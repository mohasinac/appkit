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
    coverImage: { type: "image", url: seedExtMedia("https://picsum.photos/seed/event-cover-tester-sandbox-spin-20260101/1200/600"), alt: "Test event cover" },
    tags: ["test"],
    hasRaffle: true,
    raffleType: "open_raffle",
    rafflePrize: "Test prize — not a real reward",
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
];
