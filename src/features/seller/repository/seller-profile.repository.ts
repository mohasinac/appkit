/**
 * Seller Profile Repository
 *
 * Data access for the `sellerProfiles` Firestore collection — a sidecar to
 * `users/{uid}`, keyed on the same Firebase Auth UID. See
 * `seller-profile-firestore.ts` for the full rationale.
 */

import { BaseRepository, prepareForFirestore } from "../../../providers/db-firebase";
import { DatabaseError } from "../../../errors";
import { normalizeError } from "../../../errors/normalize";
import {
  decryptPayoutDetails,
  decryptShippingConfig,
  encryptPayoutDetails,
  encryptShippingConfig,
  maskPii,
} from "../../../security";
import {
  SellerProfileDocument,
  SELLER_PROFILE_COLLECTION,
  SellerProfileCreateInput,
  SellerProfileUpdateInput,
} from "../schemas/seller-profile-firestore";

export class SellerProfileRepository extends BaseRepository<SellerProfileDocument> {
  constructor() {
    super(SELLER_PROFILE_COLLECTION);
  }

  /*
   * 🛑 `payoutDetails`/`shippingConfig` carry real PII (bank account numbers,
   * UPI ids, pickup addresses) and were encrypted on `UserDocument` via
   * `UserRepository`'s own `applyWriteHooks` override. Moving the FIELDS to
   * this collection without moving the ENCRYPTION would be a real security
   * regression — plaintext bank details at rest. Same two functions, same
   * call shape, just on this repository instead.
   *
   * `mapDoc` is deliberately NOT overridden to decrypt — ciphertext-by-
   * default, matching `StoreRepository`'s own stated convention. Plaintext
   * is `revealProfile`, named and greppable; masked is `maskedProfile`, the
   * default for anything admin-facing.
   */
  protected override applyWriteHooks<D extends object>(data: D): D {
    const out = super.applyWriteHooks(data);
    const access = out as { payoutDetails?: object | null; shippingConfig?: object | null };
    if (access.payoutDetails) access.payoutDetails = encryptPayoutDetails(access.payoutDetails);
    if (access.shippingConfig) access.shippingConfig = encryptShippingConfig(access.shippingConfig);
    return out;
  }

  /** Plaintext PII. Opt-in and named — for the account's own settings page,
   * the payout run, and anywhere the real value is genuinely needed. */
  revealProfile(doc: SellerProfileDocument): SellerProfileDocument {
    const revealed = { ...doc };
    if (revealed.payoutDetails) {
      revealed.payoutDetails = decryptPayoutDetails(revealed.payoutDetails) as typeof revealed.payoutDetails;
    }
    if (revealed.shippingConfig) {
      revealed.shippingConfig = decryptShippingConfig(revealed.shippingConfig) as typeof revealed.shippingConfig;
    }
    return revealed;
  }

  /** Masked PII — the default for any admin-facing read. */
  maskedProfile(doc: SellerProfileDocument): SellerProfileDocument {
    const masked = this.revealProfile(doc);
    if (masked.payoutDetails) masked.payoutDetails = this.maskNested(masked.payoutDetails) as typeof masked.payoutDetails;
    if (masked.shippingConfig) masked.shippingConfig = this.maskNested(masked.shippingConfig) as typeof masked.shippingConfig;
    return masked;
  }

  /** As `UserRepository.maskNested` — field list derived from the decrypted
   * object itself, never hand-duplicated (Root Cause #42). */
  private maskNested<T extends object>(value: T | null | undefined): T | undefined {
    if (!value) return undefined;
    return maskPii<T>(
      value,
      Object.entries(value)
        .filter(([, v]) => typeof v === "string")
        .map(([k]) => k),
    );
  }

  /**
   * Create-or-update by owner UID, which is always this collection's
   * document id. Uses `set(..., { merge: true })` rather than
   * `createWithId`/`update` — those two require the caller to already know
   * whether a row exists, and every real call site here (`becomeSeller`,
   * `createStore`, `updatePayoutSettings`, the backfill script) is
   * naturally idempotent instead: "this account now has/updates this
   * seller data," regardless of whether it had any before.
   */
  async upsertForOwner(
    uid: string,
    data: Omit<SellerProfileCreateInput, "uid"> | SellerProfileUpdateInput,
  ): Promise<SellerProfileDocument> {
    try {
      const now = new Date();
      const existing = await this.getCollection().doc(uid).get();
      const cleanData = prepareForFirestore({
        ...this.applyWriteHooks(data as object),
        uid,
        ...(existing.exists ? {} : { createdAt: now }),
        updatedAt: now,
      });
      await this.getCollection().doc(uid).set(cleanData, { merge: true });
      const doc = await this.getCollection().doc(uid).get();
      return this.mapDoc(doc);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to upsert seller profile for uid: ${uid}: ${String(error)}`, error);
    }
  }
}

export const sellerProfileRepository = new SellerProfileRepository();
