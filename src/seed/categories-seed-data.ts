/**
 * Categories Seed Data — Collectibles Edition
 * 22 categories in 3-tier hierarchy covering 5 collectibles verticals.
 * Verticals: action figures, trading cards, diecast, spinning tops, model kits + vintage/rare.
 * id === slug convention enforced throughout.
 */

import type { CategoryDocument } from "../features/categories/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const emptyMetrics = {
  productCount: 0,
  productIds: [],
  auctionCount: 0,
  auctionIds: [],
  totalProductCount: 0,
  totalAuctionCount: 0,
  totalItemCount: 0,
  lastUpdated: daysAgo(1),
};

const rawCategories: Partial<CategoryDocument>[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // ROOT 1: Action Figures & Statues (tier 0)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "category-action-figures",
    slug: "category-action-figures",
    name: "Action Figures & Statues",
    description:
      "Premium anime figures, scale statues, Nendoroids, figma, and poseable action figures from top Japanese manufacturers.",
    rootId: "category-action-figures",
    parentIds: [],
    childrenIds: [
      "category-nendoroids-chibis",
      "category-scale-figures",
      "category-poseable-figures",
      "category-anime-figures",
      "category-funko-pops",
      "category-superhero-figures",
    ],
    tier: 0,
    path: "action-figures",
    order: 1,
    isLeaf: false,
    position: 0,
    subtreeSize: 4,
    metrics: emptyMetrics,
    isFeatured: true,
    featuredPriority: 1,
    isBrand: false,
    seo: {
      title: "Action Figures & Anime Statues | LetItRip",
      description:
        "Shop premium anime figures, scale statues, Nendoroids, figma, and poseable action figures from Bandai, Good Smile Company, and more.",
      keywords: [
        "anime figures",
        "nendoroid",
        "figma",
        "scale figure",
        "action figure",
        "collectibles india",
      ],
      ogImage:
        "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&h=630&fit=crop",
    },
    display: {
      icon: "🎌",
      coverImage:
        "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=800&fit=crop",
      color: "#3b82f6",
      showInMenu: true,
      showInFooter: true,
    },
    isActive: true,
    isSearchable: true,
    showOnHomepage: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [],
  },

  // Action Figures > Nendoroids & Chibis (tier 1)
  {
    id: "category-nendoroids-chibis",
    slug: "category-nendoroids-chibis",
    name: "Nendoroids & Chibis",
    description:
      "Good Smile Company Nendoroids, Nendoroid Dolls, chibi-style figures, and gashapon mini collectibles.",
    rootId: "category-action-figures",
    parentIds: ["category-action-figures"],
    childrenIds: [],
    tier: 1,
    path: "action-figures/nendoroids-chibis",
    order: 1,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: {
      title: "Nendoroids & Chibi Figures | LetItRip",
      description:
        "Browse GSC Nendoroids, Nendoroid Dolls, chibi figurines, and gashapon mini collectibles.",
      keywords: ["nendoroid", "chibi figure", "good smile", "gsc", "gashapon"],
    },
    display: {
      icon: "🫧",
      coverImage:
        "https://images.unsplash.com/photo-1614108831137-558fffac9ead?w=800&h=800&fit=crop",
      showInMenu: true,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-priya-singh",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-action-figures", name: "Action Figures & Statues", tier: 0 }],
  },

  // Action Figures > Scale Figures (tier 1)
  {
    id: "category-scale-figures",
    slug: "category-scale-figures",
    name: "Scale Figures",
    description:
      "High-end 1/4, 1/6, 1/7, and 1/8 scale PVC anime statues from Alter, Kotobukiya, Max Factory, and Aniplex.",
    rootId: "category-action-figures",
    parentIds: ["category-action-figures"],
    childrenIds: [],
    tier: 1,
    path: "action-figures/scale-figures",
    order: 2,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: true,
    featuredPriority: 2,
    isBrand: false,
    seo: {
      title: "Scale Figures — 1/6, 1/7, 1/8 Anime PVC | LetItRip",
      description:
        "Shop 1/4–1/8 scale anime PVC figures by Alter, Kotobukiya, Max Factory, and more.",
      keywords: ["scale figure", "1/7 scale", "pvc figure", "alter", "kotobukiya", "anime statue"],
    },
    display: {
      icon: "🏆",
      coverImage:
        "https://images.unsplash.com/photo-1608889825271-9696283b84bd?w=800&h=800&fit=crop",
      showInMenu: true,
      showInFooter: true,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-action-figures", name: "Action Figures & Statues", tier: 0 }],
  },

  // Action Figures > Poseable Figures (tier 1)
  {
    id: "category-poseable-figures",
    slug: "category-poseable-figures",
    name: "Poseable Action Figures",
    description:
      "Fully articulated poseable action figures — figma, S.H.Figuarts, MAFEX, and Marvel Legends. Multiple points of articulation and interchangeable parts.",
    rootId: "category-action-figures",
    parentIds: ["category-action-figures"],
    childrenIds: [],
    tier: 1,
    path: "action-figures/poseable-figures",
    order: 3,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: {
      title: "Poseable Action Figures — figma, S.H.Figuarts | LetItRip",
      description:
        "Shop fully articulated figma, S.H.Figuarts, MAFEX, and Revoltech poseable anime figures.",
      keywords: ["figma", "sh figuarts", "mafex", "revoltech", "poseable figure", "articulated"],
    },
    display: {
      icon: "🦾",
      coverImage:
        "https://images.unsplash.com/photo-1560762484-813fc97650a0?w=800&h=800&fit=crop",
      showInMenu: true,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-action-figures", name: "Action Figures & Statues", tier: 0 }],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ROOT 2: Trading Cards (tier 0)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "category-trading-cards",
    slug: "category-trading-cards",
    name: "Trading Cards",
    description:
      "Pokémon TCG, Yu-Gi-Oh!, and other trading card games. Singles, booster packs, sealed boxes, ETBs, and graded slabs.",
    rootId: "category-trading-cards",
    parentIds: [],
    childrenIds: [
      "category-pokemon-tcg",
      "category-yugioh-tcg",
      "category-sealed-product",
      "category-one-piece-cards",
      "category-magic-cards",
      "category-flesh-blood-cards",
    ],
    tier: 0,
    path: "trading-cards",
    order: 2,
    isLeaf: false,
    position: 0,
    subtreeSize: 4,
    metrics: emptyMetrics,
    isFeatured: true,
    featuredPriority: 3,
    isBrand: false,
    seo: {
      title: "Trading Cards — Pokémon TCG, Yu-Gi-Oh! | LetItRip",
      description:
        "Shop Pokémon TCG singles, booster packs, sealed boxes, and Yu-Gi-Oh! cards. Graded slabs, ETBs, and more.",
      keywords: [
        "pokemon tcg",
        "yugioh cards",
        "trading cards india",
        "booster pack",
        "sealed box",
        "graded cards",
      ],
      ogImage:
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&h=630&fit=crop",
    },
    display: {
      icon: "🃏",
      coverImage:
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=800&fit=crop",
      color: "#f59e0b",
      showInMenu: true,
      showInFooter: true,
    },
    isActive: true,
    isSearchable: true,
    showOnHomepage: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [],
  },

  // Trading Cards > Pokémon TCG (tier 1)
  {
    id: "category-pokemon-tcg",
    slug: "category-pokemon-tcg",
    name: "Pokémon TCG",
    description:
      "Official Pokémon Trading Card Game product. Booster packs, Elite Trainer Boxes (ETBs), sealed booster boxes, singles, and graded PSA/BGS slabs.",
    rootId: "category-trading-cards",
    parentIds: ["category-trading-cards"],
    childrenIds: [],
    tier: 1,
    path: "trading-cards/pokemon-tcg",
    order: 1,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: true,
    featuredPriority: 4,
    isBrand: false,
    seo: {
      title: "Pokémon TCG — Cards, Booster Packs & ETBs | LetItRip",
      description:
        "Shop Pokémon TCG booster packs, Elite Trainer Boxes, sealed boxes, and singles. Charizard ex, Pikachu VMAX, and more.",
      keywords: [
        "pokemon tcg",
        "pokemon cards",
        "booster pack",
        "etb",
        "charizard",
        "pikachu vmax",
        "psa graded",
      ],
    },
    display: {
      icon: "⚡",
      coverImage:
        "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&h=800&fit=crop",
      color: "#fbbf24",
      showInMenu: true,
      showInFooter: true,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-aryan-kapoor",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-trading-cards", name: "Trading Cards", tier: 0 }],
  },

  // Trading Cards > Yu-Gi-Oh! TCG (tier 1)
  {
    id: "category-yugioh-tcg",
    slug: "category-yugioh-tcg",
    name: "Yu-Gi-Oh! TCG",
    description:
      "Konami's Yu-Gi-Oh! Trading Card Game. Booster packs, structure decks, collector tins, secret rare singles, and tournament staples.",
    rootId: "category-trading-cards",
    parentIds: ["category-trading-cards"],
    childrenIds: [],
    tier: 1,
    path: "trading-cards/yugioh-tcg",
    order: 2,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: {
      title: "Yu-Gi-Oh! TCG — Cards, Booster Packs & Decks | LetItRip",
      description:
        "Shop Yu-Gi-Oh! booster packs, structure decks, collector tins, and secret rare singles by Konami.",
      keywords: [
        "yugioh",
        "yu-gi-oh cards",
        "konami tcg",
        "structure deck",
        "secret rare",
        "tournament cards",
      ],
    },
    display: {
      icon: "🐉",
      coverImage:
        "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800&h=800&fit=crop",
      showInMenu: true,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-nisha-reddy",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-trading-cards", name: "Trading Cards", tier: 0 }],
  },

  // Trading Cards > Sealed Product (tier 1)
  {
    id: "category-sealed-product",
    slug: "category-sealed-product",
    name: "Sealed Product",
    description:
      "Sealed booster boxes, collector's tins, Premium Collections, and first-edition sealed sets from all TCG brands. Investment-grade sealed collectibles.",
    rootId: "category-trading-cards",
    parentIds: ["category-trading-cards"],
    childrenIds: [],
    tier: 1,
    path: "trading-cards/sealed-product",
    order: 3,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: {
      title: "Sealed TCG Product — Boxes, Tins & Collections | LetItRip",
      description:
        "Investment-grade sealed TCG product. Booster boxes, collector tins, and premium collections for Pokémon and Yu-Gi-Oh!.",
      keywords: [
        "sealed booster box",
        "tcg investment",
        "pokemon booster box",
        "collector tin",
        "first edition",
        "sealed set",
      ],
    },
    display: {
      icon: "📦",
      coverImage:
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=800&fit=crop",
      showInMenu: true,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-trading-cards", name: "Trading Cards", tier: 0 }],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ROOT 3: Diecast & Vehicles (tier 0)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "category-diecast-vehicles",
    slug: "category-diecast-vehicles",
    name: "Diecast & Vehicles",
    description:
      "Die-cast collectible vehicles — Hot Wheels 1:64 scale cars, Tomica Japanese vehicles, Treasure Hunts, Car Culture sets, and premium diecast.",
    rootId: "category-diecast-vehicles",
    parentIds: [],
    childrenIds: [
      "category-hot-wheels",
      "category-tomica",
      "category-premium-diecast",
      "category-matchbox-cars",
      "category-corgi-cars",
    ],
    tier: 0,
    path: "diecast-vehicles",
    order: 3,
    isLeaf: false,
    position: 0,
    subtreeSize: 4,
    metrics: emptyMetrics,
    isFeatured: true,
    featuredPriority: 5,
    isBrand: false,
    seo: {
      title: "Diecast Vehicles — Hot Wheels, Tomica | LetItRip",
      description:
        "Shop Hot Wheels Treasure Hunts, Car Culture sets, Tomica diecast, and premium 1:18 scale cars.",
      keywords: [
        "hot wheels india",
        "diecast cars",
        "tomica",
        "treasure hunt",
        "car culture",
        "1:64 scale",
      ],
      ogImage:
        "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=1200&h=630&fit=crop",
    },
    display: {
      icon: "🚗",
      coverImage:
        "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&h=800&fit=crop",
      color: "#ef4444",
      showInMenu: true,
      showInFooter: true,
    },
    isActive: true,
    isSearchable: true,
    showOnHomepage: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [],
  },

  // Diecast > Hot Wheels (tier 1)
  {
    id: "category-hot-wheels",
    slug: "category-hot-wheels",
    name: "Hot Wheels",
    description:
      "Mattel Hot Wheels 1:64 scale diecast cars. Mainline, Treasure Hunt (TH), Super Treasure Hunt (STH), Car Culture, Team Transport, and RLC exclusives.",
    rootId: "category-diecast-vehicles",
    parentIds: ["category-diecast-vehicles"],
    childrenIds: [],
    tier: 1,
    path: "diecast-vehicles/hot-wheels",
    order: 1,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: true,
    featuredPriority: 6,
    isBrand: false,
    seo: {
      title: "Hot Wheels — Treasure Hunt, Car Culture, RLC | LetItRip",
      description:
        "Shop Hot Wheels Mainline, Treasure Hunt, Super Treasure Hunt, Car Culture, and exclusive RLC sets.",
      keywords: [
        "hot wheels",
        "treasure hunt",
        "super treasure hunt",
        "car culture",
        "hot wheels india",
        "rlc",
      ],
    },
    display: {
      icon: "🔥",
      coverImage:
        "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&h=800&fit=crop",
      color: "#ef4444",
      showInMenu: true,
      showInFooter: true,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-vikram-mehta",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-diecast-vehicles", name: "Diecast & Vehicles", tier: 0 }],
  },

  // Diecast > Tomica (tier 1)
  {
    id: "category-tomica",
    slug: "category-tomica",
    name: "Tomica",
    description:
      "Takara Tomy's Tomica 1:64 Japanese diecast cars. Standard Tomica, Tomica Premium, Tomica Limited Vintage, and Disney collaboration sets.",
    rootId: "category-diecast-vehicles",
    parentIds: ["category-diecast-vehicles"],
    childrenIds: [],
    tier: 1,
    path: "diecast-vehicles/tomica",
    order: 2,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: {
      title: "Tomica Diecast — Tomica Premium & Limited Vintage | LetItRip",
      description:
        "Shop Tomica Standard, Tomica Premium, and Tomica Limited Vintage diecast cars by Takara Tomy.",
      keywords: [
        "tomica",
        "tomica premium",
        "tomica limited vintage",
        "takara tomy",
        "japanese diecast",
      ],
    },
    display: {
      icon: "🚕",
      coverImage:
        "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&h=800&fit=crop",
      showInMenu: true,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-diecast-vehicles", name: "Diecast & Vehicles", tier: 0 }],
  },

  // Diecast > Premium Diecast (tier 1)
  {
    id: "category-premium-diecast",
    slug: "category-premium-diecast",
    name: "Premium Diecast",
    description:
      "Premium 1:18 and 1:43 scale diecast from Maisto, Bburago, Kyosho, and AutoArt. Museum-quality replica cars including F1 and supercars.",
    rootId: "category-diecast-vehicles",
    parentIds: ["category-diecast-vehicles"],
    childrenIds: [],
    tier: 1,
    path: "diecast-vehicles/premium-diecast",
    order: 3,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: {
      title: "Premium 1:18 Diecast Cars | LetItRip",
      description:
        "Shop 1:18 and 1:43 scale premium diecast cars from Maisto, Kyosho, and AutoArt. F1 and supercar replicas.",
      keywords: ["1:18 diecast", "premium diecast", "maisto", "kyosho", "autoart", "f1 car"],
    },
    display: {
      icon: "🏎️",
      coverImage:
        "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&h=800&fit=crop",
      showInMenu: true,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-diecast-vehicles", name: "Diecast & Vehicles", tier: 0 }],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ROOT 4: Spinning Tops (tier 0)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "category-spinning-tops",
    slug: "category-spinning-tops",
    name: "Spinning Tops",
    description:
      "Competitive Beyblade spinning tops — Beyblade Burst, Beyblade X, Metal Fight Classic. Official Takara Tomy and Hasbro product including launchers and stadiums.",
    rootId: "category-spinning-tops",
    parentIds: [],
    childrenIds: [
      "category-beyblade-burst",
      "category-beyblade-x",
      "category-beyblade-classic",
    ],
    tier: 0,
    path: "spinning-tops",
    order: 4,
    isLeaf: false,
    position: 0,
    subtreeSize: 4,
    metrics: emptyMetrics,
    isFeatured: true,
    featuredPriority: 7,
    isBrand: false,
    seo: {
      title: "Beyblade — Burst, X & Metal Fight | LetItRip",
      description:
        "Shop Beyblade Burst, Beyblade X, and Metal Fight Classic tops, launchers, and stadiums. Official Takara Tomy and Hasbro.",
      keywords: [
        "beyblade india",
        "beyblade burst",
        "beyblade x",
        "metal fight",
        "spinning top",
        "takara tomy beyblade",
      ],
      ogImage:
        "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=1200&h=630&fit=crop",
    },
    display: {
      icon: "🌀",
      coverImage:
        "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&h=800&fit=crop",
      color: "#8b5cf6",
      showInMenu: true,
      showInFooter: true,
    },
    isActive: true,
    isSearchable: true,
    showOnHomepage: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [],
  },

  // Spinning Tops > Beyblade Burst (tier 1)
  {
    id: "category-beyblade-burst",
    slug: "category-beyblade-burst",
    name: "Beyblade Burst",
    description:
      "Beyblade Burst series — Burst, Burst GT, Burst Rise, Burst Sparking, Burst QuadStrike. Layers, discs, drivers, launchers, and combo sets.",
    rootId: "category-spinning-tops",
    parentIds: ["category-spinning-tops"],
    childrenIds: [],
    tier: 1,
    path: "spinning-tops/beyblade-burst",
    order: 1,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: true,
    featuredPriority: 8,
    isBrand: false,
    seo: {
      title: "Beyblade Burst — All Series | LetItRip",
      description:
        "Shop Beyblade Burst series tops, launchers, and stadiums. GT, Rise, Sparking, and QuadStrike lines.",
      keywords: [
        "beyblade burst",
        "burst gt",
        "burst rise",
        "burst sparking",
        "quadstrike",
        "beyblade combo",
      ],
    },
    display: {
      icon: "💥",
      coverImage:
        "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&h=800&fit=crop",
      color: "#8b5cf6",
      showInMenu: true,
      showInFooter: true,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-spinning-tops", name: "Spinning Tops", tier: 0 }],
  },

  // Spinning Tops > Beyblade X (tier 1)
  {
    id: "category-beyblade-x",
    slug: "category-beyblade-x",
    name: "Beyblade X",
    description:
      "The latest generation of Beyblade — Beyblade X. Features the X-Line rail and Extreme Dash mechanic. Official Takara Tomy starter sets, booster packs, and XStadium.",
    rootId: "category-spinning-tops",
    parentIds: ["category-spinning-tops"],
    childrenIds: [],
    tier: 1,
    path: "spinning-tops/beyblade-x",
    order: 2,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: true,
    featuredPriority: 9,
    isBrand: false,
    seo: {
      title: "Beyblade X — Latest Gen Tops & Launchers | LetItRip",
      description:
        "Shop Beyblade X generation tops, X-Line launchers, XStadium, and booster packs by Takara Tomy.",
      keywords: [
        "beyblade x",
        "bx",
        "extreme dash",
        "xstadium",
        "dran sword",
        "takara tomy bx",
      ],
    },
    display: {
      icon: "⚔️",
      coverImage:
        "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800&h=800&fit=crop",
      color: "#e11d48",
      showInMenu: true,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-rohit-joshi",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-spinning-tops", name: "Spinning Tops", tier: 0 }],
  },

  // Spinning Tops > Metal Fight Classic (tier 1)
  {
    id: "category-beyblade-classic",
    slug: "category-beyblade-classic",
    name: "Metal Fight Classic",
    description:
      "Original Beyblade and Metal Fight Beyblade series. Collector and tournament condition tops — Pegasis, Leone, Libra. Rare Japanese editions and vintage MFB.",
    rootId: "category-spinning-tops",
    parentIds: ["category-spinning-tops"],
    childrenIds: [],
    tier: 1,
    path: "spinning-tops/beyblade-classic",
    order: 3,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: {
      title: "Metal Fight Beyblade & Classic Series | LetItRip",
      description:
        "Shop Metal Fight Beyblade and original plastic-gen tops. Pegasis, Leone, Libra, and rare Japanese editions.",
      keywords: [
        "metal fight beyblade",
        "mfb",
        "classic beyblade",
        "pegasis",
        "leone",
        "vintage beyblade",
      ],
    },
    display: {
      icon: "🌟",
      coverImage:
        "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&h=800&fit=crop",
      showInMenu: true,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-spinning-tops", name: "Spinning Tops", tier: 0 }],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ROOT 5: Model Kits & Gunpla (tier 0)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "category-model-kits",
    slug: "category-model-kits",
    name: "Model Kits & Gunpla",
    description:
      "Gundam plastic model kits (Gunpla) — High Grade (HG), Master Grade (MG), Real Grade (RG), and Perfect Grade (PG). Non-Gundam kits from Kotobukiya, Bandai, and Hasegawa.",
    rootId: "category-model-kits",
    parentIds: [],
    childrenIds: [
      "category-gunpla",
      "category-non-gundam-kits",
      "category-gundam-master-grade",
      "category-gundam-perfect-grade",
    ],
    tier: 0,
    path: "model-kits",
    order: 5,
    isLeaf: false,
    position: 0,
    subtreeSize: 3,
    metrics: emptyMetrics,
    isFeatured: true,
    featuredPriority: 10,
    isBrand: false,
    seo: {
      title: "Model Kits & Gunpla | LetItRip",
      description:
        "Shop Gunpla HG, MG, RG, and PG model kits. Non-Gundam kits from Kotobukiya and Hasegawa. Build-and-display collectibles.",
      keywords: [
        "gunpla",
        "gundam model kit",
        "high grade",
        "master grade",
        "perfect grade",
        "model kit india",
      ],
      ogImage:
        "https://images.unsplash.com/photo-1657664072470-99b02c2143f2?w=1200&h=630&fit=crop",
    },
    display: {
      icon: "🤖",
      coverImage:
        "https://images.unsplash.com/photo-1657664072470-99b02c2143f2?w=800&h=800&fit=crop",
      color: "#10b981",
      showInMenu: true,
      showInFooter: true,
    },
    isActive: true,
    isSearchable: true,
    showOnHomepage: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [],
  },

  // Model Kits > Gunpla (tier 1)
  {
    id: "category-gunpla",
    slug: "category-gunpla",
    name: "Gunpla",
    description:
      "Official Bandai Gundam Plastic Model Kits. HG (High Grade), RG (Real Grade), MG (Master Grade), PG (Perfect Grade), and SD Gundam kits. Entry-grade and panel-lined pre-built options available.",
    rootId: "category-model-kits",
    parentIds: ["category-model-kits"],
    childrenIds: [],
    tier: 1,
    path: "model-kits/gunpla",
    order: 1,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: true,
    featuredPriority: 11,
    isBrand: false,
    seo: {
      title: "Gunpla — HG, MG, RG, PG Gundam Model Kits | LetItRip",
      description:
        "Shop Gunpla High Grade, Real Grade, Master Grade, and Perfect Grade kits. Wing Zero, RX-78-2, Strike Freedom, and more.",
      keywords: [
        "gunpla",
        "high grade",
        "master grade",
        "real grade",
        "perfect grade",
        "wing zero",
        "rx-78-2",
      ],
    },
    display: {
      icon: "⚙️",
      coverImage:
        "https://images.unsplash.com/photo-1657664072470-99b02c2143f2?w=800&h=800&fit=crop",
      color: "#10b981",
      showInMenu: true,
      showInFooter: true,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-amit-sharma",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-model-kits", name: "Model Kits & Gunpla", tier: 0 }],
  },

  // Model Kits > Non-Gundam Kits (tier 1)
  {
    id: "category-non-gundam-kits",
    slug: "category-non-gundam-kits",
    name: "Non-Gundam Kits",
    description:
      "Non-Gundam plastic model kits — Kotobukiya Frame Arms and Megami Device, Bandai Star Wars and Ultraman kits, Hasegawa sci-fi and aircraft models.",
    rootId: "category-model-kits",
    parentIds: ["category-model-kits"],
    childrenIds: [],
    tier: 1,
    path: "model-kits/non-gundam-kits",
    order: 2,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: {
      title: "Non-Gundam Model Kits — Frame Arms, Star Wars | LetItRip",
      description:
        "Shop Kotobukiya Frame Arms, Megami Device, Bandai Star Wars model kits, and Hasegawa aircraft.",
      keywords: [
        "frame arms",
        "megami device",
        "kotobukiya kit",
        "star wars model kit",
        "hasegawa",
        "non-gundam",
      ],
    },
    display: {
      icon: "🔩",
      coverImage:
        "https://images.unsplash.com/photo-1599409636295-e3cf3538f212?w=800&h=800&fit=crop",
      showInMenu: true,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-model-kits", name: "Model Kits & Gunpla", tier: 0 }],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ROOT 6: Vintage & Rare (tier 0)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "category-vintage-rare",
    slug: "category-vintage-rare",
    name: "Vintage & Rare",
    description:
      "Rare, vintage, and limited-edition collectibles. 1st-edition Pokémon cards, original-run Beyblade tops, production cels, signed merchandise, and graded slabs.",
    rootId: "category-vintage-rare",
    parentIds: [],
    childrenIds: [
      "category-vintage-tcg",
      "category-vintage-figures",
      "category-limited-exclusives",
    ],
    tier: 0,
    path: "vintage-rare",
    order: 6,
    isLeaf: false,
    position: 0,
    subtreeSize: 4,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: {
      title: "Vintage & Rare Collectibles | LetItRip",
      description:
        "Shop rare vintage collectibles — 1st edition Pokémon cards, graded slabs, original anime cels, and limited exclusives.",
      keywords: [
        "vintage collectibles",
        "rare collectibles",
        "1st edition pokemon",
        "graded slab",
        "anime cel",
        "limited edition",
      ],
      ogImage:
        "https://images.unsplash.com/photo-1578301978162-7aae4d755744?w=1200&h=630&fit=crop",
    },
    display: {
      icon: "💎",
      coverImage:
        "https://images.unsplash.com/photo-1578301978162-7aae4d755744?w=800&h=800&fit=crop",
      color: "#d97706",
      showInMenu: true,
      showInFooter: true,
    },
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [],
  },

  // Vintage & Rare > Vintage TCG (tier 1)
  {
    id: "category-vintage-tcg",
    slug: "category-vintage-tcg",
    name: "Vintage TCG",
    description:
      "Vintage and 1st-edition trading cards. PSA/BGS graded Pokémon Base Set, Jungle, Fossil, and Team Rocket. First-edition Yu-Gi-Oh! Blue-Eyes and LOB.",
    rootId: "category-vintage-rare",
    parentIds: ["category-vintage-rare"],
    childrenIds: [],
    tier: 1,
    path: "vintage-rare/vintage-tcg",
    order: 1,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: {
      title: "Vintage TCG — 1st Edition Pokémon & Yu-Gi-Oh! | LetItRip",
      description:
        "Shop 1st edition and vintage trading cards. PSA/BGS graded Pokémon Base Set and Yu-Gi-Oh! LOB.",
      keywords: [
        "1st edition pokemon",
        "base set charizard",
        "psa graded",
        "bgs graded",
        "vintage tcg",
        "lob yugioh",
      ],
    },
    display: {
      icon: "🃏",
      coverImage:
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=800&fit=crop",
      color: "#d97706",
      showInMenu: true,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-vintage-rare", name: "Vintage & Rare", tier: 0 }],
  },

  // Vintage & Rare > Vintage Figures (tier 1)
  {
    id: "category-vintage-figures",
    slug: "category-vintage-figures",
    name: "Vintage Figures",
    description:
      "Vintage and rare anime figures — early-run garage kits, discontinued GSC, vintage SH Figuarts, original Revoltech, and original Beyblade tops from 1999–2009.",
    rootId: "category-vintage-rare",
    parentIds: ["category-vintage-rare"],
    childrenIds: [],
    tier: 1,
    path: "vintage-rare/vintage-figures",
    order: 2,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: {
      title: "Vintage Anime Figures & Rare Collectibles | LetItRip",
      description:
        "Shop rare vintage anime figures, discontinued Nendoroids, original Revoltech, and early-run Beyblade tops.",
      keywords: [
        "vintage figure",
        "discontinued nendoroid",
        "rare anime figure",
        "original beyblade",
        "garage kit",
      ],
    },
    display: {
      icon: "🏺",
      coverImage:
        "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=800&fit=crop",
      showInMenu: true,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-vintage-rare", name: "Vintage & Rare", tier: 0 }],
  },

  // Vintage & Rare > Limited Exclusives (tier 1)
  {
    id: "category-limited-exclusives",
    slug: "category-limited-exclusives",
    name: "Limited & Exclusives",
    description:
      "Event-exclusive, convention-only, and limited-run collectibles. Wonder Festival exclusive figures, Pokémon Center exclusives, Takara Tomy convention tops, and signed merchandise.",
    rootId: "category-vintage-rare",
    parentIds: ["category-vintage-rare"],
    childrenIds: [],
    tier: 1,
    path: "vintage-rare/limited-exclusives",
    order: 3,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: {
      title: "Limited Edition & Convention Exclusives | LetItRip",
      description:
        "Shop Wonder Festival, Pokémon Center, and event-exclusive limited collectibles. Convention-only figures and signed merchandise.",
      keywords: [
        "wonder festival exclusive",
        "pokemon center exclusive",
        "limited edition figure",
        "convention exclusive",
        "signed collectible",
      ],
    },
    display: {
      icon: "✨",
      coverImage:
        "https://images.unsplash.com/photo-1614108831137-558fffac9ead?w=800&h=800&fit=crop",
      showInMenu: true,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(400),
    updatedAt: daysAgo(30),
    ancestors: [{ id: "category-vintage-rare", name: "Vintage & Rare", tier: 0 }],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // P25 expansion — additional leaf categories (Session S15 2026-05-12)
  // ──────────────────────────────────────────────────────────────────────────

  // Trading Cards > One Piece Card Game (tier 1)
  ...mkLeaves([
    {
      id: "category-one-piece-cards",
      name: "One Piece Card Game",
      description:
        "Bandai's One Piece Card Game — booster boxes, starter decks, singles, and tournament-grade cards from the OP01–OP08 sets.",
      rootId: "category-trading-cards",
      keywords: ["one piece card", "op tcg", "bandai card game", "luffy card"],
      icon: "🏴‍☠️",
      cover: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800&h=800&fit=crop",
      order: 4,
    },
    {
      id: "category-magic-cards",
      name: "Magic: The Gathering",
      description:
        "Wizards of the Coast Magic: The Gathering — Standard, Modern, Commander, and reserved-list singles. Sealed product, fat packs, and bundles.",
      rootId: "category-trading-cards",
      keywords: ["magic the gathering", "mtg", "commander", "wizards of the coast"],
      icon: "🪄",
      cover: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800&h=800&fit=crop",
      order: 5,
    },
    {
      id: "category-flesh-blood-cards",
      name: "Flesh and Blood TCG",
      description:
        "Legend Story Studios Flesh and Blood — booster boxes, blitz decks, hero decks, and competitive singles.",
      rootId: "category-trading-cards",
      keywords: ["flesh and blood", "fab tcg", "lss", "blitz deck"],
      icon: "⚔️",
      cover: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=800&fit=crop",
      order: 6,
    },
    {
      id: "category-matchbox-cars",
      name: "Matchbox 1:64",
      description:
        "Matchbox 1:64 scale diecast — basic releases, MBX series, premium recasts, and vintage Lesney Matchbox.",
      rootId: "category-diecast-vehicles",
      keywords: ["matchbox", "1:64 diecast", "lesney", "mbx"],
      icon: "🚙",
      cover: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&h=800&fit=crop",
      order: 4,
    },
    {
      id: "category-corgi-cars",
      name: "Corgi Toys",
      description:
        "Corgi Toys diecast — TV/movie tie-in vehicles (James Bond, Batman, Chitty Chitty Bang Bang) and classic British cars.",
      rootId: "category-diecast-vehicles",
      keywords: ["corgi toys", "diecast british", "james bond car", "batmobile"],
      icon: "🇬🇧",
      cover: "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&h=800&fit=crop",
      order: 5,
    },
    {
      id: "category-anime-figures",
      name: "Anime Figures",
      description:
        "Dragon Ball, Naruto, One Piece, and other shonen anime character figures — S.H.Figuarts, Banpresto, and Megahouse releases.",
      rootId: "category-action-figures",
      keywords: ["dragon ball figure", "naruto figure", "one piece figure", "shf"],
      icon: "🎌",
      cover: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=800&fit=crop",
      order: 4,
    },
    {
      id: "category-funko-pops",
      name: "Funko Pops",
      description:
        "Funko Pop vinyl figures — Marvel, DC, anime, gaming, and movie/TV licenses. Common, chase, and vaulted variants.",
      rootId: "category-action-figures",
      keywords: ["funko pop", "vinyl figure", "chase variant", "vaulted pop"],
      icon: "🥤",
      cover: "https://images.unsplash.com/photo-1608889825271-9696283b84bd?w=800&h=800&fit=crop",
      order: 5,
    },
    {
      id: "category-superhero-figures",
      name: "Marvel & DC Figures",
      description:
        "Marvel Legends, DC Multiverse, Mafex, and Hot Toys 1:6 sixth-scale figures — Avengers, Spider-Man, Batman, Justice League.",
      rootId: "category-action-figures",
      keywords: ["marvel legends", "dc multiverse", "hot toys", "mafex", "spider-man figure"],
      icon: "🦸",
      cover: "https://images.unsplash.com/photo-1560762484-813fc97650a0?w=800&h=800&fit=crop",
      order: 6,
    },
    {
      id: "category-gundam-master-grade",
      name: "Gundam Master Grade (MG)",
      description:
        "Bandai Master Grade 1/100 Gundam model kits — intermediate-difficulty builds with full inner frame and panel detail.",
      rootId: "category-model-kits",
      keywords: ["master grade", "mg gundam", "1/100 gunpla", "bandai mg"],
      icon: "🛠️",
      cover: "https://images.unsplash.com/photo-1657664072470-99b02c2143f2?w=800&h=800&fit=crop",
      order: 3,
    },
    {
      id: "category-gundam-perfect-grade",
      name: "Gundam Perfect Grade (PG)",
      description:
        "Bandai Perfect Grade 1/60 Gundam — flagship kits with internal frame, LED-ready, advanced builders only.",
      rootId: "category-model-kits",
      keywords: ["perfect grade", "pg gundam", "1/60 gunpla", "bandai flagship"],
      icon: "🏗️",
      cover: "https://images.unsplash.com/photo-1657664072470-99b02c2143f2?w=800&h=800&fit=crop",
      order: 4,
    },
  ]),
];

/**
 * Compact constructor for tier-1 leaf categories — keeps P25 expansion entries
 * short while still emitting the full CategoryDocument shape consumed by the
 * seed runner. Defaults: isLeaf=true, isActive=true, admin-authored, today-30d.
 */
function mkLeaves(
  specs: Array<{
    id: string;
    name: string;
    description: string;
    rootId: string;
    keywords: string[];
    icon: string;
    cover: string;
    order: number;
  }>,
): Partial<CategoryDocument>[] {
  // Resolve the root name once per unique rootId via a tiny inline map. Keeps
  // ancestors[] correct without re-reading the full rawCategories array.
  const rootNames: Record<string, string> = {
    "category-action-figures": "Action Figures & Statues",
    "category-trading-cards": "Trading Cards",
    "category-diecast-vehicles": "Diecast & Vehicles",
    "category-model-kits": "Model Kits & Gunpla",
  };
  return specs.map((s) => ({
    id: s.id,
    slug: s.id,
    name: s.name,
    description: s.description,
    rootId: s.rootId,
    parentIds: [s.rootId],
    childrenIds: [],
    tier: 1,
    path: `${s.rootId.replace("category-", "")}/${s.id.replace("category-", "")}`,
    order: s.order,
    isLeaf: true,
    position: 0,
    subtreeSize: 1,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: {
      title: `${s.name} | LetItRip`,
      description: s.description.slice(0, 155),
      keywords: s.keywords,
    },
    display: {
      icon: s.icon,
      coverImage: s.cover,
      showInMenu: true,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(7),
    ancestors: [
      { id: s.rootId, name: rootNames[s.rootId] ?? s.rootId, tier: 0 },
    ],
  }));
}

// SB-UNI-B — sublistings folded in as tier-N+1 leaves with categoryType:"sublisting".
// Original collection `sublistingCategories` dropped; same 12 seeded rows live here.
const ADMIN_ID = "user-admin-letitrip";
const sublistingRows: Partial<CategoryDocument>[] = [
  // ── Trading Cards ─────────────────────────────────────────────────────
  {
    id: "sublisting-pokemon-base-set",
    slug: "sublisting-pokemon-base-set",
    name: "Base Set (102/102)",
    categoryType: "sublisting",
    itemCode: "BS-102",
    description:
      "All 102 Base Set Pokémon TCG cards — Shadowless, 1st Edition, and Unlimited.",
    rootId: "category-trading-cards",
    parentIds: ["category-trading-cards"],
    tier: 1,
    path: "trading-cards/sublisting-pokemon-base-set",
    isLeaf: true,
    order: 0,
    display: {
      coverImage:
        "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&h=600&fit=crop",
      showInMenu: false,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: ADMIN_ID,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1),
  },
  {
    id: "sublisting-pokemon-psa-graded",
    slug: "sublisting-pokemon-psa-graded",
    name: "PSA Graded Pokémon Cards",
    categoryType: "sublisting",
    itemCode: "PSA",
    description: "Investment-grade Pokémon cards authenticated by PSA.",
    rootId: "category-trading-cards",
    parentIds: ["category-trading-cards"],
    tier: 1,
    path: "trading-cards/sublisting-pokemon-psa-graded",
    isLeaf: true,
    order: 1,
    display: {
      coverImage:
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=600&fit=crop",
      showInMenu: false,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: ADMIN_ID,
    createdAt: daysAgo(55),
    updatedAt: daysAgo(2),
  },
  {
    id: "sublisting-pokemon-sealed-boxes",
    slug: "sublisting-pokemon-sealed-boxes",
    name: "Sealed Pokémon Booster Boxes",
    categoryType: "sublisting",
    description:
      "Factory-sealed Pokémon TCG booster boxes — current, vintage, Japanese.",
    rootId: "category-trading-cards",
    parentIds: ["category-trading-cards"],
    tier: 1,
    path: "trading-cards/sublisting-pokemon-sealed-boxes",
    isLeaf: true,
    order: 2,
    display: {
      coverImage:
        "https://images.unsplash.com/photo-1614108831137-558fffac9ead?w=800&h=600&fit=crop",
      showInMenu: false,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: ADMIN_ID,
    createdAt: daysAgo(50),
    updatedAt: daysAgo(3),
  },
  {
    id: "sublisting-vintage-wotc-era",
    slug: "sublisting-vintage-wotc-era",
    name: "WOTC Era Pokémon (1999–2003)",
    categoryType: "sublisting",
    itemCode: "WOTC",
    description:
      "All Wizards of the Coast era Pokémon TCG sets: Base Set through Legendary Collection.",
    rootId: "category-vintage-rare",
    parentIds: ["category-vintage-rare"],
    tier: 1,
    path: "vintage-rare/sublisting-vintage-wotc-era",
    isLeaf: true,
    order: 0,
    display: {
      coverImage:
        "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&h=600&fit=crop",
      showInMenu: false,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: ADMIN_ID,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(1),
  },
  {
    id: "sublisting-yugioh-lob-1st-edition",
    slug: "sublisting-yugioh-lob-1st-edition",
    name: "Yu-Gi-Oh! LOB 1st Edition",
    categoryType: "sublisting",
    itemCode: "LOB-1E",
    description:
      "Legend of Blue-Eyes White Dragon 1st Edition singles — iconic 2002 WOTC-era Yu-Gi-Oh!.",
    rootId: "category-trading-cards",
    parentIds: ["category-trading-cards"],
    tier: 1,
    path: "trading-cards/sublisting-yugioh-lob-1st-edition",
    isLeaf: true,
    order: 3,
    display: {
      coverImage:
        "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800&h=600&fit=crop",
      showInMenu: false,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: ADMIN_ID,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(5),
  },

  // ── Diecast Vehicles ──────────────────────────────────────────────────
  {
    id: "sublisting-hotwheels-redlines",
    slug: "sublisting-hotwheels-redlines",
    name: "Hot Wheels Vintage Redlines (1968–1977)",
    categoryType: "sublisting",
    itemCode: "Redline",
    description: "Original Hot Wheels Redline-era cars (1968–1977).",
    rootId: "category-diecast-vehicles",
    parentIds: ["category-diecast-vehicles"],
    tier: 1,
    path: "diecast-vehicles/sublisting-hotwheels-redlines",
    isLeaf: true,
    order: 0,
    display: {
      coverImage:
        "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&h=600&fit=crop",
      showInMenu: false,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: ADMIN_ID,
    createdAt: daysAgo(38),
    updatedAt: daysAgo(1),
  },
  {
    id: "sublisting-hotwheels-super-treasure-hunts",
    slug: "sublisting-hotwheels-super-treasure-hunts",
    name: "Hot Wheels Super Treasure Hunts",
    categoryType: "sublisting",
    itemCode: "STH",
    description:
      "Rare Hot Wheels regular-production releases with Real Riders tyres.",
    rootId: "category-diecast-vehicles",
    parentIds: ["category-diecast-vehicles"],
    tier: 1,
    path: "diecast-vehicles/sublisting-hotwheels-super-treasure-hunts",
    isLeaf: true,
    order: 1,
    display: {
      coverImage:
        "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&h=600&fit=crop",
      showInMenu: false,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: ADMIN_ID,
    createdAt: daysAgo(35),
    updatedAt: daysAgo(2),
  },

  // ── Spinning Tops ─────────────────────────────────────────────────────
  {
    id: "sublisting-beyblade-x-series",
    slug: "sublisting-beyblade-x-series",
    name: "Beyblade X Series (2023+)",
    categoryType: "sublisting",
    itemCode: "BX",
    description:
      "All Beyblade X generation products — xtreme dash ratchet system.",
    rootId: "category-spinning-tops",
    parentIds: ["category-spinning-tops"],
    tier: 1,
    path: "spinning-tops/sublisting-beyblade-x-series",
    isLeaf: true,
    order: 0,
    display: {
      coverImage:
        "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&h=600&fit=crop",
      showInMenu: false,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: ADMIN_ID,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(1),
  },

  // ── Model Kits ────────────────────────────────────────────────────────
  {
    id: "sublisting-gundam-master-grade",
    slug: "sublisting-gundam-master-grade",
    name: "Gundam Master Grade (MG) 1/100",
    categoryType: "sublisting",
    itemCode: "MG",
    description: "Bandai Gundam MG 1/100 kits with full inner frame.",
    rootId: "category-model-kits",
    parentIds: ["category-model-kits"],
    tier: 1,
    path: "model-kits/sublisting-gundam-master-grade",
    isLeaf: true,
    order: 0,
    display: {
      coverImage:
        "https://images.unsplash.com/photo-1536896407451-6e3dd976edd6?w=800&h=600&fit=crop",
      showInMenu: false,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: ADMIN_ID,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(2),
  },
  {
    id: "sublisting-gundam-high-grade",
    slug: "sublisting-gundam-high-grade",
    name: "Gundam High Grade (HG) 1/144",
    categoryType: "sublisting",
    itemCode: "HG",
    description:
      "Entry-level Bandai Gundam HG 1/144 kits across all series.",
    rootId: "category-model-kits",
    parentIds: ["category-model-kits"],
    tier: 1,
    path: "model-kits/sublisting-gundam-high-grade",
    isLeaf: true,
    order: 1,
    display: {
      coverImage:
        "https://images.unsplash.com/photo-1536896407451-6e3dd976edd6?w=800&h=600&fit=crop",
      showInMenu: false,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: ADMIN_ID,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(4),
  },

  // ── Action Figures ────────────────────────────────────────────────────
  {
    id: "sublisting-nendoroid-early-series",
    slug: "sublisting-nendoroid-early-series",
    name: "Nendoroid Early Series (#001–#100)",
    categoryType: "sublisting",
    itemCode: "GSC-001-100",
    description: "Discontinued Good Smile Company Nendoroid figures #001–#100.",
    rootId: "category-action-figures",
    parentIds: ["category-action-figures"],
    tier: 1,
    path: "action-figures/sublisting-nendoroid-early-series",
    isLeaf: true,
    order: 0,
    display: {
      coverImage:
        "https://images.unsplash.com/photo-1536896407451-6e3dd976edd6?w=800&h=600&fit=crop",
      showInMenu: false,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: ADMIN_ID,
    createdAt: daysAgo(28),
    updatedAt: daysAgo(2),
  },
  {
    id: "sublisting-shf-dragonball",
    slug: "sublisting-shf-dragonball",
    name: "S.H.Figuarts Dragon Ball Series",
    categoryType: "sublisting",
    itemCode: "SHF-DBZ",
    description:
      "Bandai S.H.Figuarts Dragon Ball Z and Super articulated figures.",
    rootId: "category-action-figures",
    parentIds: ["category-action-figures"],
    tier: 1,
    path: "action-figures/sublisting-shf-dragonball",
    isLeaf: true,
    order: 1,
    display: {
      coverImage:
        "https://images.unsplash.com/photo-1536896407451-6e3dd976edd6?w=800&h=600&fit=crop",
      showInMenu: false,
      showInFooter: false,
    },
    isActive: true,
    isSearchable: true,
    createdBy: ADMIN_ID,
    createdAt: daysAgo(25),
    updatedAt: daysAgo(1),
  },
];

const STORE_CREATOR: Record<
  string,
  { createdByType: "store"; createdByStoreId: string; createdByStoreName: string }
> = {
  "user-aryan-kapoor":  { createdByType: "store", createdByStoreId: "store-pokemon-palace",     createdByStoreName: "Pokémon Palace" },
  "user-nisha-reddy":   { createdByType: "store", createdByStoreId: "store-cardgame-hub",        createdByStoreName: "CardGame Hub" },
  "user-vikram-mehta":  { createdByType: "store", createdByStoreId: "store-diecast-depot",       createdByStoreName: "Diecast Depot" },
  "user-rohit-joshi":   { createdByType: "store", createdByStoreId: "store-beyblade-arena",      createdByStoreName: "Beyblade Arena" },
  "user-amit-sharma":   { createdByType: "store", createdByStoreId: "store-gundam-galaxy",       createdByStoreName: "Gundam Galaxy" },
  "user-priya-singh":   { createdByType: "store", createdByStoreId: "store-tokyo-toys-india",    createdByStoreName: "Tokyo Toys India" },
};

export const categoriesSeedData: Partial<CategoryDocument>[] = [
  ...rawCategories.map((c) => ({
    ...c,
    ...(c.createdBy && STORE_CREATOR[c.createdBy]
      ? STORE_CREATOR[c.createdBy]
      : { createdByType: "admin" as const }),
  })),
  ...sublistingRows.map((s) => ({ ...s, createdByType: "admin" as const })),
];
