/*
 * WHY: Shared tester sandbox — 1 disposable test event with both raffle and spin-wheel
 *      fields populated, so testers can exercise the events/raffle/spin flow end to end.
 *      Auto-expires after 7 days (testerSandboxCleanup).
 * WHAT: Exports eventsTesterSeedData — 1 Partial<EventDocument> tagged isTestData:true.
 *
 * EXPORTS:
 *   eventsTesterSeedData — Array of 1 Partial<EventDocument> for the seed runner
 *
 * @tag domain:events,tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed-cli.mjs
 * @tag sideEffects:none
 */

import type { EventDocument } from "../../events/schemas";
import { EVENT_FIELDS } from "../../../constants/field-names";
import { seedExtMedia } from "../../../seed/_helpers/media";
import { testDataExpiresAt } from "./tester-ttl";

const TEST_EVENT_COVER_ALT = "Test event cover";
const TEST_RAFFLE_PRIZE = "Test prize — not a real reward";

export const eventsTesterSeedData: Partial<EventDocument>[] = [
  {
    id: "event-tester-sandbox-spin",
    slug: "tester-sandbox-spin",
    type: EVENT_FIELDS.TYPE_VALUES.SPIN_WHEEL,
    title: "Tester Sandbox — Spin the Wheel",
    description: "Disposable test event for the tester QA program. Spin the wheel and confirm a prize is assigned.",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    coverImage: { type: "image", url: seedExtMedia("https://picsum.photos/seed/event-cover-tester-sandbox-spin-20260101/1200/600"), alt: TEST_EVENT_COVER_ALT },
    tags: ["test"],
    hasRaffle: true,
    raffleType: "open_raffle",
    rafflePrize: TEST_RAFFLE_PRIZE,
    raffleEntryCount: 0,
    spinPrizes: [
      { id: "spin-tester-win", label: "You Win!", weight: 50, isActive: true },
      { id: "spin-tester-try-again", label: "Try Again", weight: 50, isActive: true },
    ],
    spinMaxPerUser: 1,
    spinWindowStart: new Date(),
    spinWindowEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Partial<EventDocument>,
  {
    id: "event-tester-sandbox-top-scorers",
    slug: "tester-sandbox-top-scorers",
    type: EVENT_FIELDS.TYPE_VALUES.RAFFLE,
    title: "Tester Sandbox — Top Scorers Raffle",
    description: "Disposable test event for the tester QA program. Verify top_n_scorers raffle entry and the leaderboard.",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    coverImage: { type: "image", url: seedExtMedia("https://picsum.photos/seed/event-cover-tester-sandbox-top-scorers-20260101/1200/600"), alt: TEST_EVENT_COVER_ALT },
    tags: ["test"],
    hasRaffle: true,
    raffleType: "top_n_scorers",
    raffleTopN: 3,
    rafflePrize: TEST_RAFFLE_PRIZE,
    raffleEntryCount: 0,
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Partial<EventDocument>,
  {
    id: "event-tester-sandbox-top-participants",
    slug: "tester-sandbox-top-participants",
    type: EVENT_FIELDS.TYPE_VALUES.RAFFLE,
    title: "Tester Sandbox — Top Participants Raffle",
    description: "Disposable test event for the tester QA program. Verify top_n_participants raffle entry.",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    coverImage: { type: "image", url: seedExtMedia("https://picsum.photos/seed/event-cover-tester-sandbox-top-participants-20260101/1200/600"), alt: TEST_EVENT_COVER_ALT },
    tags: ["test"],
    hasRaffle: true,
    raffleType: "top_n_participants",
    raffleTopN: 5,
    rafflePrize: TEST_RAFFLE_PRIZE,
    raffleEntryCount: 0,
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Partial<EventDocument>,
];
