/**
 * Carousel Slides Seed Data — LetiTrip Collectibles Platform
 * 6 slides using CarouselSlideDocument schema (pre-CF1 schema).
 * slide- prefix, id === slug. MAX_ACTIVE_SLIDES = 5, so slide 6 is inactive.
 */

import type { CarouselSlideDocument } from "../features/homepage/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const carouselSlidesSeedData: Partial<CarouselSlideDocument>[] = [
  // ── 1. Hero — India's #1 Collectibles Marketplace ─────────────────────────
  {
    id: "slide-hero-homepage",
    title: "Hero — India's #1 Collectibles Marketplace",
    order: 1,
    active: true,
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1614108831137-558fffac9ead?w=1920&h=1080&fit=crop",
      alt: "Collectibles — Pokémon cards, Hot Wheels, anime figures and Beyblades",
    },
    mobileMedia: {
      type: "image",
      url: "https://images.unsplash.com/photo-1614108831137-558fffac9ead?w=800&h=1200&fit=crop",
      alt: "LetiTrip Collectibles",
    },
    overlay: {
      enabled: true,
      color: "#000000",
      opacity: 40,
      title: "India's #1 Collectibles Marketplace",
      subtitle: "Pokémon TCG · Hot Wheels · Beyblade X · Anime Figures",
      description: "Buy, sell and auction rare collectibles with verified sellers across India.",
      button: {
        text: "Shop Now",
        link: "/products",
        variant: "primary",
        openInNewTab: false,
      },
    },
    cards: [
      {
        id: "card-hero-pokemon",
        gridRow: 1,
        gridCol: 1,
        background: {
          type: "image",
          value: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=600&h=400&fit=crop",
          overlay: { enabled: true, color: "#1a1a2e", opacity: 50 },
        },
        content: { title: "Pokémon TCG", subtitle: "Cards, ETBs & Sealed Boxes", textColor: "#ffffff" },
        buttons: [{ text: "Shop Pokémon", link: "/categories/category-pokemon-cards", variant: "primary", openInNewTab: false }],
        isButtonOnly: false,
      },
      {
        id: "card-hero-hotwheels",
        gridRow: 1,
        gridCol: 2,
        background: {
          type: "image",
          value: "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600&h=400&fit=crop",
          overlay: { enabled: true, color: "#ff0000", opacity: 30 },
        },
        content: { title: "Hot Wheels", subtitle: "STHs, RLC & Car Culture", textColor: "#ffffff" },
        buttons: [{ text: "Shop Diecast", link: "/categories/category-hot-wheels-cars", variant: "primary", openInNewTab: false }],
        isButtonOnly: false,
      },
      {
        id: "card-hero-beyblade",
        gridRow: 1,
        gridCol: 3,
        background: {
          type: "image",
          value: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=400&fit=crop",
          overlay: { enabled: true, color: "#0000aa", opacity: 40 },
        },
        content: { title: "Beyblade X", subtitle: "Official Takara Tomy Import", textColor: "#ffffff" },
        buttons: [{ text: "Shop Beyblades", link: "/categories/category-beyblade-tops", variant: "primary", openInNewTab: false }],
        isButtonOnly: false,
      },
    ],
    analytics: { views: 12400 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(5),
  },

  // ── 2. Pokémon 151 — New Collection ───────────────────────────────────────
  {
    id: "slide-pokemon-151-collection",
    title: "New Pokémon 151 Collection",
    order: 2,
    active: true,
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1920&h=1080&fit=crop",
      alt: "Pokémon Scarlet & Violet 151 Collection",
    },
    mobileMedia: {
      type: "image",
      url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=1200&fit=crop",
      alt: "Pokémon 151",
    },
    overlay: {
      enabled: true,
      color: "#cc0000",
      opacity: 30,
      title: "Pokémon Scarlet & Violet 151",
      subtitle: "Sealed ETBs · Booster Boxes · Singles",
      description: "Original 151 Pokémon — reimagined in Scarlet & Violet. Mew ex, Charizard ex, and more.",
      button: {
        text: "Shop Pokémon 151",
        link: "/categories/category-pokemon-cards",
        variant: "primary",
        openInNewTab: false,
      },
    },
    cards: [],
    link: { url: "/categories/category-pokemon-cards", openInNewTab: false },
    analytics: { views: 8700 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(3),
  },

  // ── 3. Hot Wheels RLC Exclusives ──────────────────────────────────────────
  {
    id: "slide-hot-wheels-rlc-exclusives",
    title: "Hot Wheels RLC Exclusives",
    order: 3,
    active: true,
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1563642421748-5047b6585a4a?w=1920&h=1080&fit=crop",
      alt: "Hot Wheels RLC Exclusives and Spectraflame",
    },
    mobileMedia: {
      type: "image",
      url: "https://images.unsplash.com/photo-1563642421748-5047b6585a4a?w=800&h=1200&fit=crop",
      alt: "Hot Wheels RLC",
    },
    overlay: {
      enabled: true,
      color: "#cc0000",
      opacity: 25,
      title: "Hot Wheels RLC Exclusives",
      subtitle: "Spectraflame · Real Riders · Super Treasure Hunts",
      description: "Rare Hot Wheels sourced from RLC members and Japan collectors. Fresh to India.",
      button: {
        text: "Shop Hot Wheels",
        link: "/categories/category-diecast-vehicles",
        variant: "primary",
        openInNewTab: false,
      },
    },
    cards: [],
    link: { url: "/categories/category-diecast-vehicles", openInNewTab: false },
    analytics: { views: 6200 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(4),
  },

  // ── 4. Live Auctions ──────────────────────────────────────────────────────
  {
    id: "slide-live-auctions-bid-now",
    title: "Live Auctions — Bid Now",
    order: 4,
    active: true,
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1559336197-ded8aaa244bc?w=1920&h=1080&fit=crop",
      alt: "Live collectibles auctions — bid on rare items",
    },
    mobileMedia: {
      type: "image",
      url: "https://images.unsplash.com/photo-1559336197-ded8aaa244bc?w=800&h=1200&fit=crop",
      alt: "Live Auctions",
    },
    overlay: {
      enabled: true,
      color: "#1a0050",
      opacity: 50,
      title: "Live Auctions — Bid Now",
      subtitle: "PSA Slabs · Vintage Cards · Rare Diecast · Signed Tops",
      description: "Real-time bidding with auto-extend protection. New auctions added daily.",
      button: {
        text: "View Auctions",
        link: "/auctions",
        variant: "primary",
        openInNewTab: false,
      },
    },
    cards: [
      {
        id: "card-auction-charizard",
        gridRow: 2,
        gridCol: 1,
        background: {
          type: "color",
          value: "var(--appkit-color-primary)",
          overlay: { enabled: false, color: "#000000", opacity: 0 },
        },
        content: {
          title: "Charizard 1st Edition PSA 9",
          subtitle: "Ending in 12h · Current bid ₹2,99,999",
          textColor: "#ffffff",
        },
        buttons: [{ text: "Bid Now", link: "/auctions/auction-pokemon-charizard-base1-psa9", variant: "secondary", openInNewTab: false }],
        isButtonOnly: false,
      },
    ],
    analytics: { views: 9300 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },

  // ── 5. S.H.Figuarts New Arrivals ──────────────────────────────────────────
  {
    id: "slide-shf-new-arrivals",
    title: "S.H.Figuarts & Nendoroid New Arrivals",
    order: 5,
    active: true,
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&h=1080&fit=crop",
      alt: "Anime figures — S.H.Figuarts and Nendoroid collection",
    },
    mobileMedia: {
      type: "image",
      url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=1200&fit=crop",
      alt: "Anime Figures",
    },
    overlay: {
      enabled: true,
      color: "#000022",
      opacity: 45,
      title: "S.H.Figuarts & Nendoroid",
      subtitle: "Dragon Ball · Re:Zero · Naruto · Demon Slayer",
      description: "Official Bandai and Good Smile figures, sourced directly from Japanese distributors.",
      button: {
        text: "Shop Figures",
        link: "/categories/category-anime-figures",
        variant: "primary",
        openInNewTab: false,
      },
    },
    cards: [],
    link: { url: "/categories/category-anime-figures", openInNewTab: false },
    analytics: { views: 5100 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(2),
  },

  // ── 6. Pokémon SV5 Pre-Order (inactive — 6th slide, over MAX_ACTIVE_SLIDES) ─
  {
    id: "slide-pokemon-sv5-preorder",
    title: "Pre-Order: Pokémon Shrouded Fable (SV5)",
    order: 6,
    active: false,
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=1920&h=1080&fit=crop",
      alt: "Pokémon Shrouded Fable SV5 Pre-Order",
    },
    mobileMedia: {
      type: "image",
      url: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1200&fit=crop",
      alt: "Pokémon SV5 Pre-Order",
    },
    overlay: {
      enabled: true,
      color: "#2d0057",
      opacity: 40,
      title: "Pre-Order Now: Pokémon SV5",
      subtitle: "Shrouded Fable — Pecharunt ex & Ancient Beasts",
      description: "Secure your Shrouded Fable ETB or booster box with just 30% deposit. Ships in 60 days.",
      button: {
        text: "Pre-Order SV5",
        link: "/pre-orders/preorder-pokemon-sv5-booster-box",
        variant: "primary",
        openInNewTab: false,
      },
    },
    cards: [],
    analytics: { views: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
];
