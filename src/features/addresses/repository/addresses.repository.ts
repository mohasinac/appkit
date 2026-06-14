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
    return decryptPiiFields(doc as unknown as Record<string, unknown>, [
      ...ADDRESS_PII_FIELDS,
    ]) as unknown as AddressDocument;
  }

  private encryptAddressData<T extends Record<string, unknown>>(data: T): T {
    return encryptPiiFields(data, [...ADDRESS_PII_FIELDS]);
  }

  protected override mapDoc<D = AddressDocument>(snap: DocumentSnapshot): D {
    const raw = super.mapDoc<AddressDocument>(snap);
    return this.decryptAddress(raw) as unknown as D;
  }

  override async createWithId(
    id: string,
    data: Partial<AddressDocument>,
  ): Promise<AddressDocument> {
    const encrypted = this.encryptAddressData(
      data as unknown as Record<string, unknown>,
    );
    return super.createWithId(id, encrypted as Partial<AddressDocument>);
  }

  override async update(
    id: string,
    data: Partial<AddressDocument>,
  ): Promise<AddressDocument> {
    const encrypted = this.encryptAddressData(
      data as unknown as Record<string, unknown>,
    );
    return super.update(id, encrypted as Partial<AddressDocument>);
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
        createdAt: now,
        updatedAt: now,
      };

      const encrypted = this.encryptAddressData(
        addressData as unknown as Record<string, unknown>,
      );
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
      throw new DatabaseError(
        `Failed to create address for ${ownerType}:${ownerId}`,
        error,
      );
    }
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

    return this.update(addressId, input);
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
      throw new DatabaseError(
        `Failed to delete all addresses for ${ownerType}:${ownerId}`,
        error,
      );
    }
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
      throw new DatabaseError(
        `Failed to clear default flag for ${ownerType}:${ownerId}`,
        error,
      );
    }
  }
}

export const addressesRepository = new AddressesRepository();
