/**
 * Event likes — the public "N people like this" signal, and who.
 *
 * ## Why this replaced "participants" on public surfaces
 *
 * Every event card and the detail hero showed `stats.totalEntries` as
 * "N entries". For a raffle or a poll an entry is a real thing; for an
 * `offer` or a `sale` nobody "enters" a cashback code, so the number was
 * structurally 0 and the label meant nothing. A like works on every event
 * type, which an entry cannot.
 *
 * Entries are NOT replaced anywhere they are real — participate, leaderboard
 * and every admin surface still read `eventEntries`. This is a second,
 * lighter signal beside them, not a rename of the first.
 *
 * ## 🛑 The document id IS the idempotency key
 *
 * `{eventId}__{userId}`, the `courierVoteId` precedent. A like is a `.set()`,
 * an unlike is a `.delete()`, and "have I liked this" is a single
 * `.doc(id).get()` — no query, no index, no transaction needed to dedupe.
 *
 * The alternative considered and rejected was the review-helpful shape, an
 * `likedBy[]` array on the event document. It has no un-vote by design (see
 * `voteHelpful`'s own comment) and it caps out at Firestore's 1 MiB document
 * limit, which is a real ceiling for a popular event and a silent one.
 *
 * ## 🛑 No denormalised name or email on this row
 *
 * Only `userId`. `enterEvent` denormalises `userDisplayName`/`userEmail` onto
 * an entry and both are then PII-encrypted, masked on read, and must be
 * stripped by every projection that touches them. A likes row is read on a
 * PUBLIC surface by definition, so the cheapest way to never leak a field is
 * to not store it: the display name and avatar are joined from the user's own
 * public projection at read time instead.
 *
 * @tag domain:events
 * @tag layer:schema
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const EVENT_LIKES_COLLECTION = "eventLikes" as const;

/**
 * The deterministic id. A repeat like overwrites itself rather than
 * double-counting; an unlike deletes exactly this document.
 *
 * 🛑 `__` matches `courierVoteId` and the tester-response id
 * (`${testerId}__${checklistItemId}`). Firestore ids may not contain `/`, and
 * a single `_` appears inside real uids — a double underscore does not.
 */
export function eventLikeId(eventId: string, userId: string): string {
  return `${eventId}__${userId}`;
}

export interface EventLikeDocument extends BaseDocument {
  eventId: string;
  /** The Firebase Auth uid. The ONLY identity stored — see the header. */
  userId: string;
  createdAt: Date;
}

export const EVENT_LIKE_FIELDS = {
  EVENT_ID: "eventId",
  USER_ID: "userId",
  CREATED_AT: "createdAt",
} as const;

/**
 * A liker as a public visitor may see them.
 *
 * An explicit allow-list, never a spread of the user document: that document
 * carries email, phone, role, addresses and store ownership, and a spread
 * publishes every field nobody thought to delete — including fields the
 * interface does not declare (Root Cause #70).
 *
 * `displayName` and `photoURL` are both in `USER_PUBLIC_FIELDS` and neither is
 * in `USER_PII_FIELDS`; they already render on public profile pages, so this
 * publishes nothing new.
 */
export interface PublicLiker {
  uid: string;
  displayName: string;
  photoURL?: string;
}

/** How many faces the rail shows before "View all". */
export const LIKERS_PREVIEW_LIMIT = 10;

/** One page of the "everyone who liked this" modal. */
export const LIKERS_PAGE_SIZE = 24;
