import { normalizeError } from "../../../errors/normalize";
import {
  rankEntries,
  DEFAULT_ENTRY_RANKING_RULE_SET,
  type EntryRankingRuleSet,
} from "../schemas/entry-ranking";
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
  EVENT_ENTRY_PII_FIELDS,
} from "../../../security";
import {
  EVENT_ENTRIES_COLLECTION,
  EVENT_ENTRY_FIELDS,
  type EventEntryCreateInput,
  type EventEntryDocument,
  type EventEntryPlain,
} from "../schemas";
import type { FirestoreDocument } from "../../../schemas/types";
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
    /*
     * 🛑 SORTABLE, but the public gallery must NOT use it — and the reason is
     * the same one `isPinned` carries on the event document.
     *
     * A Firestore `orderBy` EXCLUDES every document that lacks the ordering
     * field (Root Cause #100). `likeCount` is absent until an entry's first
     * vote, so `sorts: "-likeCount"` would answer HTTP 200 with every
     * never-voted entry missing — i.e. nearly the whole gallery on the day a
     * contest opens, and silently.
     *
     * Declared anyway because an ADMIN leaderboard over a settled contest is a
     * legitimate caller, and because a counter that is written, declared on
     * the document and then not sortable is a trap of its own. Whoever uses it
     * needs the `(eventId, reviewStatus, likeCount DESC)` composite deployed.
     *
     * The ranked read goes through `resolveEntryRanking` in memory, which is
     * also the only thing that can honour a CONFIGURED rule — net-score,
     * most-votes, earliest and jury are not expressible as one Firestore sort.
     */
    likeCount: { canFilter: true, canSort: true },
    dislikeCount: { canFilter: true, canSort: true },
  };

  constructor() {
    super(EVENT_ENTRIES_COLLECTION);
  }

  /*
   * 🛑 `mapDoc` is NOT overridden, and that absence IS the change.
   *
   * It used to decrypt on every read, so ciphertext never left the database
   * and every caller handled plaintext without ever saying so. Following
   * `SiteSettingsRepository`: reads return what Firestore holds, and plaintext
   * requires one of the two named methods below.
   *
   * A convention would not hold this. `EventEntryDocument`'s PII fields are
   * `Encrypted<string>`, assignable to nothing that wants a plain `string`, so
   * a reader that skips both accessors is a compile error naming file and line.
   */

  /** Plaintext PII. **Opt-in and named** — shows up in review and in a grep. */
  revealEntry(doc: EventEntryDocument): EventEntryPlain {
    return revealPii<EventEntryPlain>(doc, EVENT_ENTRY_PII_FIELDS);
  }

  /** As `revealEntry`, for a list read. */
  revealEntrys(docs: readonly EventEntryDocument[]): EventEntryPlain[] {
    return docs.map((d) => this.revealEntry(d));
  }

  /**
   * Masked PII — **the default for any surface that only needs to identify a
   * row to a human.** Decrypts first, then masks: the mask helpers refuse
   * ciphertext by design, so passing a stored field straight in would return
   * "Anonymous" for every row.
   */
  maskedEntry(doc: EventEntryDocument): EventEntryPlain {
    return maskPii<EventEntryPlain>(doc, EVENT_ENTRY_PII_FIELDS);
  }

  /** As `maskedEntry`, for a list read. */
  maskedEntrys(docs: readonly EventEntryDocument[]): EventEntryPlain[] {
    return docs.map((d) => this.maskedEntry(d));
  }

  /**
   * DECLARED, not called per method.
   *
   * 🛑 Encryption used to be one hand-written `encryptPiiFields(...)` inside
   * `createEntry`. Every other write path — `update`, the moderation methods
   * that route through it, the `*InTx` / `*InBatch` family — inherited the
   * unhooked base implementations, so an entrant's display name, email or IP
   * arriving through any of them was stored in PLAINTEXT with nothing failing.
   * Declaring the fields puts enforcement in `applyWriteHooks`, which every
   * write path runs, so a new method cannot silently skip it.
   */
  protected override piiFields = EVENT_ENTRY_PII_FIELDS;

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

  /**
   * One caller's own winning spins for an event, newest first.
   *
   * 🛑 Deliberately the SAME query shape as `countUserEntries` — two equalities
   * on `(eventId, userId)` and no `orderBy` — so it needs no composite index
   * that does not already exist. `getRecentSpinResults` orders by `spinWonAt`,
   * which is fine with its single equality but would demand a new
   * `(eventId, userId, spinWonAt)` index here, and an index that has not been
   * deployed fails with FAILED_PRECONDITION at runtime while looking perfectly
   * correct in source (Root Cause #2).
   *
   * Sorting in memory is safe precisely because this set is tiny and bounded by
   * the event's own `spinMaxPerUser` — it is "my spins", not a feed. Rows with
   * no `spinWonAt` are dropped rather than sorted to an arbitrary end: an entry
   * that never resolved a prize is not a spin result.
   */
  async getUserSpinResults(
    eventId: string,
    userId: string,
  ): Promise<EventEntryDocument[]> {
    try {
      const snapshot = await this.getCollection()
        .where(EVENT_ENTRY_FIELDS.EVENT_ID, "==", eventId)
        .where(EVENT_ENTRY_FIELDS.USER_ID, "==", userId)
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc(doc))
        .filter((entry) => Boolean(entry.spinWonAt))
        .sort((a, b) => {
          const at = new Date(a.spinWonAt as unknown as string).getTime();
          const bt = new Date(b.spinWonAt as unknown as string).getTime();
          return (Number.isFinite(bt) ? bt : 0) - (Number.isFinite(at) ? at : 0);
        });
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to load spin results for user ${userId} on event ${eventId}`,
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

  /**
   * The scoreboard — ranked ENTRIES, ordered by the event's own ranking rule.
   *
   * ## 🛑 This used to sum `points` PER USER, and it always read zero
   *
   * `points` is an admin-typed field that nothing in the contest path sets, so
   * every row rendered `0 pts` — the owner screenshotted exactly that. Worse,
   * grouping by user made a PHOTO contest rank photographers: two entries from
   * one person collapsed into a row that named neither, and the projection
   * carried no entry id, so no row could link to the thing being judged.
   *
   * It now ranks entries through `rankEntries`, the SAME resolver the gallery
   * and the winner resolution use, so the three cannot disagree about who is
   * winning. The rule comes from the event's `entryRanking` rule set — for the
   * photo contest that is `ranking-most-likes`, whose own `publicWording` the
   * page already renders.
   *
   * ⚠ `points` is untouched on the document: admin-scored events are a real
   * mechanic. Which field ranks is the rule set's decision, not this method's.
   *
   * ⚠ Ordering is done IN MEMORY, deliberately, for the reason
   * `entry-gallery.ts` records: a Firestore `orderBy likeCount` drops every
   * document where the field is absent, and `likeCount` does not exist until
   * an entry's first vote — so a database sort would HIDE most of a contest.
   */
  async getLeaderboard(
    eventId: string,
    limit = 50,
    ruleSet?: Pick<EntryRankingRuleSet, "rule" | "tieBreak">,
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

      const rows = snapshot.docs.map((doc) => {
        /*
         * MASKED, not decrypted. This builds a public LEADERBOARD, so it needs
         * a name to show and has no business holding the real one — the rows
         * go straight into a response. `maskPii` decrypts and then masks, which
         * is required here: `maskName` refuses ciphertext by design, so masking
         * the stored value directly would render every competitor "Anonymous".
         */
        const raw = maskPii<EventEntryPlain>(
          { id: doc.id, ...doc.data() } as FirestoreDocument,
          EVENT_ENTRY_PII_FIELDS,
        );
        const likes = typeof raw.likeCount === "number" ? raw.likeCount : 0;
        const dislikes =
          typeof raw.dislikeCount === "number" ? raw.dislikeCount : 0;
        /*
         * An unreadable `submittedAt` sorts EARLIEST, matching
         * `entry-gallery.ts`. The tie-break must be total or two entries on the
         * same like count can swap places between requests.
         */
        const submittedAt =
          raw.submittedAt instanceof Date
            ? raw.submittedAt
            : new Date(String(raw.submittedAt ?? 0));
        const cover = Array.isArray(raw.media) ? raw.media[0] : undefined;
        return {
          entryId: doc.id,
          userId: raw.userId ?? doc.id,
          userDisplayName: raw.userDisplayName ?? raw.userId ?? doc.id,
          likes,
          dislikes,
          submittedAt,
          points: typeof raw.points === "number" ? raw.points : 0,
          coverUrl:
            cover && typeof cover === "object" && "url" in cover
              ? String((cover as { url?: unknown }).url ?? "")
              : undefined,
        };
      });

      const rule = ruleSet ?? DEFAULT_ENTRY_RANKING_RULE_SET;
      return rankEntries(rule, rows)
        .slice(0, limit)
        .map((row) => ({
          rank: row.rank,
          userId: row.userId,
          userDisplayName: row.userDisplayName,
          /* Kept on the wire so an admin-scored event still reports its score. */
          totalPoints: row.points,
          entryCount: 1,
          entryId: row.entryId,
          likeCount: row.likes,
          dislikeCount: row.dislikes,
          ...(row.coverUrl ? { coverUrl: row.coverUrl } : {}),
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

  /**
   * A per-participant entry slot id: `<eventId>:<userId>:<slot>`.
   *
   * 🛑 `:` and not `/` — a `/` in a Firestore document id silently creates a
   * SUBCOLLECTION path instead of a document, so `doc("a/b")` is a different
   * object from `doc("a:b")` and would never collide with anything. Both
   * components are slugs or Firebase uids today (`[A-Za-z0-9_-]`), but the
   * caller below refuses to use a slot id at all if either one contains a `/`
   * rather than quietly writing to a path nobody enforces uniqueness on.
   */
  private static slotId(eventId: string, userId: string, slot: number): string {
    return `${eventId}:${userId}:${slot}`;
  }

  /** Is this the Firestore `ALREADY_EXISTS` refusal from `DocumentReference.create()`? */
  private static isAlreadyExists(error: unknown): boolean {
    // gRPC status 6 = ALREADY_EXISTS. The numeric code is the contract; the
    // string is checked too because the REST transport reports it that way.
    const code = (error as { code?: number | string } | null)?.code;
    if (code === 6 || code === "6" || code === "already-exists") return true;
    const message = error instanceof Error ? error.message : String(error);
    return /ALREADY_EXISTS/i.test(message);
  }

  /**
   * Write one event entry.
   *
   * ## `opts.entrySlotLimit` — the RACE-SAFE path
   *
   * Without it (guests, and any caller that does not enforce a per-user limit)
   * this is `collection.add()` with an auto-id, exactly as before.
   *
   * With it, and with `input.userId` present, the entry is written to a
   * DETERMINISTIC id — `<eventId>:<userId>:<slot>` for `slot` in
   * `0 … entrySlotLimit-1` — using `DocumentReference.create()`, which FAILS
   * with `ALREADY_EXISTS` if the document is already there. The first slot that
   * accepts the write wins; when every slot is taken this returns `null` and the
   * caller refuses the submission.
   *
   * 🛑 `create()`, never `set()`. `set()` on a taken slot would OVERWRITE a
   * participant's existing entry — a second submission would silently replace
   * the first, including its `reviewStatus` and any points an admin had already
   * awarded. The whole point is that the second submission is REFUSED, not
   * merged.
   *
   * ## Why document-id uniqueness and not a transaction
   *
   * A transaction around count+create would also be correct, and would handle
   * the legacy caveat below. It was not chosen because:
   *
   *  - Uniqueness here is enforced by Firestore's own primary key, which is the
   *    strongest guarantee available and costs one write. A transaction costs a
   *    query read plus contention retries on exactly the requests that are
   *    already contending.
   *  - A transaction only serialises against OTHER transactions. Every existing
   *    non-transactional write path in `enterEvent` (the poll, survey and
   *    giveaway `countUserEntries` pre-checks) would still be able to slip a
   *    duplicate past it. A taken document id refuses every writer, whatever
   *    path it came from.
   *  - `entrySlotLimit` is 1 by default (`resolveEntryLimit`), so the common
   *    case is a single `create()` with no extra read at all.
   *
   * ## ⚠ Entries already written with random ids
   *
   * Nothing is migrated and nothing changes for them. A pre-2026-11-10 entry has
   * an auto-id, so it occupies NO slot — which is why the caller keeps its
   * `countUserEntries` pre-check: that check is the only thing that sees legacy
   * documents, and it is what preserves today's behaviour for a participant who
   * already entered. Slot allocation starts at the counted total (see
   * `startSlot`), so N legacy entries consume the first N slot indices and the
   * total per participant still cannot exceed the limit.
   *
   * ⚠ Residual, stated rather than implied: if entries are DELETED, the slots
   * below the new count stay occupied while the count drops, so a participant
   * can end up refused with fewer than `entrySlotLimit` live entries. Refusing
   * too often is the safe direction, and it only arises on an event whose
   * entries are being deleted individually.
   */
  async createEntry(
    input: EventEntryCreateInput,
    opts?: { entrySlotLimit?: number; startSlot?: number },
  ): Promise<EventEntryDocument | null> {
    try {
      const now = new Date();
      /*
       * 🛑 `applyWriteHooks`, not a hand-written `encryptPiiFields(...)`. The
       * declared `piiFields` above is the single encryptor for this
       * collection; this bespoke `ref.create()` path goes through the same hook
       * so there is no second list to drift from it.
       */
      const data = prepareForFirestore({
        ...this.applyWriteHooks(input as FirestoreDocument),
        submittedAt: now,
      });

      const limit = opts?.entrySlotLimit;
      const userId = input.userId;
      const slottable =
        typeof limit === "number" &&
        limit > 0 &&
        typeof userId === "string" &&
        userId.length > 0 &&
        !userId.includes("/") &&
        !input.eventId.includes("/");

      if (slottable) {
        const start = Math.max(0, Math.min(opts?.startSlot ?? 0, limit - 1));
        for (let slot = start; slot < limit; slot += 1) {
          const id = EventEntryRepository.slotId(input.eventId, userId, slot);
          const ref = this.getCollection().doc(id);
          try {
            await ref.create(data);
            const created = await ref.get();
            serverLogger.info("Event entry created", {
              entryId: id,
              eventId: input.eventId,
              userId,
              slot,
            });
            return { id, ...created.data() } as EventEntryDocument;
          } catch (slotError) {
            if (!EventEntryRepository.isAlreadyExists(slotError)) throw slotError;
            // Slot taken — either by an earlier entry or by a concurrent
            // submission that won the race. Try the next one.
          }
        }
        serverLogger.info("Event entry refused: all per-user slots taken", {
          eventId: input.eventId,
          userId,
          entrySlotLimit: limit,
          startSlot: start,
        });
        return null;
      }

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
