import { normalizeError } from "../../../errors/normalize";

import type { DocumentReference, WriteBatch } from "firebase-admin/firestore";
import { DatabaseError, NotFoundError } from "../../../errors";
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
  decryptPiiFields,
  encryptPiiFields,
  ORDER_PII_FIELDS,
} from "../../../security";
import { serverTimestamp } from "../../../contracts/field-ops";
import {
  createOrderId,
  ORDER_COLLECTION,
  OrderStatusValues,
  type OrderCreateInput,
  type OrderDocument,
  type OrderRefundEvent,
} from "../schemas";
import type { OrderStatus, PaymentStatus } from "../types";
import {
  MANUAL_PAYMENT_METHODS,
  PAYMENT_REVIEW_QUEUE_SCAN_LIMIT,
  type PaymentReviewQueueMode,
} from "../constants/payment-window";
import { ORDER_FIELDS } from "../../../constants/field-names";

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

class OrderRepository extends BaseRepository<OrderDocument> {
  constructor() {
    super(ORDER_COLLECTION);
  }

  private decryptOrder(doc: OrderDocument): OrderDocument {
    return decryptPiiFields(doc, [
      ...ORDER_PII_FIELDS,
    ]) as unknown as OrderDocument;
  }

  private encryptOrderData<T extends object>(data: T): T {
    return encryptPiiFields(data, [...ORDER_PII_FIELDS]);
  }

  protected override mapDoc<D = OrderDocument>(
    snap: import("../../../providers/db-firebase").DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<OrderDocument>(snap);
    return this.decryptOrder(raw) as unknown as D;
  }

  override async create(input: OrderCreateInput): Promise<OrderDocument> {
    const orderDate = new Date();
    const id = createOrderId(input.quantity, orderDate);

    const orderData: Omit<OrderDocument, "id"> = {
      ...input,
      orderDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const encrypted = this.encryptOrderData(
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

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    additionalData?: Partial<OrderDocument>,
  ): Promise<OrderDocument> {
    return this.update(orderId, {
      status,
      ...additionalData,
      updatedAt: new Date(),
    });
  }

  async assignWorker(orderId: string, workerId: string): Promise<OrderDocument> {
    return this.update(orderId, { assignedWorkerId: workerId, updatedAt: new Date() });
  }

  async unassignWorker(orderId: string): Promise<OrderDocument> {
    return this.update(orderId, { assignedWorkerId: undefined, updatedAt: new Date() });
  }

  async markPicked(orderId: string): Promise<OrderDocument> {
    const order = await this.findById(orderId);
    if (!order) throw new NotFoundError(`Order ${orderId} not found`);
    const nextStatus =
      order.status === "confirmed" ? ("processing" as OrderStatus) : (order.status as OrderStatus);
    return this.update(orderId, { pickedAt: new Date(), status: nextStatus, updatedAt: new Date() });
  }

  async markPacked(orderId: string): Promise<OrderDocument> {
    return this.update(orderId, { packedAt: new Date(), updatedAt: new Date() });
  }

  /**
   * Payment Detail Parity (Feature C) — the COD counterpart to the manual
   * proof-upload / Razorpay-webhook write paths. Seller or admin confirms
   * the cash was physically collected; there is no external gateway to
   * verify against, so `verifiedBy` is the acting user's uid and
   * `verificationMethod` is always "cod_collection".
   */
  async markCodCollected(
    orderId: string,
    verifiedBy: string,
    note?: string,
  ): Promise<OrderDocument> {
    const order = await this.findById(orderId);
    if (!order) throw new NotFoundError(`Order ${orderId} not found`);
    return this.update(orderId, {
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
    });
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
      this.decryptOrder({ id: doc.id, ...doc.data() } as OrderDocument),
    );
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentId?: string,
  ): Promise<OrderDocument> {
    return this.update(orderId, {
      paymentStatus,
      ...(paymentId ? { paymentId } : {}),
      updatedAt: new Date(),
    });
  }

  async cancelOrder(
    orderId: string,
    reason: string,
    refundAmount?: number,
  ): Promise<OrderDocument> {
    return this.update(orderId, {
      status: "cancelled",
      cancellationDate: new Date(),
      cancellationReason: reason,
      ...(refundAmount ? { refundAmount, refundStatus: "pending" } : {}),
      updatedAt: new Date(),
    });
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
      this.decryptOrder({
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
    // Fulfilment flags. Filterable so "which of my orders need gift wrap?" is a
    // query against the orders themselves — the whole point of recording the
    // add-on on the order rather than keeping a side list of who asked for what.
    whatsappNotifyAddon: { canFilter: true, canSort: false },
    giftWrapAddon: { canFilter: true, canSort: false },
    shipmentProtectionAddon: { canFilter: true, canSort: false },
    couponCode: { canFilter: true, canSort: false },
  };

  async listForSeller(
    productIds: string[],
    model: SieveModel,
  ): Promise<FirebaseSieveResult<OrderDocument>> {
    if (productIds.length === 0) {
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

    const baseQuery = this.getCollection().where(
      ORDER_FIELDS.PRODUCT_ID,
      "in",
      productIds,
    );
    return this.sieveQuery<OrderDocument>(
      model,
      OrderRepository.SELLER_SIEVE_FIELDS,
      {
        baseQuery,
        defaultPageSize: 20,
        maxPageSize: 100,
      },
    );
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
    whatsappNotifyAddon: { canFilter: true, canSort: false },
    giftWrapAddon: { canFilter: true, canSort: false },
    shipmentProtectionAddon: { canFilter: true, canSort: false },
    couponCode: { canFilter: true, canSort: false },
  };

  async listAll(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<OrderDocument>> {
    return this.sieveQuery<OrderDocument>(
      model,
      OrderRepository.ADMIN_SIEVE_FIELDS,
      {
        defaultPageSize: 50,
        maxPageSize: 200,
      },
    );
  }

  /**
   * Append one refund event to the order and mark it non-contestable.
   * If `becomeRefunded` is true, also transitions the order status to "refunded".
   */
  async postRefundEvent(
    orderId: string,
    event: OrderRefundEvent,
    becomeRefunded = false,
  ): Promise<OrderDocument> {
    const order = await this.findById(orderId);
    if (!order) throw new NotFoundError(`Order ${orderId} not found`);

    const existing = order.refunds ?? [];
    return this.update(orderId, {
      refunds: [...existing, event],
      contestable: false,
      ...(becomeRefunded ? { status: "refunded" as OrderStatus } : {}),
      updatedAt: new Date(),
    });
  }

  /** Fetch all orders sharing a paymentBatchId (for sibling-orders display). */
  async findByPaymentBatchId(batchId: string): Promise<OrderDocument[]> {
    const snap = await this.db
      .collection(this.collection)
      .where("paymentBatchId", "==", batchId)
      .limit(20)
      .get();
    return snap.docs.map((d) => this.decryptOrder({ id: d.id, ...d.data() } as OrderDocument));
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
      data: this.decryptOrder({ id: d.id, ...d.data() } as OrderDocument),
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
        data: this.decryptOrder({ id: d.id, ...d.data() } as OrderDocument),
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
        data: this.decryptOrder({ id: d.id, ...d.data() } as OrderDocument),
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
      .map((d) => this.decryptOrder({ id: d.id, ...d.data() } as OrderDocument))
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
  async getEligibleForPayoutSweep(): Promise<
    Array<{ id: string; ref: DocumentReference; data: OrderDocument }>
  > {
    const snap = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.PAYOUT_STATUS, "==", "eligible")
      .where(ORDER_FIELDS.STATUS, "==", OrderStatusValues.DELIVERED)
      .limit(500)
      .get();

    return snap.docs
      .map((d) => ({
        id: d.id,
        ref: d.ref as DocumentReference,
        data: this.decryptOrder({ id: d.id, ...d.data() } as OrderDocument),
      }))
      .filter((o) => !o.data.emiEnabled || o.data.emiComplete);
  }

  /**
   * Cloud Functions: find auto-payout eligible delivered orders older than windowDays business days.
   * @param windowDays - number of business days since delivery
   * @param cutoff - pre-computed business-day cutoff date (computed by caller)
   *
   * See {@link getEligibleForPayoutSweep} for the EMI-incomplete exclusion rationale.
   */
  async getEligibleAutomatic(
    cutoff: Date,
  ): Promise<
    Array<{ id: string; ref: DocumentReference; data: OrderDocument }>
  > {
    const snap = await this.db
      .collection(this.collection)
      .where(ORDER_FIELDS.PAYOUT_STATUS, "==", "eligible")
      .where(ORDER_FIELDS.STATUS, "==", OrderStatusValues.DELIVERED)
      .where(ORDER_FIELDS.UPDATED_AT, "<=", cutoff)
      .limit(500)
      .get();

    return snap.docs
      .map((d) => ({
        id: d.id,
        ref: d.ref as DocumentReference,
        data: this.decryptOrder({ id: d.id, ...d.data() } as OrderDocument),
      }))
      .filter((o) => !o.data.emiEnabled || o.data.emiComplete);
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
      data: this.decryptOrder({ id: d.id, ...d.data() } as OrderDocument),
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
    });
  }

  /**
   * Cloud Functions: stage a cancellation update into a caller-owned WriteBatch.
   */
  cancelInBatch(batch: WriteBatch, ref: DocumentReference): void {
    batch.update(ref, {
      status: OrderStatusValues.CANCELLED,
      cancellationDate: new Date(),
      cancellationReason: "payment_timeout",
      updatedAt: serverTimestamp(),
    });
  }

}

const orderRepository = new OrderRepository();

export { OrderRepository, orderRepository };
