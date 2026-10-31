/**
 * Payout Repository
 *
 * Data access layer for payout documents in Firestore.
 * Handles seller payout requests and admin payout processing.
 */

import { buildTokensIndex } from "../../../security/blind-index-tokens";
import type { JsonValue } from "../../../schemas/types";
import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
  type SieveModel,
  type FirebaseSieveResult,
} from "../../../providers/db-firebase";
import type { DocumentReference } from "firebase-admin/firestore";
import type {
  PayoutDocument,
  PayoutPlain,
  PayoutCreateInput,
  PayoutRefundDeduction,
  PayoutStatus,
  PayoutUpdateInput,
} from "../schemas";
import { PAYOUT_COLLECTION, PAYOUT_FIELDS, PAYOUT_TRACKED_FIELDS, createPayoutId } from "../schemas";
import { withHistory, type HistoryActor } from "../../../_internal/shared/history/index";
import type { FirestoreDocument } from "../../../schemas/types";

import {
  maskPii,
  revealPii,
  PAYOUT_PII_FIELDS,
  PAYOUT_PII_INDEX_MAP,
} from "../../../security";

/**
 * What ONE vendor was instructed to be settled out of one capture.
 *
 * Read back by the settle path from the `payouts` row the capture wrote, so the
 * order records the amount that was actually instructed rather than one
 * recomputed from a cart that may have changed in between.
 */
export interface SplitSettlementRecord {
  /** The gateway's vendor id — i.e. the store slug. */
  vendorId: string;
  /** Decimal rupees instructed to that vendor. */
  amount: number;
  /** The adapter that collected and split. Empty only on a row written before this field existed. */
  gateway: string;
  /** The payout row's own `requestedAt` — when the instruction was written. Never fabricated. */
  instructedAt: Date;
}

/** Who/why for a payout write that lands in `statusHistory`. */
export interface PayoutWriteContext {
  actor?: HistoryActor;
  trigger?: string;
  reason?: string;
  note?: string;
}

export class PayoutRepository extends BaseRepository<PayoutDocument> {
  constructor() {
    super(PAYOUT_COLLECTION);
  }

  /** Decrypt PII fields on a payout document after Firestore read */
  /*
   * 🛑 `mapDoc` no longer decrypts — reads return what Firestore holds.
   *
   * `bankAccount` is handled here rather than by `revealPii`, because it is
   * encrypted by its OWN scheme (`decryptPayoutBankAccount`) and not by the
   * `PAYOUT_PII_FIELDS` path list. A named accessor that silently skipped it
   * would hand a caller an account number it could not read, which is worse
   * than refusing: the value looks present.
   */

  /**
   * Plaintext PII. **Opt-in and named** — for the payout run that has to
   * actually pay someone, and for the remittance email.
   */
  revealPayout(doc: PayoutDocument): PayoutPlain {
    // `bankAccount` needs no unwrap: its four members are masked or public
    // bank identifiers, never encrypted. See the tombstone in pii-encrypt.ts.
    return revealPii<PayoutPlain>(doc, PAYOUT_PII_FIELDS);
  }

  /** As `revealPayout`, for a list read. */
  revealPayouts(docs: readonly PayoutDocument[]): PayoutPlain[] {
    return docs.map((d) => this.revealPayout(d));
  }

  /**
   * Masked PII — **the default for the admin and seller payout lists**, which
   * need to identify a payee rather than pay them.
   *
   * `bankAccount.accountHolderName` is masked too — it is a person's name, and
   * a payout list only needs to identify the payee. The other three members
   * (`accountNumberMasked`, `ifscCode`, `bankName`) are already non-revealing,
   * so they pass through: masking a bank name would make the row useless
   * without protecting anything.
   */
  maskedPayout(doc: PayoutDocument): PayoutPlain {
    const masked = maskPii<PayoutPlain>(doc, PAYOUT_PII_FIELDS);
    if (masked.bankAccount) {
      masked.bankAccount = maskPii<NonNullable<PayoutPlain["bankAccount"]>>(
        masked.bankAccount,
        ["accountHolderName"],
      );
    }
    return masked;
  }

  /** As `maskedPayout`, for a list read. */
  maskedPayouts(docs: readonly PayoutDocument[]): PayoutPlain[] {
    return docs.map((d) => this.maskedPayout(d));
  }

  /**
   * Declared, not hand-rolled.
   *
   * `BaseRepository.applyWriteHooks` already does exactly what the private
   * `encryptPayoutData` did — encrypt the listed fields, then add the mapped blind
   * indices derived from the PLAINTEXT source. Declaring the fields means all
   * nine mutating methods get it, including the `createWithId` / `*InTx` /
   * `*InBatch` family that inherited unhooked base implementations while the
   * encryption lived in a private method only three call sites remembered to
   * call.
   */
  protected override piiFields = PAYOUT_PII_FIELDS;
  protected override piiIndexMap = PAYOUT_PII_INDEX_MAP;

  /**
   * Admin search by seller name/email, without decryption.
   *
   * 🛑 THIS IS THE ONE THAT MATTERS FOR THE TESTER HARNESS. `payouts` is
   * SEED_TRANSACTIONAL: it cascades on `storeId` whenever its store is
   * wiped, then gets RE-SEEDED from `appkit/src/seed/payouts-seed-data.ts`.
   * The seed file has no `sellerTokensIndex` field — only this hook produces
   * one — so a one-shot backfill script would have been silently undone by
   * the very next tester run. Routing through `applyWriteHooks` means the
   * reseed writes through `createWithId`, which calls this hook, which
   * regenerates the index — so the field is never actually "missing after a
   * wipe", because the wipe is always followed by the write that restores it.
   */
  protected override buildTokensIndexFor(
    data: Record<string, JsonValue>,
  ): Record<string, string[]> | null {
    const sellerName = typeof data.sellerName === "string" ? data.sellerName : undefined;
    const sellerEmail = typeof data.sellerEmail === "string" ? data.sellerEmail : undefined;
    if (!sellerName && !sellerEmail) return null;
    return { sellerTokensIndex: buildTokensIndex(sellerName, sellerEmail) };
  }

  /**
   * The base hook, plus the nested objects it cannot see.
   *
   * `piiFields` is a flat list of top-level names, so a nested blob has to be
   * encrypted separately. Calling `super.applyWriteHooks` FIRST keeps a single
   * encryption path with one extra step on top, rather than two parallel paths
   * that have to agree — which is what the hand-rolled override was.
   */
  /*
   * No `bankAccount` hook any more. It called `encryptPayoutBankAccount`,
   * which was `encryptPiiFields(bank, [])` — a no-op — and
   * `PayoutBankAccount` carries no secret field to encrypt. See the tombstone
   * in `security/pii-encrypt.ts`.
   */

  /**
   * Create a new payout request
   */
  /*
   * 🛑 NOT an `override`. It returns the plaintext it was handed (no
   * read-after-write, which would cost a Firestore read per payout), and
   * `PayoutPlain` is not assignable to the base's `Promise<T>` — correctly,
   * because the two genuinely differ. The declaration used to say
   * `PayoutDocument` directly above a line commented "return plaintext to
   * caller".
   */
  async createPayout(input: PayoutCreateInput): Promise<PayoutPlain> {
    const now = new Date();
    const id = createPayoutId({ sellerName: input.sellerName, date: now });

    // Plain in, ciphertext out — the write hook encrypts below.
    const data: Omit<PayoutPlain, "id"> = {
      ...input,
      status: "pending",
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // Encrypt PII before persisting
    const encrypted = this.applyWriteHooks(
      data,
    );

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    return { id, ...data };
  }

  /**
   * Record a seller share that a payment AGGREGATOR settled, not us.
   *
   * ## 🛑 THE FIRST WRITER `status: "processing"` HAS EVER HAD
   *
   * `processing` and `failed` have been in `PayoutStatus` since the RazorpayX
   * dispatcher was deleted, and `PAYOUT_TRACKED_FIELDS`' own note records that
   * nothing wrote them. `failed` was already reachable (an admin may set it
   * through `adminUpdatePayout`); `processing` was not reachable from anywhere.
   * This is it, and the meaning is exact: **the money has left our control and
   * has not yet landed.** Under split settlement that is literally true — the
   * buyer's payment went into the aggregator's escrow with an instruction to
   * pay this vendor, and the aggregator settles on its own cycle.
   *
   * ## 🛑 Why a separate method instead of `createPayout`
   *
   * `createPayout` hardcodes `status: "pending"`, and that is correct for every
   * row it writes: a pending payout is one WE still owe and an admin will
   * dispatch by hand. A row written here is one nobody will dispatch, ever.
   * Widening `createPayout` with a status parameter would make "pending" a
   * default a caller can forget, and a split-settled share sitting in the
   * manual queue is a seller about to be paid twice.
   *
   * ## 🛑 It is a RECORD, not an instruction
   *
   * Nothing downstream acts on this row. It exists so the seller can see what
   * they were paid and why, so `getPaidOutOrderIds` (which counts `pending`,
   * `processing` and `paid`) stops the same orders being swept into a second
   * payout, and so the books can tell escrow-settled revenue from
   * platform-settled. Marking it `paid` is a later reconciliation step against
   * the aggregator's own statement; `adminUpdatePayout` already does that.
   *
   * 🛑 `amount` is the share INSTRUCTED at capture and is NOT the whole of what
   * the seller will be owed. Postage reimbursement and the points-earn side are
   * decided after dispatch and cannot be expressed in a capture-time split —
   * see `_internal/shared/checkout/settlement-split.ts`' header. That residue
   * has no settlement path today and this method must not be read as claiming
   * it does.
   */
  async createSplitSettlementPayout(
    input: PayoutCreateInput & {
      settlementGateway: string;
      settlementVendorId: string;
      settlementReference?: string;
    },
  ): Promise<PayoutPlain> {
    const now = new Date();
    const id = createPayoutId({ sellerName: input.sellerName, date: now });

    const data: Omit<PayoutPlain, "id"> = {
      ...input,
      /*
       * 🛑 Not `pending`. A `pending` row is one an admin dispatches by hand,
       * and dispatching this one would pay the seller a second time out of the
       * platform's own balance — which is the commingling in reverse.
       */
      status: PAYOUT_FIELDS.STATUS_VALUES.PROCESSING,
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const encrypted = this.applyWriteHooks(data);
    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(encrypted));

    return { id, ...data };
  }

  /**
   * Every split-settlement row written for ONE capture, keyed by store.
   *
   * 🛑 This is how the SETTLE path learns what was actually INSTRUCTED, rather
   * than recomputing it. The capture happens in an earlier request
   * (`/api/payment/create-order`), which is the only place that holds the
   * vendor records and the exact per-vendor amounts it sent; recomputing at
   * settle would silently diverge in the one window that matters — the cart can
   * gain a line between the two requests, which is precisely why
   * `verifyAndPlaceGatewayOrderAction` already carries a settlement-compliance
   * detector. A read of what we wrote is a fact; a recomputation is a guess
   * that agrees most of the time.
   *
   * One Firestore equality on a single field, so it is served by the automatic
   * index — no composite. Bounded at 20: the reference is one capture, and a
   * capture spanning more than a handful of vendors is the open question in
   * `settlement-split.ts`, not a page to iterate.
   */
  async findBySettlementReference(
    reference: string,
  ): Promise<Map<string, SplitSettlementRecord>> {
    const byStore = new Map<string, SplitSettlementRecord>();
    if (!reference) return byStore;
    const snap = await this.db
      .collection(this.collection)
      .where("settlementReference", "==", reference)
      .limit(20)
      .get();
    for (const doc of snap.docs) {
      /*
       * 🛑 `mapDoc`, not `doc.data()`. It runs `deserializeTimestamps`, so
       * `requestedAt` arrives as a `Date` rather than a Firestore `Timestamp` —
       * and a `Timestamp` written into `OrderDocument.splitSettlement.instructedAt`
       * (declared `Date | string`) would type-check through the cast chain and
       * then break every date arithmetic that reads it. Same defect the
       * `shippingDate` string/Timestamp split records.
       */
      const data = this.mapDoc<PayoutDocument>(doc);
      if (!data.storeId || !data.settlementVendorId) continue;
      byStore.set(data.storeId, {
        vendorId: data.settlementVendorId,
        amount: data.amount,
        gateway: data.settlementGateway ?? "",
        /*
         * 🛑 The row's OWN `requestedAt`, which IS the moment the instruction
         * was written, and it is required on every row this method can match.
         * Never `new Date()` at the point of reading: a fabricated timestamp on
         * a money record is CLAUDE.md § Status History's first rule, and the
         * settle request can be minutes after the capture.
         */
        instructedAt: data.requestedAt,
      });
    }
    return byStore;
  }

  /** Override base update to preserve encryption/indexing for changed PII fields. */
  override async update(
    payoutId: string,
    data: Partial<PayoutPlain>,
  ): Promise<PayoutDocument> {
    const encrypted = this.applyWriteHooks(
      data,
    );
    return super.update(payoutId, encrypted as Partial<PayoutPlain>);
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
      ({
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
      ({
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
   * Update payout status (admin action).
   *
   * `prior` keeps the timeline entry read-free — the admin route already
   * fetches the payout to authorise the change (Rule #6).
   */
  async updateStatus(
    payoutId: string,
    status: PayoutStatus,
    extra?: PayoutUpdateInput,
    ctx?: PayoutWriteContext,
    prior?: PayoutDocument | null,
  ): Promise<PayoutDocument> {
    const current = prior !== undefined ? prior : await this.findById(payoutId);
    return this.update(
      payoutId,
      this.withPayoutHistory(
        current,
        {
          status,
          ...extra,
          ...(status === PAYOUT_FIELDS.STATUS_VALUES.PAID ||
          status === PAYOUT_FIELDS.STATUS_VALUES.FAILED
            ? { processedAt: new Date() }
            : {}),
          updatedAt: new Date(),
        },
        ctx,
        "adminUpdatePayout",
      ),
    );
  }

  /** Append a timeline entry when the patch touches a tracked field. */
  private withPayoutHistory(
    current: PayoutDocument | null | undefined,
    patch: Partial<PayoutPlain>,
    ctx: PayoutWriteContext | undefined,
    defaultTrigger: string,
  ): Partial<PayoutPlain> {
    const withEntry = withHistory(
      current as unknown as FirestoreDocument | undefined,
      patch as FirestoreDocument,
      {
        tracked: PAYOUT_TRACKED_FIELDS,
        actor: ctx?.actor ?? { role: "system" },
        trigger: ctx?.trigger ?? defaultTrigger,
        reason: ctx?.reason,
        note: ctx?.note,
        // `sellerEmail` / `upiId` — `encryptPiiFields` covers only NAMED paths,
        // and nothing declares them under `statusHistory[].changes`, so either
        // one reaching `changes` would persist in PLAINTEXT.
        piiFields: PAYOUT_PII_FIELDS,
      },
    );
    return (withEntry as Partial<PayoutPlain> | null) ?? patch;
  }

  /**
   * Get all order IDs that have already been paid out for a seller.
   * Used to avoid double-paying the same orders.
   */
  async getPaidOutOrderIds(storeId: string): Promise<Set<string>> {
    const snapshot = await this.db
      .collection(this.collection)
      .where(PAYOUT_FIELDS.STORE_ID, "==", storeId)
      .where(PAYOUT_FIELDS.STATUS, "in", ["pending", "processing", "paid"])
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
    return ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PayoutDocument);
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

    return (updated);
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
    requestedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    processedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
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
