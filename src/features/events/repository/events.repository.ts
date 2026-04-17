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
  EVENT_FIELDS,
  EVENTS_COLLECTION,
  type EventCreateInput,
  type EventDocument,
  type EventUpdateInput,
} from "../schemas";
import { increment } from "../../../contracts/field-ops";

class EventRepository extends BaseRepository<EventDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    type: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: true },
    title: { canFilter: true, canSort: true },
    createdBy: { canFilter: true, canSort: false },
    startsAt: { canFilter: true, canSort: true },
    endsAt: { canFilter: true, canSort: true },
    "stats.totalEntries": {
      path: "stats.totalEntries",
      canFilter: true,
      canSort: true,
    },
    "stats.approvedEntries": {
      path: "stats.approvedEntries",
      canFilter: true,
      canSort: true,
    },
    "stats.flaggedEntries": {
      path: "stats.flaggedEntries",
      canFilter: true,
      canSort: true,
    },
    id: { canFilter: true, canSort: false },
    createdAt: { canFilter: true, canSort: true },
  };

  constructor() {
    super(EVENTS_COLLECTION);
  }

  async list(model: SieveModel): Promise<FirebaseSieveResult<EventDocument>> {
    return this.sieveQuery<EventDocument>(model, EventRepository.SIEVE_FIELDS);
  }

  async listActive(): Promise<EventDocument[]> {
    try {
      const now = new Date();
      const snapshot = await this.getCollection()
        .where(EVENT_FIELDS.STATUS, "==", EVENT_FIELDS.STATUS_VALUES.ACTIVE)
        .where(EVENT_FIELDS.ENDS_AT, ">=", now)
        .orderBy(EVENT_FIELDS.ENDS_AT, "asc")
        .get();

      return snapshot.docs.map((doc) => this.mapDoc<EventDocument>(doc));
    } catch (error) {
      throw new DatabaseError("Failed to list active events", error);
    }
  }

  async createEvent(input: EventCreateInput): Promise<EventDocument> {
    try {
      const now = new Date();
      const data = prepareForFirestore({
        ...input,
        stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
        createdAt: now,
        updatedAt: now,
      });

      const ref = await this.getCollection().add(data);
      const created = await ref.get();

      serverLogger.info("Event created", { eventId: ref.id, type: input.type });

      return this.mapDoc<EventDocument>(created);
    } catch (error) {
      throw new DatabaseError("Failed to create event", error);
    }
  }

  async updateEvent(
    id: string,
    input: EventUpdateInput,
  ): Promise<EventDocument> {
    try {
      const now = new Date();
      const data = prepareForFirestore({
        ...input,
        [EVENT_FIELDS.UPDATED_AT]: now,
      });

      await this.getCollection().doc(id).update(data);
      const updated = await this.findByIdOrFail(id);

      serverLogger.info("Event updated", { eventId: id });

      return updated;
    } catch (error) {
      throw new DatabaseError(`Failed to update event ${id}`, error);
    }
  }

  async changeStatus(
    id: string,
    status: EventDocument["status"],
  ): Promise<EventDocument> {
    return this.updateEvent(id, { status });
  }

  async incrementTotalEntries(id: string): Promise<void> {
    try {
      await this.getCollection()
        .doc(id)
        .update({
          [EVENT_FIELDS.STATS.TOTAL_ENTRIES]: increment(1),
        });
    } catch (error) {
      throw new DatabaseError(
        `Failed to increment totalEntries for event ${id}`,
        error,
      );
    }
  }

  async incrementApprovedEntries(id: string): Promise<void> {
    try {
      await this.getCollection()
        .doc(id)
        .update({
          [EVENT_FIELDS.STATS.APPROVED_ENTRIES]: increment(1),
        });
    } catch (error) {
      throw new DatabaseError(
        `Failed to increment approvedEntries for event ${id}`,
        error,
      );
    }
  }

  async incrementFlaggedEntries(id: string): Promise<void> {
    try {
      await this.getCollection()
        .doc(id)
        .update({
          [EVENT_FIELDS.STATS.FLAGGED_ENTRIES]: increment(1),
        });
    } catch (error) {
      throw new DatabaseError(
        `Failed to increment flaggedEntries for event ${id}`,
        error,
      );
    }
  }
}

const eventRepository = new EventRepository();

export { EventRepository, eventRepository };
export { EventRepository as EventsRepository };
