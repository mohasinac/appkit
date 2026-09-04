/*
 * WHY: Shared tester sandbox — disposable test events covering spin-wheel, both raffle
 *      variants, a coupon offer, and a lottery with a pre-booked slot, so testers can
 *      exercise each flow end to end.
 * WHAT: Exports eventsTesterSeedData — 5 Partial<EventDocument> tagged isTestData:true.
 *
 *      The lottery's draw window is expressed via tester-window.ts rather than a fixed
 *      duration, so an automated run can shorten it and still watch the window close.
 *      The other four stay long-lived on purpose: they are meant to read as ACTIVE
 *      events for a human tester who seeds today and returns tomorrow. A fixture that
 *      must expire mid-session should be added as its own row, not by re-timing these.
 *
 * EXPORTS:
 *   eventsTesterSeedData — Array of 5 Partial<EventDocument> for the seed runner
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
import { seedPhoto } from "../../../seed/_helpers/media";
import { testDataExpiresAt } from "./tester-ttl";
import { windowMinutes, windowOffset } from "./tester-window";

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
    coverImage: { type: "image", url: seedPhoto("event-cover-tester-sandbox-spin-20260101", 1200, 600), alt: TEST_EVENT_COVER_ALT },
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
    coverImage: { type: "image", url: seedPhoto("event-cover-tester-sandbox-top-scorers-20260101", 1200, 600), alt: TEST_EVENT_COVER_ALT },
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
    coverImage: { type: "image", url: seedPhoto("event-cover-tester-sandbox-top-participants-20260101", 1200, 600), alt: TEST_EVENT_COVER_ALT },
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
  {
    id: "event-tester-sandbox-offer",
    slug: "tester-sandbox-offer",
    type: EVENT_FIELDS.TYPE_VALUES.OFFER,
    title: "Tester Sandbox — Offer Coupon",
    description: "Disposable test event for the tester QA program. Verify the Overview tab shows the coupon code and the Copy code button copies it to the clipboard.",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    coverImage: { type: "image", url: seedPhoto("event-cover-tester-sandbox-offer-20260101", 1200, 600), alt: TEST_EVENT_COVER_ALT },
    tags: ["test"],
    offerConfig: {
      couponId: "coupon-rehan10",
      displayCode: "REHAN10",
      bannerText: "Test offer — not a real discount.",
    },
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Partial<EventDocument>,

  // ── Lottery, with one slot ALREADY BOOKED ───────────────────────────────────
  // This fixture exists for exactly two checklist cases, both marked 🛑:
  //   page-wiring/data-loss/lottery-edit-preserves-bookings
  //   page-wiring/data-loss/lottery-booked-slot-cannot-be-deleted
  // Neither could be tested before, because no lottery fixture existed anywhere —
  // lottery events could previously only come from a hand-run seed.
  //
  // 🛑 Slot 3's booking IS the fixture. A booked slot carries a buyer id, a display
  // name and a lottery number, and the bug being guarded silently cleared all three
  // while returning a success message. Do not "tidy" this into an all-unbooked
  // lottery — an unbooked slot cannot demonstrate the loss, and the case would then
  // pass against the very bug it exists to catch.
  //
  // price/weight are server-only (toClientLotterySlot strips them). Uniform pricing
  // means every slot is weight 50 by definition — see computeWeight().
  {
    id: "event-tester-sandbox-lottery",
    slug: "tester-sandbox-lottery",
    type: EVENT_FIELDS.TYPE_VALUES.LOTTERY,
    title: "Tester Sandbox — Lottery",
    description:
      "Disposable test lottery for the tester QA program. Slot 3 is pre-booked: edit an unrelated slot, save, reopen, and confirm slot 3 is STILL booked to the same buyer with the same lottery number.",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: new Date(),
    endsAt: windowOffset(1),
    coverImage: {
      type: "image",
      url: seedPhoto("event-cover-tester-sandbox-lottery-20260101", 1200, 600),
      alt: TEST_EVENT_COVER_ALT,
    },
    tags: ["test"],
    lotteryConfig: {
      totalSlots: 6,
      pricingMode: "uniform",
      uniformPrice: 100,
      // Must outlast the run, or late batches meet a closed lottery. windowOffset(1)
      // is the run's end, so the draw window is expressed in the same units.
      drawWindowDurationMinutes: Math.ceil(windowMinutes()),
      maxPullsPerTransaction: 1,
      maxPullsPerUser: 1,
      slots: [
        { slotNumber: 1, name: "Test Prize — Dragoon Storm", price: 100, weight: 50, isBooked: false, image: seedPhoto("lottery-slot-tester-1-20260101", 600, 600) },
        { slotNumber: 2, name: "Test Prize — Dranzer S", price: 100, weight: 50, isBooked: false, image: seedPhoto("lottery-slot-tester-2-20260101", 600, 600) },
        {
          slotNumber: 3,
          name: "Test Prize — Draciel Shield",
          price: 100,
          weight: 50,
          isBooked: true,
          bookedByUserId: "user-ash-trainer",
          bookedByDisplayName: "Mock User 4",
          bookedByUserLotteryNumber: 1,
          image: seedPhoto("lottery-slot-tester-3-20260101", 600, 600),
        },
        { slotNumber: 4, name: "Test Prize — Driger F", price: 100, weight: 50, isBooked: false },
        { slotNumber: 5, name: "Test Prize — Wolborg", price: 100, weight: 50, isBooked: false },
        { slotNumber: 6, name: "Test Prize — Trygle", price: 100, weight: 50, isBooked: false },
      ],
    },
    stats: { totalEntries: 1, approvedEntries: 1, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Partial<EventDocument>,
];
