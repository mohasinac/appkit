/**
 * Multi-Franchise Collectibles — Carousel Slides Seed Data
 *
 * 3 active + 2 disabled slides. Each slide has at most 2 cards with buttons.
 * Covers Pokémon TCG · Hot Wheels · Beyblade Burst · Transformers
 */

import type { CarouselSlideDocument } from "../features/homepage/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

const ADMIN = "user-admin-user-admin";

const cardImg = (num: number) =>
  `https://images.pokemontcg.io/base1/${num}_hires.png`;
const picsumImg = (seed: string, w = 1200, h = 500) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const pokemonCarouselSlidesSeedData: Partial<CarouselSlideDocument>[] = [
  // ── Slide 1 — Multi-Franchise Welcome Hero (ACTIVE) ──────────────────────
  {
    id: "carousel-welcome-hero-multifranchise-1",
    title: "Welcome — Multi-Franchise Collectibles",
    order: 1,
    active: true,
    media: {
      type: "image",
      url: cardImg(4),
      alt: "Charizard — Pokémon Base Set #4 Holo Rare",
    },
    mobileMedia: {
      type: "image",
      url: cardImg(4),
      alt: "Charizard — Pokémon Base Set #4 Holo Rare",
    },
    cards: [
      {
        id: "card-welcome-cta",
        gridRow: 2,
        gridCol: 3,
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #1E40AF 0%, #7C3AED 100%)",
        },
        content: {
          title: "India's #1 Collectibles Marketplace",
          subtitle: "Pokémon · Hot Wheels · Beyblade · Transformers",
          description: "Authentic products from verified sellers. Graded slabs, sealed packs, rare singles & more.",
        },
        buttons: [
          {
            id: "btn-welcome-shop",
            text: "Shop Now",
            link: "/products",
            variant: "primary",
            openInNewTab: false,
          },
          {
            id: "btn-welcome-auctions",
            text: "Live Auctions",
            link: "/auctions",
            variant: "secondary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
    ],
    overlay: {
      enabled: true,
      color: "#000000",
      opacity: 0.4,
      title: "Own a Piece of History",
      subtitle: "Collectibles for Every Fan",
      description:
        "From 1st Edition Charizard to G1 Optimus Prime — browse, bid, and collect.",
    },
    analytics: { views: 0 },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
    createdBy: ADMIN,
  },

  // ── Slide 2 — Live Auctions Spotlight (ACTIVE) ───────────────────────────
  {
    id: "carousel-live-auctions-spotlight-2",
    title: "Live Auctions Spotlight",
    order: 2,
    active: true,
    media: {
      type: "image",
      url: cardImg(10),
      alt: "Mewtwo — Live Auction spotlight",
    },
    link: { url: "/auctions", openInNewTab: false },
    cards: [
      {
        id: "card-auction-charizard",
        gridRow: 2,
        gridCol: 2,
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #FF6B35 0%, #FFCB05 100%)",
        },
        content: {
          title: "🔥 1st Ed. Charizard PSA 7",
          subtitle: "Current Bid: ₹3,49,999",
          description: "Ends in 7 days · Buy Now at ₹6,99,999",
        },
        buttons: [
          {
            id: "btn-bid-charizard",
            text: "Bid Now",
            link: "/auctions",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card-auction-optimus",
        gridRow: 2,
        gridCol: 3,
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #1D4ED8 0%, #64748B 100%)",
        },
        content: {
          title: "🤖 G1 Optimus Prime MISB",
          subtitle: "Starting Bid: ₹99,999",
          description: "Factory sealed · 1984 vintage",
        },
        buttons: [
          {
            id: "btn-bid-optimus",
            text: "Place Bid",
            link: "/auctions",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
    ],
    analytics: { views: 0 },
    createdAt: daysAgo(3),
    updatedAt: daysAgo(0),
    createdBy: ADMIN,
  },

  // ── Slide 3 — Hot Wheels & Beyblade (ACTIVE) ─────────────────────────────
  {
    id: "carousel-hw-beyblade-featured-3",
    title: "Hot Wheels & Beyblade Featured",
    order: 3,
    active: true,
    media: {
      type: "image",
      url: picsumImg("hotwheels-hero", 1200, 500),
      alt: "Hot Wheels and Beyblade Burst collectibles",
    },
    cards: [
      {
        id: "card-hot-wheels-th",
        gridRow: 2,
        gridCol: 2,
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #DC2626 0%, #F59E0B 100%)",
        },
        content: {
          title: "🚗 Treasure Hunts",
          subtitle: "Hot Wheels TH & Super TH",
          description: "India's largest Hot Wheels collector store. Premium, Car Culture & STHs.",
        },
        buttons: [
          {
            id: "btn-hw-shop",
            text: "Browse Hot Wheels",
            link: "/products?category=hot-wheels",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card-beyblade-launch",
        gridRow: 2,
        gridCol: 3,
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
        },
        content: {
          title: "🌀 Let It Rip!",
          subtitle: "Beyblade Burst — All Series",
          description: "Attack · Defense · Stamina · Balance · Stadiums",
        },
        buttons: [
          {
            id: "btn-bb-shop",
            text: "Browse Beyblade",
            link: "/products?category=beyblade-burst",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
    ],
    analytics: { views: 0 },
    createdAt: daysAgo(20),
    updatedAt: daysAgo(2),
    createdBy: ADMIN,
  },

  // ── Slide 4 — Pre-Orders (DISABLED) ──────────────────────────────────────
  {
    id: "carousel-pre-orders-incoming-4",
    title: "Pre-Orders — Incoming Sets",
    order: 4,
    active: false,
    media: {
      type: "image",
      url: cardImg(58),
      alt: "Pre-Order — upcoming Pokémon TCG sets",
    },
    cards: [
      {
        id: "card-preorder-151",
        gridRow: 2,
        gridCol: 2,
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #059669 0%, #10B981 100%)",
        },
        content: {
          title: "📦 SV: 151 Booster Box",
          subtitle: "Pre-Order Now — ₹14,999",
          description: "All 151 original Pokémon · Ships in 60 days",
        },
        buttons: [
          {
            id: "btn-preorder-151",
            text: "Pre-Order",
            link: "/pre-orders",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card-preorder-hw",
        gridRow: 2,
        gridCol: 3,
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #0369A1 0%, #38BDF8 100%)",
        },
        content: {
          title: "🚗 HW 2025 Mainline Cases",
          subtitle: "Pre-Order · ₹2,499",
          description: "72-car assortment case · Ships when available",
        },
        buttons: [
          {
            id: "btn-preorder-hw",
            text: "Pre-Order",
            link: "/pre-orders",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
    ],
    analytics: { views: 0 },
    createdAt: daysAhead(1),
    updatedAt: daysAhead(1),
    createdBy: ADMIN,
  },

  // ── Slide 5 — Seasonal Promo (DISABLED) ──────────────────────────────────
  {
    id: "carousel-seasonal-promo-5",
    title: "Seasonal Promo — Summer Sale",
    order: 5,
    active: false,
    media: {
      type: "image",
      url: picsumImg("summer-sale-banner", 1200, 500),
      alt: "Summer Sale — up to 20% off select collectibles",
    },
    cards: [
      {
        id: "card-summer-sale-cta",
        gridRow: 2,
        gridCol: 3,
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
        },
        content: {
          title: "☀️ Summer Sale",
          subtitle: "Up to 20% off select items",
          description: "Pokémon · Hot Wheels · Beyblade · Transformers — limited time",
        },
        buttons: [
          {
            id: "btn-summer-sale",
            text: "Shop the Sale",
            link: "/products?promoted=true",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
    ],
    analytics: { views: 0 },
    createdAt: daysAhead(30),
    updatedAt: daysAhead(30),
    createdBy: ADMIN,
  },
];
