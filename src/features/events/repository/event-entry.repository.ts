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
  EVENT_ENTRY_PII_FIELDS,
} from "../../../security";
import {
  EVENT_ENTRIES_COLLECTION,
  EVENT_ENTRY_FIELDS,
  type EventEntryCreateInput,
  type EventEntryDocument,
} from "../schemas";
import type { FirestoreDocument } from "@mohasinac/appkit";
import type { JsonValue } from "../../../schemas/types";

/** Extracted from getExportReport's poll branch to stay under the max nesting depth. */
function formatPollResultLines(
  pollOptions: { id: string; label: string }[],
  countByOption: Map<string, number>,
  total: number,
): string[] {
  return pollOptions.map((opt) => {
    const count = countByOption.get(opt.id) ?? 0;
    const percent = Math.round((count / total) * 100);
    return `- **${opt.label}** — ${count} vote${count === 1 ? "" : "s"} (${percent}%)`;
  });
}

/** Extracted from getExportReport's per-entry loop to stay under the max nesting depth. */
function formatFormResponseLines(formResponses: Record<string, JsonValue>): string[] {
  return Object.entries(formResponses).map(
    ([key, value]) =>
      `  - ${key}: ${Array.isArray(value) ? value.join(", ") : String(value ?? "—")}`,
  );
}

class EventEntryRepository extends BaseRepository<EventEntryDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    eventId: { canFilter: true, canSort: false },
    userId: { canFilter: true, canSort: false },
    userDisplayName: { canFilter: false, canSort: false },
    reviewStatus: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: false },
    submittedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    points: { canFilter: true, canSort: true },
  };

  constructor() {
    super(EVENT_ENTRIES_COLLECTION);
  }

  protected override mapDoc<D = EventEntryDocument>(
    snap: import("../../../providers/db-firebase").DocumentSnapshot,
  ): D {
    const raw = super.mapDoc<EventEntryDocument>(snap);
    return decryptPiiFields(raw, [
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

  async listForUser(
    userId: string,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<EventEntryDocument>> {
    return this.sieveQuery<EventEntryDocument>(
      model,
      EventEntryRepository.SIEVE_FIELDS,
      {
        baseQuery: this.getCollection().where(
          EVENT_ENTRY_FIELDS.USER_ID,
          "==",
          userId,
        ),
      },
    );
  }

  /**
   * W1-42 — admin-facing list (all events, all users). Filterable on eventId,
   * userId, reviewStatus, submittedAt; sortable on submittedAt + points.
   */
  async list(model: SieveModel): Promise<FirebaseSieveResult<EventEntryDocument>> {
    return this.sieveQuery<EventEntryDocument>(
      model,
      EventEntryRepository.SIEVE_FIELDS,
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
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to check user entry for event ${eventId}`,
        error,
      );
    }
  }

  /** Guest (unauthenticated) counterpart of `hasUserEntered` — keyed by the hashed IP, never the raw address. */
  async hasGuestEntered(eventId: string, guestIpHash: string): Promise<boolean> {
    try {
      const snapshot = await this.getCollection()
        .where(EVENT_ENTRY_FIELDS.EVENT_ID, "==", eventId)
        .where(EVENT_ENTRY_FIELDS.GUEST_IP_HASH, "==", guestIpHash)
        .limit(1)
        .get();

      return !snapshot.empty;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to check guest entry for event ${eventId}`,
        error,
      );
    }
  }

  /**
   * Last N spins that resulted in a prize being assigned, most recent
   * first. Firestore's `orderBy` excludes documents missing the ordered
   * field, so this naturally returns only entries that actually spun
   * (every write path sets `spinWonAt` and `spinPrizeId` together).
   */
  async getRecentSpinResults(
    eventId: string,
    limit = 10,
  ): Promise<EventEntryDocument[]> {
    try {
      const snapshot = await this.getCollection()
        .where(EVENT_ENTRY_FIELDS.EVENT_ID, "==", eventId)
        .orderBy(EVENT_ENTRY_FIELDS.SPIN_WON_AT, "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => this.mapDoc(doc));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to get recent spin results for event ${eventId}`,
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
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to count user entries for event ${eventId}`,
        error,
      );
    }
  }

  async getLeaderboard(
    eventId: string,
    limit = 50,
  ): Promise<import("../types").LeaderboardEntry[]> {
    try {
      const snapshot = await this.getCollection()
        .where(EVENT_ENTRY_FIELDS.EVENT_ID, "==", eventId)
        .where(
          EVENT_ENTRY_FIELDS.REVIEW_STATUS,
          "==",
          EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
        )
        .get();

      // Aggregate per user: sum all approved entry points
      const byUser = new Map<string, { displayName: string; totalPoints: number; entryCount: number }>();
      for (const doc of snapshot.docs) {
        const raw = decryptPiiFields(
          { id: doc.id, ...doc.data() } as FirestoreDocument,
          [...EVENT_ENTRY_PII_FIELDS],
        ) as unknown as EventEntryDocument;
        if (!raw.userId) continue;
        const existing = byUser.get(raw.userId);
        const pts = typeof raw.points === "number" ? raw.points : 0;
        if (existing) {
          existing.totalPoints += pts;
          existing.entryCount += 1;
        } else {
          byUser.set(raw.userId, {
            displayName: raw.userDisplayName ?? raw.userId,
            totalPoints: pts,
            entryCount: 1,
          });
        }
      }

      return Array.from(byUser.entries())
        .sort((a, b) => b[1].totalPoints - a[1].totalPoints)
        .slice(0, limit)
        .map(([userId, data], idx) => ({
          rank: idx + 1,
          userId,
          userDisplayName: data.displayName,
          totalPoints: data.totalPoints,
          entryCount: data.entryCount,
        }));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to get leaderboard for event ${eventId}`,
        error,
      );
    }
  }

  /**
   * Raw vote tally per poll option id for a poll-type event. This repository
   * has no access to the events collection, so it cannot resolve option
   * labels — the caller (event-actions.ts, which has the EventDocument's
   * pollConfig.options in hand) joins optionId -> label and computes percent.
   */
  async getPollResults(
    eventId: string,
  ): Promise<{ optionId: string; count: number }[]> {
    try {
      const snapshot = await this.getCollection()
        .where(EVENT_ENTRY_FIELDS.EVENT_ID, "==", eventId)
        .where(
          EVENT_ENTRY_FIELDS.REVIEW_STATUS,
          "==",
          EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
        )
        .get();

      const counts = new Map<string, number>();
      for (const doc of snapshot.docs) {
        const data = doc.data() as EventEntryDocument;
        for (const optionId of data.pollVotes ?? []) {
          counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
        }
      }

      return Array.from(counts.entries()).map(([optionId, count]) => ({
        optionId,
        count,
      }));
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to get poll results for event ${eventId}`,
        error,
      );
    }
  }

  /**
   * Markdown export for the admin Event Entries view (AdminEventEntriesView
   * "Download Report" button). For a poll event, renders the same
   * per-option vote tally as getPollResults — the caller passes
   * event.pollConfig.options since this repository has no access to the
   * events collection to resolve labels itself. For every other event type
   * (survey included — survey's points-based leaderboard is intentional,
   * see getEventPollResults' doc comment in event-actions.ts), lists
   * individual entries: submitter, submission date, review status, points,
   * and form responses — mirroring what the on-screen table + "Responses"
   * panel already show.
   */
  async getExportReport(
    eventId: string,
    event: {
      title: string;
      type: string;
      pollOptions?: { id: string; label: string }[];
    },
  ): Promise<string> {
    try {
      const lines: string[] = [];
      lines.push(`# Event Entries Report — ${event.title}`);
      lines.push("");
      lines.push(`Generated ${new Date().toISOString()}`);
      lines.push("");
      lines.push("---");
      lines.push("");

      if (event.type === "poll" && event.pollOptions) {
        const tally = await this.getPollResults(eventId);
        const countByOption = new Map(tally.map((t) => [t.optionId, t.count]));
        const total = tally.reduce((sum, t) => sum + t.count, 0);

        lines.push("## Poll Results");
        lines.push("");
        if (total === 0) {
          lines.push("_No votes yet._");
          lines.push("");
        } else {
          lines.push(...formatPollResultLines(event.pollOptions, countByOption, total));
          lines.push("");
          lines.push(`${total} total vote${total === 1 ? "" : "s"}.`);
          lines.push("");
        }
        return lines.join("\n");
      }

      const snapshot = await this.getCollection()
        .where(EVENT_ENTRY_FIELDS.EVENT_ID, "==", eventId)
        .get();

      const entries = snapshot.docs
        .map((doc) => this.mapDoc<EventEntryDocument>(doc))
        .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

      lines.push(`## Entries (${entries.length})`);
      lines.push("");

      if (entries.length === 0) {
        lines.push("_No entries yet._");
        lines.push("");
        return lines.join("\n");
      }

      for (const entry of entries) {
        const who = entry.userDisplayName || entry.userEmail || entry.userId || "Guest";
        lines.push(`### ${who}`);
        lines.push(`- Submitted: ${entry.submittedAt.toISOString()}`);
        lines.push(`- Status: ${entry.reviewStatus}`);
        if (typeof entry.points === "number") lines.push(`- Points: ${entry.points}`);
        if (entry.pollVotes && entry.pollVotes.length > 0) {
          lines.push(`- Poll votes: ${entry.pollVotes.join(", ")}`);
          if (entry.pollComment) lines.push(`- Comment: ${entry.pollComment}`);
        }
        if (entry.formResponses && Object.keys(entry.formResponses).length > 0) {
          lines.push("- Responses:");
          lines.push(...formatFormResponseLines(entry.formResponses));
        }
        lines.push("");
      }

      return lines.join("\n");
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to get export report for event ${eventId}`,
        error,
      );
    }
  }

  async createEntry(input: EventEntryCreateInput): Promise<EventEntryDocument> {
    try {
      const now = new Date();
      const encrypted = encryptPiiFields(input as FirestoreDocument, [
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
      void normalizeError(error);
      throw new DatabaseError("Failed to create event entry", error);
    }
  }

  async reviewEntry(
    id: string,
    reviewStatus: EventEntryDocument["reviewStatus"],
    reviewedBy: string,
    reviewNote?: string,
    points?: number,
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
            ...(points !== undefined ? { points } : {}),
          }),
        );

      serverLogger.info("Event entry reviewed", { entryId: id, reviewStatus });

      return this.findByIdOrFail(id);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(`Failed to review event entry ${id}`, error);
    }
  }
}

const eventEntryRepository = new EventEntryRepository();

export { EventEntryRepository, eventEntryRepository };
export { EventEntryRepository as EventEntriesRepository };
