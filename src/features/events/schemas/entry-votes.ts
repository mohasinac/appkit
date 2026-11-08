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
 * ## 🛑 Ranking is a CONFIG RULE, never a fixed formula
 *
 * This file first shipped with `entryScore = likes - dislikes` hardcoded, which
 * is the exact mistake the rework exists to remove: a rule baked into code that
 * an admin then cannot change. There are several legitimate situations — a
 * like-only popularity contest, a net-score vote, a straight turnout count, a
 * jury pick — and the event, not the source, decides which applies.
 *
 * So the rule is a value on the event and `resolveEntryRanking` is the one
 * place it is interpreted. Adding a fifth rule is a case here plus a config
 * option; it is never a second copy of the arithmetic somewhere else.
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
 * How an event ranks its entries. Stored on the event, chosen by an admin.
 *
 * `manual` means a human picks the winner and the scoreboard is informational
 * only — which is a real situation (a jury prize), not an absence of a rule.
 */
/*
 * 🛑 OPEN, not a closed union. Owner, 2026-11-08: *"nothing in the code should
 * be fixed … the types we have now are the DEFAULT TEMPLATES"*.
 *
 * The five spellings are the shipped defaults and exist here only so the common
 * ones autocomplete. `(string & {})` keeps the union open, so a site that wants
 * a ranking we never imagined adds a rule-set row and a resolver case rather
 * than editing this file to ask permission.
 *
 * The rows live in `seed/rule-sets-seed-data.ts` under `entryRanking`, beside
 * payment, shipping, tax, offers and coins — a contest ranking is a rule set
 * like any other, not a special case.
 */
export type EntryRankingRule =
  | "most-likes"
  | "net-score"
  | "most-votes"
  | "earliest"
  | "manual"
  | (string & {});

/** The default when an event does not say. Matches "most liked photo wins". */
export const DEFAULT_ENTRY_RANKING: EntryRankingRule = "most-likes";

export interface EntryRankingInput {
  likes: number;
  dislikes: number;
  /** Used by `earliest`, and as the tie-break for every other rule. */
  submittedAt: Date;
}

/**
 * The ONE place a ranking rule is interpreted.
 *
 * Returns the sort key, descending — so the gallery, the scoreboard, the winner
 * resolution and any export all order entries identically. Two screens
 * disagreeing about who is winning is the failure this prevents.
 *
 * `manual` returns 0 for every entry on purpose: with no computed order, the
 * caller must fall back to the tie-break (earliest first) rather than invent
 * one, and the UI shows a human decision is pending.
 */
export function resolveEntryRanking(
  rule: EntryRankingRule,
  entry: EntryRankingInput,
): number {
  switch (rule) {
    case "most-likes":
      return entry.likes;
    case "net-score":
      return entry.likes - entry.dislikes;
    case "most-votes":
      return entry.likes + entry.dislikes;
    case "earliest":
      /*
       * Negated so that, like every other rule, a HIGHER key sorts first —
       * callers sort one way and need no per-rule direction flag.
       */
      return -entry.submittedAt.getTime();
    case "manual":
      return 0;
    default:
      /*
       * An unknown rule means config names something this build does not
       * implement — a newer rule set against an older deploy. Rank everything
       * equally and let the tie-break order it, which degrades to "earliest
       * first" rather than throwing on a public page. The admin screen is
       * where an unimplemented rule should be surfaced, not the gallery.
       */
      return 0;
  }
}

/**
 * The published tie-break: the earlier entry wins.
 *
 * Stated here because it has to be announced BEFORE a contest closes. Deciding
 * a tie afterwards, however fairly, looks like deciding it to suit someone.
 */
export function entryTieBreak(a: EntryRankingInput, b: EntryRankingInput): number {
  return a.submittedAt.getTime() - b.submittedAt.getTime();
}
