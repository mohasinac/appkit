/**
 * Entry votes — cast, change, retract, and summarise.
 *
 * See `../schemas/entry-votes.ts` for why the document id is the idempotency
 * key, why only `userId` is stored on the row, and why ranking is a config
 * rule rather than arithmetic in this file.
 *
 * @tag domain:events
 * @tag layer:repository
 * @tag access:server-only
 */

import { normalizeError } from "../../../errors/normalize";
import { DatabaseError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import { BaseRepository } from "../../../providers/db-firebase";
import {
  EVENT_ENTRY_VOTES_COLLECTION,
  EVENT_ENTRY_VOTE_FIELDS,
  eventEntryVoteId,
  type EntryVoteAudit,
  type EntryVoteSummary,
  type EntryVoteValue,
  type EventEntryVoteDocument,
} from "../schemas/entry-votes";
import { EVENT_ENTRIES_COLLECTION } from "../schemas/firestore";

/** The counters kept on the entry so a gallery needs no per-card query. */
interface EntryVoteCounters {
  likeCount?: number;
  dislikeCount?: number;
}

export class EventEntryVotesRepository extends BaseRepository<EventEntryVoteDocument> {
  constructor() {
    super(EVENT_ENTRY_VOTES_COLLECTION);
  }

  /**
   * Cast, change or retract a vote.
   *
   * 🛑 ONE TRANSACTION, and the counters are adjusted by the DELTA the vote
   * actually caused — never by a bare increment beside a bare set. The three
   * cases differ and each would corrupt the count if treated as one:
   *
   *   none  → like      likes +1
   *   like  → dislike   likes -1 AND dislikes +1   (the case a toggle misses)
   *   like  → like      retraction: likes -1, row deleted
   *
   * Reading the vote row inside the transaction is what makes each adjustment
   * conditional on the membership really changing, so a double-click or a
   * replayed request cannot double-count.
   */
  async cast(
    eventId: string,
    entryId: string,
    userId: string,
    value: EntryVoteValue,
  ): Promise<EntryVoteSummary> {
    try {
      const db = this.db;
      const voteRef = this.getCollection().doc(eventEntryVoteId(entryId, userId));
      const entryRef = db.collection(EVENT_ENTRIES_COLLECTION).doc(entryId);

      return await db.runTransaction(async (tx) => {
        const [voteSnap, entrySnap] = await Promise.all([tx.get(voteRef), tx.get(entryRef)]);

        if (!entrySnap.exists) {
          // Voting on a deleted entry would strand a row the cascade cannot
          // find — the cleanup keys on the entry existing.
          throw new DatabaseError(`Entry not found: ${entryId}`);
        }

        const counters = (entrySnap.data() as EntryVoteCounters | undefined) ?? {};
        let likes = Number(counters.likeCount ?? 0);
        let dislikes = Number(counters.dislikeCount ?? 0);

        const previous = voteSnap.exists
          ? ((voteSnap.data() as EventEntryVoteDocument).value as EntryVoteValue)
          : null;

        let myVote: EntryVoteValue | null;
        const now = new Date();

        if (previous === value) {
          // Same direction twice is a RETRACTION — the second press of a
          // pressed button. Matches how the like button already behaves.
          tx.delete(voteRef);
          if (value === "like") likes -= 1;
          else dislikes -= 1;
          myVote = null;
        } else {
          if (previous === "like") likes -= 1;
          if (previous === "dislike") dislikes -= 1;
          if (value === "like") likes += 1;
          else dislikes += 1;

          tx.set(
            voteRef,
            {
              eventId,
              entryId,
              userId,
              value,
              createdAt: voteSnap.exists
                ? ((voteSnap.data() as EventEntryVoteDocument).createdAt ?? now)
                : now,
              updatedAt: now,
            },
            { merge: true },
          );
          myVote = value;
        }

        /*
         * 🛑 Floor at zero, the same call `eventLikes.toggle` makes. A count
         * can only go negative if it has drifted — a row removed by a cascade
         * without the counter moving — and a public "-1" is worse than an
         * understated 0.
         */
        likes = Math.max(0, likes);
        dislikes = Math.max(0, dislikes);

        tx.update(entryRef, { likeCount: likes, dislikeCount: dislikes, updatedAt: now });

        /*
         * `score` is NOT computed here. The ranking rule is config
         * (`entryRanking` rule sets) and `resolveEntryRanking` is the one
         * place it is interpreted — a second formula in a repository is how
         * two screens come to disagree about who is winning.
         */
        return { likes, dislikes, score: likes - dislikes, myVote };
      });
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.error("entryVotes.cast failed", { entryId, userId, value, message: e.message });
      throw new DatabaseError(`Failed to record vote: ${e.message}`);
    }
  }

  /** How this user voted. One document read — no query, no index. */
  async myVote(entryId: string, userId: string): Promise<EntryVoteValue | null> {
    try {
      const snap = await this.getCollection().doc(eventEntryVoteId(entryId, userId)).get();
      if (!snap.exists) return null;
      return (snap.data() as EventEntryVoteDocument).value;
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.error("entryVotes.myVote failed", { entryId, userId, message: e.message });
      throw new DatabaseError(`Failed to read vote: ${e.message}`);
    }
  }

  /**
   * ADMIN ONLY — who voted, and which way.
   *
   * 🛑 The public path never calls this. `EntryVoteAudit` and
   * `EntryVoteSummary` are separate, non-overlapping types precisely so a
   * public handler returning the wrong one is a compile error rather than a
   * leak of who voted. Owner rule: *"only admins see who voted, rest see
   * numbers"*.
   */
  async audit(entryId: string, summary: EntryVoteSummary, max = 500): Promise<EntryVoteAudit> {
    try {
      const snap = await this.getCollection()
        .where(EVENT_ENTRY_VOTE_FIELDS.ENTRY_ID, "==", entryId)
        .limit(max)
        .get();

      const voters = snap.docs.map((d) => {
        const v = d.data() as EventEntryVoteDocument;
        return { userId: v.userId, value: v.value, at: v.updatedAt ?? v.createdAt };
      });

      return { ...summary, voters };
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.error("entryVotes.audit failed", { entryId, message: e.message });
      throw new DatabaseError(`Failed to read voters: ${e.message}`);
    }
  }
}

export const eventEntryVotesRepository = new EventEntryVotesRepository();
