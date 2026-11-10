"use server";

/*
 * 🛑 From the DEFINING module, never "@mohasinac/appkit/server".
 *
 * appkit importing its own public server barrel is a self-reference that drags
 * the whole server surface in behind it — `dist/server.js` reaches next/og,
 * next/navigation, next/headers and driver.js. Twenty `actions.ts` files did
 * this for two symbols, and because `obligationSweep` reaches one of them, the
 * Firebase Functions tsup bundle (noExternal: appkit) had to resolve Next:
 * it failed on two `react-server-dom-webpack/*` requires and two @vercel/og
 * .wasm files, naming none of the responsible files. Root Cause #18.
 */
import { wrapAction, type ActionResult } from "../../../shared/types/action-result";
import { adminNotificationsRepository, orderRepository, storeRepository } from "../../../../repositories";
import { requireRoleUser, requireAuthUser } from "../../../../providers/auth-firebase/helpers";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  returnRequestSchema,
} from "../../../shared/features/orders/schema";
import { isFinalSaleExempt } from "../../../shared/features/orders/return-reasons";
import {
  DISPUTE_KIND_LABEL,
  checkDisputeGate,
  isDisputeKind,
  type DisputeKind,
} from "../../../shared/features/orders/dispute-reasons";
import { disputeReasonsRepository } from "../../../../features/dispute-reasons/repository/dispute-reasons.repository";
import { REFUND_COPY } from "../../../shared/features/orders/refund-copy";
import { assertOrderCancellable, assertReturnWindowOpen } from "./service";
import { cancelOrderWithRefund } from "./cancellation-refund";
import { ValidationError } from "../../../shared/errors/index";
import { OrderNotFoundError, OrderOwnershipError } from "../../../shared/features/orders/errors";
/*
 * ── Moderation is a PERMISSION here, not a role ──────────────────────────────
 *
 * These gates read `isAdminUser(user) || isModeratorUser(user)` until
 * 2026-11-08. Collapsing `moderator` into `employee` (A9) made the second half
 * true for EVERY employee, so the three payment-override actions below —
 * declare a manual payment received, extend a payment window, cancel an order
 * and enqueue a 7-day hard ban — widened to every employee account as a side
 * effect of a role rename.
 *
 * Owner's decision: keep the fold, gate the sites on an explicit permission.
 * So the question asked here is "does this user hold
 * `admin:orders:payment-override`?" — admin holds it unconditionally
 * (`permissionsFor` short-circuits), an employee holds it only if GRANTED, and
 * no role bundle confers it.
 *
 * ⚠ `canModerateServer` and not the synchronous `can()`: the per-person grant
 * lives in `permissions[]` on the user document and never reaches the session
 * cookie, so the sync form would deny a correctly configured employee.
 */
import { isAdminUser } from "../../../../features/auth/role-predicates";
import { canModerateServer } from "../auth/permissions";
import { AuthorizationError } from "../../../../errors";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { restoreStockForOrder } from "../checkout/stock-restore";
import { getAdminDb } from "../../../../providers/db-firebase";
import { enqueueJob } from "../../../../features/jobs/actions/enqueue-job";
import { PAYMENT_WINDOW_MS, PAYMENT_FRAUD_REJECTED_REASON } from "../../../../features/orders/constants/payment-window";
/*
 * The dispute cutoff is DERIVED from the `order-complete` policy, never read
 * off a stored flag — one definition of "7 days after delivery", shared with
 * the sweep that closes the window and with whatever page tells the buyer when
 * it closes.
 */
import { deadlinesFor } from "../../../shared/obligations/deadlines";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import { formatMoney } from "../../../../utils/number.formatter";

export async function createOrderAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      const parsed = createOrderSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid order input");
      return orderRepository.createOrder({
        ...(parsed.data as any),
        userId: user.uid,
        status: "pending",
      } as any);
  });
}

/**
 * Cancel an order, and give the money back if any was taken (D14).
 *
 * 🛑 `assertOrderCancellable` already RETURNS the order it validated, and this
 * threw that away and let `cancelOrder` fetch it again. Reusing it saves a read
 * on every cancellation and — more importantly — means the refund is decided
 * against the same document the ownership and dispatch checks ran on, rather
 * than against a re-read that could have moved in between.
 *
 * The response shape widened from the bare order to `{ order, refund }`. The
 * order alone could not express the thing a buyer most needs to know, which is
 * whether their money is coming back automatically or waiting on a human.
 */
export async function cancelOrderAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      const parsed = cancelOrderSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      const order = await assertOrderCancellable(parsed.data.orderId, user.uid);
      return cancelOrderWithRefund(order, {
        reason: parsed.data.reason ?? "Cancelled by user",
        actorUid: user.uid,
        actorRole: "buyer",
        trigger: "cancelOrderAction",
      });
  });
}

/**
 * Buyer requests a return on a delivered order.
 *
 * Two things this did not do before, both of which made the feature unusable:
 *
 *  1. it parsed `cancelOrderSchema` and then **discarded the reason**, so an
 *     order reached `return_requested` with nothing recorded about why;
 *  2. it had no caller anywhere — the whole path was unreachable.
 */
export async function requestReturnAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
      const parsed = returnRequestSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      const { orderId, reasonCode, reasonNote, itemIds } = parsed.data;

      // Ownership + the 7-day post-delivery window.
      await assertReturnWindowOpen(orderId, user.uid);

      /*
       * The final-sale gate, in the same shape as `processRefundAction`'s.
       * Both entry points need it: this one is where the buyer asks, that one
       * is where the money moves, and a buyer must not be able to lodge a
       * request that is guaranteed to be refused at the second gate.
       *
       * Read from the order's per-line snapshot, never the live product.
       */
      if (!isFinalSaleExempt(reasonCode)) {
        const order = await orderRepository.findById(orderId);
        if (!order) throw new OrderNotFoundError(orderId);
        const scopedItems = itemIds?.length
          ? (order.items ?? []).filter((i) => itemIds.includes(i.productId))
          : (order.items ?? []);
        if (scopedItems.some((i) => i.finalSale === true)) {
          throw new ValidationError(REFUND_COPY.request.finalSaleBlockedMessage);
        }
      }

      /*
       * Record the reason BEFORE flipping the status. A status change is what
       * every notification and dashboard query keys on, so a seller reading
       * the row the moment it lands must already find the reason on it.
       */
      await orderRepository.update(orderId, {
        returnReasonCode: reasonCode,
        ...(reasonNote ? { returnReasonNote: reasonNote } : {}),
        returnRequestedAt: new Date(),
        ...(itemIds?.length ? { returnRequestedItemIds: itemIds } : {}),
      } as any);

      return orderRepository.updateStatus(orderId, "return_requested" as any);
  });
}

export async function updateOrderStatusAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["seller", "admin"]);
      const parsed = updateOrderStatusSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      const order = await orderRepository.findById(parsed.data.orderId);
      if (!order) throw new OrderNotFoundError(parsed.data.orderId);
      if (!isAdminUser(user) && order.storeId !== user.uid) {
        throw new OrderOwnershipError(parsed.data.orderId);
      }
      return orderRepository.updateStatus(parsed.data.orderId, parsed.data.status as any, {
        trackingNumber: parsed.data.trackingNumber,
        shippingCarrier: parsed.data.carrier,
      } as any);
  });
}

// ── P-1 Manual payment proof ─────────────────────────────────────────────────

/** Loose UPI VPA comparison — case/whitespace differences shouldn't register as a mismatch. */
function normalizeUpi(vpa: string | undefined): string {
  return (vpa ?? "").trim().toLowerCase();
}

const REASON_REQUIRED_MSG = "A reason is required";

/**
 * Tier PP — raises a dispute on an auto-approved order ("the automation
 * might be wrong"). Only valid when `autoApproved === true` — a manually
 * reviewed order already went through human judgment and disputes on it go
 * through the existing return/refund flow instead. Callable by the buyer,
 * the seller (store owner), or staff holding `admin:orders:write`. Does not
 * itself reverse payment/order status — surfaces to the admin queue for
 * investigation.
 */
export async function raiseOrderDisputeAction(
  orderId: string,
  input: {
    kind: DisputeKind;
    /** `disputeReasons/{id}` — must exist and must match `kind`. */
    reasonId: string;
    /** The buyer's own words. Optional; the reason is the required part. */
    detail?: string;
  },
): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    /*
     * `requireAuthUser`, not `requireRoleUser([...])`. The tuple here listed
     * user/buyer/seller/admin and matched the scalar `role` claim, so an
     * employee granted `admin:orders:write` was refused before the real gate
     * below ever ran — a half-converted gate in the worst direction. Who may
     * act is decided by ownership-or-permission a few lines down, which is the
     * one place that should know.
     */
    const user = await requireAuthUser();
    if (!isDisputeKind(input.kind)) throw new ValidationError("Pick what kind of problem this is.");
    if (!input.reasonId?.trim()) throw new ValidationError(REASON_REQUIRED_MSG);
    const order = await orderRepository.findById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);

    const isBuyer = order.userId === user.uid;
    /*
     * ── Ownership first, permission second — and exactly ONCE ───────────────
     *
     * Was `!isAdminUser(user) && !isModeratorUser(user)` evaluated twice, with
     * the moderator half now true for every employee. It is a permission
     * question (`admin:orders:write` — act on an order you neither bought nor
     * sold), and the answer needs a document read, so it is computed once and
     * ONLY when ownership has already failed: a buyer disputing their own
     * order must not pay a Firestore round-trip to be allowed (Rule #6).
     */
    const isStaff = isBuyer
      ? false
      : await canModerateServer(user.uid, "orders:act-on-any");
    let isSeller = false;
    if (!isBuyer && !isStaff && order.storeId) {
      const store = await storeRepository.findById(order.storeId);
      isSeller = store?.ownerId === user.uid;
    }
    if (!isBuyer && !isSeller && !isStaff) {
      throw new OrderOwnershipError(orderId);
    }
    /*
     * 🛑 THE `autoApproved` RESTRICTION IS GONE, and that is the one
     * behaviour change an existing path will notice.
     *
     * It used to refuse every order whose payment was not auto-approved,
     * telling the caller to use the return/refund flow — which made this a
     * narrow "the 2-hour auto-approval might have been wrong" escalation
     * rather than a dispute mechanism. The owner's rules are about delivery
     * and item problems on ANY order, so the scope had to widen.
     *
     * What replaces it is a REAL gate per kind, below: the old check refused
     * 99% of orders for a reason unrelated to the complaint, while accepting
     * "it never arrived" on an order delivered last week.
     */
    if (order.disputeStatus === "open") return; // idempotent

    /*
     * The reason must exist AND belong to the kind being claimed.
     *
     * 🛑 Both halves matter. Without the kind check a caller could pass an
     * `item` reason with `kind: "not_reached"` and pass the wrong gate — the
     * kind is what the gate keys on, so an unvalidated pairing is the gate
     * being bypassed by the request body.
     */
    const reasonDoc = await disputeReasonsRepository.findById(input.reasonId.trim());
    if (!reasonDoc || !reasonDoc.isActive) {
      throw new ValidationError("That reason is no longer available. Pick another.");
    }
    if (reasonDoc.kind !== input.kind) {
      throw new ValidationError("That reason doesn't match the kind of problem selected.");
    }

    /*
     * ── THE GATES ─────────────────────────────────────────────────────────
     *
     * Owner's rules: an item dispute only after the order was received; a
     * "not reached" dispute only once the ETD is more than 3 days past.
     *
     * Enforced HERE, where the request arrives, for the same reason the
     * 7-day cutoff below is: a refusal has to live where the refusing
     * happens. The message is buyer-facing and names the next action.
     */
    const gate = checkDisputeGate(input.kind, order);
    if (!gate.allowed) throw new ValidationError(gate.message);

    /*
     * ── THE DISPUTE CUTOFF ────────────────────────────────────────────────
     *
     * Owner's rule, 2026-10-21: *"after 7 days of delivery no further disputes
     * should be entertained."*
     *
     * 🛑 Enforced here, at the one place a dispute is RAISED, rather than in
     * the sweep — because a cutoff is a refusal, and a refusal has to live
     * where the request arrives. The `order-complete` obligation firing records
     * that the window shut; this is what makes the record mean something.
     *
     * 🛑 It closes the door to NEW disputes ONLY. An existing dispute, an
     * in-flight return, or a refund already posted are all untouched — the
     * `order-complete` precondition refuses to fire while any of those is live,
     * so by construction this cutoff can only exist on an order where nothing
     * was ever contested. Reading the rule as "everything closes at 7 days"
     * would cancel a return the buyer raised on day 6, which is the opposite of
     * what a dispute window is for.
     *
     * Derived from `deliveryDate` rather than read off a stored flag, for the
     * same reason every other deadline here is derived: a stored
     * `disputeWindowClosed` boolean would need a backfill and would drift from
     * the policy the day the duration changed (Root Cause #42).
     */
    /*
     * 🛑 This correctly does NOT apply to a `not_reached` dispute, and that is
     * not an oversight to "fix".
     *
     * `order-complete` is anchored on `deliveryDate`, so `deadlinesFor` yields
     * no such deadline when nothing was delivered — and you cannot be past a
     * delivery window that never happened. Making the cutoff refuse
     * undelivered parcels would block exactly the buyers whose parcel is lost,
     * which is the opposite of what a dispute window is for.
     */
    const completion = deadlinesFor(order).find((d) => d.kind === "order-complete");
    if (completion && completion.dueAt.getTime() <= Date.now()) {
      throw new ValidationError(
        `The dispute window for this order closed on ${completion.dueAt.toLocaleDateString("en-IN")} — 7 days after delivery. Contact support if you believe this is wrong.`,
      );
    }

    /*
     * No `as any`. Every field below is declared on `OrderDocument`, and the
     * cast that used to be here is precisely how a misspelled field reaches
     * Firestore unnoticed — it silences the check on all six at once.
     *
     * 🛑 `disputeReason` stores the reason's LABEL, not its id. It is a
     * SNAPSHOT: staff can retire or reword a `disputeReasons` row, and neither
     * may rewrite what a buyer said months ago. `disputeReasonId` beside it is
     * the join key for "what are buyers reporting"; the label is the record.
     * Same discipline as the fee terms and the box presets.
     */
    await orderRepository.update(orderId, {
      disputeRaised: true,
      disputeRaisedBy: user.uid,
      disputeRaisedAt: new Date(),
      disputeKind: input.kind,
      disputeReasonId: reasonDoc.id,
      disputeReason: reasonDoc.label,
      ...(input.detail?.trim() ? { disputeDetail: input.detail.trim() } : {}),
      disputeStatus: "open",
    });

    /*
     * One admin-inbox row, not one notification per admin.
     *
     * 🛑 This was `Promise.allSettled` over `userRepository.findByRole("admin")`
     * sending `payment_review` — an email-ELIGIBLE type — so a single disputed
     * order cost one email per admin, concurrently. Same defect as the
     * scam-report employee blast (removed in the same change), and the comment
     * on that one said it was copying this pattern.
     *
     * `adminNotifications` is durable, appears in the admin inbox, is counted
     * in the daily digest, and costs exactly one write regardless of how many
     * admins exist.
     */
    await adminNotificationsRepository
      .create({
        category: "fraud",
        /*
         * 🛑 No longer "on auto-approved order". The title said that because
         * the action refused everything else; now any order can be disputed,
         * and a title naming a payment path the dispute has nothing to do with
         * would send an operator looking in the wrong place.
         */
        title: `Dispute raised: ${DISPUTE_KIND_LABEL[input.kind]}`,
        body: `A dispute was raised on order "${order.productTitle}". Reason: ${reasonDoc.label}.${
          input.detail?.trim() ? ` Buyer said: "${input.detail.trim()}"` : ""
        }`,
        severity: "error",
        isRead: false,
        entityType: "order",
        entityId: orderId,
        audienceUserIds: [],
      })
      .catch((err: unknown) => {
        void normalizeError(err);
        serverLogger.error("Failed to write dispute admin notification (non-fatal)", { orderId });
      });
  });
}

/*
 * 🛑 `submitEmiInstallmentPaymentAction` removed with EMI stage 5 — the plan
 * named it explicitly. It read `emiEnabled`/`emiInstallments` off
 * `OrderDocument`, both deleted.
 */

