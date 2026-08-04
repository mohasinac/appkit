/**
 * SavedPaymentMethodsRepository
 *
 * Persists user payment identifiers (UPI VPAs, card tokens, etc.) for
 * checkout pre-fill and cross-account fraud detection.
 *
 * PII: `identifier` is encrypted at rest (AES-256-GCM) — never returned
 * to clients. `identifierHash` is unencrypted SHA-256 for cross-account
 * dedup queries. `displayLabel` is pre-masked and safe to display.
 */

import { createHash } from "crypto";
import { normalizeError } from "../../../errors/normalize";
import { DatabaseError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import {
  BaseRepository,
  prepareForFirestore,
  type DocumentSnapshot,
} from "../../../providers/db-firebase";
import {
  PAYMENT_METHOD_PII_FIELDS,
  decryptPiiFields,
  encryptPiiFields,
} from "../../../security";
import {
  SAVED_PAYMENT_METHOD_FIELDS,
  SAVED_PAYMENT_METHODS_COLLECTION,
  type SavedPaymentMethodBanStatus,
  type SavedPaymentMethodCreateInput,
  type SavedPaymentMethodDocument,
} from "../schemas/saved-methods-firestore";

function normaliseIdentifier(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "").trim();
}

function computeIdentifierHash(type: string, identifier: string): string {
  return createHash("sha256")
    .update(`${type}|${normaliseIdentifier(identifier)}`)
    .digest("hex");
}

export class SavedPaymentMethodsRepository extends BaseRepository<SavedPaymentMethodDocument> {
  constructor() {
    super(SAVED_PAYMENT_METHODS_COLLECTION);
  }

  private decrypt(doc: SavedPaymentMethodDocument): SavedPaymentMethodDocument {
    return decryptPiiFields(doc, [...PAYMENT_METHOD_PII_FIELDS]) as SavedPaymentMethodDocument;
  }

  private encrypt<T extends object>(data: T): T {
    return encryptPiiFields(data, [...PAYMENT_METHOD_PII_FIELDS]);
  }

  protected override mapDoc<D = SavedPaymentMethodDocument>(snap: DocumentSnapshot): D {
    const raw = super.mapDoc<SavedPaymentMethodDocument>(snap);
    return this.decrypt(raw) as D;
  }

  override async createWithId(
    id: string,
    data: Partial<SavedPaymentMethodDocument>,
  ): Promise<SavedPaymentMethodDocument> {
    return super.createWithId(id, this.encrypt(data));
  }

  override async update(
    id: string,
    data: Partial<SavedPaymentMethodDocument>,
  ): Promise<SavedPaymentMethodDocument> {
    return super.update(id, this.encrypt(data));
  }

  /** List all saved methods for a user. Never returns raw `identifier` — only `displayLabel`. */
  async listByUser(userId: string): Promise<SavedPaymentMethodDocument[]> {
    try {
      const snap = await this.getCollection()
        .where(SAVED_PAYMENT_METHOD_FIELDS.USER_ID, "==", userId)
        .orderBy(SAVED_PAYMENT_METHOD_FIELDS.LAST_USED_AT, "desc")
        .get();
      return snap.docs.map((d) => {
        const doc = this.mapDoc<SavedPaymentMethodDocument>(d);
        doc.identifier = ""; // never expose decrypted PII to caller
        return doc;
      });
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to list payment methods for user:${userId}`, error);
    }
  }

  /**
   * Idempotent upsert by (userId + identifierHash).
   * Computes hash + encrypts identifier before write.
   * Updates lastUsedAt on re-add.
   */
  async upsertForUser(
    userId: string,
    input: SavedPaymentMethodCreateInput,
  ): Promise<SavedPaymentMethodDocument> {
    try {
      const hash = computeIdentifierHash(input.type, input.identifier);

      // Check for existing
      const existing = await this.getCollection()
        .where(SAVED_PAYMENT_METHOD_FIELDS.USER_ID, "==", userId)
        .where(SAVED_PAYMENT_METHOD_FIELDS.IDENTIFIER_HASH, "==", hash)
        .limit(1)
        .get();

      const now = new Date();

      if (!existing.empty) {
        const docId = existing.docs[0].id;
        return this.update(docId, { lastUsedAt: now, displayLabel: input.displayLabel });
      }

      const docRef = this.getCollection().doc();
      const data: Omit<SavedPaymentMethodDocument, "id"> = {
        userId,
        type: input.type,
        identifier: input.identifier,
        displayLabel: input.displayLabel,
        identifierHash: hash,
        isDefault: input.isDefault ?? false,
        lastUsedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      await docRef.set(prepareForFirestore(this.encrypt(data)));

      serverLogger.info("Saved payment method created", { userId, type: input.type, docId: docRef.id });

      const refetched = await this.findById(docRef.id);
      if (!refetched) throw new DatabaseError("Payment method not readable after create");
      refetched.identifier = "";
      return refetched;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to upsert payment method for user:${userId}`, error);
    }
  }

  /** Cross-account lookup by identifierHash. Returns display-safe docs (identifier stripped). */
  async listByIdentifierHash(hash: string): Promise<SavedPaymentMethodDocument[]> {
    try {
      const snap = await this.getCollection()
        .where(SAVED_PAYMENT_METHOD_FIELDS.IDENTIFIER_HASH, "==", hash)
        .get();
      return snap.docs.map((d) => {
        const doc = this.mapDoc<SavedPaymentMethodDocument>(d);
        doc.identifier = "";
        return doc;
      });
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to lookup payment methods by hash`, error);
    }
  }

  /** Batch-ban all methods for a user. Used by hard-ban cascade. */
  async banAllForUser(
    userId: string,
    banData: { banReason: string; bannedBy: string },
  ): Promise<number> {
    try {
      const snap = await this.getCollection()
        .where(SAVED_PAYMENT_METHOD_FIELDS.USER_ID, "==", userId)
        .get();
      if (snap.empty) return 0;

      const now = new Date();
      const batch = this.db.batch();
      snap.docs.forEach((doc) => {
        batch.update(doc.ref, {
          [SAVED_PAYMENT_METHOD_FIELDS.BAN_STATUS]: "banned",
          [SAVED_PAYMENT_METHOD_FIELDS.BAN_REASON]: banData.banReason,
          [SAVED_PAYMENT_METHOD_FIELDS.BANNED_BY]: banData.bannedBy,
          [SAVED_PAYMENT_METHOD_FIELDS.BANNED_AT]: now,
          [SAVED_PAYMENT_METHOD_FIELDS.AUTO_BANNED]: true,
          [SAVED_PAYMENT_METHOD_FIELDS.UPDATED_AT]: now,
        });
      });
      await batch.commit();
      return snap.size;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to ban payment methods for user:${userId}`, error);
    }
  }

  /** Reverse auto-ban cascade on user unban. Leaves manually-banned methods untouched. */
  async unbanAutoForUser(userId: string): Promise<number> {
    try {
      const snap = await this.getCollection()
        .where(SAVED_PAYMENT_METHOD_FIELDS.USER_ID, "==", userId)
        .where(SAVED_PAYMENT_METHOD_FIELDS.AUTO_BANNED, "==", true)
        .get();
      if (snap.empty) return 0;

      const now = new Date();
      const batch = this.db.batch();
      snap.docs.forEach((doc) => {
        batch.update(doc.ref, {
          [SAVED_PAYMENT_METHOD_FIELDS.BAN_STATUS]: null,
          [SAVED_PAYMENT_METHOD_FIELDS.BAN_REASON]: null,
          [SAVED_PAYMENT_METHOD_FIELDS.BANNED_BY]: null,
          [SAVED_PAYMENT_METHOD_FIELDS.BANNED_AT]: null,
          [SAVED_PAYMENT_METHOD_FIELDS.AUTO_BANNED]: null,
          [SAVED_PAYMENT_METHOD_FIELDS.UPDATED_AT]: now,
        });
      });
      await batch.commit();
      return snap.size;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to unban payment methods for user:${userId}`, error);
    }
  }

  /** List by banStatus for admin view. Returns display-safe docs. */
  async listByBanStatus(
    banStatus: SavedPaymentMethodBanStatus,
    limit = 50,
    offset = 0,
  ): Promise<SavedPaymentMethodDocument[]> {
    try {
      const snap = await this.getCollection()
        .where(SAVED_PAYMENT_METHOD_FIELDS.BAN_STATUS, "==", banStatus)
        .orderBy(SAVED_PAYMENT_METHOD_FIELDS.BANNED_AT, "desc")
        .limit(limit)
        .offset(offset)
        .get();
      return snap.docs.map((d) => {
        const doc = this.mapDoc<SavedPaymentMethodDocument>(d);
        doc.identifier = "";
        return doc;
      });
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to list payment methods by banStatus:${banStatus}`, error);
    }
  }

  async banById(
    id: string,
    banData: { banReason: string; bannedBy: string },
  ): Promise<void> {
    await this.update(id, {
      banStatus: "banned",
      banReason: banData.banReason,
      bannedBy: banData.bannedBy,
      bannedAt: new Date(),
      autoBanned: false,
    } as Partial<SavedPaymentMethodDocument>);
  }

  async clearBanById(id: string): Promise<void> {
    const now = new Date();
    await this.db.collection(SAVED_PAYMENT_METHODS_COLLECTION).doc(id).update({
      [SAVED_PAYMENT_METHOD_FIELDS.BAN_STATUS]: null,
      [SAVED_PAYMENT_METHOD_FIELDS.BAN_REASON]: null,
      [SAVED_PAYMENT_METHOD_FIELDS.BANNED_BY]: null,
      [SAVED_PAYMENT_METHOD_FIELDS.BANNED_AT]: null,
      [SAVED_PAYMENT_METHOD_FIELDS.AUTO_BANNED]: null,
      [SAVED_PAYMENT_METHOD_FIELDS.UNBAN_REQUEST_NOTE]: null,
      [SAVED_PAYMENT_METHOD_FIELDS.UNBAN_REQUESTED_AT]: null,
      [SAVED_PAYMENT_METHOD_FIELDS.UPDATED_AT]: now,
    });
  }

  async deleteForUser(userId: string, id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new DatabaseError(`Payment method ${id} not found for user:${userId}`);
    }
    await this.delete(id);
  }

  /** Public wrapper — compute identifier hash from outside the class (e.g. in API routes). */
  computeIdentifierHash(type: string, identifier: string): string {
    return computeIdentifierHash(type, identifier);
  }
}

export const savedPaymentMethodsRepository = new SavedPaymentMethodsRepository();
