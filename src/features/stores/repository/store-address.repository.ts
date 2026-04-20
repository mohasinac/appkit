/**
 * Store Address Repository
 *
 * Data access layer for store address documents stored as a subcollection:
 *   stores/{storeSlug}/addresses/{addressId}
 *
 * Mirrors the user address repository but scoped to stores.
 */

import {
  getAdminDb,
  getFirestoreCount,
  prepareForFirestore,
  deserializeTimestamps,
} from "../../../providers/db-firebase";
import { DatabaseError, NotFoundError } from "../../../errors";
import {
  encryptPiiFields,
  decryptPiiFields,
  ADDRESS_PII_FIELDS,
} from "../../../security";
import type {
  StoreAddressDocument,
  StoreAddressCreateInput,
  StoreAddressUpdateInput,
} from "../schemas";
import {
  STORE_ADDRESS_SUBCOLLECTION,
  STORE_ADDRESS_FIELDS,
  STORE_COLLECTION,
} from "../schemas";
import { serverLogger } from "../../../monitoring";

class StoreAddressRepository {
  /**
   * Get the addresses subcollection reference for a store.
   */
  private getCollection(storeSlug: string) {
    return getAdminDb()
      .collection(STORE_COLLECTION)
      .doc(storeSlug)
      .collection(STORE_ADDRESS_SUBCOLLECTION);
  }

  /** Decrypt PII fields after reading a store address doc from Firestore */
  private decryptAddress(doc: StoreAddressDocument): StoreAddressDocument {
    return decryptPiiFields(doc as unknown as Record<string, unknown>, [
      ...ADDRESS_PII_FIELDS,
    ]) as unknown as StoreAddressDocument;
  }

  /** Encrypt PII fields before writing a store address doc to Firestore */
  private encryptAddressData<T extends Record<string, unknown>>(data: T): T {
    return encryptPiiFields(data, [...ADDRESS_PII_FIELDS]);
  }

  /**
   * List all addresses for a store, ordered by createdAt desc.
   */
  async findByStore(storeSlug: string): Promise<StoreAddressDocument[]> {
    try {
      const snapshot = await this.getCollection(storeSlug)
        .orderBy(STORE_ADDRESS_FIELDS.CREATED_AT, "desc")
        .get();

      return snapshot.docs.map((doc) =>
        this.decryptAddress(
          deserializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }) as StoreAddressDocument,
        ),
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to list addresses for store: ${storeSlug}`,
        error,
      );
    }
  }

  /**
   * Find a single address belonging to a store.
   */
  async findById(
    storeSlug: string,
    addressId: string,
  ): Promise<StoreAddressDocument | null> {
    try {
      const doc = await this.getCollection(storeSlug).doc(addressId).get();

      if (!doc.exists) return null;

      return this.decryptAddress(
        deserializeTimestamps({
          id: doc.id,
          ...doc.data(),
        }) as StoreAddressDocument,
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find address ${addressId} for store ${storeSlug}`,
        error,
      );
    }
  }

  /**
   * Find a single address or throw NotFoundError.
   */
  async findByIdOrFail(
    storeSlug: string,
    addressId: string,
  ): Promise<StoreAddressDocument> {
    const address = await this.findById(storeSlug, addressId);

    if (!address) {
      throw new NotFoundError(`Store address not found: ${addressId}`);
    }

    return address;
  }

  /**
   * Count the total number of addresses for a store.
   */
  async count(storeSlug: string): Promise<number> {
    try {
      return await getFirestoreCount(this.getCollection(storeSlug));
    } catch (error) {
      throw new DatabaseError(
        `Failed to count addresses for store: ${storeSlug}`,
        error,
      );
    }
  }

  /**
   * Create a new store address.
   * If isDefault is true, clears the default flag from all other addresses first.
   */
  async create(
    storeSlug: string,
    input: StoreAddressCreateInput,
  ): Promise<StoreAddressDocument> {
    try {
      const collection = this.getCollection(storeSlug);

      if (input.isDefault) {
        await this.clearDefaultFlag(storeSlug);
      }

      const now = new Date();
      const docRef = collection.doc();
      const addressData: Omit<StoreAddressDocument, "id"> = {
        ...input,
        createdAt: now,
        updatedAt: now,
      };

      const encrypted = this.encryptAddressData(
        addressData as unknown as Record<string, unknown>,
      );
      await docRef.set(prepareForFirestore(encrypted));

      serverLogger.info("Store address created", {
        storeSlug,
        addressId: docRef.id,
        label: input.label,
      });

      return { id: docRef.id, ...addressData };
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError)
        throw error;
      throw new DatabaseError(
        `Failed to create address for store: ${storeSlug}`,
        error,
      );
    }
  }

  /**
   * Update an existing store address.
   * If isDefault is set to true, clears the default flag from all other addresses.
   */
  async update(
    storeSlug: string,
    addressId: string,
    input: StoreAddressUpdateInput,
  ): Promise<StoreAddressDocument> {
    try {
      await this.findByIdOrFail(storeSlug, addressId);

      if (input.isDefault) {
        await this.clearDefaultFlag(storeSlug);
      }

      const encryptedInput = this.encryptAddressData(
        input as unknown as Record<string, unknown>,
      );
      const updateData = {
        ...prepareForFirestore(encryptedInput),
        [STORE_ADDRESS_FIELDS.UPDATED_AT]: new Date(),
      };

      await this.getCollection(storeSlug).doc(addressId).update(updateData);

      const updated = await this.findByIdOrFail(storeSlug, addressId);

      serverLogger.info("Store address updated", { storeSlug, addressId });

      return updated;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError)
        throw error;
      throw new DatabaseError(
        `Failed to update address ${addressId} for store ${storeSlug}`,
        error,
      );
    }
  }

  /**
   * Delete a store address.
   */
  async delete(storeSlug: string, addressId: string): Promise<void> {
    try {
      await this.findByIdOrFail(storeSlug, addressId);
      await this.getCollection(storeSlug).doc(addressId).delete();

      serverLogger.info("Store address deleted", { storeSlug, addressId });
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError)
        throw error;
      throw new DatabaseError(
        `Failed to delete address ${addressId} for store ${storeSlug}`,
        error,
      );
    }
  }

  /**
   * Remove the isDefault flag from all addresses of a store.
   */
  private async clearDefaultFlag(storeSlug: string): Promise<void> {
    try {
      const db = getAdminDb();
      const snapshot = await this.getCollection(storeSlug)
        .where(STORE_ADDRESS_FIELDS.IS_DEFAULT, "==", true)
        .get();

      if (snapshot.empty) return;

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          [STORE_ADDRESS_FIELDS.IS_DEFAULT]: false,
          [STORE_ADDRESS_FIELDS.UPDATED_AT]: new Date(),
        });
      });

      await batch.commit();
    } catch (error) {
      throw new DatabaseError(
        `Failed to clear default flag for store: ${storeSlug}`,
        error,
      );
    }
  }
}

export const storeAddressRepository = new StoreAddressRepository();
