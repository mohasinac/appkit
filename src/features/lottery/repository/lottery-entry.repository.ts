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
  encryptPiiFields,
  maskPii,
  revealPii,
  LOTTERY_ENTRY_PII_FIELDS,
} from "../../../security";
import {
  LOTTERY_ENTRIES_COLLECTION,
  LOTTERY_ENTRY_FIELDS,
  type LotteryEntryDocument,
  type LotteryEntryPlain,
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

  /*
   * 🛑 `mapDoc` is NOT overridden, and that is the whole change.
   *
   * It used to call `decryptPiiFields` on every read, so ciphertext never left
   * the database and all five consumers handled plaintext without ever saying
   * so. Following `SiteSettingsRepository`: reads return what Firestore holds,
   * and plaintext requires one of the two named methods below.
   *
   * The compiler enforces it rather than a convention doing so —
   * `LotteryEntryDocument`'s PII fields are `Encrypted<string>`, assignable to
   * nothing that wants a plain `string`, so a reader that skips both accessors
   * is a compile error naming the file and line.
   */

  /**
   * Plaintext PII. **Opt-in and named** — for the admin entries table and the
   * draw notification, where the real address is the point.
   */
  revealEntry(doc: LotteryEntryDocument): LotteryEntryPlain {
    return revealPii<LotteryEntryPlain>(doc, LOTTERY_ENTRY_PII_FIELDS);
  }

  /** As `revealEntry`, for a list read. */
  revealEntries(docs: readonly LotteryEntryDocument[]): LotteryEntryPlain[] {
    return docs.map((d) => this.revealEntry(d));
  }

  /**
   * Masked PII — **the default for any surface that only needs to identify a
   * row to a human.** Decrypts first, then masks: handing a stored field
   * straight to `maskName` would return "Anonymous" for every row, because
   * those helpers refuse ciphertext by design.
   */
  maskedEntry(doc: LotteryEntryDocument): LotteryEntryPlain {
    return maskPii<LotteryEntryPlain>(doc, LOTTERY_ENTRY_PII_FIELDS);
  }

  /** As `maskedEntry`, for a list read. */
  maskedEntries(docs: readonly LotteryEntryDocument[]): LotteryEntryPlain[] {
    return docs.map((d) => this.maskedEntry(d));
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
  /*
   * 🛑 Takes PLAINTEXT (`LotteryEntryPlain`), returns CIPHERTEXT
   * (`LotteryEntryDocument`), and the asymmetry is the point.
   *
   * The caller holds a real email and phone; this method encrypts them. Typing
   * the parameter `Omit<LotteryEntryDocument, "id">` would have demanded the
   * caller hand over `Encrypted<string>` it does not have, and the only way to
   * satisfy that is `asEncrypted(email)` — which labels plaintext as ciphertext
   * and is exactly the misuse `asEncrypted`'s own docstring forbids. The
   * encryption happens here; so does the type change.
   */
  async createEntry(
    data: Omit<LotteryEntryPlain, "id">,
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
