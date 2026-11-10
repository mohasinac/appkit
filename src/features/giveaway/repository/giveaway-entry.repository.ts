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
  maskPii,
  revealPii,
  GIVEAWAY_ENTRY_PII_FIELDS,
} from "../../../security";
import {
  GIVEAWAY_ENTRIES_COLLECTION,
  GIVEAWAY_ENTRY_FIELDS,
  type GiveawayEntryDocument,
  type GiveawayEntryPlain,
} from "../schemas/firestore";

class GiveawayEntryRepository extends BaseRepository<GiveawayEntryDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    sourceType: { canFilter: true, canSort: false },
    eventId: { canFilter: true, canSort: false },
    productId: { canFilter: true, canSort: false },
    userId: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: false },
    submittedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    userGiveawayNumber: { canFilter: false, canSort: true },
  };

  constructor() {
    super(GIVEAWAY_ENTRIES_COLLECTION);
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
   * `GiveawayEntryDocument`'s PII fields are `Encrypted<string>`, assignable to
   * nothing that wants a plain `string`, so a reader that skips both accessors
   * is a compile error naming the file and line.
   */

  /**
   * Plaintext PII. **Opt-in and named** — for the admin entries table and the
   * draw notification, where the real address is the point.
   */
  revealEntry(doc: GiveawayEntryDocument): GiveawayEntryPlain {
    return revealPii<GiveawayEntryPlain>(doc, GIVEAWAY_ENTRY_PII_FIELDS);
  }

  /** As `revealEntry`, for a list read. */
  revealEntries(docs: readonly GiveawayEntryDocument[]): GiveawayEntryPlain[] {
    return docs.map((d) => this.revealEntry(d));
  }

  /**
   * Masked PII — **the default for any surface that only needs to identify a
   * row to a human.** Decrypts first, then masks: handing a stored field
   * straight to `maskName` would return "Anonymous" for every row, because
   * those helpers refuse ciphertext by design.
   */
  maskedEntry(doc: GiveawayEntryDocument): GiveawayEntryPlain {
    return maskPii<GiveawayEntryPlain>(doc, GIVEAWAY_ENTRY_PII_FIELDS);
  }

  /** As `maskedEntry`, for a list read. */
  maskedEntries(docs: readonly GiveawayEntryDocument[]): GiveawayEntryPlain[] {
    return docs.map((d) => this.maskedEntry(d));
  }

  /**
   * DECLARED, not called per method.
   *
   * 🛑 One hand-written `encryptPiiFields(...)` in `createEntry` used to be the
   * whole enforcement. `flagEntry`, `markWinner` and everything else routing
   * through the inherited `update` had no encryption at all, so an entrant's
   * phone, email or display name arriving on any of those paths was stored in
   * PLAINTEXT with nothing failing. The declaration moves it to
   * `applyWriteHooks`, which every write path runs.
   */
  protected override piiFields = GIVEAWAY_ENTRY_PII_FIELDS;

  /**
   * Get the next sequential userGiveawayNumber for a source atomically.
   * Returns current count + 1.
   */
  async nextUserGiveawayNumber(
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
        `Failed to get next giveaway number for ${field}=${sourceId}`,
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
        .where(GIVEAWAY_ENTRY_FIELDS.TRANSACTION_ID, "==", transactionId)
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
        .where(GIVEAWAY_ENTRY_FIELDS.USER_ID, "==", userId)
        .where(GIVEAWAY_ENTRY_FIELDS.STATUS, "!=", "cancelled")
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
  ): Promise<FirebaseSieveResult<GiveawayEntryDocument>> {
    return this.sieveQuery<GiveawayEntryDocument>(
      model,
      GiveawayEntryRepository.SIEVE_FIELDS,
      {
        baseQuery: this.getCollection().where(sourceField, "==", sourceId),
      },
    );
  }

  /** List entries for a specific user across all sources. */
  async listForUser(
    userId: string,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<GiveawayEntryDocument>> {
    return this.sieveQuery<GiveawayEntryDocument>(
      model,
      GiveawayEntryRepository.SIEVE_FIELDS,
      {
        baseQuery: this.getCollection().where(GIVEAWAY_ENTRY_FIELDS.USER_ID, "==", userId),
      },
    );
  }

  /** Create a giveaway entry with PII encryption. */
  /*
   * 🛑 Takes PLAINTEXT (`GiveawayEntryPlain`), returns CIPHERTEXT
   * (`GiveawayEntryDocument`), and the asymmetry is the point.
   *
   * The caller holds a real email and phone; this method encrypts them. Typing
   * the parameter `Omit<GiveawayEntryDocument, "id">` would have demanded the
   * caller hand over `Encrypted<string>` it does not have, and the only way to
   * satisfy that is `asEncrypted(email)` — which labels plaintext as ciphertext
   * and is exactly the misuse `asEncrypted`'s own docstring forbids. The
   * encryption happens here; so does the type change.
   */
  async createEntry(
    data: Omit<GiveawayEntryPlain, "id">,
  ): Promise<GiveawayEntryDocument> {
    try {
      /*
       * 🛑 `applyWriteHooks`, not a hand-written `encryptPiiFields(...)` — the
       * declared `piiFields` above is the single encryptor for this collection,
       * and this bespoke `.add()` path goes through the same hook.
       */
      const prepared = prepareForFirestore({
        ...this.applyWriteHooks(
          data as unknown as import("@mohasinac/appkit").FirestoreDocument,
        ),
      });
      const ref = await this.getCollection().add(prepared);
      const created = await ref.get();

      serverLogger.info("Giveaway entry created", {
        entryId: ref.id,
        sourceType: data.sourceType,
        eventId: data.eventId,
        productId: data.productId,
        userId: data.userId,
        userGiveawayNumber: data.userGiveawayNumber,
      });

      return this.mapDoc<GiveawayEntryDocument>(created);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to create giveaway entry", error);
    }
  }

  /** Flag a giveaway entry as fraudulent. */
  async flagEntry(
    entryId: string,
    flagNote: string,
    flaggedBy: string,
  ): Promise<GiveawayEntryDocument> {
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
      throw new DatabaseError(`Failed to flag giveaway entry ${entryId}`, error);
    }
  }
}

export { GiveawayEntryRepository };
export const giveawayEntryRepository = new GiveawayEntryRepository();
