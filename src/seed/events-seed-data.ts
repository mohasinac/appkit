/*
 * WHY: Seeds 10 Beyblade-themed events covering all event types (poll, survey, sale, raffle, spin_wheel, feedback, offer, lottery).
 * WHAT: 2 upcoming + 4 active + 2 ended + 2 lottery (1 active, 1 draft). Includes raffle (open + drawn), spin wheel, poll, survey, feedback, sale, offer.
 *
 * EXPORTS:
 *   eventsSeedData — Array of EventDocument for seed runner
 *   eventEntriesSeedData — Array of EventEntryDocument for seed runner
 *
 * @tag domain:events
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type {
  EventDocument,
  EventEntryDocument,
} from "../features/events/schemas";
import type { LotteryConfig } from "../features/lottery/types";
import { EVENT_FIELDS, EVENT_ENTRY_FIELDS } from "../features/events/schemas";
import { seedExtMedia } from "./_helpers/media";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const eventsSeedData: EventDocument[] = [
  // ── 1. ACTIVE — Poll: Favourite Blader Original Series ────────────────────
  {
    id: "event-favourite-blader-poll",
    slug: "favourite-blader-poll",
    type: EVENT_FIELDS.TYPE_VALUES.POLL,
    title: "Vote: Best Blader of the Original Beyblade Series",
    description: `<p>Who is the greatest blader of the original 1999 series? Cast your vote and see real-time results!</p><img src="${seedExtMedia("https://picsum.photos/seed/event-content-favourite-blader-lineup-20260101/900/500")}" alt="Original series blader lineup" />`,
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(5),
    endsAt: daysAhead(10),
    coverImage: { type: "image", url: seedExtMedia("https://picsum.photos/seed/event-cover-favourite-blader-poll-20260101/1200/600"), alt: "Original series Beyblade lineup" },
    tags: ["poll", "original-series", "season-1"],
    pollConfig: {
      options: [
        { id: "tyson", label: "Mock User 6" },
        { id: "kai", label: "Kai Hiwatari" },
        { id: "max", label: "Max Tate" },
        { id: "rei", label: "Rei Kon" },
        { id: "kenny", label: "Kenny (Chief)" },
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

  // ── 2. ACTIVE — Survey: Beyblade Storage ─────────────────────────────────
  {
    id: "event-beyblade-storage-survey",
    slug: "beyblade-storage-survey",
    type: EVENT_FIELDS.TYPE_VALUES.SURVEY,
    title: "How Do You Store Your Beyblades?",
    description: "Help us understand how Indian bladers protect their collections. Your responses help us recommend better storage solutions.",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(3),
    endsAt: daysAhead(14),
    coverImage: { type: "image", url: seedExtMedia("https://picsum.photos/seed/event-cover-storage-survey-20260101/1200/600"), alt: "Beyblade storage case" },
    tags: ["survey", "beyblade-storage", "community"],
    surveyConfig: {
      requireLogin: true,
      maxEntriesPerUser: 1,
      hasLeaderboard: false,
      hasPointSystem: false,
      entryReviewRequired: false,
      formFields: [
        { id: "q1", label: "What storage case do you use?", type: "radio", options: ["Hard case", "Soft pouch", "Original box", "No case"], required: true },
        { id: "q2", label: "How do you store your launchers?", type: "radio", options: ["Wall rack", "Drawer organizer", "Original box", "Loose"], required: true },
        { id: "q3", label: "Do you keep tips separately?", type: "radio", options: ["Yes — labeled bags", "Yes — compartment box", "No"], required: true },
      ],
    },
    stats: { totalEntries: 89, approvedEntries: 89, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  } as EventDocument,

  // ── 3. ACTIVE — Sale: Original Series Clearance ──────────────────────────
  {
    id: "event-original-series-clearance",
    slug: "original-series-clearance",
    type: EVENT_FIELDS.TYPE_VALUES.SALE,
    title: "Original Series Clearance Sale — 20% Off",
    description: "20% off all beyblades from the original 1999-2003 series! Use code TOURNAMENT2026 at checkout. Limited time only.",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(2),
    endsAt: daysAhead(7),
    coverImage: { type: "image", url: seedExtMedia("https://picsum.photos/seed/event-cover-original-clearance-20260101/1200/600"), alt: "Original series Beyblade clearance sale" },
    tags: ["sale", "clearance", "original-series", "singles"],
    saleConfig: {
      discountPercent: 20,
      applicableCategories: ["category-beyblade-original"],
      couponCode: "TOURNAMENT2026",
    },
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
  } as EventDocument,

  // ── 4. ACTIVE — Raffle: Win Beyblade Burst Regalia Genesis ───────────────
  {
    id: "event-win-burst-regalia-genesis",
    slug: "win-burst-regalia-genesis",
    type: EVENT_FIELDS.TYPE_VALUES.RAFFLE,
    title: "Win a Sealed Beyblade Burst Regalia Genesis",
    description: `<p>Enter for a chance to win a sealed Beyblade Burst Regalia Genesis! One lucky blader takes home the ultimate spinner.</p><img src="${seedExtMedia("https://picsum.photos/seed/event-content-regalia-genesis-prize-20260101/900/500")}" alt="Sealed Beyblade Burst Regalia Genesis prize box" />`,
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(3),
    endsAt: daysAhead(14),
    coverImage: { type: "image", url: seedExtMedia("https://picsum.photos/seed/event-cover-regalia-genesis-raffle-20260101/1200/600"), alt: "Beyblade Burst Regalia Genesis" },
    tags: ["raffle", "burst", "regalia-genesis", "giveaway", "prizes"],
    hasRaffle: true,
    raffleType: "open_raffle",
    rafflePrize: "Sealed Beyblade Burst Regalia Genesis (authenticity cert: LIR-BEY-998877)",
    raffleEntryCount: 247,
    stats: { totalEntries: 247, approvedEntries: 247, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  } as EventDocument,

  // ── 5. ACTIVE — Spin Wheel: Daily Beyblade Pull ──────────────────────────
  {
    id: "event-daily-beyblade-pull-wheel",
    slug: "daily-beyblade-pull-wheel",
    type: EVENT_FIELDS.TYPE_VALUES.SPIN_WHEEL,
    title: "Daily Beyblade Pull! Spin for a Prize",
    description: "Spin the wheel once per day for a chance to win discount coupons and free launcher grips!",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(7),
    endsAt: daysAhead(23),
    coverImage: { type: "image", url: seedExtMedia("https://picsum.photos/seed/event-cover-daily-pull-wheel-20260101/1200/600"), alt: "Spin wheel prize wheel" },
    tags: ["spin-wheel", "daily", "prizes", "coupons"],
    spinPrizes: [
      { id: "spin-10pct", label: "10% Off Coupon", couponId: "coupon-rehan10", weight: 15, isActive: true },
      { id: "spin-5pct", label: "5% Off Coupon", weight: 25, isActive: true },
      { id: "spin-grip", label: "Free Launcher Grip Tape", weight: 10, isActive: true },
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

  // ── 6. ACTIVE — Feedback: Metal Fight Era ────────────────────────────────
  {
    id: "event-metal-fight-era-feedback",
    slug: "metal-fight-era-feedback",
    type: EVENT_FIELDS.TYPE_VALUES.FEEDBACK,
    title: "Tell Us About Metal Fight Era Beyblades on LetItRip",
    description: "Rate your experience buying Metal Fight era beyblades on LetItRip. Your feedback helps us improve the marketplace.",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(10),
    endsAt: daysAhead(20),
    coverImage: { type: "image", url: seedExtMedia("https://picsum.photos/seed/event-cover-metal-fight-feedback-20260101/1200/600"), alt: "Metal Fight era Beyblade lineup" },
    tags: ["feedback", "metal-fight", "community"],
    feedbackConfig: {
      formFields: [
        { id: "rating", label: "How would you rate the Metal Fight era selection?", type: "rating", required: true },
        { id: "comment", label: "Any additional feedback?", type: "textarea", required: false },
      ],
      anonymous: false,
    },
    stats: { totalEntries: 45, approvedEntries: 45, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(2),
  } as EventDocument,

  // ── 7. ACTIVE — Offer: Buy 3 Beyblades, Get 10% Off ──────────────────────
  {
    id: "event-buy-3-get-1-beyblades",
    slug: "buy-3-get-1-beyblades",
    type: EVENT_FIELDS.TYPE_VALUES.OFFER,
    title: "Buy 3 Beyblades, Get 10% Off",
    description: "Buy any 3 beyblades from Beyblade Arena and get 10% off the total. Applies to original, metal, burst, and X series.",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(1),
    endsAt: daysAhead(20),
    coverImage: { type: "image", url: seedExtMedia("https://picsum.photos/seed/event-cover-buy3get1-20260101/1200/600"), alt: "Buy 3 beyblades, get 10% off offer" },
    tags: ["offer", "buy-3-get-10-percent", "singles"],
    offerConfig: {
      couponId: "coupon-buynow10",
      displayCode: "BUYNOW10",
      bannerText: "Buy any 3 beyblades from Beyblade Arena and get 10% off the total!",
    },
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  } as EventDocument,

  // ── 8. ENDED — Raffle: Won Complete Original Series Set (drawn) ─────────
  {
    id: "event-won-original-set-raffle",
    slug: "won-original-set-raffle",
    type: EVENT_FIELDS.TYPE_VALUES.RAFFLE,
    title: "Win Complete Original Series Collectors Set",
    description: `<p>The grand raffle has concluded! One lucky blader won a complete original-series collectors set.</p><img src="${seedExtMedia("https://picsum.photos/seed/event-content-original-set-winner-20260101/900/500")}" alt="Winner unboxing the complete original-series collectors set" />`,
    status: EVENT_FIELDS.STATUS_VALUES.ENDED,
    startsAt: daysAgo(30),
    endsAt: daysAgo(5),
    coverImage: { type: "image", url: seedExtMedia("https://picsum.photos/seed/event-cover-original-set-raffle-20260101/1200/600"), alt: "Complete original-series collectors set" },
    tags: ["raffle", "original-series", "ended", "winner"],
    hasRaffle: true,
    raffleType: "open_raffle",
    rafflePrize: "Complete Original Series Collectors Set — 5 beyblades + stadium, all sealed or NM",
    raffleWinnerUserId: "user-yugi-muto",
    raffleWinnerDisplayName: "Mock User 3",
    raffleWinnerEntryId: "entry-original-raffle-yugi-001",
    raffleTriggeredAt: daysAgo(5),
    raffleEntryCount: 1892,
    stats: { totalEntries: 1892, approvedEntries: 1892, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(35),
    updatedAt: daysAgo(5),
  } as EventDocument,

  // ── 9. ACTIVE — Lottery: Pokémon Number Draw (July 2026) ─────────────────
  {
    id: "event-pokemon-number-draw-july-2026",
    slug: "pokemon-number-draw-july-2026",
    type: "lottery" as const,
    title: "Pokémon Number Draw — July 2026",
    description: "<p>Choose your lucky slot and win rare Pokémon collectibles! 25 slots available. Each slot is assigned a prize from our collection. First-come, first-served.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(2),
    endsAt: daysAhead(5),
    coverImage: { type: "image", url: seedExtMedia("https://upload.wikimedia.org/wikipedia/commons/9/98/International_Pok%C3%A9mon_logo.svg"), alt: "Pokémon Number Draw" },
    tags: ["lottery", "pokemon", "prizes"],
    lotteryConfig: {
      totalSlots: 25,
      pricingMode: "variable",
      drawWindowDurationMinutes: 5,
      maxPullsPerTransaction: 1,
      maxPullsPerUser: 1,
      slots: [
        { slotNumber: 1,  name: "Charizard Base Set Holo",          price: 5000, weight: 1,  isBooked: true,  bookedByUserId: "user-ravi-k",   bookedByDisplayName: "Ravi K",   bookedByUserLotteryNumber: 1 },
        { slotNumber: 2,  name: "Blastoise Base Set Holo",          price: 3000, weight: 33, isBooked: true,  bookedByUserId: "user-priya-s",  bookedByDisplayName: "Priya S",  bookedByUserLotteryNumber: 2 },
        { slotNumber: 3,  name: "Venusaur Base Set Holo",           price: 2500, weight: 40, isBooked: true,  bookedByUserId: "user-arjun-m",  bookedByDisplayName: "Arjun M",  bookedByUserLotteryNumber: 3 },
        { slotNumber: 4,  name: "Pikachu Surfing Promo",            price: 1500, weight: 66, isBooked: true,  bookedByUserId: "user-sneha-p",  bookedByDisplayName: "Sneha P",  bookedByUserLotteryNumber: 4 },
        { slotNumber: 5,  name: "Mewtwo Base Set Holo",             price: 2000, weight: 50, isBooked: true,  bookedByUserId: "user-vikram-r", bookedByDisplayName: "Vikram R", bookedByUserLotteryNumber: 5 },
        { slotNumber: 6,  name: "Gengar First Ed. Fossil",          price: 3500, weight: 28, isBooked: false },
        { slotNumber: 7,  name: "Alakazam Base Set Holo",           price: 800,  weight: 93, isBooked: false },
        { slotNumber: 8,  name: "Machamp 1st Ed. Base Set",         price: 400,  weight: 99, isBooked: false },
        { slotNumber: 9,  name: "Clefairy Base Set Holo",           price: 600,  weight: 95, isBooked: false },
        { slotNumber: 10, name: "Chansey Base Set Holo",            price: 700,  weight: 94, isBooked: false },
        { slotNumber: 11, name: "Ninetales Base Set Holo",          price: 1000, weight: 80, isBooked: false },
        { slotNumber: 12, name: "Scyther Jungle Holo",              price: 500,  weight: 97, isBooked: false },
        { slotNumber: 13, name: "Gyarados Base Set Holo",           price: 1200, weight: 76, isBooked: false },
        { slotNumber: 14, name: "Lapras Fossil Holo",               price: 900,  weight: 88, isBooked: false },
        { slotNumber: 15, name: "Zapdos Fossil Holo",               price: 2200, weight: 45, isBooked: false },
        { slotNumber: 16, name: "Articuno Fossil Holo",             price: 2000, weight: 50, isBooked: false },
        { slotNumber: 17, name: "Moltres Fossil Holo",              price: 1800, weight: 55, isBooked: false },
        { slotNumber: 18, name: "Dragonite Base Set Holo",          price: 4000, weight: 20, isBooked: false },
        { slotNumber: 19, name: "Snorlax Jungle Holo",              price: 600,  weight: 95, isBooked: false },
        { slotNumber: 20, name: "Jolteon Jungle Holo",              price: 700,  weight: 94, isBooked: false },
        { slotNumber: 21, name: "Flareon Jungle Holo",              price: 700,  weight: 94, isBooked: false },
        { slotNumber: 22, name: "Vaporeon Jungle Holo",             price: 700,  weight: 94, isBooked: false },
        { slotNumber: 23, name: "Espeon Neo Discovery Holo",        price: 800,  weight: 93, isBooked: false },
        { slotNumber: 24, name: "Umbreon Neo Discovery Holo",       price: 1000, weight: 80, isBooked: false },
        { slotNumber: 25, name: "Lugia Neo Genesis Holo",           price: 4500, weight: 10, isBooked: false },
      ],
    } satisfies LotteryConfig,
    stats: { totalEntries: 5, approvedEntries: 5, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(0),
  } as EventDocument,

  // ── 10. DRAFT — Lottery: Beyblade Slot Raffle ────────────────────────────
  {
    id: "event-beyblade-slot-raffle-draft",
    slug: "beyblade-slot-raffle-draft",
    type: "lottery" as const,
    title: "Beyblade Slot Raffle — Coming Soon",
    description: "<p>10 rare beyblade slots up for grabs. Details coming soon!</p>",
    status: EVENT_FIELDS.STATUS_VALUES.DRAFT,
    startsAt: daysAhead(7),
    endsAt: daysAhead(14),
    coverImage: { type: "image", url: seedExtMedia("https://picsum.photos/seed/event-cover-beyblade-slot-raffle-20260101/1200/600"), alt: "Beyblade Slot Raffle" },
    tags: ["lottery", "beyblade", "prizes"],
    lotteryConfig: {
      totalSlots: 10,
      pricingMode: "uniform",
      uniformPrice: 500,
      drawWindowDurationMinutes: 10,
      maxPullsPerTransaction: 1,
      maxPullsPerUser: 1,
      slots: Array.from({ length: 10 }, (_, i) => ({
        slotNumber: i + 1,
        name: `Prize Slot ${i + 1}`,
        price: 500,
        weight: 50,
        isBooked: false,
      })),
    } satisfies LotteryConfig,
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0),
  } as EventDocument,
];

// ── Event Entries ────────────────────────────────────────────────────────────

export const eventEntriesSeedData: EventEntryDocument[] = [
  // Rehan entered the poll
  {
    id: "entry-poll-yugi-001",
    eventId: "event-favourite-blader-poll",
    userId: "user-yugi-muto",
    userDisplayName: "Mock User 3",
    userEmail: "rehan.sheikh@gmail.com",
    pollVotes: ["tyson"],
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(4),
    createdAt: daysAgo(4),
  } as EventEntryDocument,

  // Vivaan entered the poll
  {
    id: "entry-poll-kaiba-001",
    eventId: "event-favourite-blader-poll",
    userId: "user-seto-kaiba",
    userDisplayName: "Mock User 2",
    userEmail: "vivaan.kapoor@gmail.com",
    pollVotes: ["kai"],
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(3),
    createdAt: daysAgo(3),
  } as EventEntryDocument,

  // Rehan entered the raffle (and won the original-series raffle)
  {
    id: "entry-original-raffle-yugi-001",
    eventId: "event-won-original-set-raffle",
    userId: "user-yugi-muto",
    userDisplayName: "Mock User 3",
    userEmail: "rehan.sheikh@gmail.com",
    raffleEligible: true,
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(25),
    createdAt: daysAgo(25),
  } as EventEntryDocument,

  // Rehan entered the active raffle
  {
    id: "entry-regalia-raffle-yugi-001",
    eventId: "event-win-burst-regalia-genesis",
    userId: "user-yugi-muto",
    userDisplayName: "Mock User 3",
    userEmail: "rehan.sheikh@gmail.com",
    raffleEligible: true,
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(2),
    createdAt: daysAgo(2),
  } as EventEntryDocument,

  // Vivaan spun the wheel
  {
    id: "entry-spin-kaiba-001",
    eventId: "event-daily-beyblade-pull-wheel",
    userId: "user-seto-kaiba",
    userDisplayName: "Mock User 2",
    userEmail: "vivaan.kapoor@gmail.com",
    spinUsed: true,
    spinPrizeId: "spin-10pct",
    spinPrizeCouponCode: "REHAN10",
    spinWonAt: daysAgo(1),
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(1),
    createdAt: daysAgo(1),
  } as EventEntryDocument,
];
