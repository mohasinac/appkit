/**
 * Grouped Listings Seed Data — Product bundles with optional discount.
 * 8 bundles across all collectibles verticals.
 * id === slug convention. group- prefix.
 * Standard products + pre-orders only (no auctions per GP1 spec).
 */

import type { GroupedListingDocument } from "../features/grouped/schemas/firestore";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const groupedListingsSeedData: Partial<GroupedListingDocument>[] = [
  // ── 1. Pokémon TCG Starter Bundle (Pokémon Palace) ────────────────────────
  {
    id: "group-pokemon-starter-bundle",
    slug: "group-pokemon-starter-bundle",
    title: "Pokémon TCG Starter Bundle — ETB + Deck Box + Sleeves",
    description: "Everything a new Pokémon TCG player needs. Paldean Fates Elite Trainer Box, 200 Katana sleeves, and a Dragon Shield deck box — all bundled at a saving of ₹400 vs buying separately.",
    productIds: [
      "product-pokemon-sv-etb",
      "product-pokemon-pikachu-plush-8",
    ],
    bundlePrice: 499900,
    originalPrice: 549900,
    discountPercent: 9,
    coverImage: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&h=600&fit=crop",
    currency: "INR",
    isActive: true,
    isFeatured: true,
    storeId: "store-pokemon-palace",
    brandSlug: "brand-pokemon-company",
    categorySlug: "category-pokemon-cards",
    createdBy: "user-aryan-kapoor",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
  },

  // ── 2. Hot Wheels Car Culture 3-Pack (Diecast Depot) ─────────────────────
  {
    id: "group-hot-wheels-car-culture-3pack",
    slug: "group-hot-wheels-car-culture-3pack",
    title: "Hot Wheels Car Culture Collector 3-Pack",
    description: "Three premium Hot Wheels Car Culture cars curated by Diecast Depot. Real Riders rubber tyres, premium spectraflame paint. Perfect gift set for the diecast enthusiast.",
    productIds: [
      "product-hot-wheels-premium-5pack",
      "product-hot-wheels-redline-1969-camaro",
      "product-tomica-limited-datsun",
    ],
    bundlePrice: 599900,
    originalPrice: 679900,
    discountPercent: 12,
    coverImage: "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&h=600&fit=crop",
    currency: "INR",
    isActive: true,
    isFeatured: true,
    storeId: "store-diecast-depot",
    brandSlug: "brand-hot-wheels",
    categorySlug: "category-hot-wheels-cars",
    createdBy: "user-vikram-mehta",
    createdAt: daysAgo(25),
    updatedAt: daysAgo(3),
  },

  // ── 3. Beyblade X Starter Kit (Beyblade Arena) ────────────────────────────
  {
    id: "group-beyblade-x-starter-kit",
    slug: "group-beyblade-x-starter-kit",
    title: "Beyblade X Complete Starter Kit — Top + Launcher + Stadium",
    description: "Best way to start with Beyblade X. Includes BX-01 Dran Sword, BX-05 Launcher, and the official XStadium. Takara Tomy Japan import. Ready to battle right out of the box.",
    productIds: [
      "product-beyblade-x-bx01-dran-sword",
      "product-beyblade-burst-b200-valkyrie",
    ],
    bundlePrice: 349900,
    originalPrice: 399800,
    discountPercent: 12,
    coverImage: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&h=600&fit=crop",
    currency: "INR",
    isActive: true,
    isFeatured: true,
    storeId: "store-beyblade-arena",
    brandSlug: "brand-takara-tomy",
    categorySlug: "category-beyblade-tops",
    createdBy: "user-rohit-joshi",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(1),
  },

  // ── 4. Anime Figure Duo — Rem + Goku (Tokyo Toys India) ──────────────────
  {
    id: "group-anime-figure-duo-rem-goku",
    slug: "group-anime-figure-duo-rem-goku",
    title: "Anime Figure Duo — Nendoroid Rem + S.H.Figuarts Goku",
    description: "Two collector-favourite anime figures at a bundle price. Good Smile Nendoroid Rem (#663) from Re:Zero and Bandai S.H.Figuarts Goku Ultra Instinct. Display as a pair or separately.",
    productIds: [
      "product-nendoroid-rem-rezero",
      "product-shf-goku-ultra-instinct",
    ],
    bundlePrice: 1099900,
    originalPrice: 1199800,
    discountPercent: 8,
    coverImage: "https://images.unsplash.com/photo-1536896407451-6e3dd976edd6?w=800&h=600&fit=crop",
    currency: "INR",
    isActive: true,
    isFeatured: false,
    storeId: "store-tokyo-toys-india",
    categorySlug: "category-anime-figures",
    createdBy: "user-priya-singh",
    createdAt: daysAgo(18),
    updatedAt: daysAgo(4),
  },

  // ── 5. Gundam Builder Essentials (Tokyo Toys India) ───────────────────────
  {
    id: "group-gundam-builder-essentials",
    slug: "group-gundam-builder-essentials",
    title: "Gundam Builder Essentials — MG + RG Bundle",
    description: "Start your Gunpla journey right. Gundam RX-78-2 MG 1/100 (Ver. 3.0) for an intermediate build, plus Gundam Wing Zero RG 1/144 for a detailed smaller display. Both official Bandai Spirits Japan releases.",
    productIds: [
      "product-gundam-rx78-mg",
      "product-gundam-wing-zero-rg",
    ],
    bundlePrice: 449900,
    originalPrice: 499800,
    discountPercent: 10,
    coverImage: "https://images.unsplash.com/photo-1536896407451-6e3dd976edd6?w=800&h=600&fit=crop",
    currency: "INR",
    isActive: true,
    isFeatured: false,
    storeId: "store-tokyo-toys-india",
    brandSlug: "brand-bandai",
    categorySlug: "category-gundam-kits",
    createdBy: "user-priya-singh",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(2),
  },

  // ── 6. Pokémon Plush Pair (Pokémon Palace) ────────────────────────────────
  {
    id: "group-pokemon-plush-pair",
    slug: "group-pokemon-plush-pair",
    title: "Pokémon Plush Gift Pair — Pikachu + Gengar",
    description: "Gift-ready pair of official Pokémon Center plushies. 8-inch Pikachu and Sitting Cuties Gengar. Ideal for gifting or display. Both authentic Pokémon Center Japan release.",
    productIds: [
      "product-pokemon-pikachu-plush-8",
      "product-pokemon-gengar-sitting-cuties",
    ],
    bundlePrice: 249900,
    originalPrice: 279800,
    discountPercent: 11,
    coverImage: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&h=600&fit=crop",
    currency: "INR",
    isActive: true,
    isFeatured: false,
    storeId: "store-pokemon-palace",
    brandSlug: "brand-pokemon-company",
    categorySlug: "category-pokemon-cards",
    createdBy: "user-aryan-kapoor",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(3),
  },

  // ── 7. Yu-Gi-Oh! Tournament Ready Pair (CardGame Hub) ────────────────────
  {
    id: "group-yugioh-tournament-pair",
    slug: "group-yugioh-tournament-pair",
    title: "Yu-Gi-Oh! Tournament Ready — 25th Tin + Structure Deck",
    description: "Upgrade your deck with the 25th Anniversary Tin and the Albaz Structure Deck. Both are current-format legal. The tin gives you chase rares; the structure gives you a complete playable engine.",
    productIds: [
      "product-yugioh-25th-tin",
      "product-yugioh-structure-albaz",
    ],
    bundlePrice: 369900,
    originalPrice: 389800,
    discountPercent: 5,
    coverImage: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800&h=600&fit=crop",
    currency: "INR",
    isActive: true,
    isFeatured: false,
    storeId: "store-cardgame-hub",
    brandSlug: "brand-konami",
    categorySlug: "category-yugioh-cards",
    createdBy: "user-nisha-reddy",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
  },

  // ── 8. Funko Pop Anime Collector Set (Tokyo Toys India) ───────────────────
  {
    id: "group-funko-pop-anime-trio",
    slug: "group-funko-pop-anime-trio",
    title: "Funko Pop! Anime Collector Set — Naruto + Batman",
    description: "Two of the most iconic Funko Pop figures at a bundle price. Naruto Sage Mode #932 and McFarlane Batman (Dark Knight). Ideal for display shelves or desktops.",
    productIds: [
      "product-funko-pop-naruto-sage",
      "product-mcfarlane-batman-dark-knight",
    ],
    bundlePrice: 449900,
    originalPrice: 499800,
    discountPercent: 10,
    coverImage: "https://images.unsplash.com/photo-1536896407451-6e3dd976edd6?w=800&h=600&fit=crop",
    currency: "INR",
    isActive: true,
    isFeatured: false,
    storeId: "store-tokyo-toys-india",
    categorySlug: "category-vinyl-figures",
    createdBy: "user-priya-singh",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(2),
  },
];
