/*
 * WHY: So the "Liked by" rail and the engagement chart have something real to
 *      render on a fresh database. An empty rail renders null by design, so
 *      without these the feature is invisible and untestable.
 * WHAT: Likes across the six season events from the seeded buyer personas.
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
 * 14 days, so the festive hub (9 likes) renders a chart and the quieter
 * events deliberately do not — which is the behaviour worth being able to see.
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

  // Launch week — enough to clear the chart threshold.
  ["event-beyblade-x-launch-sale", "user-tyson-blader", 8],
  ["event-beyblade-x-launch-sale", "user-meera-bey", 6],
  ["event-beyblade-x-launch-sale", "user-ash-trainer", 5],
  ["event-beyblade-x-launch-sale", "user-rohit-collector", 2],
  ["event-beyblade-x-launch-sale", "user-ananya-collector", 1],

  /*
   * The remaining four sit BELOW `LIKE_TREND_MIN_POINTS` on purpose. A rail
   * with three faces and no chart is the common real state, and it is the one
   * most likely to be got wrong — the chart must render nothing rather than a
   * flat line that looks like a measurement.
   */
  ["event-spin-the-launcher", "user-meera-bey", 5],
  ["event-spin-the-launcher", "user-vikram-wheels", 3],
  ["event-spin-the-launcher", "user-ash-trainer", 1],

  ["event-signed-dranzer-raffle", "user-sneha-vintage", 4],
  ["event-signed-dranzer-raffle", "user-tyson-blader", 2],
  ["event-signed-dranzer-raffle", "user-priya-cards", 0],

  ["event-restock-vote-2027", "user-arjun-gunpla", 3],
  ["event-restock-vote-2027", "user-ananya-collector", 1],

  ["event-burst-clearance-weekend", "user-rohit-collector", 2],
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
