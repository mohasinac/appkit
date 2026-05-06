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

export const categoriesSeedData: Partial<CategoryDocument>[] = [
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
    createdBy: "user-admin-letitrip",
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
    createdBy: "user-admin-letitrip",
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
    createdBy: "user-admin-letitrip",
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
    createdBy: "user-admin-letitrip",
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
    createdBy: "user-admin-letitrip",
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
    createdBy: "user-admin-letitrip",
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
];
