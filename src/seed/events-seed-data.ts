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
    id: "pokemon-summer-holo-sale-2026",
    slug: "pokemon-summer-holo-sale-2026",
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
    id: "gen1-starter-poll-2026",
    slug: "gen1-starter-poll-2026",
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
    id: "1st-edition-booster-giveaway-2026",
    slug: "1st-edition-booster-giveaway-2026",
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
    id: "best-psa-submission-contest-2026",
    slug: "best-psa-submission-contest-2026",
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
      requireLogin: true,
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
    id: "buyer-experience-survey-2026",
    slug: "buyer-experience-survey-2026",
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
    id: "new-trainer-welcome-offer-2026",
    slug: "new-trainer-welcome-offer-2026",
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

  // 7. Active Sale — Hot Wheels Car Culture Flash Sale
  {
    id: "hot-wheels-car-culture-flash-sale-2026",
    slug: "hot-wheels-car-culture-flash-sale-2026",
    type: EVENT_FIELDS.TYPE_VALUES.SALE,
    title: "Hot Wheels Car Culture Flash Sale — 20% Off 5-Car Packs",
    description:
      "<p>Limited-time flash sale — <strong>20% off all Hot Wheels Car Culture 5-car assortments</strong> at Speed King Diecast. Japan Historics, Germany or Bust, and more. Ends Sunday!</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(2),
    endsAt: daysAhead(5),
    coverImageUrl: "https://picsum.photos/seed/hw-car-culture-sale/800/400",
    saleConfig: {
      discountPercent: 20,
      bannerText: "Hot Wheels Car Culture Flash Sale — 20% Off This Weekend!",
      affectedCategories: ["category-hw-premium"],
    },
    tags: ["hot-wheels", "car-culture", "flash-sale", "discount", "speed-king"],
    stats: {
      totalEntries: 0,
      approvedEntries: 0,
      flaggedEntries: 0,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },

  // 8. Active Poll — Best Beyblade Burst Series
  {
    id: "best-beyblade-burst-series-poll-2026",
    slug: "best-beyblade-burst-series-poll-2026",
    type: EVENT_FIELDS.TYPE_VALUES.POLL,
    title: "Vote: Which Is the Best Beyblade Burst Series?",
    description:
      "<p>From Classic to MCC — which series introduced your favourite mechanics and best tops? Cast your vote and join the discussion. Results revealed when the poll closes.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(5),
    endsAt: daysAhead(9),
    coverImageUrl: "https://picsum.photos/seed/beyblade-poll/800/400",
    pollConfig: {
      options: [
        { id: "classic", label: "Classic / Original Burst" },
        { id: "turbo", label: "Burst Turbo / Cho-Z" },
        { id: "gt", label: "Burst GT / Gachi" },
        { id: "superking", label: "Burst Superking / Sparking" },
        { id: "quaddrive", label: "QuadDrive" },
        { id: "mcc", label: "DB / MCC" },
      ],
      allowMultiSelect: false,
      allowComment: true,
      resultsVisibility: "after_end",
    },
    tags: ["beyblade", "poll", "series", "community", "burst"],
    stats: {
      totalEntries: 214,
      approvedEntries: 214,
      flaggedEntries: 0,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(1),
  },

  // 9. Active Feedback — Transformers Figure Wishlist Survey
  {
    id: "transformers-figure-wishlist-survey-2026",
    slug: "transformers-figure-wishlist-survey-2026",
    type: EVENT_FIELDS.TYPE_VALUES.SURVEY,
    title: "Tell Us: Which Transformers Figures Do You Want Listed?",
    description:
      "<p>Help us stock what you actually want. Share your Transformers wishlist — Studio Series, Legacy, G1 vintage, or Masterpiece? We'll use these results to prioritise our Speed King Diecast stock requests.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(10),
    endsAt: daysAhead(20),
    coverImageUrl: "https://picsum.photos/seed/tf-wishlist-survey/800/400",
    surveyConfig: {
      requireLogin: true,
      maxEntriesPerUser: 1,
      hasLeaderboard: false,
      hasPointSystem: false,
      entryReviewRequired: false,
      formFields: [
        {
          id: "line",
          type: "text",
          label: "Which Transformers line do you prefer? (Studio Series, Legacy, Masterpiece, G1 vintage)",
          required: true,
          order: 1,
        },
        {
          id: "wishlist",
          type: "textarea",
          label: "List up to 5 specific figures you'd like to see available on LetItRip",
          required: true,
          order: 2,
        },
        {
          id: "budget",
          type: "text",
          label: "What's your typical budget per Transformers figure?",
          required: false,
          order: 3,
        },
      ],
    },
    tags: ["transformers", "survey", "wishlist", "studio-series", "legacy"],
    stats: {
      totalEntries: 98,
      approvedEntries: 98,
      flaggedEntries: 0,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(11),
    updatedAt: daysAgo(1),
  },

  // 10. Active Offer — Beyblade Burst Bundle Deal
  {
    id: "beyblade-burst-bundle-offer-2026",
    slug: "beyblade-burst-bundle-offer-2026",
    type: EVENT_FIELDS.TYPE_VALUES.OFFER,
    title: "Bladers Paradise Bundle Deal — Buy 2 Tops, Get Free Stadium",
    description:
      "<p>Order any 2 Beyblade Burst starter/individual tops from Bladers Paradise and get a <strong>free standard stadium</strong> (worth ₹1,299). Use code <strong>BBBUNDLE2</strong> at checkout. While stocks last!</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(1),
    endsAt: daysAhead(13),
    coverImageUrl: "https://picsum.photos/seed/beyblade-bundle-offer/800/400",
    offerConfig: {
      couponId: "coupon-bbbundle2",
      displayCode: "BBBUNDLE2",
      bannerText: "Buy 2 Beyblade Tops → Free Stadium! Use BBBUNDLE2",
    },
    tags: ["beyblade", "offer", "bundle", "stadium", "bladers-paradise"],
    stats: {
      totalEntries: 0,
      approvedEntries: 0,
      flaggedEntries: 0,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },

  // 11. Active Feedback — Hot Wheels Collector Community Survey
  {
    id: "hot-wheels-collector-survey-2026",
    slug: "hot-wheels-collector-survey-2026",
    type: EVENT_FIELDS.TYPE_VALUES.FEEDBACK,
    title: "Hot Wheels Collectors Survey — Win a Super Treasure Hunt!",
    description:
      "<p>Complete this 2-minute survey about your Hot Wheels collecting habits and be entered to <strong>win a Super Treasure Hunt</strong> of our choice (value ₹2,000–₹5,000). One lucky winner drawn when entries close.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(4),
    endsAt: daysAhead(10),
    coverImageUrl: "https://picsum.photos/seed/hw-survey-event/800/400",
    feedbackConfig: {
      formFields: [
        {
          id: "collecting_focus",
          type: "text",
          label: "What's your Hot Wheels collecting focus? (TH hunting, Car Culture, mainline, track sets)",
          required: true,
          order: 1,
        },
        {
          id: "most_wanted_casting",
          type: "text",
          label: "Name your most-wanted Hot Wheels casting currently",
          required: true,
          order: 2,
        },
        {
          id: "monthly_spend",
          type: "text",
          label: "Roughly how much do you spend on Hot Wheels per month?",
          required: false,
          order: 3,
        },
      ],
      anonymous: false,
    },
    tags: ["hot-wheels", "survey", "giveaway", "super-th", "community"],
    stats: {
      totalEntries: 183,
      approvedEntries: 180,
      flaggedEntries: 3,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },

  // 12. Active Sale — Pokémon Multi-Set Clearance
  {
    id: "pokemon-multiseries-clearance-2026",
    slug: "pokemon-multiseries-clearance-2026",
    type: EVENT_FIELDS.TYPE_VALUES.SALE,
    title: "Pokémon TCG Multi-Series Clearance — Up to 25% Off Non-Holo Rares & Uncommons",
    description:
      "<p>Clearance sale across all three LetItRip Pokémon TCG stores. <strong>Up to 25% off</strong> non-holo rares, uncommons, and common energy lots. Perfect for completing your Base Set playset.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAgo(3),
    endsAt: daysAhead(7),
    coverImageUrl: "https://images.pokemontcg.io/base1/2_hires.png",
    saleConfig: {
      discountPercent: 25,
      bannerText: "Pokémon Clearance Sale — Up to 25% Off Non-Holo Rares & Uncommons!",
      affectedCategories: ["category-non-holo-rare-rarity", "category-uncommon-rarity", "category-common-rarity"],
    },
    tags: ["pokemon", "clearance", "sale", "non-holo", "uncommon", "common"],
    stats: {
      totalEntries: 0,
      approvedEntries: 0,
      flaggedEntries: 0,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(3),
  },

  // 13. Cancelled — Transformers Convention Live Event (cancelled due to venue issue)
  {
    id: "transformers-convention-mumbai-2026",
    slug: "transformers-convention-mumbai-2026",
    type: EVENT_FIELDS.TYPE_VALUES.OFFER,
    title: "Transformers Collector Meet-Up Mumbai 2026 [CANCELLED]",
    description:
      "<p><strong>This event has been cancelled</strong> due to unforeseen venue circumstances. We apologise for the inconvenience. All registered participants will receive a ₹500 store credit coupon as compensation. Thank you for your understanding.</p>",
    status: EVENT_FIELDS.STATUS_VALUES.ENDED,
    startsAt: daysAhead(15),
    endsAt: daysAhead(16),
    coverImageUrl: "https://picsum.photos/seed/tf-meet-cancelled/800/400",
    offerConfig: {
      couponId: "coupon-tfmeet-cancelled",
      displayCode: "TFMEET500",
      bannerText: "Convention cancelled — ₹500 compensation coupon issued to all registrants",
    },
    tags: ["transformers", "event", "cancelled", "convention", "mumbai"],
    stats: {
      totalEntries: 0,
      approvedEntries: 0,
      flaggedEntries: 0,
    },
    createdBy: "user-admin-user-admin",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(1),
  },
];

// -- Event Entries -------------------------------------------------------------

export const eventEntriesSeedData: EventEntryDocument[] = [
  // Poll entries — Gen 1 Starter poll
  {
    id: "entry-gen1-poll-ash-ketchum",
    eventId: "gen1-starter-poll-2026",
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
    eventId: "gen1-starter-poll-2026",
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
    eventId: "gen1-starter-poll-2026",
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
    eventId: "1st-edition-booster-giveaway-2026",
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
    eventId: "1st-edition-booster-giveaway-2026",
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
