import { DatabaseError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import { slugify } from "../../../utils";
import { ALL_EVENT_STATUSES, ALL_EVENT_TYPES } from "../types";
import type {
  FirebaseSieveFields,
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import { normalizeError } from "../../../errors/normalize";
import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
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
    searchTxt: { canFilter: true, canSort: false },
    type: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: true },
    title: { canFilter: true, canSort: true },
    createdBy: { canFilter: true, canSort: false },
    startsAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    endsAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
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
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  constructor() {
    super(EVENTS_COLLECTION);
  }

  async list(model: SieveModel): Promise<FirebaseSieveResult<EventDocument>> {
    return this.sieveQuery<EventDocument>(model, EventRepository.SIEVE_FIELDS);
  }

  /**
   * How many events exist per `type` and per `status` — the numbers behind the
   * facet checkboxes, and what lets a type with no events disappear from the
   * filter instead of offering a guaranteed-empty result.
   *
   * Events carry no store/category/brand FK (verified against `EventDocument`),
   * so these counts are global by nature; `baseFilters` narrows them only when
   * a surface wants a subset (e.g. the public page counting active events).
   *
   * Both fields are counted in ONE parallel batch — 13 `.count()` aggregations,
   * no document reads.
   */
  async facetCountsForTypesAndStatuses(opts?: {
    types?: readonly string[];
    statuses?: readonly string[];
    baseFilters?: string;
  }): Promise<Record<string, number | undefined>> {
    const types = opts?.types ?? ALL_EVENT_TYPES;
    const statuses = opts?.statuses ?? ALL_EVENT_STATUSES;
    const [typeCounts, statusCounts] = await Promise.all([
      this.facetCounts(EVENT_FIELDS.TYPE, types, EventRepository.SIEVE_FIELDS, {
        baseFilters: opts?.baseFilters,
      }),
      this.facetCounts(
        EVENT_FIELDS.STATUS,
        statuses,
        EventRepository.SIEVE_FIELDS,
        { baseFilters: opts?.baseFilters },
      ),
    ]);
    // Type and status values are disjoint, so one flat map is unambiguous and
    // lets the filter component look either up by value without knowing which
    // field it came from.
    return { ...typeCounts, ...statusCounts };
  }

  async findBySlug(slug: string): Promise<EventDocument | null> {
    return this.findOneBy(EVENT_FIELDS.SLUG, slug);
  }

  async findByIdOrSlug(idOrSlug: string): Promise<EventDocument | null> {
    const bySlug = await this.findBySlug(idOrSlug);
    if (bySlug) return bySlug;
    return this.findById(idOrSlug);
  }

  /**
   * Active events sharing at least one tag with the given list — "related
   * events" discovery. `array-contains-any` caps at 10 values, so only the
   * first 10 tags are used.
   */
  async findByTagsOverlap(tags: string[], limit = 8): Promise<EventDocument[]> {
    if (tags.length === 0) return [];
    try {
      const snap = await this.getCollection()
        .where(EVENT_FIELDS.STATUS, "==", EVENT_FIELDS.STATUS_VALUES.ACTIVE)
        .where(EVENT_FIELDS.TAGS, "array-contains-any", tags.slice(0, 10))
        .limit(limit)
        .get();
      return snap.docs.map((doc) => this.mapDoc<EventDocument>(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError("Failed to find events by tag overlap", error);
    }
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
      void normalizeError(error);
      throw new DatabaseError("Failed to list active events", error);
    }
  }

  async createEvent(input: EventCreateInput): Promise<EventDocument> {
    try {
      const now = new Date();
      const slug = (input as EventDocument).slug || slugify(input.title);
      const data = prepareForFirestore({
        ...input,
        slug,
        stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
        createdAt: now,
        updatedAt: now,
      });

      const ref = await this.getCollection().add(data);
      const created = await ref.get();

      serverLogger.info("Event created", { eventId: ref.id, type: input.type });

      return this.mapDoc<EventDocument>(created);
    } catch (error) {
      void normalizeError(error);
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
      void normalizeError(error);
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
      void normalizeError(error);
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
      void normalizeError(error);
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
      void normalizeError(error);
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
