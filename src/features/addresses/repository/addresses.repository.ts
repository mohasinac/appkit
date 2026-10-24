import { createHash } from "crypto";
import { normalizeError } from "../../../errors/normalize";
import type { JsonValue } from "../../../schemas/types";
/**
 * AddressesRepository — SB-UNI-A 2026-05-13
 *
 * Top-level `addresses` collection. Discriminator: `ownerType: "user"|"store"`.
 * Replaces the two prior subcollection repositories.
 *
 * PII encryption: `fullName`, `phone`, `addressLine1` are routed through
 * `encryptPiiFields` on every write path (createWithId, create, update) and
 * decrypted in `mapDoc`. Pattern #9 (CLAUDE.md): never bypass repo hooks.
 */

import { DatabaseError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import { BaseRepository, getFirestoreCount, prepareForFirestore } from "../../../providers/db-firebase";
import {
  maskPii,
  revealPii,
  ADDRESS_PII_FIELDS,
} from "../../../security";
import { buildTokensIndex } from "../../../security/blind-index-tokens";
import {
  ADDRESS_FIELDS,
  ADDRESSES_COLLECTION,
  type AddressBanStatus,
  type AddressCreateInput,
  type AddressDocument,
  type AddressPlain,
  type AddressOwnerType,
  type AddressUpdateInput,
} from "../schemas";

export class AddressesRepository extends BaseRepository<AddressDocument> {
  constructor() {
    super(ADDRESSES_COLLECTION);
  }

  /**
   * Declared, not hand-rolled.
   *
   * `BaseRepository.applyWriteHooks` already does exactly what the private
   * `encryptAddressData` did — encrypt the listed fields, then add the mapped blind
   * indices derived from the PLAINTEXT source. Declaring the fields means all
   * nine mutating methods get it, including the `createWithId` / `*InTx` /
   * `*InBatch` family that inherited unhooked base implementations while the
   * encryption lived in a private method only three call sites remembered to
   * call.
   */
  protected override piiFields = ADDRESS_PII_FIELDS;

  /**
   * Admin search by name, without decryption. ONLY `fullName` — never
   * `addressLine1`: "find everyone on Brigade Road" is not a capability
   * admin needs and is the single most re-identifying field on the
   * document. See `security/blind-index-tokens.ts` for why this is
   * whole-word rather than a prefix-expanded index.
   *
   * Runs through `applyWriteHooks`, so it reaches every write path
   * including a seed load — which is what makes it survive the tester
   * harness's cascade on `addresses` (it references `ownerId`, a
   * PRESERVE-tier user, so the row itself is never actually wiped — but
   * the field regenerating on every write is what makes that true by
   * construction rather than by luck).
   */
  protected override buildTokensIndexFor(
    data: Record<string, JsonValue>,
  ): Record<string, string[]> | null {
    const fullName = typeof data.fullName === "string" ? data.fullName : undefined;
    if (!fullName) return null;
    return { nameTokensIndex: buildTokensIndex(fullName) };
  }

  /*
   * 🛑 `mapDoc` is NOT overridden, and that absence IS the change.
   *
   * It used to decrypt on every read, so ciphertext never left the database
   * and every caller handled plaintext without ever saying so. Following
   * `SiteSettingsRepository`: reads return what Firestore holds, and plaintext
   * requires one of the two named methods below.
   *
   * A convention would not hold this. `AddressDocument`'s PII fields are
   * `Encrypted<string>`, assignable to nothing that wants a plain `string`, so
   * a reader that skips both accessors is a compile error naming file and line.
   */

  /** Plaintext PII. **Opt-in and named** — shows up in review and in a grep. */
  revealAddress(doc: AddressDocument): AddressPlain {
    return revealPii<AddressPlain>(doc, ADDRESS_PII_FIELDS);
  }

  /** As `revealAddress`, for a list read. */
  revealAddresss(docs: readonly AddressDocument[]): AddressPlain[] {
    return docs.map((d) => this.revealAddress(d));
  }

  /**
   * Masked PII — **the default for any surface that only needs to identify a
   * row to a human.** Decrypts first, then masks: the mask helpers refuse
   * ciphertext by design, so passing a stored field straight in would return
   * "Anonymous" for every row.
   */
  maskedAddress(doc: AddressDocument): AddressPlain {
    return maskPii<AddressPlain>(doc, ADDRESS_PII_FIELDS);
  }

  /** As `maskedAddress`, for a list read. */
  maskedAddresss(docs: readonly AddressDocument[]): AddressPlain[] {
    return docs.map((d) => this.maskedAddress(d));
  }

  /*
   * Takes PLAINTEXT, like the base it overrides — this method is what
   * encrypts (`applyWriteHooks`), so demanding ciphertext from callers
   * inverted its own contract.
   */
  override async createWithId(
    id: string,
    data: Partial<AddressPlain>,
  ): Promise<AddressDocument> {
    const encrypted = this.applyWriteHooks(data);
    return super.createWithId(id, encrypted as Partial<AddressPlain>);
  }

  /*
   * Takes PLAINTEXT, like the base it overrides — this method is the thing
   * that encrypts (`applyWriteHooks`), so demanding ciphertext from callers
   * inverted its own contract.
   */
  override async update(
    id: string,
    data: Partial<AddressPlain>,
  ): Promise<AddressDocument> {
    const encrypted = this.applyWriteHooks(data);
    return super.update(id, encrypted as Partial<AddressPlain>);
  }

  async listByOwner(
    ownerType: AddressOwnerType,
    ownerId: string,
  ): Promise<AddressDocument[]> {
    try {
      const snapshot = await this.getCollection()
        .where(ADDRESS_FIELDS.OWNER_TYPE, "==", ownerType)
        .where(ADDRESS_FIELDS.OWNER_ID, "==", ownerId)
        .orderBy(ADDRESS_FIELDS.CREATED_AT, "desc")
        .get();

      return snapshot.docs.map((doc) =>
        this.mapDoc<AddressDocument>(doc),
      );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to list addresses for ${ownerType}:${ownerId}`,
        error,
      );
    }
  }

  /**
   * 🛑 Requires the composite index `(ownerType ASC, createdAt DESC)`.
   *
   * The pre-existing `(ownerType, ownerId, createdAt DESC)` index does NOT serve
   * this query: Firestore matches an index by its field sequence, and `ownerId`
   * sits between the equality and the sort, so a query that filters on
   * `ownerType` alone and orders by `createdAt` has no usable prefix. Without the
   * two-field index this throws FAILED_PRECONDITION, which `mapToHttpError`
   * renders as a **409** — and `/admin/address-clusters` then showed "Failed to
   * load clusters." *and* "No shared addresses found." at the same time, so the
   * page read as "there are no clusters" rather than as an error. Added
   * 2026-10-02; see Recurrent Root Cause #2.
   */
  async listByOwnerType(
    ownerType: AddressOwnerType,
    limit = 500,
  ): Promise<AddressDocument[]> {
    try {
      const snapshot = await this.getCollection()
        .where(ADDRESS_FIELDS.OWNER_TYPE, "==", ownerType)
        .orderBy(ADDRESS_FIELDS.CREATED_AT, "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<AddressDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to list addresses by ownerType=${ownerType}`,
        error,
      );
    }
  }

  async countByOwner(
    ownerType: AddressOwnerType,
    ownerId: string,
  ): Promise<number> {
    try {
      return await getFirestoreCount(
        this.getCollection()
          .where(ADDRESS_FIELDS.OWNER_TYPE, "==", ownerType)
          .where(ADDRESS_FIELDS.OWNER_ID, "==", ownerId),
      );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to count addresses for ${ownerType}:${ownerId}`,
        error,
      );
    }
  }

  async createForOwner(
    ownerType: AddressOwnerType,
    ownerId: string,
    input: AddressCreateInput,
  ): Promise<AddressDocument> {
    try {
      if (input.isDefault) {
        await this.clearDefaultFlag(ownerType, ownerId);
      }

      const now = new Date();
      const docRef = this.getCollection().doc();
      // Plain in, ciphertext out — the write hook encrypts below.
      const addressData: Omit<AddressPlain, "id"> = {
        ...input,
        ownerType,
        ownerId,
        addressHash: this.computeAddressHash(input.postalCode, input.addressLine1, input.addressLine2),
        createdAt: now,
        updatedAt: now,
      };

      const encrypted = this.applyWriteHooks(addressData);
      await docRef.set(prepareForFirestore(encrypted));

      serverLogger.info("Address created", {
        ownerType,
        ownerId,
        addressId: docRef.id,
        label: input.label,
      });

      // W4 FIX: previously returned the in-memory plaintext shape while having
      // persisted the encrypted shape. Subsequent GETs decrypted via mapDoc and
      // produced different field values than what this method returned. Re-fetch
      // so the returned object matches what a future GET would see.
      const refetched = await this.findById(docRef.id);
      if (refetched) return refetched;
      // Defensive fallback — the doc was just written; if it can't be re-read,
      // surface that as a database error rather than silently returning plaintext.
      throw new DatabaseError(
        `Address ${docRef.id} not readable immediately after create`,
        null,
      );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to create address for ${ownerType}:${ownerId}`,
        error,
      );
    }
  }

  /**
   * Read one address, scoped to its owner.
   *
   * The owner check is `ownerType` AND `ownerId` — the same pair
   * `updateForOwner` and `deleteForOwner` use, because `addresses` is one
   * top-level collection holding both buyer and store addresses discriminated
   * by `ownerType` (SB-UNI-A). Checking only `ownerId` would let a seller read
   * their own personal address through the store endpoint and vice versa.
   *
   * Returns null rather than throwing: the caller turns it into a 404, and a
   * missing address and a foreign one must be indistinguishable to the client.
   */
  async getForOwner(
    ownerType: AddressOwnerType,
    ownerId: string,
    addressId: string,
  ): Promise<AddressDocument | null> {
    const existing = await this.findById(addressId);
    if (!existing || existing.ownerType !== ownerType || existing.ownerId !== ownerId) {
      return null;
    }
    return existing;
  }

  async updateForOwner(
    ownerType: AddressOwnerType,
    ownerId: string,
    addressId: string,
    input: AddressUpdateInput,
  ): Promise<AddressDocument> {
    const existing = await this.findById(addressId);
    if (!existing || existing.ownerType !== ownerType || existing.ownerId !== ownerId) {
      throw new DatabaseError(
        `Address not found for ${ownerType}:${ownerId}: ${addressId}`,
      );
    }

    if (input.isDefault) {
      await this.clearDefaultFlag(ownerType, ownerId);
    }

    const updateData: AddressUpdateInput = { ...input };
    if (input.postalCode || input.addressLine1 || input.addressLine2 !== undefined) {
      /*
       * 🛑 Revealed, because the hash is a BLIND INDEX over plaintext.
       *
       * `existing` comes from a find, which no longer decrypts, and these three
       * fall back to it when the caller did not supply them. Hashing ciphertext
       * would compute a hash nothing else can reproduce — so every address
       * edited after this change would stop matching its own duplicates, with
       * no error and nothing to notice. The brand is what made the fallback
       * visible; `.postalCode` is not PII and needs no reveal.
       */
      const current = this.revealAddress(existing);
      const postalCode = input.postalCode ?? current.postalCode;
      const line1 = input.addressLine1 ?? current.addressLine1;
      const line2 = input.addressLine2 ?? current.addressLine2;
      /*
       * The hash is computed from PLAINTEXT, which is the whole point of a
       * blind index — and `existing` now holds ciphertext, so the three values
       * feeding it come from the revealed copy above. Casting to the document
       * shape here would have hashed ciphertext and silently broken
       * duplicate-detection for every address edited after this change.
       */
      (updateData as Partial<AddressPlain>).addressHash = this.computeAddressHash(postalCode, line1, line2);
    }

    return this.update(addressId, updateData);
  }

  async deleteForOwner(
    ownerType: AddressOwnerType,
    ownerId: string,
    addressId: string,
  ): Promise<void> {
    const existing = await this.findById(addressId);
    if (!existing || existing.ownerType !== ownerType || existing.ownerId !== ownerId) {
      throw new DatabaseError(
        `Address not found for ${ownerType}:${ownerId}: ${addressId}`,
      );
    }
    await this.delete(addressId);
    serverLogger.info("Address deleted", { ownerType, ownerId, addressId });
  }

  async setDefault(
    ownerType: AddressOwnerType,
    ownerId: string,
    addressId: string,
  ): Promise<AddressDocument> {
    const existing = await this.findById(addressId);
    if (!existing || existing.ownerType !== ownerType || existing.ownerId !== ownerId) {
      throw new DatabaseError(
        `Address not found for ${ownerType}:${ownerId}: ${addressId}`,
      );
    }
    await this.clearDefaultFlag(ownerType, ownerId);
    return this.update(addressId, { isDefault: true });
  }

  async deleteAllForOwner(
    ownerType: AddressOwnerType,
    ownerId: string,
  ): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where(ADDRESS_FIELDS.OWNER_TYPE, "==", ownerType)
        .where(ADDRESS_FIELDS.OWNER_ID, "==", ownerId)
        .get();

      if (snapshot.empty) return 0;

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return snapshot.size;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to delete all addresses for ${ownerType}:${ownerId}`,
        error,
      );
    }
  }

  private computeAddressHash(
    postalCode: string,
    line1: string,
    line2?: string,
  ): string {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    return createHash("sha256")
      .update([postalCode, line1, line2 ?? ""].map(norm).join("|"))
      .digest("hex");
  }

  async banAllForOwner(
    ownerType: AddressOwnerType,
    ownerId: string,
    banData: { banReason: string; bannedBy: string },
  ): Promise<number> {
    try {
      const snap = await this.getCollection()
        .where(ADDRESS_FIELDS.OWNER_TYPE, "==", ownerType)
        .where(ADDRESS_FIELDS.OWNER_ID, "==", ownerId)
        .get();
      if (snap.empty) return 0;

      const now = new Date();
      const batch = this.db.batch();
      snap.docs.forEach((doc) => {
        batch.update(doc.ref, {
          [ADDRESS_FIELDS.BAN_STATUS]: "banned",
          [ADDRESS_FIELDS.BAN_REASON]: banData.banReason,
          [ADDRESS_FIELDS.BANNED_BY]: banData.bannedBy,
          [ADDRESS_FIELDS.BANNED_AT]: now,
          [ADDRESS_FIELDS.AUTO_BANNED]: true,
          [ADDRESS_FIELDS.UPDATED_AT]: now,
        });
      });
      await batch.commit();
      return snap.size;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to ban addresses for ${ownerType}:${ownerId}`, error);
    }
  }

  async unbanAutoForOwner(
    ownerType: AddressOwnerType,
    ownerId: string,
  ): Promise<number> {
    try {
      const snap = await this.getCollection()
        .where(ADDRESS_FIELDS.OWNER_TYPE, "==", ownerType)
        .where(ADDRESS_FIELDS.OWNER_ID, "==", ownerId)
        .where(ADDRESS_FIELDS.AUTO_BANNED, "==", true)
        .get();
      if (snap.empty) return 0;

      const now = new Date();
      const batch = this.db.batch();
      snap.docs.forEach((doc) => {
        batch.update(doc.ref, {
          [ADDRESS_FIELDS.BAN_STATUS]: null,
          [ADDRESS_FIELDS.BAN_REASON]: null,
          [ADDRESS_FIELDS.BANNED_BY]: null,
          [ADDRESS_FIELDS.BANNED_AT]: null,
          [ADDRESS_FIELDS.AUTO_BANNED]: null,
          [ADDRESS_FIELDS.UPDATED_AT]: now,
        });
      });
      await batch.commit();
      return snap.size;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to unban addresses for ${ownerType}:${ownerId}`, error);
    }
  }

  async listByAddressHash(addressHash: string): Promise<AddressDocument[]> {
    try {
      const snap = await this.getCollection()
        .where(ADDRESS_FIELDS.ADDRESS_HASH, "==", addressHash)
        .get();
      return snap.docs.map((d) => this.mapDoc<AddressDocument>(d));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to lookup addresses by hash`, error);
    }
  }

  async listByBanStatus(
    banStatus: AddressBanStatus,
    limit = 50,
    offset = 0,
  ): Promise<AddressDocument[]> {
    try {
      const snap = await this.getCollection()
        .where(ADDRESS_FIELDS.BAN_STATUS, "==", banStatus)
        .orderBy(ADDRESS_FIELDS.BANNED_AT, "desc")
        .limit(limit)
        .offset(offset)
        .get();
      return snap.docs.map((d) => this.mapDoc<AddressDocument>(d));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to list addresses by banStatus:${banStatus}`, error);
    }
  }

  async banById(
    id: string,
    banData: { banReason: string; bannedBy: string },
  ): Promise<AddressDocument> {
    // Plain write payload — see `update`'s own note.
    return this.update(id, {
      banStatus: "banned",
      banReason: banData.banReason,
      bannedBy: banData.bannedBy,
      bannedAt: new Date(),
      autoBanned: false,
    } as Partial<AddressPlain>);
  }

  async clearBanById(id: string): Promise<void> {
    const now = new Date();
    await this.db.collection(ADDRESSES_COLLECTION).doc(id).update({
      [ADDRESS_FIELDS.BAN_STATUS]: null,
      [ADDRESS_FIELDS.BAN_REASON]: null,
      [ADDRESS_FIELDS.BANNED_BY]: null,
      [ADDRESS_FIELDS.BANNED_AT]: null,
      [ADDRESS_FIELDS.AUTO_BANNED]: null,
      [ADDRESS_FIELDS.UNBAN_REQUEST_NOTE]: null,
      [ADDRESS_FIELDS.UNBAN_REQUESTED_AT]: null,
      [ADDRESS_FIELDS.UPDATED_AT]: now,
    });
  }

  private async clearDefaultFlag(
    ownerType: AddressOwnerType,
    ownerId: string,
  ): Promise<void> {
    try {
      const snapshot = await this.getCollection()
        .where(ADDRESS_FIELDS.OWNER_TYPE, "==", ownerType)
        .where(ADDRESS_FIELDS.OWNER_ID, "==", ownerId)
        .where(ADDRESS_FIELDS.IS_DEFAULT, "==", true)
        .get();

      if (snapshot.empty) return;

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          [ADDRESS_FIELDS.IS_DEFAULT]: false,
          [ADDRESS_FIELDS.UPDATED_AT]: new Date(),
        });
      });
      await batch.commit();
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to clear default flag for ${ownerType}:${ownerId}`,
        error,
      );
    }
  }
}

export const addressesRepository = new AddressesRepository();
