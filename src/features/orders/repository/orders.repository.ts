import type { JsonValue } from "../../../schemas/types";
import { buildOrderSearchTxt } from "../../../utils/search-txt-builders";
import {
  planSearchTxt,
  beginSearchWindow,
  emptySearchResult,
} from "../../../utils/search-txt-query";
import { normalizeError } from "../../../errors/normalize";

import type { DocumentReference, WriteBatch } from "firebase-admin/firestore";
/*
 * `ValidationError` from `../../../errors`, which is the REAL one — the class
 * `mapToHttpError` instanceof-checks to produce a 400. The other
 * `ValidationError` (in `_internal/shared/errors`) is a structurally
 * unrelated class that falls through to a generic 500; Root Cause #53 records
 * that mix-up swallowing ~100 call sites' validation messages.
 */
import { DatabaseError, NotFoundError, ValidationError } from "../../../errors";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
} from "../../../providers/db-firebase";
import {
  maskPii,
  revealPii,
  ORDER_PII_FIELDS,
} from "../../../security";
import { serverTimestamp, arrayUnion } from "../../../contracts/field-ops";
import {
  createOrderId,
  ORDER_COLLECTION,
  ORDER_TRACKED_FIELDS,
  OrderStatusValues,
  type OrderCreateInput,
  type OrderDocument,
  type OrderPlain,
  type OrderRefundEvent,
} from "../schemas";
import { withHistory, type HistoryActor, type FieldChange } from "../../../_internal/shared/history/index";
import type { FirestoreDocument } from "../../../schemas/types";
import type { OrderStatus, PaymentStatus } from "../types";
import {
  MANUAL_PAYMENT_METHODS,
  PAYMENT_REVIEW_QUEUE_SCAN_LIMIT,
  type PaymentReviewQueueMode,
} from "../constants/payment-window";
import {
  isLegalOrderTransition,
  describeIllegalTransition,
} from "../constants/transitions";
import { reconcileObligations } from "../../../_internal/shared/obligations/deadlines";
import { obligationsRepository } from "../../obligations/repository/obligations.repository";
import { ORDER_FIELDS } from "../../../constants/field-names";

/**
 * Who/why for a write that lands in `statusHistory`.
 *
 * Optional everywhere so existing callers keep compiling and record
 * `system`; pass it wherever the acting user is known.
 */
export interface OrderWriteContext {
  actor?: HistoryActor;
  /** Overrides the default trigger label with the calling function's name. */
  trigger?: string;
  reason?: string;
  note?: string;
  /**
   * Changes the field diff cannot express — used by `postRefundEvent` to put
   * the refund itself on the timeline rather than an array-length delta.
   */
  extraChanges?: Record<string, FieldChange>;
  /**
   * Bypass the status transition guard. **For the admin order editor only.**
   *
   * 🛑 The override is RECORDED in `statusHistory`, never silent — an override
   * that leaves no trace is indistinguishable from the bug the guard exists to
   * catch, so a later reader cannot tell a deliberate correction from a
   * regression that slipped through.
   *
   * Do not pass this from a route that takes its status from a request body.
   * Two of `updateStatus`'s four callers do exactly that (see
   * `constants/transitions.ts`), and handing them the override would restore
   * the hole the guard closes.
   */
  allowStatusOverride?: boolean;
}

/**
 * An illegal status transition was refused.
 *
 * Its own class so the webhook ingest can distinguish "this event is LATE"
 * from "this event is broken": a replayed `order.paid` arriving after the order
 * shipped is not wrong, it is out of date, and the correct ack is 200 with a
 * `status: "conflict"` row rather than a 500 asking the gateway to retry a
 * regression it can never win.
 */
export class OrderStatusError extends Error {
  readonly code = "ORDER_STATUS_TRANSITION_INVALID";
  constructor(message: string) {
    super(message);
    this.name = "OrderStatusError";
  }
}

/**
 * Statuses that count toward a user's per-product / per-bundle purchase
 * allowance (SB6 maxPerUser enforcement). Cancelled and refunded orders are
 * intentionally excluded — the inventory was returned to circulation.
 */
const ACTIVE_ALLOWANCE_STATUSES: ReadonlyArray<string> = [
  ORDER_FIELDS.STATUS_VALUES.PENDING,
  ORDER_FIELDS.STATUS_VALUES.CONFIRMED,
  ORDER_FIELDS.STATUS_VALUES.PROCESSING,
  ORDER_FIELDS.STATUS_VALUES.SHIPPED,
  ORDER_FIELDS.STATUS_VALUES.DELIVERED,
];

/**
 * Status → the timestamp field recording when the order ENTERED that status.
 *
 * 🛑 `deliveryDate` had NO WRITER anywhere in the live application until
 * 2026-10-21 — only seed data and display components referenced it — and that
 * single omission unanchored every post-delivery deadline in the product:
 *
 *   · `assertReturnWindowOpen` fell through to an `updatedAt` fallback, so the
 *     return window was measured from the order's LAST MUTATION. Any write at
 *     all — a note, `assignWorker`, a `statusHistory` append — silently
 *     restarted the buyer's clock.
 *   · `PROTECTION_CLAIM_WINDOW_HOURS` had nothing to measure from, so the
 *     shipment- and sale-protection claim windows (which we charge 2% and 3%
 *     for) could not open or close.
 *   · The payout hold had no anchor, which is half of why three payout paths
 *     honour one intended hold between them (D25).
 *
 * A FACT, never a deadline. The deadline is derived from it on read, so a
 * policy change re-dates nothing and there is no stored mirror to drift
 * (Root Cause #42).
 *
 * 🛑 `cancellationDate` is deliberately ABSENT from this map even though the
 * field exists. `cancelOrder` already sets it in the same patch, and stamping
 * it here too would be a second writer for one fact — the exact shape the rest
 * of this comment is about. Add a status here only when nothing else owns its
 * anchor.
 */
const STATUS_ANCHOR_FIELD = {
  [ORDER_FIELDS.STATUS_VALUES.SHIPPED]: "shippingDate",
  [ORDER_FIELDS.STATUS_VALUES.DELIVERED]: "deliveryDate",
} as const satisfies Partial<Record<OrderStatus, keyof OrderDocument>>;

/**
 * Stamp the anchor for a status this patch is moving INTO.
 *
 * Three properties, each load-bearing:
 *
 * 1. **Only on a real transition.** Gated on `current?.status !== patch.status`,
 *    so re-writing `delivered` over `delivered` (a tracking-number edit, a
 *    replayed webhook) does not move the anchor. Without that gate every
 *    subsequent write would push the return window further out — which is the
 *    `updatedAt` bug this exists to remove, reintroduced by the fix for it.
 * 2. **Never overwrites an explicit value.** A caller passing its own
 *    `deliveryDate` — a backfill, an admin correcting a date, a courier
 *    webhook reporting when delivery actually happened — wins. We are
 *    supplying a default, not asserting authority.
 * 3. **Costs no reads.** `updateWithHistory` already holds `current`, which is
 *    why this belongs there and not in a service layer (Rule #6).
 */
/**
 * Coerce whatever Firestore actually handed us into a `Date`, or `null`.
 *
 * 🛑 FOUR shapes reach this, and the type annotations claim only one.
 * `OrderDocument` declares these fields `Date`, but the queries below read
 * `d.data()` RAW — no `mapDoc`, because they need the `DocumentReference` for
 * a later batch write — so what arrives is:
 *
 *   · a Firestore `Timestamp` (the normal case, exposing `.toDate()`)
 *   · a real `Date` (when a doc was just written in-process)
 *   · a **string** — `/api/store/orders/[id]` wrote `shippingDate` as
 *     `new Date().toISOString()` until 2026-10-21 while the sibling
 *     `customShipOrder` wrote a `Date`, so live documents carry both
 *   · a number (epoch ms), from any hand-written fixture
 *
 * A bare `o.data.deliveryDate.getTime()` therefore throws on the common case
 * (a Timestamp has no `getTime`), and `new Date(timestamp)` yields an Invalid
 * Date rather than failing — which would silently compare as `false` and
 * withhold the payout forever with no error. Mirrors the four-shape handling
 * in `orders/adapters.ts:27`, returning a `Date` rather than an ISO string.
 */
function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function stampStatusAnchor(
  current: OrderDocument | null | undefined,
  patch: Partial<OrderDocument>,
): Partial<OrderDocument> {
  const nextStatus = patch.status;
  if (!nextStatus || current?.status === nextStatus) return patch;
  const field = (STATUS_ANCHOR_FIELD as Record<string, string | undefined>)[nextStatus];
  if (!field) return patch;
  if ((patch as Record<string, unknown>)[field] !== undefined) return patch;
  return { ...patch, [field]: new Date() };
}

class OrderRepository extends BaseRepository<OrderDocument> {
  constructor() {
    super(ORDER_COLLECTION);
  }


  /**
   * Declared, not hand-rolled.
   *
   * `BaseRepository.applyWriteHooks` already does exactly what the private
   * `encryptOrderData` did — encrypt the listed fields, then add the mapped blind
   * indices derived from the PLAINTEXT source. Declaring the fields means all
   * nine mutating methods get it, including the `createWithId` / `*InTx` /
   * `*InBatch` family that inherited unhooked base implementations while the
   * encryption lived in a private method only three call sites remembered to
   * call.
   */
  protected override piiFields = ORDER_PII_FIELDS;

  /*
   * 🛑 `mapDoc` is NOT overridden, and that absence IS the change.
   *
   * It used to decrypt on every read, so ciphertext never left the database
   * and every caller handled plaintext without ever saying so. Following
   * `SiteSettingsRepository`: reads return what Firestore holds, and plaintext
   * requires one of the two named methods below.
   *
   * A convention would not hold this. `OrderDocument`'s PII fields are
   * `Encrypted<string>`, assignable to nothing that wants a plain `string`, so
   * a reader that skips both accessors is a compile error naming file and line.
   */

  /** Plaintext PII. **Opt-in and named** — shows up in review and in a grep. */
  revealOrder(doc: OrderDocument): OrderPlain {
    return revealPii<OrderPlain>(doc, ORDER_PII_FIELDS);
  }

  /** As `revealOrder`, for a list read. */
  revealOrders(docs: readonly OrderDocument[]): OrderPlain[] {
    return docs.map((d) => this.revealOrder(d));
  }

  /**
   * Masked PII — **the default for any surface that only needs to identify a
   * row to a human.** Decrypts first, then masks: the mask helpers refuse
   * ciphertext by design, so passing a stored field straight in would return
   * "Anonymous" for every row.
   */
  maskedOrder(doc: OrderDocument): OrderPlain {
    return maskPii<OrderPlain>(doc, ORDER_PII_FIELDS);
  }

  /** As `maskedOrder`, for a list read. */
  maskedOrders(docs: readonly OrderDocument[]): OrderPlain[] {
    return docs.map((d) => this.maskedOrder(d));
  }

  /*
   * 🛑 NOT an `override`. It returns the plaintext it was handed rather than
   * re-reading (a read-after-write costs a Firestore read per order), so the
   * return is `OrderPlain` — not assignable to the base's `Promise<T>`, and
   * correctly so, because the two differ.
   */
  async createOrder(input: OrderCreateInput): Promise<OrderPlain> {
    const orderDate = new Date();
    const id = createOrderId(input.quantity, orderDate);

    // Plain in, ciphertext out — `applyWriteHooks` encrypts below.
    const orderData: Omit<OrderPlain, "id"> = {
      ...input,
      orderDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const encrypted = this.applyWriteHooks(
      orderData,
    );

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    return { id, ...orderData };
  }

  async findByUser(userId: string): Promise<OrderDocument[]> {
    return this.findBy(ORDER_FIELDS.USER_ID, userId);
  }

  async findByProduct(productId: string): Promise<OrderDocument[]> {
    return this.findBy(ORDER_FIELDS.PRODUCT_ID, productId);
  }

  async findByStatus(status: OrderStatus): Promise<OrderDocument[]> {
    return this.findBy(ORDER_FIELDS.STATUS, status);
  }

  async findConfirmed(): Promise<OrderDocument[]> {
    return this.findBy(ORDER_FIELDS.STATUS, "confirmed");
  }

  async findPending(): Promise<OrderDocument[]> {
    return this.findBy(ORDER_FIELDS.STATUS, "pending");
  }

  /**
   * Every write primitive below routes through this so `statusHistory` is
   * appended at the SEVEN places a tracked field can change, rather than at
   * the ~32 call sites above them. That is what makes order history a
   * contained change instead of a codebase-wide sweep — and it follows the
   * precedent `postRefundEvent` already set for append-only order data.
   *
   * `ctx` is optional throughout: a caller that has not been updated yet
   * records `system` rather than failing, so this rolls out incrementally.
   * The actor is worth passing wherever it is known — a history entry that
   * cannot say who cancelled an order is a much weaker record.
   */
  private async updateWithHistory(
    orderId: string,
    patch: Partial<OrderDocument>,
    ctx: OrderWriteContext | undefined,
    defaultTrigger: string,
    /**
     * The already-fetched document, when the caller has one. Three of the six
     * write primitives (`markPicked`, `markCodCollected`, `postRefundEvent`)
     * read the order before patching it — passing it through avoids a second
     * read of the same document on every one of those writes, which matters
     * against the Firestore daily read budget (Rule #6).
     */
    known?: OrderDocument | null,
  ): Promise<OrderDocument> {
    const current = known !== undefined ? known : await this.findById(orderId);

    /*
     * ── THE STATUS TRANSITION GUARD ───────────────────────────────────────────
     *
     * 🛑 ENFORCED HERE, and the location is the whole reason this is cheap.
     *
     * `updateWithHistory` is the single choke point all seven write primitives
     * route through, AND it is the only place that already holds the current
     * document — so the guard costs **zero extra Firestore reads**. Enforcing
     * at the service layer instead would be four call-site edits and would
     * still miss `settleRefund`'s own write, which goes straight through here.
     *
     * What it stops, from the census in `constants/transitions.ts`: two of
     * `updateStatus`'s four callers pass an arbitrary status from a REQUEST
     * BODY with `as any`, so a seller could set `delivered` on an unpaid order
     * or regress `delivered` → `pending`, and nothing refused it. A replayed
     * `order.paid` webhook could do the same.
     *
     * 🛑 It is skipped when `current` is null — a brand-new document has no
     * `from` state, and refusing the first write would make the guard reject
     * order creation. Also skipped when the patch carries no `status`, which
     * is most writes (a tracking number, a note, a payout flag).
     */
    const nextStatus = patch.status;
    if (current?.status && nextStatus && !isLegalOrderTransition(current.status, nextStatus)) {
      if (ctx?.allowStatusOverride) {
        /*
         * The admin escape hatch — RECORDED, never silent. An override that
         * leaves no trace is indistinguishable from the bug this guard exists
         * to catch, so it goes into `statusHistory` as an explicit note and the
         * write proceeds.
         */
        ctx = {
          ...ctx,
          note: [
            ctx.note,
            `status override: ${current.status} → ${nextStatus} is not a legal transition`,
          ]
            .filter(Boolean)
            .join(" · "),
        };
      } else {
        throw new OrderStatusError(describeIllegalTransition(current.status, nextStatus));
      }
    }

    patch = stampStatusAnchor(current, patch);
    const withEntry = withHistory(
      current as unknown as FirestoreDocument | undefined,
      patch as unknown as FirestoreDocument,
      {
        tracked: ORDER_TRACKED_FIELDS,
        actor: ctx?.actor ?? { role: "system" },
        trigger: ctx?.trigger ?? defaultTrigger,
        reason: ctx?.reason,
        note: ctx?.note,
        extraChanges: ctx?.extraChanges,
        // `encryptPiiFields` is a flat top-level loop and never descends into
        // arrays, so anything PII-named reaching `changes` would persist in
        // PLAINTEXT inside statusHistory. None of ORDER_TRACKED_FIELDS is PII
        // today — this is defence for the next field somebody adds.
        piiFields: ORDER_PII_FIELDS,
        historyField: "statusHistory",
        truncatedField: "statusHistoryTruncated",
      },
    );
    // `null` means no tracked field actually changed — write the patch as-is
    // so an untracked update never grows the array.
    // Plain: this is a write payload and `update` encrypts.
    const written = await this.update(orderId, (withEntry ?? patch) as Partial<OrderPlain>);

    /*
     * ── OBLIGATION RECONCILIATION (Phase 5b) ──────────────────────────────────
     *
     * Reconciled from the order's OWN write, here, for two reasons.
     *
     * 🛑 NOT a Firestore trigger. An `onOrderWrite` trigger that wrote
     * `obligations`, whose sweep then wrote `orders`, is Root Cause #92's
     * self-write loop exactly — 1,017,548 invocations in 24 hours against a
     * 2M/month quota, plus a correctly-guarded sibling woken a million times
     * just to return. A correct guard does not save you from a neighbour's
     * loop.
     *
     * 🛑 And it costs ZERO extra reads: the post-write document is assembled
     * from `current` plus `patch` rather than re-read. `reconcileObligations`
     * is a pure function over that shape.
     *
     * Fire-and-forget, and that is deliberate: an obligation is a derived HINT.
     * Letting its write fail the ORDER write — the one the caller is waiting on,
     * which may be a payment confirmation — would trade a real transaction for
     * a bookkeeping row. The next write reconciles again, and the sweep's
     * re-read of the subject is what makes a missed row self-correcting.
     */
    void this.reconcileObligationsFor(
      { ...(current ?? {}), ...patch, id: orderId } as OrderDocument,
      current,
    ).catch((err: unknown) => {
      void normalizeError(err);
    });

    return written;
  }

  /**
   * Open/close this order's obligations to match what its own facts imply.
   *
   * Public so the obligation sweep can re-run it after acting, and so a
   * backfill can reconcile existing orders without a synthetic write.
   */
  async reconcileObligationsFor(
    order: OrderDocument,
    /**
     * The pre-write document, so the close set is `was-open MINUS is-open`
     * rather than every kind that is not open. Omit ONLY for a deliberate
     * backfill — see `reconcileObligations`' own 🛑 on the cost.
     */
    previous?: OrderDocument | null,
  ): Promise<void> {
    const { open, close } = reconcileObligations(order, previous);
    const repo = obligationsRepository();

    for (const deadline of open) {
      await repo.open({
        kind: deadline.kind,
        subjectCollection: ORDER_COLLECTION,
        subjectId: order.id,
        dueAt: deadline.dueAt,
        ...(order.isTestData ? { isTestData: true } : {}),
        note: deadline.policy.describe,
      });
    }

    /*
     * Closed as `met`, not `superseded`: reaching here means the order's own
     * facts no longer satisfy the precondition, i.e. the thing the obligation
     * was waiting for HAPPENED. `superseded` is reserved for the sweep finding
     * a stale row at fire time, which is a different story and worth
     * distinguishing in the record.
     */
    for (const kind of close) {
      await repo.close(order.id, kind, {
        state: "met",
        closeReason: "the order's own state no longer requires it",
      });
    }
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    additionalData?: Partial<OrderDocument>,
    ctx?: OrderWriteContext,
  ): Promise<OrderDocument> {
    return this.updateWithHistory(
      orderId,
      { status, ...additionalData, updatedAt: new Date() },
      ctx,
      "orderRepository.updateStatus",
    );
  }

  async assignWorker(orderId: string, workerId: string): Promise<OrderDocument> {
    return this.update(orderId, { assignedWorkerId: workerId, updatedAt: new Date() });
  }

  async unassignWorker(orderId: string): Promise<OrderDocument> {
    return this.update(orderId, { assignedWorkerId: undefined, updatedAt: new Date() });
  }

  async markPicked(orderId: string, ctx?: OrderWriteContext): Promise<OrderDocument> {
    const order = await this.findById(orderId);
    if (!order) throw new NotFoundError(`Order ${orderId} not found`);
    const nextStatus =
      order.status === "confirmed" ? ("processing" as OrderStatus) : (order.status as OrderStatus);
    return this.updateWithHistory(
      orderId,
      { pickedAt: new Date(), status: nextStatus, updatedAt: new Date() },
      ctx,
      "orderRepository.markPicked",
      order,
    );
  }

  async markPacked(orderId: string): Promise<OrderDocument> {
    return this.update(orderId, { packedAt: new Date(), updatedAt: new Date() });
  }

  /**
   * Payment Detail Parity (Feature C) — the COD counterpart to the manual
   * proof-upload / PhonePe-webhook write paths. Seller or admin confirms
   * the cash was physically collected; there is no external gateway to
   * verify against, so `verifiedBy` is the acting user's uid and
   * `verificationMethod` is always "cod_collection".
   */
  async markCodCollected(
    orderId: string,
    verifiedBy: string,
    note?: string,
    ctx?: OrderWriteContext,
  ): Promise<OrderDocument> {
    const order = await this.findById(orderId);
    if (!order) throw new NotFoundError(`Order ${orderId} not found`);
    return this.updateWithHistory(
      orderId,
      {
        paymentStatus: "paid",
        paymentRecord: {
          method: "cod",
          transactionId: note,
          amount: order.totalPrice,
          paidAt: new Date(),
          verifiedBy,
          verificationMethod: "cod_collection",
        },
        updatedAt: new Date(),
      },
      // `verifiedBy` is the acting user — use it unless the caller supplied a
      // richer actor. Cash collection is always a person, never the system.
      ctx ?? { actor: { uid: verifiedBy, role: "seller" }, note },
      "orderRepository.markCodCollected",
      order,
    );
  }

  async findFulfillmentQueue(storeId: string): Promise<OrderDocument[]> {
    const snap = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.STORE_ID, "==", storeId)
      .where(ORDER_FIELDS.STATUS, "in", ["confirmed", "processing"])
      .orderBy(ORDER_FIELDS.CREATED_AT, "asc")
      .limit(200)
      .get();
    return snap.docs.map((doc) =>
      ({ id: doc.id, ...doc.data() } as OrderDocument),
    );
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentId?: string,
    ctx?: OrderWriteContext,
  ): Promise<OrderDocument> {
    return this.updateWithHistory(
      orderId,
      {
        paymentStatus,
        ...(paymentId ? { paymentId } : {}),
        updatedAt: new Date(),
      },
      ctx,
      "orderRepository.updatePaymentStatus",
    );
  }

  async cancelOrder(
    orderId: string,
    reason: string,
    refundAmount?: number,
    ctx?: OrderWriteContext,
  ): Promise<OrderDocument> {
    return this.updateWithHistory(
      orderId,
      {
        status: "cancelled",
        cancellationDate: new Date(),
        cancellationReason: reason,
        ...(refundAmount ? { refundAmount, refundStatus: "pending" } : {}),
        updatedAt: new Date(),
      },
      // The cancellation reason is already a first-class argument here — carry
      // it into the history entry so the timeline can say WHY, not just that
      // it was cancelled.
      { ...ctx, reason: ctx?.reason ?? reason },
      "orderRepository.cancelOrder",
    );
  }

  async findRecentByUser(userId: string): Promise<OrderDocument[]> {
    const now = new Date();
    const snapshot = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.USER_ID, "==", userId)
      .where(ORDER_FIELDS.ORDER_DATE,
        ">=",
        new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      )
      .orderBy(ORDER_FIELDS.ORDER_DATE, "desc")
      .get();

    return snapshot.docs.map((doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      } as OrderDocument),
    );
  }

  async hasUserPurchased(userId: string, productId: string): Promise<boolean> {
    const purchasedStatuses = new Set<string>([
      ORDER_FIELDS.STATUS_VALUES.CONFIRMED,
      ORDER_FIELDS.STATUS_VALUES.SHIPPED,
      ORDER_FIELDS.STATUS_VALUES.DELIVERED,
    ]);

    const snapshot = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.USER_ID, "==", userId)
      .where(ORDER_FIELDS.PRODUCT_ID, "==", productId)
      .get();

    return snapshot.docs.some((doc) =>
      purchasedStatuses.has(doc.data()[ORDER_FIELDS.STATUS] as string),
    );
  }

  /**
   * SB6-B — count this user's "active" orders for a given product. Used by
   * the order-creation API to enforce `product.maxPerUser` on pre-orders +
   * prize draws. Active = pending / confirmed / processing / shipped /
   * delivered. Cancelled + refunded are intentionally excluded.
   *
   * Firestore caveat: an `in` over the 5-status set keeps this a single
   * round-trip; we filter in memory if the active set ever grows past 10.
   */
  async countByUserAndProduct(
    userId: string,
    productId: string,
  ): Promise<number> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.USER_ID, "==", userId)
      .where(ORDER_FIELDS.PRODUCT_ID, "==", productId)
      .where(ORDER_FIELDS.STATUS, "in", ACTIVE_ALLOWANCE_STATUSES)
      .get();
    return snapshot.size;
  }

  /**
   * SB6-B — count this user's active orders for a given bundle. Same
   * active-status filter as `countByUserAndProduct`. Bundle orders set
   * `order.bundleId` at creation time (SB3 / SB6-C).
   */
  async countByUserAndBundle(
    userId: string,
    bundleId: string,
  ): Promise<number> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.USER_ID, "==", userId)
      .where(ORDER_FIELDS.BUNDLE_ID, "==", bundleId)
      .where(ORDER_FIELDS.STATUS, "in", ACTIVE_ALLOWANCE_STATUSES)
      .get();
    return snapshot.size;
  }

  async deleteByUser(userId: string): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where(ORDER_FIELDS.USER_ID, "==", userId)
        .get();

      if (snapshot.empty) return 0;

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return snapshot.size;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to delete orders for user: ${userId}`,
        error,
      );
    }
  }

  static readonly SELLER_SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    productId: { canFilter: true, canSort: false },
    productTitle: { canFilter: true, canSort: true },
    userId: { canFilter: true, canSort: false },
    userName: { canFilter: true, canSort: true },
    status: { canFilter: true, canSort: true },
    paymentStatus: { canFilter: true, canSort: true },
    paymentMethod: { canFilter: true, canSort: true },
    totalPrice: { canFilter: true, canSort: true },
    orderDate: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    contestable: { canFilter: true, canSort: false },
    /*
     * Lane segregation on the SELLER's order list — the same provenance axis
     * `/user/orders` has had.
     *
     * 🛑 It was absent, and absence here is SILENT: `sieve.ts` sets
     * `throwExceptions: false`, so an unallowlisted field does not raise —
     * `findField` returns undefined and the clause is simply dropped. A lane
     * chip emitting `orderType==auction` would therefore have returned the
     * seller's ENTIRE order list while looking exactly like a working filter
     * (Root Cause #62). Checked before wiring the chip, not after.
     *
     * 🛑 Never pushed as `orderType==standard`, for the same reason the admin
     * set above carries that note: orders written before the field existed have
     * no value to match. `/api/store/orders` refines that one case in memory.
     */
    orderType: { canFilter: true, canSort: false },
    // Fulfilment flags. Filterable so "which of my orders need gift wrap?" is a
    // query against the orders themselves — the whole point of recording the
    // add-on on the order rather than keeping a side list of who asked for what.
    giftWrapAddon: { canFilter: true, canSort: false },
    shipmentProtectionAddon: { canFilter: true, canSort: false },
    saleProtectionAddon: { canFilter: true, canSort: false },
    couponCode: { canFilter: true, canSort: false },
  };

  /**
   * A store's orders.
   *
   * 🛑 SCOPED BY `storeId`, NOT BY A LIST OF PRODUCT IDS.
   *
   * It used to take the seller's whole product list and run
   * `.where(productId, "in", productIds)`. **Firestore caps `in` at 30 values**
   * and nothing bounded that array, so the query threw `INVALID_ARGUMENT` and
   * the route 500'd for any store past its 30th listing. Measured on production
   * 2026-09-14: `store-beyblade-arena` has **65** products, so
   * `GET /api/store/orders` — the seller's own order list — was permanently
   * broken for the only real seller on the site, while the two small stores
   * worked fine. A seller with 29 listings would never have reported it.
   *
   * `storeId` is the right key regardless of the cap: it is the field a cart is
   * SPLIT on (one order per store), `findFulfillmentQueue` a few lines up
   * already queries it, it is a registered sieve field, and 64/64 production
   * orders carry it. It also deletes an entire products query per request from
   * all four call sites — the route already resolved the store.
   */
  async listForSeller(
    storeId: string,
    model: SieveModel,
    opts?: { search?: string },
  ): Promise<FirebaseSieveResult<OrderDocument>> {
    const plan = planSearchTxt(opts?.search);
    // A search that yielded no usable term must return NOTHING, not the
    // seller's whole order list.
    if (plan.empty) return emptySearchResult<OrderDocument>();

    if (!storeId) {
      const page = Math.max(1, Number(model.page ?? 1));
      const pageSize = Math.max(1, Number(model.pageSize ?? 20));
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        hasMore: false,
      };
    }

    let baseQuery = this.getCollection().where(
      ORDER_FIELDS.STORE_ID,
      "==",
      storeId,
    );
    if (plan.head) {
      // One `array-contains` alongside one equality is unconstrained —
      // Firestore's per-query limits are on `array-contains` and on the
      // `in`/`not-in`/`array-contains-any` family separately.
      baseQuery = baseQuery.where(
        ORDER_FIELDS.SEARCH_TXT,
        "array-contains",
        plan.head,
      ) as typeof baseQuery;
    }

    /*
     * One bounded window, one raised `maxPageSize`, one page slice — see
     * `beginSearchWindow`. Hand-writing the three is how the other ten
     * repositories each ended up with two of them, which reads as a working
     * multi-word search and silently cannot reach page 2.
     */
    const win = beginSearchWindow(model, plan);

    const result = await this.sieveQuery<OrderDocument>(
      win.model,
      OrderRepository.SELLER_SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 20,
        maxPageSize: win.maxPageSize(100),
      },
    );
    return win.finish(result);
  }

  async listForUser(
    userId: string,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<OrderDocument>> {
    const baseQuery = this.getCollection().where(
      ORDER_FIELDS.USER_ID,
      "==",
      userId,
    );
    return this.sieveQuery<OrderDocument>(
      model,
      OrderRepository.ADMIN_SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 20,
        maxPageSize: 200,
      },
    );
  }

  static readonly ADMIN_SIEVE_FIELDS = {
    searchTxt: { canFilter: true, canSort: false },
    id: { canFilter: true, canSort: false },
    userId: { canFilter: true, canSort: false },
    userName: { canFilter: true, canSort: true },
    userEmail: { canFilter: true, canSort: true },
    storeId: { canFilter: true, canSort: false },
    productId: { canFilter: true, canSort: false },
    productTitle: { canFilter: true, canSort: true },
    status: { canFilter: true, canSort: true },
    paymentStatus: { canFilter: true, canSort: true },
    paymentMethod: { canFilter: true, canSort: true },
    shippingMethod: { canFilter: true, canSort: true },
    payoutStatus: { canFilter: true, canSort: false },
    totalPrice: { canFilter: true, canSort: true },
    orderDate: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    // S-SBUNI-RULES 2026-05-13 — refund + batch fields
    paymentBatchId: { canFilter: true, canSort: false },
    contestable: { canFilter: true, canSort: false },
    // Lane segregation on /user/orders — "standard"/"auction"/"offer" etc.
    // Never filtered as "standard" via Firestore == (see listForUser callers):
    // orders written before this field existed have no value to match.
    orderType: { canFilter: true, canSort: false },
    // Same fulfilment flags as SELLER_SIEVE_FIELDS — admin needs to answer
    // "who opted into WhatsApp updates?" when a status change goes out, without
    // maintaining a parallel tracker.
    giftWrapAddon: { canFilter: true, canSort: false },
    shipmentProtectionAddon: { canFilter: true, canSort: false },
    saleProtectionAddon: { canFilter: true, canSort: false },
    couponCode: { canFilter: true, canSort: false },
  };

  /**
   * Derived on every write path via `applyWriteHooks`.
   *
   * Fed by product/store/tracking only — the three ORDER_PII_FIELDS and the
   * shipping address are deliberately absent (see buildOrderSearchTxt).
   */
  protected override buildSearchTxtFor(
    data: Record<string, JsonValue>,
  ): string[] | null {
    return buildOrderSearchTxt(data as Partial<OrderDocument>);
  }

  async listAll(
    model: SieveModel,
    opts?: { search?: string },
  ): Promise<FirebaseSieveResult<OrderDocument>> {
    const plan = planSearchTxt(opts?.search);
    // A search that yielded no usable term must return NOTHING, not everything.
    if (plan.empty) return emptySearchResult<OrderDocument>();

    let baseQuery = this.getCollection();
    if (plan.head) {
      baseQuery = baseQuery.where(
        ORDER_FIELDS.SEARCH_TXT,
        "array-contains",
        plan.head,
      ) as typeof baseQuery;
    }

    /*
     * One bounded window, one raised `maxPageSize`, one page slice — see
     * `beginSearchWindow`. Hand-writing the three is how the other ten
     * repositories each ended up with two of them, which reads as a working
     * multi-word search and silently cannot reach page 2.
     */
    const win = beginSearchWindow(model, plan);

    const result = await this.sieveQuery<OrderDocument>(
      win.model,
      OrderRepository.ADMIN_SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 50,
        maxPageSize: win.maxPageSize(200),
      },
    );
    return win.finish(result);
  }

  /**
   * Append one refund event to the order and mark it non-contestable.
   * If `becomeRefunded` is true, also transitions the order status to "refunded".
   */
  /**
   * PHASE A — reserve a refund slot atomically, enforcing the cumulative cap.
   *
   * 🛑 WHY A TRANSACTION, AND WHY NOT `arrayUnion` (D1 + D6).
   *
   * `postRefundEvent` below does `findById` then `[...existing, event]` — a
   * read-then-write. Two concurrent refunds both read the same `existing` and
   * the second write **overwrites the first's append, losing an event
   * entirely**. And the cap check lived in the ACTION, outside any
   * transaction, so it was TOCTOU: two requests could each see a clear cap and
   * both proceed. Combined with the cap comparing against `totalPrice` rather
   * than the remaining balance (D1), ₹500 and another ₹500 both passed on a
   * ₹600 order — **two real gateway refunds, both successful.**
   *
   * `arrayUnion` is the obvious fix and is WRONG here on three counts: it
   * cannot evaluate the cumulative cap (the whole point), it cannot build the
   * `withHistory` entry, and it dedupes by DEEP EQUALITY — so two legitimate
   * identical ₹100 partial refunds would silently merge into one.
   *
   * The entry lands with `status: "reserved"`, which `committedRefundTotal`
   * counts. That is what makes the reservation real: a concurrent request sees
   * the pending amount and cannot refund against a balance already spoken for.
   * A later `failed` settlement releases it simply by being skipped.
   *
   * Throws rather than returning a flag — a caller that ignores a boolean here
   * calls the gateway anyway, which is the failure this prevents.
   */
  async reserveRefund(
    orderId: string,
    event: OrderRefundEvent,
    /** Resolved by the caller from `refundCapacity`; see `refundable-base.ts`. */
    opts: { refundableBase: number; epsilon: number },
  ): Promise<void> {
    const docRef = this.getCollection().doc(orderId);
    await this.db.runTransaction(async (tx) => {
      const snap = (await tx.get(docRef as never)) as unknown as {
        exists?: boolean;
        data?: () => Record<string, unknown> | undefined;
      };
      const data = typeof snap?.data === "function" ? snap.data() : undefined;
      if (!data) throw new NotFoundError(`Order ${orderId} not found`);

      const existing = (data.refunds ?? []) as Array<{ amount?: number; status?: string; refundId?: string }>;

      /*
       * Idempotency inside the transaction too, not only at the claim doc.
       * The claim is the at-most-once gate for a RETRY of the same request;
       * this catches the case where a reservation landed but the claim write
       * did not, and makes re-entry a no-op rather than a second slot.
       */
      if (existing.some((r) => r.refundId === event.refundId)) return;

      const committed = existing
        .filter((r) => r.status !== "failed")
        .reduce((sum, r) => sum + (r.amount ?? 0), 0);

      /*
       * The cap, evaluated HERE rather than by the caller — inside the
       * transaction is the only place it is not a race.
       */
      if (committed + event.amount > opts.refundableBase + opts.epsilon) {
        const remaining = Math.max(0, opts.refundableBase - committed);
        throw new ValidationError(
          `Refund of ₹${event.amount.toFixed(2)} exceeds the ₹${remaining.toFixed(2)} still refundable on this order.`,
        );
      }

      tx.update(docRef as never, {
        refunds: [...existing, { ...event, status: "reserved" }],
        contestable: false,
        updatedAt: new Date(),
      } as never);
    });
  }

  /**
   * PHASE B — settle a reserved refund: `processed` with the gateway's id, or
   * `failed`, which releases the reservation.
   *
   * Runs AFTER the provider call, which must sit outside any transaction: a
   * Firestore transaction retries its body, and a retried network call is a
   * second refund. This is the only ordering in which "money left the gateway
   * and we have no record of it" is impossible — a crash between the provider
   * call and this write leaves a `reserved` entry and an unsettled claim,
   * which is exactly the shape Phase 4's reconciler looks for.
   *
   * Goes through `updateWithHistory`, so the TIMELINE entry is written at
   * settlement rather than at reservation. That is deliberate: the history
   * should record money that moved, not an intent that may yet fail.
   */
  async settleRefund(
    orderId: string,
    refundId: string,
    outcome:
      | { status: "processed"; gatewayRefundId?: string; gateway?: string; providerFields?: Record<string, string> }
      | { status: "failed"; failureReason?: string },
    becomeRefunded = false,
    ctx?: OrderWriteContext,
  ): Promise<OrderDocument> {
    const order = await this.findById(orderId);
    if (!order) throw new NotFoundError(`Order ${orderId} not found`);
    const existing = order.refunds ?? [];
    const target = existing.find((r) => r.refundId === refundId);
    if (!target) throw new NotFoundError(`Reserved refund ${refundId} not found on order ${orderId}`);

    const settled = existing.map((r) =>
      r.refundId === refundId
        ? {
            ...r,
            ...outcome,
            ...(outcome.status === "processed" ? (outcome.providerFields ?? {}) : {}),
          }
        : r,
    );

    return this.updateWithHistory(
      orderId,
      {
        refunds: settled as OrderRefundEvent[],
        /*
         * `becomeRefunded` only on a SUCCESSFUL settlement. Marking an order
         * refunded on a failed gateway call would be the worst possible lie:
         * terminal status, no money moved.
         */
        ...(becomeRefunded && outcome.status === "processed"
          ? {
              status: "refunded" as OrderStatus,
              /*
               * 🛑 Clears the INTENT that `cancelOrder` wrote.
               *
               * `cancelOrder(…, refundAmount)` sets `refundStatus: "pending"`,
               * and until 2026-10-21 nothing anywhere ever wrote a terminal
               * value — so a successfully refunded cancellation kept reading
               * `"pending"` forever. That is not cosmetic: D14's detector looks
               * for cancelled orders that still owe money, and a flag stuck at
               * `"pending"` would make every *successful* refund look like a
               * failure.
               *
               * It also gives `issuePartialRefund`'s
               * `refundStatus === COMPLETED` guard its first writer. That check
               * has existed for a long time and could never fire, so a
               * fully-refunded order could be submitted for another full refund
               * and was stopped only by the cumulative cap one layer down.
               *
               * Only on `processed` + `isFull`, because those are the two facts
               * that make "completed" true. A failed settlement deliberately
               * leaves `"pending"` standing — that is the state the detector
               * must still see.
               */
              refundStatus: "completed" as const,
            }
          : {}),
        updatedAt: new Date(),
      },
      {
        ...ctx,
        extraChanges: {
          refund: {
            from: null,
            to: {
              refundId,
              type: target.type,
              amount: target.amount,
              reason: target.reason,
              outcome: outcome.status,
            },
          },
        },
        actor: ctx?.actor ?? { uid: target.refundedBy, role: "admin" },
        reason: ctx?.reason ?? target.reason,
      },
      "orderRepository.settleRefund",
      order,
    );
  }

  /**
   * Stamp a credit-note number onto one settled refund event (Phase 7, 7c).
   *
   * ## 🛑 Why this is a repository method and not an inline update
   *
   * `refunds[]` is written by re-mapping the whole array, exactly as
   * `settleRefund` directly above does — because a read-modify-write of
   * `[...existing, event]` LOSES a concurrent event (D6), and that defect is
   * just as reachable from a credit-note stamp as from a refund append.
   * Letting the invoicing feature touch the array directly would reintroduce
   * it one caller away from the fix.
   *
   * It goes through `updateWithHistory` for the same reason every other
   * mutator here does: the transition guard and the status-history entry live
   * there, and this is a real recorded event on the order.
   *
   * 🛑 A missing refund event is a NO-OP, not a throw. The caller is the
   * refund settle path, where money has already moved; raising here would turn
   * a successful refund into a reported failure. See
   * `issueCreditNoteForRefund`'s own 🛑.
   */
  async setRefundCreditNote(
    orderId: string,
    refundId: string,
    note: {
      creditNoteNumber: string;
      creditNoteIssuedAt: Date;
      creditNoteStoragePath?: string;
    },
    ctx?: OrderWriteContext,
  ): Promise<OrderDocument | null> {
    const order = await this.findById(orderId);
    if (!order) return null;
    const existing = order.refunds ?? [];
    const target = existing.find((r) => r.refundId === refundId);
    if (!target) return null;
    // Already numbered — never overwrite. A credit-note number is issued once,
    // and a second number for one reversal is a permanent gap in the series.
    if (target.creditNoteNumber) return order;

    const stamped = existing.map((r) =>
      r.refundId === refundId ? { ...r, ...note } : r,
    );

    return this.updateWithHistory(
      orderId,
      { refunds: stamped as OrderRefundEvent[], updatedAt: new Date() },
      {
        ...ctx,
        extraChanges: {
          creditNote: {
            from: null,
            to: { refundId, creditNoteNumber: note.creditNoteNumber },
          },
        },
        actor: ctx?.actor ?? { uid: "system:invoicing", role: "system" },
        reason: ctx?.reason ?? `Credit note ${note.creditNoteNumber} issued`,
      },
      "orderRepository.setRefundCreditNote",
      order,
    );
  }

  /**
   * 🛑 LEGACY — prefer `reserveRefund` + `settleRefund`.
   *
   * Kept because several non-gateway paths (manual refunds with no provider
   * call, and the out-of-stock auto-refund) post a single terminal event with
   * nothing to reserve against. Its read-then-write append is still a lost-
   * update risk under concurrency (D6); do not route a new gateway refund
   * through it.
   */
  async postRefundEvent(
    orderId: string,
    event: OrderRefundEvent,
    becomeRefunded = false,
    ctx?: OrderWriteContext,
  ): Promise<OrderDocument> {
    const order = await this.findById(orderId);
    if (!order) throw new NotFoundError(`Order ${orderId} not found`);

    const existing = order.refunds ?? [];
    return this.updateWithHistory(
      orderId,
      {
        refunds: [...existing, event],
        contestable: false,
        ...(becomeRefunded ? { status: "refunded" as OrderStatus } : {}),
        updatedAt: new Date(),
      },
      {
        ...ctx,
        // The refund is contributed explicitly rather than diffed. A raw diff
        // of `refunds[]` would say "an array of 1 became an array of 2" —
        // true, and useless on a timeline. PARTIAL refunds matter as much as
        // full ones here: a partial changes no tracked field at all, so
        // without this it would leave no trace despite being exactly the kind
        // of event a buyer later asks about.
        extraChanges: {
          refund: {
            from: null,
            to: {
              refundId: event.refundId,
              type: event.type,
              amount: event.amount,
              reason: event.reason,
            },
          },
        },
        actor: ctx?.actor ?? { uid: event.refundedBy, role: "admin" },
        reason: ctx?.reason ?? event.reason,
      },
      "orderRepository.postRefundEvent",
      order,
    );
  }

  /** Fetch all orders sharing a paymentBatchId (for sibling-orders display). */
  async findByPaymentBatchId(batchId: string): Promise<OrderDocument[]> {
    const snap = await this.db
      .collection(this.collection)
      .where("paymentBatchId", "==", batchId)
      .limit(20)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderDocument));
  }

  /**
   * Fetch every order recorded against a single gateway payment id (e.g. a
   * PhonePe `merchantOrderId`, which one checkout can split into several
   * per-seller orders). Used by the checkout idempotency guard — the buyer's
   * `/verify` call and the async webhook can both race to place orders for
   * the same payment, and whichever loses the claim needs to know what the
   * winner already created.
   */
  async findByPaymentId(paymentId: string): Promise<OrderDocument[]> {
    const snap = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.PAYMENT_ID, "==", paymentId)
      .limit(20)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderDocument));
  }

  /**
   * Cloud Functions: find pending orders created before a timeout threshold.
   * Used by the payment-timeout cleanup job to cancel stale unconfirmed orders.
   */
  async getTimedOutPending(
    hours: number,
  ): Promise<
    Array<{ id: string; ref: DocumentReference; data: OrderDocument }>
  > {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);

    const snap = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.STATUS, "==", OrderStatusValues.PENDING)
      .where(ORDER_FIELDS.PAYMENT_STATUS, "==", "pending")
      .where(ORDER_FIELDS.CREATED_AT, "<", cutoff)
      .limit(500)
      .get();

    return snap.docs.map((d) => ({
      id: d.id,
      ref: d.ref as DocumentReference,
      data: ({ id: d.id, ...d.data() } as OrderDocument),
    }));
  }

  /**
   * Cloud Functions: 15-minute payment-window sweep — orders past their
   * `paymentDeadline` with no proof uploaded yet. Filters out orders that
   * already have `paymentProofUrl` set in-memory (the 2-hour auto-approve
   * sweep owns those instead) rather than as a Firestore inequality, since a
   * `paymentProofUrl != null` filter would silently exclude every doc where
   * the field isn't set at all — the opposite of what's needed here.
   */
  /**
   * Orders invoiced within a window — the GSTR-1 export's only query
   * (Phase 7d).
   *
   * ## 🛑 Windowed on `invoiceIssuedAt`, not on the order date
   *
   * A COD order placed on 30 March and paid on 2 April is invoiced in the NEW
   * financial year, and that is the period its tax belongs to. Numbering
   * happens at the payment transition for exactly this reason, so the invoice
   * date is the only correct axis — windowing on `orderDate` would file that
   * order's tax in the year before it was invoiced.
   *
   * ## 🛑 It also returns PAID orders with no invoice number, deliberately
   *
   * Those are the ones the export must warn about rather than omit — a paid
   * order silently absent from a tax return is the single error this whole
   * feature exists to prevent. Firestore cannot OR across two fields, so the
   * second query is a separate one and the caller merges; the alternative
   * (one query on `paymentStatus`, filtered in memory) would scan every paid
   * order ever placed.
   *
   * Unbounded `.limit(2000)`: a quarter's orders at this volume is a few
   * hundred, and an export that silently truncated would understate a tax
   * return. If this ever saturates, the fix is pagination with an explicit
   * "more rows exist" signal in the CSV — never a higher cap.
   */
  async listInvoicedBetween(from: Date, to: Date): Promise<OrderDocument[]> {
    const [invoiced, paidUnnumbered] = await Promise.all([
      this.db
        .collection(this.collection)
        .where("invoiceIssuedAt", ">=", from)
        .where("invoiceIssuedAt", "<=", to)
        .limit(2000)
        .get(),
      /*
       * The exceptions. Bounded on `orderDate` because an un-invoiced order
       * has no invoice date to window on — which is the whole problem with it
       * — and because `paymentStatus == paid` alone would match every paid
       * order in the collection's history.
       */
      this.db
        .collection(this.collection)
        .where(ORDER_FIELDS.PAYMENT_STATUS, "==", "paid")
        .where(ORDER_FIELDS.ORDER_DATE, ">=", from)
        .where(ORDER_FIELDS.ORDER_DATE, "<=", to)
        .limit(2000)
        .get(),
    ]);

    const byId = new Map<string, OrderDocument>();
    for (const d of invoiced.docs) {
      byId.set(d.id, { id: d.id, ...d.data() } as OrderDocument);
    }
    for (const d of paidUnnumbered.docs) {
      const data = { id: d.id, ...d.data() } as OrderDocument;
      // Only the genuinely un-numbered ones — a paid, numbered order is
      // already in the first set, and adding it again would double every one
      // of its rows in the return.
      if (!data.invoiceNumber && !byId.has(d.id)) byId.set(d.id, data);
    }
    return [...byId.values()];
  }

  async getExpiredPaymentDeadlines(): Promise<
    Array<{ id: string; ref: DocumentReference; data: OrderDocument }>
  > {
    const snap = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.STATUS, "==", OrderStatusValues.PENDING)
      .where(ORDER_FIELDS.PAYMENT_STATUS, "==", "pending")
      .where(ORDER_FIELDS.PAYMENT_DEADLINE, "<=", new Date())
      .limit(500)
      .get();

    return snap.docs
      .map((d) => ({
        id: d.id,
        ref: d.ref as DocumentReference,
        data: ({ id: d.id, ...d.data() } as OrderDocument),
      }))
      .filter((entry) => !entry.data.paymentProofUrl);
  }

  /**
   * Cloud Functions: 2-hour auto-approve sweep — orders with a submitted
   * proof that no admin has acted on yet (`paymentReviewOutcome` unset).
   * Filters that in-memory rather than as a Firestore inequality for the
   * same reason as `getExpiredPaymentDeadlines` — a `!= null` filter would
   * silently exclude every doc where the field was never set at all.
   */
  async getUnreviewedProofPastDeadline(
    hours = 2,
  ): Promise<Array<{ id: string; ref: DocumentReference; data: OrderDocument }>> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);

    const snap = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.STATUS, "==", OrderStatusValues.PENDING)
      .where(ORDER_FIELDS.PAYMENT_STATUS, "==", "pending")
      .where(ORDER_FIELDS.PAYMENT_PROOF_UPLOADED_AT, "<=", cutoff)
      .limit(500)
      .get();

    return snap.docs
      .map((d) => ({
        id: d.id,
        ref: d.ref as DocumentReference,
        data: ({ id: d.id, ...d.data() } as OrderDocument),
      }))
      .filter((entry) => !!entry.data.paymentProofUrl && !entry.data.paymentReviewOutcome);
  }

  /**
   * Admin/seller payment-review queue — the manual-payment orders that are
   * waiting on somebody. Two modes:
   *
   *  - `awaiting_proof`        — buyer hasn't uploaded a screenshot yet
   *                              (the 15-minute `paymentDeadline` window).
   *  - `awaiting_verification` — proof submitted, no admin decision recorded
   *                              yet (the 2-hour auto-approve window).
   *
   * Both refinements — proof presence and manual `paymentMethod` — are done
   * in-memory rather than as Firestore clauses, deliberately:
   *
   *  - `paymentProofUrl != null` would silently exclude every doc where the
   *    field was never set at all, which is exactly the `awaiting_proof` set
   *    (same reasoning as `getExpiredPaymentDeadlines` /
   *    `getUnreviewedProofPastDeadline` above).
   *  - keeping `paymentMethod` out of the query means this reuses the
   *    existing `(status, paymentStatus, createdAt)` composite index instead
   *    of needing a new four-field one.
   *
   * The scan is hard-bounded at {@link PAYMENT_REVIEW_QUEUE_SCAN_LIMIT} for
   * the Vercel 10s ceiling. That bound is generous for this queue by
   * construction: an order only sits in it for 15 minutes (awaiting proof) or
   * 2 hours (awaiting verification) before a scheduled sweep resolves it, so
   * the live set is inherently small. `total` therefore counts matches within
   * the scan window, not an unbounded collection-wide count.
   */
  async listPaymentReviewQueue(
    mode: PaymentReviewQueueMode,
    opts: { page?: number; pageSize?: number } = {},
  ): Promise<FirebaseSieveResult<OrderDocument>> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 25));

    const snap = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.STATUS, "==", OrderStatusValues.PENDING)
      .where(ORDER_FIELDS.PAYMENT_STATUS, "==", "pending")
      .orderBy(ORDER_FIELDS.CREATED_AT, "desc")
      .limit(PAYMENT_REVIEW_QUEUE_SCAN_LIMIT)
      .get();

    const matches = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as OrderDocument))
      .filter((order) => MANUAL_PAYMENT_METHODS.includes(order.paymentMethod ?? ""))
      .filter((order) =>
        mode === "awaiting_proof"
          ? !order.paymentProofUrl
          : !!order.paymentProofUrl && !order.paymentReviewOutcome,
      );

    const total = matches.length;
    const totalPages = total === 0 ? 0 : Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return {
      items: matches.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Cloud Functions: find delivered orders eligible for the weekly payout sweep.
   *
   * EMI orders that still have unpaid installments are excluded — the seller
   * is only eligible once the buyer has fully paid off the order, not merely
   * once it's delivered (a seller-enabled `allowShipBeforeEmiComplete` item
   * can be delivered long before EMI collection finishes).
   */
  /*
   * 🛑 `getEligibleForPayoutSweep()` was DELETED on 2026-10-21. Do not
   * reinstate it.
   *
   * It filtered on `payoutStatus == "eligible" && status == "delivered"` and
   * NOTHING ELSE — no time cutoff of any kind. `weeklyPayoutEligibility` (the
   * Saturday job) called it, so the intended 7-day payout hold was not merely
   * miscomputed, it was **unreachable as a floor**: the weekly sweep paid out
   * an order delivered yesterday, every Saturday.
   *
   * Three payout paths existed and ONE hold was intended; it was honoured by
   * zero of the three. The manual seller "Request payout"
   * (`seller-actions.ts`) had no time check either. Collapsing to a single
   * query is what makes the hold enforceable at all — a second entry point
   * with its own predicate is how this happened, so the fix is one query, not
   * a cutoff added to two.
   */


  /**
   * Cloud Functions: find auto-payout eligible delivered orders older than windowDays business days.
   * @param windowDays - number of business days since delivery
   * @param cutoff - pre-computed business-day cutoff date (computed by caller)
   *
   * See {@link getEligibleForPayoutSweep} for the EMI-incomplete exclusion rationale.
   */
  async getEligibleAutomatic(
    cutoff: Date,
    opts?: { onWarn?: (msg: string, meta?: Record<string, JsonValue>) => void },
  ): Promise<
    Array<{ id: string; ref: DocumentReference; data: OrderDocument }>
  > {
    /*
     * 🛑 NO DATE INEQUALITY IN THE QUERY, and this is the load-bearing
     * decision in the whole payout-hold fix. Both obvious shapes are wrong:
     *
     * (a) `.where(UPDATED_AT, "<=", cutoff)` — what this used to do (D29).
     *     `updatedAt` is bumped by EVERY write, so a note, an `assignWorker`,
     *     a `statusHistory` append or a tracking-number edit silently RESTARTS
     *     the hold. The clock measured "time since anyone last touched this
     *     order", not "time since delivery".
     *
     * (b) `.where(DELIVERY_DATE, "<=", cutoff)` — the obvious fix, and it
     *     would pay out NOBODY, FOREVER, SILENTLY. A Firestore inequality
     *     excludes every document that LACKS the field, and `deliveryDate`
     *     had no writer at all until 2026-10-21 — so every order delivered
     *     before today is missing it, the query returns zero rows, and
     *     "no eligible orders" is indistinguishable from a working sweep with
     *     nothing to do. That is Root Cause #100 exactly, which is the
     *     incident where `orderBy("itemsSold")` returned 0 of 95 products and
     *     the endpoint answered 200.
     *
     * So the query finds CANDIDATES on fields that certainly exist, bounded,
     * and the anchor test is a per-row predicate below. One query, no new
     * composite index, and no way to silently return nothing.
     */
    const snap = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.PAYOUT_STATUS, "==", "eligible")
      .where(ORDER_FIELDS.STATUS, "==", OrderStatusValues.DELIVERED)
      .limit(500)
      .get();

    let missingAnchor = 0;
    const rows = snap.docs
      .map((d) => ({
        id: d.id,
        ref: d.ref as DocumentReference,
        data: ({ id: d.id, ...d.data() } as OrderDocument),
      }))
      .filter((o) => !o.data.emiEnabled || o.data.emiComplete)
      .filter((o) => {
        /*
         * The anchor, with a conservative fallback. `deliveryDate` is the
         * truth; `updatedAt` is what every pre-2026-10-21 order has instead.
         *
         * Falling back is safe in the one direction that matters: `updatedAt`
         * is always >= `deliveryDate` (any write bumps it), so the fallback can
         * only ever WITHHOLD a payout longer than intended, never release one
         * early. Withholding is recoverable — the next sweep picks it up;
         * releasing early is not, because the money has gone.
         */
        /*
         * 🛑 A BUYER'S OWN CONFIRMATION RELEASES THE PAYOUT IMMEDIATELY.
         *
         * The owner's rule: an order is CONFIRMED when it is delivered and
         * either the buyer says they received it, or 7 days pass. This filter
         * only ever implemented the second half — `deliveryDate <= cutoff` —
         * so a buyer who pressed "Mark complete" on day one still made their
         * seller wait out the full hold. The fast path existed and bought the
         * seller nothing.
         *
         * Safe in the direction that matters, and not by luck:
         * `markOrderCompleteAction` is the only writer of `completedAt`, and it
         * REFUSES while a return in any state, a posted refund or a buyer
         * dispute is live — the same precondition the `order-complete`
         * obligation carries. So honouring it here cannot release money while
         * an issue is open; the hold is skipped only because the one party the
         * hold protects has said they are satisfied.
         */
        const completedAt = toDateOrNull(o.data.completedAt);
        if (completedAt) return true;

        const anchor = toDateOrNull(o.data.deliveryDate) ?? toDateOrNull(o.data.updatedAt);
        if (!o.data.deliveryDate) missingAnchor++;
        if (!anchor) return false;
        return anchor.getTime() <= cutoff.getTime();
      });

    if (missingAnchor > 0) {
      /*
       * Visible, because the fallback is a transitional state and not the
       * design. As orders delivered after 2026-10-21 flow through, this count
       * should trend to zero; if it does not, something is still setting
       * `delivered` by a path that bypasses `updateWithHistory`'s anchor
       * stamp, and these sellers are being paid late for no stated reason.
       */
      opts?.onWarn?.(
        `${missingAnchor} delivered order(s) have no deliveryDate — the payout hold fell back to updatedAt, which withholds longer than intended`,
        { missingAnchor, candidates: snap.size },
      );
    }
    return rows;
  }

  /**
   * Cloud Functions: EMI reminder sweep — orders on an active (not yet fully
   * paid) EMI plan. Per-installment due-date filtering happens in the job
   * itself since `emiInstallments` is an array field Firestore can't range-
   * query on.
   */
  async getActiveEmiOrders(): Promise<
    Array<{ id: string; ref: DocumentReference; data: OrderDocument }>
  > {
    const snap = await this.db
      .collection(this.collection)
      .where("emiEnabled", "==", true)
      .where("emiComplete", "==", false)
      .limit(500)
      .get();

    return snap.docs.map((d) => ({
      id: d.id,
      ref: d.ref as DocumentReference,
      data: ({ id: d.id, ...d.data() } as OrderDocument),
    }));
  }

  /**
   * Cloud Functions: stage a payout-requested update into a caller-owned WriteBatch.
   */
  markPayoutRequested(
    batch: WriteBatch,
    ref: DocumentReference,
    payoutId: string,
  ): void {
    batch.update(ref, {
      payoutStatus: "requested",
      payoutId,
      updatedAt: serverTimestamp(),
      ...this.batchHistoryPatch({
        changes: { payoutStatus: { from: "eligible", to: "requested" } },
        trigger: "orderRepository.markPayoutRequested",
      }),
    });
  }

  /**
   * Cloud Functions: stage a cancellation update into a caller-owned WriteBatch.
   *
   * `fromStatus` is supplied by the caller because a batch write does no read
   * — but the sweep that calls this already filtered on a status, so it knows
   * the value. Passing it beats recording `null` for something that is
   * genuinely known one stack frame up.
   */
  cancelInBatch(
    batch: WriteBatch,
    ref: DocumentReference,
    fromStatus: OrderStatus | null = null,
  ): void {
    batch.update(ref, {
      status: OrderStatusValues.CANCELLED,
      cancellationDate: new Date(),
      cancellationReason: "payment_timeout",
      updatedAt: serverTimestamp(),
      ...this.batchHistoryPatch({
        changes: { status: { from: fromStatus, to: OrderStatusValues.CANCELLED } },
        reason: "payment_timeout",
        trigger: "orderRepository.cancelInBatch",
      }),
    });
  }

  /**
   * History append for the two WriteBatch paths, which cannot read-then-diff.
   *
   * Uses `arrayUnion` so the entry lands without a prior read. The FIFO cap
   * therefore is NOT applied here — it is enforced on the next ordinary
   * write. That is an acceptable trade: both batch paths are terminal
   * transitions (cancelled, payout-requested) that fire at most once per
   * order, so they cannot be what overflows the array.
   */
  private batchHistoryPatch(input: {
    changes: Record<string, FieldChange>;
    trigger: string;
    reason?: string;
  }): FirestoreDocument {
    const entry = {
      at: new Date(),
      actorRole: "system" as const,
      changes: input.changes,
      trigger: input.trigger,
      ...(input.reason ? { reason: input.reason } : {}),
    };
    return { statusHistory: arrayUnion(entry) };
  }

}

const orderRepository = new OrderRepository();

export { OrderRepository, orderRepository };
