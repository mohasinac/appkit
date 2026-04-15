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
} from "../../../providers/db-firebase";
import {
  decryptPiiFields,
  encryptPiiFields,
  EVENT_ENTRY_PII_FIELDS,
} from "../../../security";
import {
  EVENT_ENTRIES_COLLECTION,
  EVENT_ENTRY_FIELDS,
  type EventEntryCreateInput,
  type EventEntryDocument,
} from "../schemas";

class EventEntryRepository extends BaseRepository<EventEntryDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    eventId: { canFilter: true, canSort: false },
    userId: { canFilter: true, canSort: false },
    userDisplayName: { canFilter: false, canSort: false },
    reviewStatus: { canFilter: true, canSort: false },
    submittedAt: { canFilter: true, canSort: true },
    points: { canFilter: true, canSort: true },
  };

  constructor() {
    super(EVENT_ENTRIES_COLLECTION);
  }

  protected override mapDoc<D = EventEntryDocument>(
    snap: import("firebase-admin/firestore").DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<EventEntryDocument>(snap);
    return decryptPiiFields(raw as unknown as Record<string, unknown>, [
      ...EVENT_ENTRY_PII_FIELDS,
    ]) as unknown as D;
  }

  async listForEvent(
    eventId: string,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<EventEntryDocument>> {
    return this.sieveQuery<EventEntryDocument>(
      model,
      EventEntryRepository.SIEVE_FIELDS,
      {
        baseQuery: this.getCollection().where(
          EVENT_ENTRY_FIELDS.EVENT_ID,
          "==",
          eventId,
        ),
      },
    );
  }

  async hasUserEntered(eventId: string, userId: string): Promise<boolean> {
    try {
      const snapshot = await this.getCollection()
        .where(EVENT_ENTRY_FIELDS.EVENT_ID, "==", eventId)
        .where(EVENT_ENTRY_FIELDS.USER_ID, "==", userId)
        .limit(1)
        .get();

      return !snapshot.empty;
    } catch (error) {
      throw new DatabaseError(
        `Failed to check user entry for event ${eventId}`,
        error,
      );
    }
  }

  async countUserEntries(eventId: string, userId: string): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where(EVENT_ENTRY_FIELDS.EVENT_ID, "==", eventId)
        .where(EVENT_ENTRY_FIELDS.USER_ID, "==", userId)
        .get();

      return snapshot.size;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count user entries for event ${eventId}`,
        error,
      );
    }
  }

  async getLeaderboard(
    eventId: string,
    limit = 50,
  ): Promise<EventEntryDocument[]> {
    try {
      const snapshot = await this.getCollection()
        .where(EVENT_ENTRY_FIELDS.EVENT_ID, "==", eventId)
        .where(
          EVENT_ENTRY_FIELDS.REVIEW_STATUS,
          "==",
          EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
        )
        .orderBy(EVENT_ENTRY_FIELDS.POINTS, "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) =>
        decryptPiiFields(
          {
            id: doc.id,
            ...doc.data(),
          } as Record<string, unknown>,
          [...EVENT_ENTRY_PII_FIELDS],
        ),
      ) as unknown as EventEntryDocument[];
    } catch (error) {
      throw new DatabaseError(
        `Failed to get leaderboard for event ${eventId}`,
        error,
      );
    }
  }

  async createEntry(input: EventEntryCreateInput): Promise<EventEntryDocument> {
    try {
      const now = new Date();
      const encrypted = encryptPiiFields(input as Record<string, unknown>, [
        ...EVENT_ENTRY_PII_FIELDS,
      ]);
      const data = prepareForFirestore({
        ...encrypted,
        submittedAt: now,
      });

      const ref = await this.getCollection().add(data);
      const created = await ref.get();

      serverLogger.info("Event entry created", {
        entryId: ref.id,
        eventId: input.eventId,
        userId: input.userId,
      });

      return { id: ref.id, ...created.data() } as EventEntryDocument;
    } catch (error) {
      throw new DatabaseError("Failed to create event entry", error);
    }
  }

  async reviewEntry(
    id: string,
    reviewStatus: EventEntryDocument["reviewStatus"],
    reviewedBy: string,
    reviewNote?: string,
  ): Promise<EventEntryDocument> {
    try {
      const now = new Date();
      await this.getCollection()
        .doc(id)
        .update(
          prepareForFirestore({
            [EVENT_ENTRY_FIELDS.REVIEW_STATUS]: reviewStatus,
            [EVENT_ENTRY_FIELDS.REVIEWED_BY]: reviewedBy,
            [EVENT_ENTRY_FIELDS.REVIEWED_AT]: now,
            ...(reviewNote !== undefined ? { reviewNote } : {}),
          }),
        );

      serverLogger.info("Event entry reviewed", { entryId: id, reviewStatus });

      return this.findByIdOrFail(id);
    } catch (error) {
      throw new DatabaseError(`Failed to review event entry ${id}`, error);
    }
  }
}

const eventEntryRepository = new EventEntryRepository();

export { EventEntryRepository, eventEntryRepository };
export { EventEntryRepository as EventEntriesRepository };
