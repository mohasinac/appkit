/**
 * Pokemon Base Set 151 — Carousel Slides Seed Data
 * Hero slides for the LetItRip homepage using real pokemontcg.io card images
 */

import type { CarouselSlideDocument } from "../features/homepage/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

const ADMIN = "user-admin-user-admin";

const cardImg = (num: number) =>
  `https://images.pokemontcg.io/base1/${num}_hires.png`;

export const pokemonCarouselSlidesSeedData: Partial<CarouselSlideDocument>[] = [
  // ── Slide 1: Welcome Hero — Charizard ──────────────────────────────────────
  {
    id: "carousel-pokemon-welcome-hero-1707300000001",
    title: "Welcome — Charizard Hero",
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
    cards: [],
    overlay: {
      enabled: true,
      color: "#000000",
      opacity: 0.45,
      subtitle: "Pokémon Base Set 151",
      title: "Own a Piece of History",
      description:
        "Browse authentic Base Set singles, sealed packs, and graded gems — from Pikachu to Charizard.",
      button: {
        id: "hero-cta-shop",
        text: "Start Collecting",
        link: "/products",
        variant: "primary",
        openInNewTab: false,
      },
    },
    analytics: { views: 0 },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
    createdBy: ADMIN,
  },

  // ── Slide 2: Holo Rare Sale ────────────────────────────────────────────────
  {
    id: "carousel-pokemon-holo-rare-sale-1707300000002",
    title: "Holo Rare Showcase",
    order: 2,
    active: true,
    media: {
      type: "image",
      url: cardImg(10), // Mewtwo
      alt: "Mewtwo — Pokémon Base Set #10 Holo Rare",
    },
    cards: [
      {
        id: "card-holo-rare-charizard",
        gridRow: 1,
        gridCol: 1,
        background: { type: "image", value: cardImg(4) },
        content: {
          title: "Charizard #4",
          subtitle: "Holo Rare",
          description: "From ₹89,999",
        },
        buttons: [
          {
            id: "btn-charizard",
            text: "View",
            link: "/products/charizard-base1-4-holo-rare",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card-holo-rare-blastoise",
        gridRow: 1,
        gridCol: 2,
        background: { type: "image", value: cardImg(2) },
        content: {
          title: "Blastoise #2",
          subtitle: "Holo Rare",
          description: "From ₹34,999",
        },
        buttons: [
          {
            id: "btn-blastoise",
            text: "View",
            link: "/products/blastoise-base1-2-holo-rare",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card-holo-rare-zapdos",
        gridRow: 1,
        gridCol: 3,
        background: { type: "image", value: cardImg(16) },
        content: {
          title: "Zapdos #16",
          subtitle: "Holo Rare",
          description: "From ₹12,999",
        },
        buttons: [
          {
            id: "btn-zapdos",
            text: "View",
            link: "/products/zapdos-base1-16-holo-rare",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
    ],
    analytics: { views: 0 },
    createdAt: daysAgo(28),
    updatedAt: daysAgo(1),
    createdBy: ADMIN,
  },

  // ── Slide 3: Auctions — 1st Edition Grail ─────────────────────────────────
  {
    id: "carousel-pokemon-auction-grail-1707300000003",
    title: "Live Auction — 1st Edition Grail",
    order: 3,
    active: true,
    media: {
      type: "image",
      url: cardImg(4),
      alt: "1st Edition Charizard Auction",
    },
    link: { url: "/auctions", openInNewTab: false },
    cards: [
      {
        id: "card-auction-banner",
        gridRow: 2,
        gridCol: 3,
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #FF6B35 0%, #F7C59F 100%)",
        },
        content: {
          title: "🔥 Live Auction",
          subtitle: "1st Edition Charizard PSA 7",
          description: "Current bid: ₹3,49,999 — ends in 7 days",
        },
        buttons: [
          {
            id: "btn-bid-now",
            text: "Bid Now",
            link: "/auctions",
            variant: "primary",
            openInNewTab: false,
          },
          {
            id: "btn-view-all-auctions",
            text: "All Auctions",
            link: "/auctions",
            variant: "secondary",
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

  // ── Slide 4: Element Types Showcase ───────────────────────────────────────
  {
    id: "carousel-pokemon-element-types-1707300000004",
    title: "Element Types Showcase",
    order: 4,
    active: true,
    media: {
      type: "image",
      url: cardImg(16), // Zapdos
      alt: "Zapdos — Electric Type",
    },
    cards: [
      {
        id: "card-water-type",
        gridRow: 1,
        gridCol: 1,
        background: { type: "color", value: "#6DB6D4" },
        content: {
          title: "💧 Water",
          subtitle: "Blastoise · Lapras · Starmie",
        },
        buttons: [
          {
            id: "btn-water",
            text: "Browse Water",
            link: "/categories/water",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card-fire-type",
        gridRow: 1,
        gridCol: 2,
        background: { type: "color", value: "#EE8130" },
        content: {
          title: "🔥 Fire",
          subtitle: "Charizard · Arcanine · Ninetales",
        },
        buttons: [
          {
            id: "btn-fire",
            text: "Browse Fire",
            link: "/categories/fire",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card-electric-type",
        gridRow: 1,
        gridCol: 3,
        background: { type: "color", value: "#F7D02C" },
        content: {
          title: "⚡ Electric",
          subtitle: "Pikachu · Raichu · Zapdos",
        },
        buttons: [
          {
            id: "btn-electric",
            text: "Browse Electric",
            link: "/categories/electric",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card-psychic-type",
        gridRow: 2,
        gridCol: 1,
        background: { type: "color", value: "#F95587" },
        content: { title: "🔮 Psychic", subtitle: "Mewtwo · Gengar · Jynx" },
        buttons: [
          {
            id: "btn-psychic",
            text: "Browse Psychic",
            link: "/categories/psychic",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card-grass-type",
        gridRow: 2,
        gridCol: 2,
        background: { type: "color", value: "#7AC74C" },
        content: { title: "🌿 Grass", subtitle: "Venusaur · Scyther · Pinsir" },
        buttons: [
          {
            id: "btn-grass",
            text: "Browse Grass",
            link: "/categories/grass",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card-fighting-type",
        gridRow: 2,
        gridCol: 3,
        background: { type: "color", value: "#C22E28" },
        content: { title: "🥊 Fighting", subtitle: "Machamp · Hitmonchan" },
        buttons: [
          {
            id: "btn-fighting",
            text: "Browse Fighting",
            link: "/categories/fighting",
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

  // ── Slide 5: Pikachu Fan Favourite ────────────────────────────────────────
  {
    id: "carousel-pokemon-pikachu-fan-fav-1707300000005",
    title: "Pikachu Fan Favourite",
    order: 5,
    active: true,
    media: {
      type: "image",
      url: cardImg(58), // Pikachu
      alt: "Pikachu — Pokémon Base Set #58 Common",
    },
    cards: [
      {
        id: "card-pikachu-promo",
        gridRow: 2,
        gridCol: 3,
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #FFCB05 0%, #FFB300 100%)",
        },
        content: {
          title: "⚡ Pikachu #58",
          subtitle: "Base Set Common",
          description: "Yellow Cheeks variant — from ₹1,999",
        },
        buttons: [
          {
            id: "btn-pikachu-shop",
            text: "Get Yours",
            link: "/products/pikachu-base1-58-common",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
    ],
    analytics: { views: 0 },
    createdAt: daysAgo(15),
    updatedAt: daysAgo(1),
    createdBy: ADMIN,
  },

  // ── Slide 6: Sealed Products ──────────────────────────────────────────────
  {
    id: "carousel-pokemon-sealed-products-1707300000006",
    title: "Sealed Products",
    order: 6,
    active: true,
    media: {
      type: "image",
      url: "https://images.pokemontcg.io/base1/logo.png",
      alt: "Pokémon Base Set sealed products",
    },
    cards: [
      {
        id: "card-booster-pack",
        gridRow: 1,
        gridCol: 1,
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)",
        },
        content: {
          title: "📦 Booster Pack",
          subtitle: "Factory Sealed",
          description: "11 cards · 1 guaranteed Rare · ₹12,999",
        },
        buttons: [
          {
            id: "btn-booster",
            text: "Buy Sealed Pack",
            link: "/products/base-set-booster-pack-sealed",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card-theme-deck",
        gridRow: 1,
        gridCol: 2,
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #6B21A8 0%, #A855F7 100%)",
        },
        content: {
          title: "🗲 Zap! Theme Deck",
          subtitle: "Sealed",
          description: "Electric starter deck · ₹18,999",
        },
        buttons: [
          {
            id: "btn-zap-deck",
            text: "Buy Zap! Deck",
            link: "/products/zap-theme-deck-sealed",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
    ],
    analytics: { views: 0 },
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
    createdBy: ADMIN,
  },

  // ── Slide 7: Inactive placeholder ─────────────────────────────────────────
  {
    id: "carousel-pokemon-inactive-test-1707300000007",
    title: "Inactive Test Slide",
    order: 7,
    active: false,
    media: {
      type: "image",
      url: cardImg(1),
      alt: "Alakazam — inactive slide",
    },
    cards: [],
    analytics: { views: 0 },
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
    createdBy: ADMIN,
  },
];
