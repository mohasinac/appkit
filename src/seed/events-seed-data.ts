/*
 * WHY: Seeds 8 YGO-themed events covering all event types (poll, survey, sale, raffle, spin_wheel, feedback, offer).
 * WHAT: 2 upcoming + 4 active + 2 ended. Includes raffle (open + drawn), spin wheel, poll, survey, feedback, sale, offer.
 *
 * EXPORTS:
 *   eventsSeedData — Array of EventDocument for seed runner
 *   eventEntriesSeedData — Array of EventEntryDocument for seed runner
 *
 * @tag domain:events
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type {
  EventDocument,
  EventEntryDocument,
} from "../features/events/schemas";
import { EVENT_FIELDS, EVENT_ENTRY_FIELDS } from "../features/events/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const eventsSeedData: EventDocument[] = [
  // ── 1. ACTIVE — Poll: Favourite Duelist Season 1 ──────────────────────────
  {
    id: "event-favourite-duelist-poll",
    slug: "favourite-duelist-poll",
    type: EVENT_FIELDS.TYPE_VALUES.POLL,
    title: "Vote: Best Duelist of Duel Monsters Season 1",
    description: "Who is the greatest duelist of the original Duel Monsters season? Cast your vote and see real-time results!",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(5),
    endsAt: daysAhead(10),
    coverImage: { type: "image", url: "https://images.ygoprodeck.com/images/cards/cropped/46986414.jpg", alt: "Dark Magician — Yugi's ace" },
    tags: ["poll", "duel-monsters", "season-1"],
    pollConfig: {
      options: [
        { id: "yugi", label: "Yugi Muto" },
        { id: "kaiba", label: "Seto Kaiba" },
        { id: "joey", label: "Joey Wheeler" },
        { id: "pegasus", label: "Maximillion Pegasus" },
        { id: "bakura", label: "Yami Bakura" },
      ],
      allowMultiSelect: false,
      allowComment: false,
      resultsVisibility: "after_vote" as const,
    },
    stats: { totalEntries: 362, approvedEntries: 362, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(1),
  } as EventDocument,

  // ── 2. ACTIVE — Survey: Card Condition ───────────────────────────────────
  {
    id: "event-card-condition-survey",
    slug: "card-condition-survey",
    type: EVENT_FIELDS.TYPE_VALUES.SURVEY,
    title: "How Do You Store Your Cards?",
    description: "Help us understand how Indian YGO collectors protect their cards. Your responses help us recommend better storage solutions.",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(3),
    endsAt: daysAhead(14),
    coverImage: { type: "image", url: "https://images.ygoprodeck.com/images/cards/cropped/89631139.jpg", alt: "Blue-Eyes White Dragon" },
    tags: ["survey", "card-storage", "community"],
    surveyConfig: {
      requireLogin: true,
      maxEntriesPerUser: 1,
      hasLeaderboard: false,
      hasPointSystem: false,
      entryReviewRequired: false,
      formFields: [
        { id: "q1", label: "What sleeve type do you use?", type: "radio", options: ["Penny sleeves", "Perfect fit", "Character art", "No sleeves"], required: true },
        { id: "q2", label: "How do you store your collection?", type: "radio", options: ["Binder", "Deck box", "Top loaders", "Shoebox"], required: true },
        { id: "q3", label: "Do you use humidity control?", type: "radio", options: ["Yes — silica gel", "Yes — climate control", "No"], required: true },
      ],
    },
    stats: { totalEntries: 89, approvedEntries: 89, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  } as EventDocument,

  // ── 3. ACTIVE — Sale: Duelist Kingdom Clearance ───────────────────────────
  {
    id: "event-duelist-kingdom-clearance",
    slug: "duelist-kingdom-clearance",
    type: EVENT_FIELDS.TYPE_VALUES.SALE,
    title: "Duelist Kingdom Clearance Sale — 20% Off",
    description: "20% off all singles from the Duel Monsters era! Use code TOURNAMENT2026 at checkout. Limited time only.",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(2),
    endsAt: daysAhead(7),
    coverImage: { type: "image", url: "https://images.ygoprodeck.com/images/cards/cropped/55144522.jpg", alt: "Pot of Greed" },
    tags: ["sale", "clearance", "duel-monsters", "singles"],
    saleConfig: {
      discountPercent: 20,
      applicableCategories: ["category-monster-cards", "category-spell-cards", "category-trap-cards", "category-extra-deck-cards"],
      couponCode: "TOURNAMENT2026",
    },
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
  } as EventDocument,

  // ── 4. ACTIVE — Raffle: Win PSA 10 Dark Magician Girl ────────────────────
  {
    id: "event-win-psa10-dark-magician-girl",
    slug: "win-psa10-dark-magician-girl",
    type: EVENT_FIELDS.TYPE_VALUES.RAFFLE,
    title: "Win PSA 10 Dark Magician Girl",
    description: "Enter for a chance to win a PSA 10 Dark Magician Girl (MFC 1st Edition)! One lucky duelist takes home the ultimate card.",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(3),
    endsAt: daysAhead(14),
    coverImage: { type: "image", url: "https://images.ygoprodeck.com/images/cards/cropped/38033121.jpg", alt: "Dark Magician Girl" },
    tags: ["raffle", "psa-10", "dark-magician-girl", "giveaway"],
    hasRaffle: true,
    raffleType: "open_raffle",
    rafflePrize: "PSA 10 Dark Magician Girl — MFC 1st Edition (Cert: PSA-YGO-998877)",
    raffleEntryCount: 247,
    stats: { totalEntries: 247, approvedEntries: 247, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  } as EventDocument,

  // ── 5. ACTIVE — Spin Wheel: Daily Card Pull ──────────────────────────────
  {
    id: "event-daily-card-pull-wheel",
    slug: "daily-card-pull-wheel",
    type: EVENT_FIELDS.TYPE_VALUES.SPIN_WHEEL,
    title: "Daily Card Pull! Spin for a Prize",
    description: "Spin the wheel once per day for a chance to win discount coupons and free card sleeves!",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(7),
    endsAt: daysAhead(23),
    coverImage: { type: "image", url: "https://images.ygoprodeck.com/images/cards/cropped/40640057.jpg", alt: "Kuriboh" },
    tags: ["spin-wheel", "daily", "prizes", "coupons"],
    spinPrizes: [
      { id: "spin-10pct", label: "10% Off Coupon", couponId: "coupon-yugi10", weight: 15, isActive: true },
      { id: "spin-5pct", label: "5% Off Coupon", weight: 25, isActive: true },
      { id: "spin-sleeve", label: "Free Card Sleeve Pack", weight: 10, isActive: true },
      { id: "spin-try-again", label: "Try Again Tomorrow!", weight: 50, isActive: true },
    ],
    spinMaxPerUser: 1,
    spinWindowStart: daysAgo(7),
    spinWindowEnd: daysAhead(23),
    stats: { totalEntries: 534, approvedEntries: 534, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(1),
  } as EventDocument,

  // ── 6. ACTIVE — Feedback: GX Era ─────────────────────────────────────────
  {
    id: "event-gx-era-feedback",
    slug: "gx-era-feedback",
    type: EVENT_FIELDS.TYPE_VALUES.FEEDBACK,
    title: "Tell Us About GX Era Cards on LetItRip",
    description: "Rate your experience buying GX era cards on LetItRip. Your feedback helps us improve the marketplace.",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(10),
    endsAt: daysAhead(20),
    coverImage: { type: "image", url: "https://images.ygoprodeck.com/images/cards/cropped/89943723.jpg", alt: "Elemental HERO Neos" },
    tags: ["feedback", "gx-era", "community"],
    feedbackConfig: {
      formFields: [
        { id: "rating", label: "How would you rate the GX era selection?", type: "rating", required: true },
        { id: "comment", label: "Any additional feedback?", type: "textarea", required: false },
      ],
      anonymous: false,
    },
    stats: { totalEntries: 45, approvedEntries: 45, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(2),
  } as EventDocument,

  // ── 7. UPCOMING — Offer: Buy 3 Get 1 Free Singles ────────────────────────
  {
    id: "event-buy-3-get-1-singles",
    slug: "buy-3-get-1-singles",
    type: EVENT_FIELDS.TYPE_VALUES.OFFER,
    title: "Buy 3 Singles, Get 1 Free",
    description: "Coming soon! Buy any 3 single cards and get the cheapest one free. Applies to all stores on LetItRip.",
    status: EVENT_FIELDS.STATUS_VALUES.DRAFT,
    startsAt: daysAhead(5),
    endsAt: daysAhead(20),
    coverImage: { type: "image", url: "https://images.ygoprodeck.com/images/cards/cropped/83764718.jpg", alt: "Monster Reborn" },
    tags: ["offer", "buy-3-get-1", "singles", "upcoming"],
    offerConfig: {
      couponId: "coupon-buy3get1",
      displayCode: "BUY3GET1",
      bannerText: "Buy any 3 single cards and get the cheapest one free!",
    },
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  } as EventDocument,

  // ── 8. ENDED — Raffle: Won Complete LOB 1st Ed Set (drawn) ───────────────
  {
    id: "event-won-complete-lob-raffle",
    slug: "won-complete-lob-raffle",
    type: EVENT_FIELDS.TYPE_VALUES.RAFFLE,
    title: "Win Complete LOB 1st Edition Set",
    description: "The grand raffle has concluded! One lucky duelist won a complete Legend of Blue Eyes 1st Edition set.",
    status: EVENT_FIELDS.STATUS_VALUES.ENDED,
    startsAt: daysAgo(30),
    endsAt: daysAgo(5),
    coverImage: { type: "image", url: "https://images.ygoprodeck.com/images/cards/cropped/89631139.jpg", alt: "Blue-Eyes White Dragon" },
    tags: ["raffle", "lob", "1st-edition", "ended", "winner"],
    hasRaffle: true,
    raffleType: "open_raffle",
    rafflePrize: "Complete LOB 1st Edition Set — 126 cards, all NM or better",
    raffleWinnerUserId: "user-yugi-muto",
    raffleWinnerDisplayName: "Yugi Muto",
    raffleWinnerEntryId: "entry-lob-raffle-yugi-001",
    raffleTriggeredAt: daysAgo(5),
    raffleEntryCount: 1892,
    stats: { totalEntries: 1892, approvedEntries: 1892, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(35),
    updatedAt: daysAgo(5),
  } as EventDocument,
];

// ── Event Entries ────────────────────────────────────────────────────────────

export const eventEntriesSeedData: EventEntryDocument[] = [
  // Yugi entered the poll
  {
    id: "entry-poll-yugi-001",
    eventId: "event-favourite-duelist-poll",
    userId: "user-yugi-muto",
    userDisplayName: "Yugi Muto",
    userEmail: "yugi@duelkingdom.in",
    pollVotes: ["yugi"],
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(4),
    createdAt: daysAgo(4),
  } as EventEntryDocument,

  // Kaiba entered the poll
  {
    id: "entry-poll-kaiba-001",
    eventId: "event-favourite-duelist-poll",
    userId: "user-seto-kaiba",
    userDisplayName: "Seto Kaiba",
    userEmail: "kaiba@kaibalandmark.in",
    pollVotes: ["kaiba"],
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(3),
    createdAt: daysAgo(3),
  } as EventEntryDocument,

  // Yugi entered the raffle (and won the LOB raffle)
  {
    id: "entry-lob-raffle-yugi-001",
    eventId: "event-won-complete-lob-raffle",
    userId: "user-yugi-muto",
    userDisplayName: "Yugi Muto",
    userEmail: "yugi@duelkingdom.in",
    raffleEligible: true,
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(25),
    createdAt: daysAgo(25),
  } as EventEntryDocument,

  // Yugi entered the active raffle
  {
    id: "entry-dmg-raffle-yugi-001",
    eventId: "event-win-psa10-dark-magician-girl",
    userId: "user-yugi-muto",
    userDisplayName: "Yugi Muto",
    userEmail: "yugi@duelkingdom.in",
    raffleEligible: true,
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(2),
    createdAt: daysAgo(2),
  } as EventEntryDocument,

  // Kaiba spun the wheel
  {
    id: "entry-spin-kaiba-001",
    eventId: "event-daily-card-pull-wheel",
    userId: "user-seto-kaiba",
    userDisplayName: "Seto Kaiba",
    userEmail: "kaiba@kaibalandmark.in",
    spinUsed: true,
    spinPrizeId: "spin-10pct",
    spinPrizeCouponCode: "YUGI10",
    spinWonAt: daysAgo(1),
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(1),
    createdAt: daysAgo(1),
  } as EventEntryDocument,
];
