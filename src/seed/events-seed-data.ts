/**
 * Events Seed Data — Pokemon TCG Themed
 * Sample events: sale, offer, poll, survey, feedback for Pokemon card collectors
 */

import type {
  EventDocument,
  EventEntryDocument,
} from "../features/events/schemas";
import { EVENT_FIELDS, EVENT_ENTRY_FIELDS } from "../features/events/schemas";

// --- Dynamic date helpers ---------------------------------------------------
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

// -- Events --------------------------------------------------------------------

export const eventsSeedData: EventDocument[] = [
  // 1. Ended Sale Event
  {
    id: "event-pokemon-summer-holo-sale-2026-sale",
    type: EVENT_FIELDS.TYPE_VALUES.SALE,
    title: "Pokemon Summer Holo Sale 2026 — 15% Off All Holo Rares",
    description:
      "<p>Celebrate the summer season with a <strong>flat 15% discount</strong> across all holo rare singles. Stock up on Base Set holos, fossil holos, and jungle holos before prices climb again.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ENDED,
    startsAt: daysAgo(45),
    endsAt: daysAgo(38),
    coverImageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
    saleConfig: {
      discountPercent: 15,
      bannerText: "Pokemon Summer Holo Sale — 15% Off All Holo Rares!",
      affectedCategories: ["category-holo-rare-rarity"],
    },
    stats: {
      totalEntries: 0,
      approvedEntries: 0,
      flaggedEntries: 0,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(49),
    updatedAt: daysAgo(37),
  },

  // 2. Active Poll Event — Favourite Gen 1 Starter
  {
    id: "event-favourite-gen1-starter-poll-2026-poll",
    type: EVENT_FIELDS.TYPE_VALUES.POLL,
    title: "Vote: Which Gen 1 Starter Has the Best Base Set Card?",
    description:
      "<p>The eternal debate — <strong>Charizard, Blastoise, or Venusaur</strong>? Vote for which of the original three starters has the best card art in the Base Set. Results go live after the poll closes.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(7),
    endsAt: daysAhead(7),
    coverImageUrl: "https://images.pokemontcg.io/base1/15_hires.png",
    pollConfig: {
      options: [
        { id: "charizard", label: "Charizard (#4)" },
        { id: "blastoise", label: "Blastoise (#2)" },
        { id: "venusaur", label: "Venusaur (#15)" },
      ],
      allowMultiSelect: false,
      allowComment: true,
      resultsVisibility: "after_end",
    },
    tags: ["poll", "starter-pokemon", "base-set", "community"],
    stats: {
      totalEntries: 312,
      approvedEntries: 312,
      flaggedEntries: 2,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
  },

  // 3. Active Feedback Event — Best Pull Story (giveaway-style)
  {
    id: "event-1st-edition-booster-giveaway-2026-feedback",
    type: EVENT_FIELDS.TYPE_VALUES.FEEDBACK,
    title: "Share Your Best Pull Story — Win a Sealed 1st Edition Booster Pack!",
    description:
      "<p>We're giving away a <strong>sealed 1st Edition Base Set Booster Pack</strong> — estimated value ₹95,000+. Share your best pull story and tag a friend who loves Pokemon TCG.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(3),
    endsAt: daysAhead(11),
    coverImageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
    feedbackConfig: {
      formFields: [
        {
          id: "story",
          type: "textarea",
          label: "Share your best Pokemon card pull story",
          required: true,
          order: 1,
        },
        {
          id: "tagged_friend",
          type: "text",
          label: "Tag a friend (username or social handle)",
          required: false,
          order: 2,
        },
      ],
      anonymous: false,
    },
    tags: ["giveaway", "1st-edition", "base-set", "booster-pack"],
    stats: {
      totalEntries: 847,
      approvedEntries: 839,
      flaggedEntries: 8,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(5),
    updatedAt: hoursAgo(6),
  },

  // 4. Upcoming Poll Event — Best PSA Submission
  {
    id: "event-best-psa-submission-contest-2026-poll",
    type: EVENT_FIELDS.TYPE_VALUES.POLL,
    title: "Best PSA Submission — Community Vote for Top Grade!",
    description:
      "<p>The community votes for the most impressive PSA-graded Pokemon card. Winner receives store credit and a featured listing slot. Base Set cards only.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAhead(3),
    endsAt: daysAhead(17),
    coverImageUrl: "https://images.pokemontcg.io/base1/10_hires.png",
    pollConfig: {
      options: [
        { id: "charizard-psa10", label: "Charizard PSA 10" },
        { id: "mewtwo-psa9", label: "Mewtwo PSA 9" },
        { id: "blastoise-psa10", label: "Blastoise PSA 10" },
      ],
      allowMultiSelect: false,
      allowComment: true,
      resultsVisibility: "after_end",
    },
    tags: ["contest", "psa", "grading", "base-set", "community"],
    stats: {
      totalEntries: 0,
      approvedEntries: 0,
      flaggedEntries: 0,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },

  // 5. Active Survey — Buyer Experience
  {
    id: "event-buyer-experience-survey-2026-survey",
    type: EVENT_FIELDS.TYPE_VALUES.SURVEY,
    title: "Pokemon TCG Buyer Experience Survey",
    description:
      "<p>Help us improve the LetItRip Pokemon TCG buying experience. This short survey takes 2 minutes and helps us understand what collectors want most from our platform.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(14),
    endsAt: daysAhead(14),
    coverImageUrl: "https://images.pokemontcg.io/base1/58_hires.png",
    surveyConfig: {
      requireLogin: true,
      maxEntriesPerUser: 1,
      hasLeaderboard: false,
      hasPointSystem: false,
      entryReviewRequired: false,
      formFields: [
        {
          id: "satisfaction",
          type: "rating",
          label: "How satisfied are you with our Pokemon card listings?",
          required: true,
          order: 1,
        },
        {
          id: "most_wanted",
          type: "text",
          label: "Which Pokemon card are you currently hunting?",
          required: false,
          order: 2,
        },
        {
          id: "improvements",
          type: "textarea",
          label: "What would make your experience better?",
          required: false,
          order: 3,
        },
      ],
    },
    tags: ["survey", "feedback", "buyer-experience"],
    stats: {
      totalEntries: 156,
      approvedEntries: 156,
      flaggedEntries: 0,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(16),
    updatedAt: daysAgo(2),
  },

  // 6. Ended Offer Event
  {
    id: "event-new-trainer-welcome-offer-2026-offer",
    type: EVENT_FIELDS.TYPE_VALUES.OFFER,
    title: "New Trainer Welcome Offer — 10% Off Your First Order",
    description:
      "<p>New to LetItRip? Welcome, Trainer! Use code <strong>NEWTRAINER10</strong> for 10% off your first Pokemon card purchase. Valid on all singles, sealed product, and accessories.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ENDED,
    startsAt: daysAgo(60),
    endsAt: daysAgo(30),
    coverImageUrl: "https://images.pokemontcg.io/base1/58_hires.png",
    offerConfig: {
      couponId: "coupon-newtrainer10",
      displayCode: "NEWTRAINER10",
      bannerText: "New Trainer? Get 10% off your first order with NEWTRAINER10",
    },
    tags: ["offer", "welcome", "new-trainer", "discount"],
    stats: {
      totalEntries: 0,
      approvedEntries: 0,
      flaggedEntries: 0,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(65),
    updatedAt: daysAgo(29),
  },
];

// -- Event Entries -------------------------------------------------------------

export const eventEntriesSeedData: EventEntryDocument[] = [
  // Poll entries — Gen 1 Starter poll
  {
    id: "entry-gen1-poll-ash-ketchum",
    eventId: "event-favourite-gen1-starter-poll-2026-poll",
    userId: "user-ash-ketchum-ash",
    userDisplayName: "Ash Ketchum",
    pollVotes: ["charizard"],
    pollComment: "Charizard carried me through every battle!",
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(6),
    points: 1,
  },
  {
    id: "entry-gen1-poll-gary-oak",
    eventId: "event-favourite-gen1-starter-poll-2026-poll",
    userId: "user-gary-oak-gary",
    userDisplayName: "Gary Oak",
    pollVotes: ["blastoise"],
    pollComment: "Blastoise's art is unmatched. Shell Shock is peak Pokemon TCG design.",
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(5),
    points: 1,
  },
  {
    id: "entry-gen1-poll-brock",
    eventId: "event-favourite-gen1-starter-poll-2026-poll",
    userId: "user-brock-pewter-brock",
    userDisplayName: "Brock",
    pollVotes: ["venusaur"],
    pollComment: "Venusaur never gets the respect it deserves. Solar Beam is powerful!",
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(4),
    points: 1,
  },

  // Feedback entries — 1st Edition booster pull story
  {
    id: "entry-feedback-1sted-ash-ketchum",
    eventId: "event-1st-edition-booster-giveaway-2026-feedback",
    userId: "user-ash-ketchum-ash",
    userDisplayName: "Ash Ketchum",
    formResponses: {
      story: "I pulled a 1st Edition Charizard from a booster pack at age 10 and have been hooked ever since. Tagged @professor_oak!",
      tagged_friend: "@professor_oak",
    },
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: daysAgo(2),
    points: 1,
  },
  {
    id: "entry-feedback-1sted-sabrina",
    eventId: "event-1st-edition-booster-giveaway-2026-feedback",
    userId: "user-sabrina-psychic-sabrina",
    userDisplayName: "Sabrina",
    formResponses: {
      story: "My best pull was a 1st Ed Mewtwo from a pack my gym leader gave me. Changed my life as a collector.",
      tagged_friend: "@giovanni_viridian",
    },
    reviewStatus: EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED,
    submittedAt: hoursAgo(36),
    points: 1,
  },
];
