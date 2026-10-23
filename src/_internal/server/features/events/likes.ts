/**
 * Event likes — the server read path, and the only place a liker's identity
 * is assembled.
 *
 * @tag domain:events
 * @tag layer:server
 * @tag access:server-only
 */

import { cache } from "react";
import { eventLikesRepository } from "../../../../features/events/repository/event-likes.repository";
import { userRepository } from "../../../../features/auth/repository/user.repository";
import {
  LIKERS_PREVIEW_LIMIT,
  type PublicLiker,
} from "../../../../features/events/schemas/likes";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";

/**
 * Project a user document down to the three fields a face needs.
 *
 * 🛑 AN ALLOW-LIST, NEVER A SPREAD. The user document carries email, phone,
 * role, store ownership and encrypted PII; a spread-and-delete publishes
 * every field nobody thought to remove, including fields the interface does
 * not declare — which is precisely how `adSettings.providerCredentials` ended
 * up on a public endpoint (Root Cause #70).
 *
 * 🛑 AND NOT `maskPii`. The obvious-looking alternative is to read the name
 * off the event ENTRY and mask it, which is what the leaderboard and the spin
 * results do. That renders "A*** K***" — correct for a leaderboard, useless
 * as a face. `displayName` and `photoURL` are in `USER_PUBLIC_FIELDS`, are
 * absent from `USER_PII_FIELDS`, and already render on public profile pages,
 * so taking them from the user document publishes nothing new.
 */
function toPublicLiker(doc: { uid?: string; id?: string; displayName?: string; photoURL?: string } | null): PublicLiker | null {
  const uid = doc?.uid ?? doc?.id;
  if (!uid) return null;
  return {
    uid: String(uid),
    // A real account with no display name renders as a person, not a blank.
    displayName: doc?.displayName?.trim() || "A collector",
    photoURL: doc?.photoURL || undefined,
  };
}

export interface EventLikersPage {
  likers: PublicLiker[];
  /** True when more rows exist past this page. */
  hasMore: boolean;
}

/**
 * The most recent likers, resolved to names and faces.
 *
 * Two hops, both bounded: one indexed query for the ids, then one batched
 * lookup for the profiles. The join is why the like row stores no name — see
 * `schemas/likes.ts`.
 *
 * A user that cannot be resolved (deleted account, say) is DROPPED rather
 * than rendered as a placeholder: a face with no person behind it is worse
 * than a shorter rail.
 */
export async function getEventLikers(
  eventId: string,
  limit: number = LIKERS_PREVIEW_LIMIT,
  offset = 0,
): Promise<EventLikersPage> {
  try {
    // One extra row is the cheapest possible "is there a next page" — it
    // avoids a count query, which Firestore bills per matched document.
    const ids = await eventLikesRepository.recentLikerIds(eventId, limit + 1, offset);
    const hasMore = ids.length > limit;
    const pageIds = hasMore ? ids.slice(0, limit) : ids;

    const docs = await Promise.all(
      pageIds.map((uid) =>
        userRepository
          .findByUid(uid)
          .catch(() => null),
      ),
    );

    return {
      likers: docs
        .map((d) => toPublicLiker(d as Parameters<typeof toPublicLiker>[0]))
        .filter((l): l is PublicLiker => l !== null),
      hasMore,
    };
  } catch (err) {
    const e = normalizeError(err);
    serverLogger.warn("getEventLikers failed", { eventId, message: e.message });
    // An empty rail is a degraded page; a thrown error is a dead one. The
    // count beside it comes from the event document and still renders.
    return { likers: [], hasMore: false };
  }
}

/**
 * Cached for the page+metadata pair. `React.cache` memoises per argument
 * list, so the default-arguments call site here and any explicit-limit call
 * site would be two entries — which is why every caller on a page should use
 * the same shape.
 */
export const getEventLikersCached = cache(getEventLikers);

/** Has the viewer liked it? `false` for a signed-out visitor, with no read. */
export async function viewerHasLiked(eventId: string, userId?: string): Promise<boolean> {
  if (!userId) return false;
  return eventLikesRepository.hasLiked(eventId, userId);
}

export const viewerHasLikedCached = cache(viewerHasLiked);

/** Days plotted by the engagement chart. */
export const LIKE_TREND_DAYS = 14;

/**
 * Below this many likes the chart renders NOTHING.
 *
 * 🛑 This threshold is the honest half of the feature. A brand-new event has
 * two likes, and plotting them produces a flat line with a y-axis and a date
 * range — which looks like a measurement and carries no information. An
 * absent chart says "not enough data yet"; a flat one says "we measured, and
 * this is the result", which is a different and false claim.
 */
export const LIKE_TREND_MIN_POINTS = 5;

export interface LikeTrend {
  /** Day labels, oldest first, e.g. "6 Nov". */
  categories: string[];
  /** Likes received on each of those days. Same length as `categories`. */
  values: number[];
}

/**
 * Likes per day over the last `LIKE_TREND_DAYS`, oldest first.
 *
 * Returns `null` — not an empty chart — when there is too little to plot.
 *
 * Bounded by `recentLikeTimes`' own 200-row cap: that is far more than 14
 * days of a realistic event, and it means this cannot become an unbounded
 * collection scan on a popular one (Rule #6).
 */
export async function getLikeTrend(eventId: string): Promise<LikeTrend | null> {
  const times = await eventLikesRepository.recentLikeTimes(eventId);
  if (times.length < LIKE_TREND_MIN_POINTS) return null;

  const now = new Date();
  const buckets: { label: string; count: number }[] = [];
  const index = new Map<string, number>();

  for (let i = LIKE_TREND_DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    index.set(key, buckets.length);
    buckets.push({
      label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      count: 0,
    });
  }

  for (const t of times) {
    const slot = index.get(t.toISOString().slice(0, 10));
    // Older than the window — `recentLikeTimes` returns newest-first over a
    // 200-row cap, so this is the normal case for a long-running event.
    if (slot !== undefined) buckets[slot].count += 1;
  }

  // Every like could be older than the window even though the count cleared
  // the threshold, which would plot fourteen zeroes.
  if (buckets.every((b) => b.count === 0)) return null;

  return {
    categories: buckets.map((b) => b.label),
    values: buckets.map((b) => b.count),
  };
}

export const getLikeTrendCached = cache(getLikeTrend);
