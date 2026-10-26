/*
 * WHY: So the "Liked by" rail and the engagement chart have something real to
 *      render on a fresh database. An empty rail renders null by design, so
 *      without these the feature is invisible and untestable.
 * WHAT: 9 likes on the one surviving season event, from the seeded buyer
 *       personas. Was 23 across six events until the 2026-10-27 prune.
 *
 * ## 🛑 IDS ARE DETERMINISTIC AND MUST STAY THAT WAY
 *
 * `eventLikeId(eventId, userId)` is `{eventId}__{userId}` — the same value on
 * every run, so `appkit-seed load` upserts the same rows rather than creating
 * duplicates. This is exactly the property `orders-seed-data.ts` lost when it
 * used `Math.random()` for a suffix: 50 fresh duplicate orders on every
 * reseed, and `status`/`delete` unable to find what a previous `load` wrote
 * (Root Cause #25). A like has no random component at all, which is the
 * cheapest possible way to hold that property.
 *
 * ## 🛑 `stats.likeCount` ON THE EVENT IS NOT UPDATED BY THIS FILE
 *
 * The counter is written only inside `eventLikesRepository.toggle`'s
 * transaction. The seeded events therefore carry the matching count in their
 * own `stats` — see `events-seed-data.ts`. Two writers for one number is the
 * mirror-drift trap (Root Cause #42); here the seed is a single consistent
 * snapshot, and every subsequent change goes through the transaction.
 *
 * EXPORTS:
 *   eventLikesSeedData — Array of EventLikeDocument for the seed runner
 *
 * @tag domain:events
 * @tag layer:seed
 * @tag access:server-only
 */

import type { EventLikeDocument } from "../features/events/schemas/likes";
import { eventLikeId } from "../features/events/schemas/likes";

/*
 * Spread across the last twelve days so the engagement chart has a SHAPE
 * rather than a single spike. `LIKE_TREND_MIN_POINTS` is 5 and the window is
 * 14 days, so the festive hub (9 likes) renders a chart.
 *
 * 🛑 The contrast this sentence used to draw — "and the quieter events
 * deliberately do not" — is gone with the five pruned events. There is no
 * below-threshold fixture any more; see the note in `LIKES`.
 */
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

/** `[eventId, userId, daysAgo]` — flattened below into real documents. */
const LIKES: [string, string, number][] = [
  // The season hub, the most-liked thing on the site.
  ["event-festive-cashback-10", "user-meera-bey", 11],
  ["event-festive-cashback-10", "user-tyson-blader", 10],
  ["event-festive-cashback-10", "user-ananya-collector", 9],
  ["event-festive-cashback-10", "user-rohit-collector", 7],
  ["event-festive-cashback-10", "user-vikram-wheels", 6],
  ["event-festive-cashback-10", "user-priya-cards", 4],
  ["event-festive-cashback-10", "user-sneha-vintage", 3],
  ["event-festive-cashback-10", "user-arjun-gunpla", 1],
  ["event-festive-cashback-10", "user-megumi-figures", 0],

  /*
   * 🛑 THE OTHER 14 LIKES WERE DELETED 2026-10-27, with the five events they
   * pointed at (see `events-seed-data.ts`). A like whose `eventId` resolves to
   * nothing is the dangling FK of Root Cause #26, and the "Liked by" rail
   * would render faces for an event no visitor can open.
   *
   * 🛑 CONSEQUENCE: the BELOW-THRESHOLD case is now unfixtured. Those four
   * events sat under `LIKE_TREND_MIN_POINTS` (5) on purpose, because a rail
   * with three faces and NO chart is the common real state and the one most
   * likely to be got wrong — the chart must render nothing rather than a flat
   * line that looks like a measurement. Only the 9-like hub remains, so today
   * this corpus exercises the chart-renders branch and not the chart-withheld
   * branch. Restoring it needs an event to hang the likes on; three orphan
   * rows would not be a fixture.
   */
];

export const eventLikesSeedData: EventLikeDocument[] = LIKES.map(
  ([eventId, userId, ago]) =>
    ({
      id: eventLikeId(eventId, userId),
      eventId,
      userId,
      createdAt: daysAgo(ago),
    }) as EventLikeDocument,
);

/**
 * The per-event totals this file implies, so `events-seed-data.ts` can carry
 * a `stats.likeCount` that agrees with the rows rather than a hand-typed
 * number that drifts the moment a like is added here.
 */
export const SEEDED_LIKE_COUNTS: Record<string, number> = LIKES.reduce(
  (acc, [eventId]) => {
    acc[eventId] = (acc[eventId] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);
