/**
 * Entry votes — like/dislike on a CONTEST ENTRY, and who cast them.
 *
 * ## Why a sibling of `likes.ts` rather than a field on the entry
 *
 * Deliberately the same shape as `EventLikeDocument`, for the same reasons its
 * header gives: the document id IS the idempotency key, so a repeat vote
 * overwrites itself, a retraction is a `.delete()`, and "how did I vote" is a
 * single `.doc(id).get()` with no query, no index and no transaction.
 *
 * The rejected alternative is the same one: a `votedBy[]` array on the entry.
 * It caps out at Firestore's 1 MiB document limit — a real ceiling for a
 * popular entry and a silent one — and it has no clean un-vote.
 *
 * ## 🛑 The difference from a like: a vote has a VALUE
 *
 * `likes.ts` stores existence — the row is the like. A vote stores a
 * direction, so the row carries `value` and changing your mind is a `.set()`
 * over the same id rather than a delete-then-create. That keeps "one vote per
 * user per entry" true by construction instead of by a rule somebody enforces.
 *
 * ## 🛑 Who may see WHO voted
 *
 * Owner, 2026-11-08: *"only admins see who voted, rest see numbers"*.
 *
 * So the voter list is an admin projection and the counts are the public one.
 * This file stores only `userId` — never a denormalised name or email — for
 * exactly the reason `likes.ts` states: a public surface reads the counts, and
 * the cheapest way to never leak a field is to not store it. An admin screen
 * joins the user's own public projection at read time.
 *
 * ## 🛑 Ranking is NET: likes minus dislikes
 *
 * Owner decision, 2026-11-08. Note the consequence, because it is not what the
 * published contest artwork says — that reads "THE MOST LIKED PHOTO WINS". If
 * the ranking subtracts dislikes, the public rules copy has to say so too, or
 * the winner cannot be explained from the rules as written.
 *
 * @tag domain:events
 * @tag layer:schema
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const EVENT_ENTRY_VOTES_COLLECTION = "eventEntryVotes" as const;

/**
 * The deterministic id — one row per user per entry.
 *
 * 🛑 `__` matches `eventLikeId`, `courierVoteId` and the tester-response id.
 * Firestore ids may not contain `/`, and a single `_` appears inside real
 * uids; a double underscore does not.
 */
export function eventEntryVoteId(entryId: string, userId: string): string {
  return `${entryId}__${userId}`;
}

/** Which way the vote points. */
export type EntryVoteValue = "like" | "dislike";

export interface EventEntryVoteDocument extends BaseDocument {
  /** Denormalised so an admin can sweep one event without joining entries. */
  eventId: string;
  entryId: string;
  /** The Firebase Auth uid. The ONLY identity stored — see the header. */
  userId: string;
  value: EntryVoteValue;
  /*
   * `createdAt` and `updatedAt` are both inherited from `BaseDocument` and are
   * both REQUIRED there. `updatedAt` is not optional here even though a first
   * vote has never been changed — on a first write the two are simply equal,
   * which is what every other collection does. Narrowing it to optional is a
   * type error, and rightly so: a repository that sets it unconditionally
   * would otherwise disagree with the declared shape.
   */
}

export const EVENT_ENTRY_VOTE_FIELDS = {
  EVENT_ID: "eventId",
  ENTRY_ID: "entryId",
  USER_ID: "userId",
  VALUE: "value",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

/**
 * What a PUBLIC visitor may see: counts, and their own vote. Never a voter.
 */
export interface EntryVoteSummary {
  likes: number;
  dislikes: number;
  /** likes − dislikes. The ranking key. */
  score: number;
  /** The viewer's own vote, when signed in. `null` means they have not voted. */
  myVote: EntryVoteValue | null;
}

/**
 * What an ADMIN may additionally see.
 *
 * A separate type rather than optional fields on the summary above, so a
 * public handler cannot return this by forgetting to strip something — the
 * shapes do not overlap, and returning the wrong one is a type error rather
 * than a leak.
 */
export interface EntryVoteAudit extends EntryVoteSummary {
  voters: Array<{
    userId: string;
    value: EntryVoteValue;
    at: Date;
  }>;
}

/**
 * The ranking key for a contest entry.
 *
 * 🛑 Net, per the owner decision — NOT a like count. Exported as a function so
 * the scoreboard, the winner resolution and any report all compute it the same
 * way; a second copy of `likes - dislikes` somewhere is how two screens come
 * to disagree about who won.
 */
export function entryScore(likes: number, dislikes: number): number {
  return likes - dislikes;
}
