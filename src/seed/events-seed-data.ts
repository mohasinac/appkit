/**
 * Events Seed Data — LetItRip Collectibles Platform
 * 6 events: 2 upcoming (draft), 2 active, 2 ended.
 * Types: sale | offer | poll | survey | feedback — using exact schema shapes.
 * id === slug, event- prefix throughout.
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
  // ── 1. ACTIVE — Pokémon Card Tournament (Poll, voting open now) ──────────
  {
    id: "event-pokemon-card-tournament-june-2026",
    slug: "event-pokemon-card-tournament-june-2026",
    type: EVENT_FIELDS.TYPE_VALUES.POLL,
    title: "Pokémon TCG India Open — June 2026 (Vote for Format!)",
    description:
      "<p>India's biggest Pokémon TCG open tournament is coming to Mumbai in June 2026. <strong>Vote for your preferred battle format</strong> — Standard, Expanded, or Limited Sealed — and help us shape the event schedule. Top voter-selected format gets the biggest prize pool!</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAhead(7),
    endsAt: daysAhead(21),
    coverImageUrl:
      "https://images.unsplash.com/photo-1559336197-ded8aaa244bc?w=1200&h=630&fit=crop",
    tags: ["pokemon", "tournament", "tcg", "mumbai", "2026"],
    pollConfig: {
      allowMultiSelect: false,
      allowComment: true,
      options: [
        { id: "opt-standard", label: "Standard Format (current meta)" },
        { id: "opt-expanded", label: "Expanded Format (wider card pool)" },
        { id: "opt-sealed", label: "Limited Sealed (booster draft)" },
      ],
      resultsVisibility: "after_end",
      requireLogin: true,
    },
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },

  // ── 2. ACTIVE — Collectors Convention Survey (survey open now) ───────────
  {
    id: "event-collectors-convention-2026-survey",
    slug: "event-collectors-convention-2026-survey",
    type: EVENT_FIELDS.TYPE_VALUES.SURVEY,
    title: "LetItRip Collectors Convention 2026 — Interest Survey",
    description:
      "<p>We're planning the first-ever LetItRip Collectors Convention — a one-day event for Pokémon TCG, Hot Wheels, Beyblade X, anime figure, and Gunpla enthusiasts in India. Help us plan by filling out this short survey. Participants get a ₹200 voucher on their next LetItRip order.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAhead(14),
    endsAt: daysAhead(35),
    coverImageUrl:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=630&fit=crop",
    tags: ["convention", "collectors", "survey", "india", "community"],
    surveyConfig: {
      requireLogin: true,
      maxEntriesPerUser: 1,
      hasLeaderboard: false,
      hasPointSystem: true,
      pointsLabel: "Voucher Credits",
      entryReviewRequired: false,
      formFields: [
        {
          id: "field-city",
          type: "select",
          label: "Which city would you travel to for a 1-day convention?",
          required: true,
          options: ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Pune", "Chennai", "Other"],
          order: 1,
        },
        {
          id: "field-vertical",
          type: "multiselect",
          label: "Which collectibles verticals do you primarily collect?",
          required: true,
          options: ["Pokémon TCG", "Hot Wheels / Tomica", "Beyblade X", "Anime Figures", "Gunpla", "Yu-Gi-Oh! TCG"],
          order: 2,
        },
        {
          id: "field-budget",
          type: "select",
          label: "What would you spend at a convention (entry + purchases)?",
          required: false,
          options: ["Under ₹2,000", "₹2,000–5,000", "₹5,000–10,000", "Over ₹10,000"],
          order: 3,
        },
      ],
    },
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(2),
  },

  // ── 3. ACTIVE — Hot Wheels May Swap Meet Sale ─────────────────────────────
  {
    id: "event-hot-wheels-swap-meet-may-2026",
    slug: "event-hot-wheels-swap-meet-may-2026",
    type: EVENT_FIELDS.TYPE_VALUES.SALE,
    title: "Hot Wheels May Swap Meet — Up to 30% Off Diecast This Weekend",
    description:
      "<p>Diecast Depot is running a <strong>weekend flash sale</strong> to clear swap meet stock. Up to 30% off Treasure Hunts, Car Culture sets, Team Transport, and Tomica Limited Vintage. Prices drop as stock runs out — grab your cars before they're gone. <strong>LetItRip exclusive sale</strong> — no other platform, no restocks.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(1),
    endsAt: daysAhead(2),
    coverImageUrl:
      "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=1200&h=630&fit=crop",
    tags: ["hot-wheels", "sale", "diecast", "swap-meet", "tomica"],
    saleConfig: {
      discountPercent: 30,
      bannerText: "🚗 Up to 30% off Hot Wheels & Tomica — this weekend only!",
      affectedCategories: ["category-diecast-vehicles", "category-hot-wheels-cars", "category-tomica-cars"],
    },
    stats: { totalEntries: 47, approvedEntries: 47, flaggedEntries: 0 },
    createdBy: "user-vikram-mehta",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(1),
  },

  // ── 4. ACTIVE — Anime Figure Showcase Offer Event ─────────────────────────
  {
    id: "event-anime-figure-showcase-may-2026",
    slug: "event-anime-figure-showcase-may-2026",
    type: EVENT_FIELDS.TYPE_VALUES.OFFER,
    title: "S.H.Figuarts & Nendoroid Showcase — Make an Offer Week",
    description:
      "<p>This week, all S.H.Figuarts and Nendoroid listings on LetItRip accept <strong>negotiated offers</strong>. Submit your best price on any anime figure listing — sellers will respond within 24 hours. Use code <strong>FIGURE10</strong> for an additional 10% off any accepted offer.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(3),
    endsAt: daysAhead(4),
    coverImageUrl:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&h=630&fit=crop",
    tags: ["anime-figures", "shf", "nendoroid", "offers", "bandai", "good-smile"],
    offerConfig: {
      couponId: "coupon-figure10",
      displayCode: "FIGURE10",
      bannerText: "🎌 Use FIGURE10 for 10% extra off any accepted offer on anime figures",
    },
    stats: { totalEntries: 23, approvedEntries: 21, flaggedEntries: 2 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(3),
  },

  // ── 5. ENDED — Yu-Gi-Oh! Regional Qualifier Poll ──────────────────────────
  {
    id: "event-yugioh-regional-qualifier-march-2026",
    slug: "event-yugioh-regional-qualifier-march-2026",
    type: EVENT_FIELDS.TYPE_VALUES.POLL,
    title: "Yu-Gi-Oh! Regional March 2026 — Hyderabad vs Bengaluru Vote",
    description:
      "<p>The vote for March's regional venue is closed. <strong>Hyderabad won</strong> with 68% of the vote! Results and tournament schedule are now posted in the LetItRip blog. Stay tuned for the April regional venue poll.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ENDED,
    startsAt: daysAgo(45),
    endsAt: daysAgo(30),
    coverImageUrl:
      "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=1200&h=630&fit=crop",
    tags: ["yugioh", "regional", "tournament", "poll", "ended"],
    pollConfig: {
      allowMultiSelect: false,
      allowComment: false,
      options: [
        { id: "opt-hyd", label: "Hyderabad" },
        { id: "opt-blr", label: "Bengaluru" },
      ],
      resultsVisibility: "after_end",
      requireLogin: true,
    },
    stats: { totalEntries: 209, approvedEntries: 209, flaggedEntries: 0 },
    createdBy: "user-nisha-reddy",
    createdAt: daysAgo(52),
    updatedAt: daysAgo(30),
  },

  // ── 6. ENDED — Beyblade X India Launch Sale ───────────────────────────────
  {
    id: "event-beyblade-x-india-launch-sale-2026",
    slug: "event-beyblade-x-india-launch-sale-2026",
    type: EVENT_FIELDS.TYPE_VALUES.SALE,
    title: "Beyblade X Official India Launch — 15% Off All BX Tops",
    description:
      "<p>This event has ended. Thank you to everyone who participated in the Beyblade X India launch sale! Over 300 BX tops sold in 72 hours — Dran Sword, Wizard Arrow, and Knight Shield all sold out within the first day. New stock arrives in 3 weeks.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ENDED,
    startsAt: daysAgo(60),
    endsAt: daysAgo(57),
    coverImageUrl:
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&h=630&fit=crop",
    tags: ["beyblade-x", "launch", "sale", "takara-tomy", "india"],
    saleConfig: {
      discountPercent: 15,
      bannerText: "🌀 15% off all Beyblade X tops — India launch weekend!",
      affectedCategories: ["category-beyblade-tops", "category-spinning-tops"],
    },
    stats: { totalEntries: 312, approvedEntries: 312, flaggedEntries: 0 },
    createdBy: "user-rohit-joshi",
    createdAt: daysAgo(65),
    updatedAt: daysAgo(57),
  },
];

export const eventEntriesSeedData: EventEntryDocument[] = [
  {
    id: "entry-swap-meet-rahul",
    eventId: "event-hot-wheels-swap-meet-may-2026",
    userId: "user-rahul-sharma",
    userDisplayName: "Rahul Sharma",
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(1),
  },
  {
    id: "entry-swap-meet-priya",
    eventId: "event-hot-wheels-swap-meet-may-2026",
    userId: "user-priya-patel",
    userDisplayName: "Priya Patel",
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(1),
  },
];
