import { normalizeError } from "../../../errors/normalize";
import { DatabaseError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import type {
  FirebaseSieveFields,
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
  LOTTERY_ENTRY_PII_FIELDS,
} from "../../../security";
import {
  LOTTERY_ENTRIES_COLLECTION,
  LOTTERY_ENTRY_FIELDS,
  type LotteryEntryDocument,
} from "../schemas/firestore";

class LotteryEntryRepository extends BaseRepository<LotteryEntryDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    sourceType: { canFilter: true, canSort: false },
    eventId: { canFilter: true, canSort: false },
    productId: { canFilter: true, canSort: false },
    userId: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: false },
    submittedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    userLotteryNumber: { canFilter: false, canSort: true },
  };

  constructor() {
    super(LOTTERY_ENTRIES_COLLECTION);
  }

  protected override mapDoc<D = LotteryEntryDocument>(
    snap: import("../../../providers/db-firebase").DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<LotteryEntryDocument>(snap);
    return decryptPiiFields(raw, [
      ...LOTTERY_ENTRY_PII_FIELDS,
    ]) as unknown as D;
  }

  /**
   * Get the next sequential userLotteryNumber for a source atomically.
   * Returns current count + 1.
   */
  async nextUserLotteryNumber(
    sourceId: string,
    field: "eventId" | "productId",
  ): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where(field, "==", sourceId)
        .get();
      return snapshot.size + 1;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to get next lottery number for ${field}=${sourceId}`,
        error,
      );
    }
  }

  /**
   * Count entries for a given source and transaction ID.
   * Used to enforce maxPullsPerTransaction.
   */
  async countByTransactionId(
    sourceId: string,
    sourceField: "eventId" | "productId",
    transactionId: string,
  ): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where(sourceField, "==", sourceId)
        .where(LOTTERY_ENTRY_FIELDS.TRANSACTION_ID, "==", transactionId)
        .get();
      return snapshot.size;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to count entries for transactionId=${transactionId}`,
        error,
      );
    }
  }

  /**
   * Count entries for a given source and user.
   * Used to enforce maxPullsPerUser.
   */
  async countByUser(
    sourceId: string,
    sourceField: "eventId" | "productId",
    userId: string,
  ): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where(sourceField, "==", sourceId)
        .where(LOTTERY_ENTRY_FIELDS.USER_ID, "==", userId)
        .where(LOTTERY_ENTRY_FIELDS.STATUS, "!=", "cancelled")
        .get();
      return snapshot.size;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to count entries for userId=${userId}`,
        error,
      );
    }
  }

  /** List all entries for an event/product source. Paginated via Sieve. */
  async listForSource(
    sourceId: string,
    sourceField: "eventId" | "productId",
    model: SieveModel,
  ): Promise<FirebaseSieveResult<LotteryEntryDocument>> {
    return this.sieveQuery<LotteryEntryDocument>(
      model,
      LotteryEntryRepository.SIEVE_FIELDS,
      {
        baseQuery: this.getCollection().where(sourceField, "==", sourceId),
      },
    );
  }

  /** List entries for a specific user across all sources. */
  async listForUser(
    userId: string,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<LotteryEntryDocument>> {
    return this.sieveQuery<LotteryEntryDocument>(
      model,
      LotteryEntryRepository.SIEVE_FIELDS,
      {
        baseQuery: this.getCollection().where(LOTTERY_ENTRY_FIELDS.USER_ID, "==", userId),
      },
    );
  }

  /** Create a lottery entry with PII encryption. */
  async createEntry(
    data: Omit<LotteryEntryDocument, "id">,
  ): Promise<LotteryEntryDocument> {
    try {
      const encrypted = encryptPiiFields(
        data as unknown as import("@mohasinac/appkit").FirestoreDocument,
        [...LOTTERY_ENTRY_PII_FIELDS],
      );
      const prepared = prepareForFirestore({ ...encrypted });
      const ref = await this.getCollection().add(prepared);
      const created = await ref.get();

      serverLogger.info("Lottery entry created", {
        entryId: ref.id,
        sourceType: data.sourceType,
        eventId: data.eventId,
        productId: data.productId,
        userId: data.userId,
        userLotteryNumber: data.userLotteryNumber,
      });

      return this.mapDoc<LotteryEntryDocument>(created);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to create lottery entry", error);
    }
  }

  /** Flag a lottery entry as fraudulent. */
  async flagEntry(
    entryId: string,
    flagNote: string,
    flaggedBy: string,
  ): Promise<LotteryEntryDocument> {
    try {
      await this.getCollection().doc(entryId).update(
        prepareForFirestore({
          isFlagged: true,
          flagNote,
          flaggedBy,
          flaggedAt: new Date(),
          status: "flagged",
        }),
      );
      return this.findByIdOrFail(entryId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to flag lottery entry ${entryId}`, error);
    }
  }
}

export { LotteryEntryRepository };
export const lotteryEntryRepository = new LotteryEntryRepository();
