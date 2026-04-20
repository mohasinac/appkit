import { DatabaseError, NotFoundError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import {
  deserializeTimestamps,
  getFirestoreCount,
  getAdminDb,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import {
  ADDRESS_PII_FIELDS,
  decryptPiiFields,
  encryptPiiFields,
} from "../../../security";
import { USER_COLLECTION } from "../../auth";
import {
  ADDRESS_FIELDS,
  ADDRESS_SUBCOLLECTION,
  type AddressCreateInput,
  type AddressDocument,
  type AddressUpdateInput,
} from "../schemas";

export class AddressRepository {
  private getCollection(userId: string) {
    return getAdminDb()
      .collection(USER_COLLECTION)
      .doc(userId)
      .collection(ADDRESS_SUBCOLLECTION);
  }

  private decryptAddress(doc: AddressDocument): AddressDocument {
    return decryptPiiFields(doc as unknown as Record<string, unknown>, [
      ...ADDRESS_PII_FIELDS,
    ]) as unknown as AddressDocument;
  }

  private encryptAddressData<T extends Record<string, unknown>>(data: T): T {
    return encryptPiiFields(data, [...ADDRESS_PII_FIELDS]);
  }

  async findByUser(userId: string): Promise<AddressDocument[]> {
    try {
      const snapshot = await this.getCollection(userId)
        .orderBy(ADDRESS_FIELDS.CREATED_AT, "desc")
        .get();

      return snapshot.docs.map((doc) =>
        this.decryptAddress(
          deserializeTimestamps({
            id: doc.id,
            ...doc.data(),
          }) as AddressDocument,
        ),
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to list addresses for user: ${userId}`,
        error,
      );
    }
  }

  async findById(
    userId: string,
    addressId: string,
  ): Promise<AddressDocument | null> {
    try {
      const doc = await this.getCollection(userId).doc(addressId).get();

      if (!doc.exists) return null;

      return this.decryptAddress(
        deserializeTimestamps({ id: doc.id, ...doc.data() }) as AddressDocument,
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find address ${addressId} for user ${userId}`,
        error,
      );
    }
  }

  async findByIdOrFail(
    userId: string,
    addressId: string,
  ): Promise<AddressDocument> {
    const address = await this.findById(userId, addressId);

    if (!address) {
      throw new NotFoundError(`Address not found: ${addressId}`);
    }

    return address;
  }

  async count(userId: string): Promise<number> {
    try {
      return await getFirestoreCount(this.getCollection(userId));
    } catch (error) {
      throw new DatabaseError(
        `Failed to count addresses for user: ${userId}`,
        error,
      );
    }
  }

  async create(
    userId: string,
    input: AddressCreateInput,
  ): Promise<AddressDocument> {
    try {
      const collection = this.getCollection(userId);

      if (input.isDefault) {
        await this.clearDefaultFlag(userId);
      }

      const now = new Date();
      const docRef = collection.doc();
      const addressData: Omit<AddressDocument, "id"> = {
        ...input,
        createdAt: now,
        updatedAt: now,
      };

      const encrypted = this.encryptAddressData(
        addressData as unknown as Record<string, unknown>,
      );
      await docRef.set(prepareForFirestore(encrypted));

      serverLogger.info("Address created", {
        userId,
        addressId: docRef.id,
        label: input.label,
      });

      return { id: docRef.id, ...addressData };
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to create address for user: ${userId}`,
        error,
      );
    }
  }

  async update(
    userId: string,
    addressId: string,
    input: AddressUpdateInput,
  ): Promise<AddressDocument> {
    try {
      await this.findByIdOrFail(userId, addressId);

      if (input.isDefault) {
        await this.clearDefaultFlag(userId);
      }

      const encryptedInput = this.encryptAddressData(
        input as unknown as Record<string, unknown>,
      );
      const updateData = {
        ...prepareForFirestore(encryptedInput),
        [ADDRESS_FIELDS.UPDATED_AT]: new Date(),
      };

      await this.getCollection(userId).doc(addressId).update(updateData);

      const updated = await this.findByIdOrFail(userId, addressId);

      serverLogger.info("Address updated", { userId, addressId });

      return updated;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to update address ${addressId} for user ${userId}`,
        error,
      );
    }
  }

  async delete(userId: string, addressId: string): Promise<void> {
    try {
      await this.findByIdOrFail(userId, addressId);
      await this.getCollection(userId).doc(addressId).delete();

      serverLogger.info("Address deleted", { userId, addressId });
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to delete address ${addressId} for user ${userId}`,
        error,
      );
    }
  }

  async setDefault(
    userId: string,
    addressId: string,
  ): Promise<AddressDocument> {
    try {
      await this.findByIdOrFail(userId, addressId);
      await this.clearDefaultFlag(userId);

      await this.getCollection(userId)
        .doc(addressId)
        .update({
          [ADDRESS_FIELDS.IS_DEFAULT]: true,
          [ADDRESS_FIELDS.UPDATED_AT]: new Date(),
        });

      serverLogger.info("Default address set", { userId, addressId });

      return this.findByIdOrFail(userId, addressId);
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to set default address ${addressId} for user ${userId}`,
        error,
      );
    }
  }

  private async clearDefaultFlag(userId: string): Promise<void> {
    try {
      const db = getAdminDb();
      const snapshot = await this.getCollection(userId)
        .where(ADDRESS_FIELDS.IS_DEFAULT, "==", true)
        .get();

      if (snapshot.empty) return;

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          [ADDRESS_FIELDS.IS_DEFAULT]: false,
          [ADDRESS_FIELDS.UPDATED_AT]: new Date(),
        });
      });

      await batch.commit();
    } catch (error) {
      throw new DatabaseError(
        `Failed to clear default flag for user: ${userId}`,
        error,
      );
    }
  }

  async deleteAllByUser(userId: string): Promise<number> {
    try {
      const db = getAdminDb();
      const snapshot = await this.getCollection(userId).get();

      if (snapshot.empty) return 0;

      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return snapshot.size;
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete all addresses for user: ${userId}`,
        error,
      );
    }
  }
}

export const addressRepository = new AddressRepository();
