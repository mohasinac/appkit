/**
 * Payout Repository
 *
 * Data access layer for payout documents in Firestore.
 * Handles seller payout requests and admin payout processing.
 */

import {
  BaseRepository,
  prepareForFirestore,
  type SieveModel,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import type { DocumentReference, WriteResult } from "firebase-admin/firestore";
import type {
  PayoutDocument,
  PayoutCreateInput,
  PayoutRefundDeduction,
  PayoutStatus,
  PayoutUpdateInput,
} from "../schemas";
import { PAYOUT_COLLECTION, PAYOUT_FIELDS, createPayoutId } from "../schemas";
import {
  encryptPiiFields,
  decryptPiiFields,
  addPiiIndices,
  PAYOUT_PII_FIELDS,
  PAYOUT_PII_INDEX_MAP,
  encryptPayoutBankAccount,
  decryptPayoutBankAccount,
} from "../../../security";

export class PayoutRepository extends BaseRepository<PayoutDocument> {
  constructor() {
    super(PAYOUT_COLLECTION);
  }

  /** Decrypt PII fields on a payout document after Firestore read */
  private decryptPayout(doc: PayoutDocument): PayoutDocument {
    const decrypted = decryptPiiFields(
      doc,
      [...PAYOUT_PII_FIELDS],
    ) as unknown as PayoutDocument;
    if (decrypted.bankAccount) {
      decrypted.bankAccount = decryptPayoutBankAccount(
        decrypted.bankAccount,
      ) as unknown as typeof decrypted.bankAccount;
    }
    return decrypted;
  }

  /** Encrypt PII fields on payout data before Firestore write */
  private encryptPayoutData<T extends object>(data: T): T {
    let encrypted = encryptPiiFields(data, [...PAYOUT_PII_FIELDS]);
    encrypted = addPiiIndices(data, PAYOUT_PII_INDEX_MAP) as T;
    encrypted = {
      ...encryptPiiFields(data, [...PAYOUT_PII_FIELDS]),
      ...encrypted,
    };
    const access = encrypted as { bankAccount?: object | null };
    if (access.bankAccount) {
      access.bankAccount = encryptPayoutBankAccount(access.bankAccount);
    }
    return encrypted;
  }

  /** Override mapDoc to auto-decrypt PII on every Firestore read */
  protected override mapDoc<D = PayoutDocument>(
    snap: import("../../../providers/db-firebase").DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<PayoutDocument>(snap);
    return this.decryptPayout(raw) as unknown as D;
  }

  /**
   * Create a new payout request
   */
  async create(input: PayoutCreateInput): Promise<PayoutDocument> {
    const now = new Date();
    const id = createPayoutId({ sellerName: input.sellerName, date: now });

    const data: Omit<PayoutDocument, "id"> = {
      ...input,
      status: "pending",
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // Encrypt PII before persisting
    const encrypted = this.encryptPayoutData(
      data,
    );

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    return { id, ...data }; // return plaintext to caller
  }

  /** Override base update to preserve encryption/indexing for changed PII fields. */
  override async update(
    payoutId: string,
    data: Partial<PayoutDocument>,
  ): Promise<PayoutDocument> {
    const encrypted = this.encryptPayoutData(
      data,
    );
    return super.update(payoutId, encrypted as Partial<PayoutDocument>);
  }

  /**
   * Find all payouts for a specific seller, newest first
   */
  async findByStore(storeId: string): Promise<PayoutDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(PAYOUT_FIELDS.STORE_ID, "==", storeId)
      .orderBy(PAYOUT_FIELDS.CREATED_AT, "desc")
      .get();

    return snapshot.docs.map((doc) =>
      this.decryptPayout({
        id: doc.id,
        ...doc.data(),
      } as PayoutDocument),
    );
  }

  /**
   * Find payouts for a seller by status, newest first
   */
  async findByStoreAndStatus(
    storeId: string,
    status: PayoutStatus,
  ): Promise<PayoutDocument[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(PAYOUT_FIELDS.STORE_ID, "==", storeId)
      .where(PAYOUT_FIELDS.STATUS, "==", status)
      .orderBy(PAYOUT_FIELDS.CREATED_AT, "desc")
      .get();

    return snapshot.docs.map((doc) =>
      this.decryptPayout({
        id: doc.id,
        ...doc.data(),
      } as PayoutDocument),
    );
  }

  /**
   * Find payouts by status
   */
  async findByStatus(status: PayoutStatus): Promise<PayoutDocument[]> {
    return this.findBy(PAYOUT_FIELDS.STATUS, status);
  }

  /**
   * Find all pending payouts across all sellers (for admin processing)
   */
  async findPending(): Promise<PayoutDocument[]> {
    return this.findByStatus("pending");
  }

  /**
   * Cloud Functions compatibility: pending payouts with refs.
   */
  async getPending(): Promise<
    Array<{ id: string; ref: DocumentReference; data: PayoutDocument }>
  > {
    const snapshot = await this.db
      .collection(this.collection)
      .where(PAYOUT_FIELDS.STATUS, "==", "pending")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ref: doc.ref,
      data: this.mapDoc<PayoutDocument>(doc),
    }));
  }

  /**
   * Update payout status (admin action)
   */
  async updateStatus(
    payoutId: string,
    status: PayoutStatus,
    extra?: PayoutUpdateInput,
  ): Promise<PayoutDocument> {
    return this.update(payoutId, {
      status,
      ...extra,
      ...(status === PAYOUT_FIELDS.STATUS_VALUES.COMPLETED ||
      status === PAYOUT_FIELDS.STATUS_VALUES.FAILED
        ? { processedAt: new Date() }
        : {}),
      updatedAt: new Date(),
    });
  }

  markProcessing(ref: DocumentReference): Promise<WriteResult> {
    return ref.update({
      status: "processing",
      processedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  recordSuccess(
    ref: DocumentReference,
    razorpayPayoutId: string,
    razorpayStatus: string,
  ): Promise<WriteResult> {
    return ref.update({
      razorpayPayoutId,
      razorpayStatus,
      updatedAt: new Date(),
    });
  }

  recordFailure(
    ref: DocumentReference,
    failureCount: number,
    reason: string,
    isFinal: boolean,
  ): Promise<WriteResult> {
    return ref.update({
      status: isFinal ? "failed" : "pending",
      failureCount,
      lastFailureReason: reason,
      updatedAt: new Date(),
    });
  }

  /**
   * Get all order IDs that have already been paid out for a seller.
   * Used to avoid double-paying the same orders.
   */
  async getPaidOutOrderIds(storeId: string): Promise<Set<string>> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(PAYOUT_FIELDS.STORE_ID, "==", storeId)
      .where(PAYOUT_FIELDS.STATUS, "in", ["pending", "processing", "completed"])
      .get();

    const ids = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as PayoutDocument;
      (data.orderIds ?? []).forEach((oid) => ids.add(oid));
    });
    return ids;
  }

  /**
   * Find the most recent pending payout for a store.
   * Used to locate the deduction target when a refund is issued.
   */
  async findPendingByStore(storeId: string): Promise<PayoutDocument | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(PAYOUT_FIELDS.STORE_ID, "==", storeId)
      .where(PAYOUT_FIELDS.STATUS, "==", "pending")
      .orderBy(PAYOUT_FIELDS.CREATED_AT, "desc")
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return this.decryptPayout({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PayoutDocument);
  }

  /**
   * Atomically append a refund deduction and recalculate netAmount.
   *
   * Only valid while status = "pending". Throws if the payout is not found
   * or is no longer pending. netAmount is floored at 0.
   */
  async applyRefundDeduction(
    payoutId: string,
    deduction: Omit<PayoutRefundDeduction, "appliedAt">,
  ): Promise<PayoutDocument> {
    const ref = this.db.collection(this.collection).doc(payoutId);
    const entry: PayoutRefundDeduction = { ...deduction, appliedAt: new Date() };

    const updated = await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error(`Payout ${payoutId} not found`);
      const doc = { id: snap.id, ...snap.data() } as PayoutDocument;
      if (doc.status !== "pending") {
        throw new Error(`Cannot deduct from payout ${payoutId} in status "${doc.status}"`);
      }
      const existing = doc.refundDeductions ?? [];
      const newDeductions = [...existing, entry];
      const totalDeducted = newDeductions.reduce((s, d) => s + d.deductedAmount, 0);
      const netAmount = Math.max(0, doc.amount - totalDeducted);
      tx.update(ref, {
        refundDeductions: newDeductions.map((d) => prepareForFirestore(d)),
        netAmount,
        updatedAt: new Date(),
      });
      return { ...doc, refundDeductions: newDeductions, netAmount, updatedAt: new Date() };
    });

    return this.decryptPayout(updated);
  }

  // ---------------------------------------------------------------------------
  // Sieve-powered list query
  // ---------------------------------------------------------------------------

  static readonly SIEVE_FIELDS = {
    id: { canFilter: true, canSort: false },
    storeId: { canFilter: true, canSort: false },
    sellerEmailIndex: { canFilter: true, canSort: false },
    sellerName: { canFilter: true, canSort: true },
    sellerEmail: { canFilter: false, canSort: false }, // encrypted — use sellerEmailIndex
    status: { canFilter: true, canSort: true },
    paymentMethod: { canFilter: true, canSort: false },
    amount: { canFilter: true, canSort: true },
    netAmount: { canFilter: true, canSort: true },
    requestedAt: { canFilter: true, canSort: true },
    createdAt: { canFilter: true, canSort: true },
    processedAt: { canFilter: true, canSort: true },
  };

  /**
   * Paginated, Firestore-native payout list (admin use).
   */
  async list(model: SieveModel): Promise<FirebaseSieveResult<PayoutDocument>> {
    return this.sieveQuery<PayoutDocument>(
      model,
      PayoutRepository.SIEVE_FIELDS,
      {
        defaultPageSize: 50,
        maxPageSize: 200,
      },
    );
  }
}

// Export singleton instance
export const payoutRepository = new PayoutRepository();
