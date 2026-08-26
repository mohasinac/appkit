import { createHash } from "crypto";
import { normalizeError } from "../../../errors/normalize";
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
import {
  BaseRepository,
  getFirestoreCount,
  prepareForFirestore,
  type DocumentSnapshot,
} from "../../../providers/db-firebase";
import {
  ADDRESS_PII_FIELDS,
  decryptPiiFields,
  encryptPiiFields,
} from "../../../security";
import {
  ADDRESS_FIELDS,
  ADDRESSES_COLLECTION,
  type AddressBanStatus,
  type AddressCreateInput,
  type AddressDocument,
  type AddressOwnerType,
  type AddressUpdateInput,
} from "../schemas";

export class AddressesRepository extends BaseRepository<AddressDocument> {
  constructor() {
    super(ADDRESSES_COLLECTION);
  }

  private decryptAddress(doc: AddressDocument): AddressDocument {
    return decryptPiiFields(doc, [...ADDRESS_PII_FIELDS]) as AddressDocument;
  }

  private encryptAddressData<T extends object>(data: T): T {
    return encryptPiiFields(data, [...ADDRESS_PII_FIELDS]);
  }

  protected override mapDoc<D = AddressDocument>(snap: DocumentSnapshot): D {
    const raw = super.mapDoc<AddressDocument>(snap);
    return this.decryptAddress(raw) as D;
  }

  override async createWithId(
    id: string,
    data: Partial<AddressDocument>,
  ): Promise<AddressDocument> {
    const encrypted = this.encryptAddressData(data);
    return super.createWithId(id, encrypted);
  }

  override async update(
    id: string,
    data: Partial<AddressDocument>,
  ): Promise<AddressDocument> {
    const encrypted = this.encryptAddressData(data);
    return super.update(id, encrypted);
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
      const addressData: Omit<AddressDocument, "id"> = {
        ...input,
        ownerType,
        ownerId,
        addressHash: this.computeAddressHash(input.postalCode, input.addressLine1, input.addressLine2),
        createdAt: now,
        updatedAt: now,
      };

      const encrypted = this.encryptAddressData(addressData);
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
      const postalCode = input.postalCode ?? existing.postalCode;
      const line1 = input.addressLine1 ?? existing.addressLine1;
      const line2 = input.addressLine2 ?? existing.addressLine2;
      (updateData as Partial<AddressDocument>).addressHash = this.computeAddressHash(postalCode, line1, line2);
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
    return this.update(id, {
      banStatus: "banned",
      banReason: banData.banReason,
      bannedBy: banData.bannedBy,
      bannedAt: new Date(),
      autoBanned: false,
    } as Partial<AddressDocument>);
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
