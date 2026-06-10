/*
 * WHY: Provides 8 seed stores covering all collectible categories for the marketplace demo.
 * WHAT: Exports 8 StoreDocument partials — letitrip-official, kaiba-corp-cards, pokemon-palace,
 *       cardgame-hub, diecast-depot, beyblade-arena, tokyo-toys-india, gundam-galaxy.
 *       Mix of verified/basic stores with various capabilities.
 *
 * EXPORTS:
 *   storesSeedData — array of 8 Partial<StoreDocument> for the seed runner
 *
 * @tag domain:stores
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type { StoreDocument } from "../features/stores/schemas";
import { STORE_FIELDS } from "../constants/field-names";
import type { StoreCapability } from "../features/auth/permissions/constants";
import { seedExtMedia } from "./_helpers/media";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const storesSeedData: Partial<StoreDocument>[] = [
  // ── Store 1: LetItRip Official (admin-owned, curated YGO showcase) ──────────
  {
    id: "store-letitrip-official",
    storeSlug: "store-letitrip-official",
    ownerId: "user-admin-letitrip",
    storeName: "LetItRip Official",
    storeDescription:
      "The official LetItRip curated store. Hand-picked premium Yu-Gi-Oh! collectibles — authenticated graded slabs, Egyptian God cards, sealed vintage product, and rare 1st Edition singles. Every item personally inspected.",
    storeCategory: "category-singles",
    storeLogoURL:
      seedExtMedia("https://images.ygoprodeck.com/images/cards/small/10000015.jpg"),
    storeBannerURL:
      seedExtMedia("https://images.ygoprodeck.com/images/cards/cropped/10000015.jpg"),
    status: STORE_FIELDS.STATUS_VALUES.ACTIVE,
    bio: "Curated by the LetItRip team. All cards authenticated and graded by PSA/BGS/CGC before listing. Fast dispatch, collector-grade packaging.",
    location: "Mumbai, Maharashtra, India",
    website: "https://letitrip.in",
    socialLinks: {
      instagram: "https://instagram.com/letitrip",
      facebook: "https://facebook.com/letitrip",
      twitter: "https://twitter.com/letitrip",
    },
    returnPolicy:
      "7-day hassle-free returns on all items. Items must be in original condition. Full refund or replacement guaranteed.",
    shippingPolicy:
      "Free shipping on orders above ₹999. Orders dispatched within 24 hours. 3–5 business day delivery across India. Express shipping available. All graded slabs shipped in hard slab mailers.",
    shippingConfig: {
      defaultProviderId: "provider-letitrip-standard",
      providers: [
        {
          providerId: "provider-letitrip-standard",
          label: "Standard Shipping",
          type: "shiprocket" as const,
          fee: { flatInPaise: 4900, freeAboveInPaise: 99900 },
          etaDaysMin: 3,
          etaDaysMax: 5,
          requiresAwbUpload: true,
        },
        {
          providerId: "provider-letitrip-express",
          label: "Express Shipping",
          type: "shiprocket" as const,
          fee: { flatInPaise: 9900 },
          etaDaysMin: 1,
          etaDaysMax: 2,
          requiresAwbUpload: true,
        },
        {
          providerId: "provider-letitrip-pickup",
          label: "Store Pickup (Mumbai HQ)",
          type: "store-pickup" as const,
          fee: { flatInPaise: 0 },
          etaDaysMin: 0,
          etaDaysMax: 1,
        },
      ],
    },
    isPublic: true,
    isVacationMode: false,

    stats: {
      totalProducts: 0,
      itemsSold: 0,
      totalReviews: 5,
      averageRating: 4.8,
    },
    capabilities: [
      "host_auctions",
      "host_preorders",
      "verified_seller",
      "create_coupons",
      "suggest_brands",
      "bulk_listing_import",
      "featured_placement",
      "promotional_banner",
      "advanced_analytics",
      "api_access",
      "multiple_stores",
      "early_access_features",
      "whatsapp_catalog_sync",
    ] as StoreCapability[],
    createdAt: daysAgo(400),
    updatedAt: daysAgo(1),
  },

  // ── Store 2: Kaiba Corp Card Vault (seller-owned, main YGO inventory) ───────
  {
    id: "store-kaiba-corp-cards",
    storeSlug: "store-kaiba-corp-cards",
    ownerId: "user-seto-kaiba",
    storeName: "Kaiba Corp Card Vault",
    storeDescription:
      "The definitive Yu-Gi-Oh! card store by Seto Kaiba. Massive inventory of Duel Monsters era singles, GX era cards, graded slabs, sealed booster boxes, accessories, and rare collectibles. Authenticated and documented.",
    storeCategory: "category-singles",
    storeLogoURL:
      seedExtMedia("https://images.ygoprodeck.com/images/cards/small/23995346.jpg"),
    storeBannerURL:
      seedExtMedia("https://images.ygoprodeck.com/images/cards/cropped/23995346.jpg"),
    status: STORE_FIELDS.STATUS_VALUES.ACTIVE,
    bio: "CEO of Kaiba Corp. My vault contains the finest YGO cards in the world. Every card authenticated, graded, and catalogued. Blue-Eyes White Dragon specialist.",
    location: "Domino City, Japan",
    website: "https://kaibacorp.jp",
    socialLinks: {
      instagram: "https://instagram.com/kaibacorpvault",
      twitter: "https://twitter.com/kaibacorp",
    },
    returnPolicy:
      "3-day returns on singles (must be in original condition, same sleeve). No returns on opened sealed product. Graded slabs: 3-day return if slab arrives cracked.",
    shippingPolicy:
      "Singles shipped in top loaders + team bags, bubble-padded envelope. Sealed product double-boxed. Free shipping on orders above ₹1,499. Dispatched within 48 hours. 3–7 business days.",
    shippingConfig: {
      defaultProviderId: "provider-kaiba-standard",
      providers: [
        {
          providerId: "provider-kaiba-standard",
          label: "Standard (Singles & Accessories)",
          type: "self-courier" as const,
          fee: { flatInPaise: 4900, freeAboveInPaise: 149900 },
          etaDaysMin: 3,
          etaDaysMax: 7,
        },
        {
          providerId: "provider-kaiba-box",
          label: "Box Shipping (Sealed Product)",
          type: "shiprocket" as const,
          fee: { flatInPaise: 14900 },
          etaDaysMin: 4,
          etaDaysMax: 7,
          requiresAwbUpload: true,
        },
        {
          providerId: "provider-kaiba-express",
          label: "Express Courier",
          type: "shiprocket" as const,
          fee: { flatInPaise: 19900 },
          etaDaysMin: 1,
          etaDaysMax: 2,
          requiresAwbUpload: true,
        },
      ],
    },
    isPublic: true,
    isVacationMode: false,
    vacationMessage: "Taking a break to prepare my next card shipment. Back soon.",
    vacationReturnDate: new Date(NOW.getTime() + 7 * 86_400_000), // 7 days from seed time

    stats: {
      totalProducts: 0,
      itemsSold: 0,
      totalReviews: 30,
      averageRating: 4.6,
    },
    capabilities: [
      "host_auctions",
      "host_preorders",
      "verified_seller",
      "create_coupons",
      "suggest_brands",
      "bulk_listing_import",
      "advanced_analytics",
    ] as StoreCapability[],
    createdAt: daysAgo(350),
    updatedAt: daysAgo(1),
  },

  // ── Store 3: Pokémon Palace (Pokémon TCG specialist) ──────────────────────
  {
    id: "store-pokemon-palace",
    storeSlug: "store-pokemon-palace",
    ownerId: "user-ash-trainer",
    storeName: "Pokémon Palace",
    storeDescription:
      "India's top Pokémon TCG store. Booster packs, Elite Trainer Boxes, singles, graded slabs, and Japanese exclusives. Base Set to Scarlet & Violet — if it's Pokémon, we've got it.",
    storeCategory: "category-pokemon-tcg",
    storeLogoURL: seedExtMedia("https://picsum.photos/seed/store-logo-pokemon-palace-20260101/400/400"),
    storeBannerURL: seedExtMedia("https://picsum.photos/seed/store-banner-pokemon-palace-20260101/1600/400"),
    status: STORE_FIELDS.STATUS_VALUES.ACTIVE,
    bio: "Pokémon Master turned seller. Building the largest Pokémon TCG collection marketplace in India.",
    location: "Bengaluru, Karnataka, India",
    website: "https://pokemonpalace.in",
    socialLinks: { instagram: "https://instagram.com/pokemonpalace.in" },
    returnPolicy: "7-day returns on singles. No returns on opened sealed product.",
    shippingPolicy: "Free shipping on orders above ₹799. Ships within 48 hours. 4–6 business days across India.",
    shippingConfig: {
      defaultProviderId: "provider-pokemon-standard",
      providers: [
        { providerId: "provider-pokemon-standard", label: "Standard Shipping", type: "shiprocket" as const, fee: { flatInPaise: 4900, freeAboveInPaise: 79900 }, etaDaysMin: 4, etaDaysMax: 6, requiresAwbUpload: true },
      ],
    },
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 8, averageRating: 4.7 },
    capabilities: ["host_auctions", "host_preorders", "verified_seller", "create_coupons", "suggest_brands"] as StoreCapability[],
    createdAt: daysAgo(200),
    updatedAt: daysAgo(3),
  },

  // ── Store 4: CardGame Hub (multi-TCG store) ───────────────────────────────
  {
    id: "store-cardgame-hub",
    storeSlug: "store-cardgame-hub",
    ownerId: "user-priya-cards",
    storeName: "CardGame Hub",
    storeDescription:
      "Multi-TCG collectibles store. Yu-Gi-Oh!, Pokémon, One Piece, Dragon Ball Super, and Cardfight!! Vanguard. Singles, sealed product, and tournament accessories.",
    storeCategory: "category-trading-cards",
    storeLogoURL: seedExtMedia("https://picsum.photos/seed/store-logo-cardgame-hub-20260101/400/400"),
    storeBannerURL: seedExtMedia("https://picsum.photos/seed/store-banner-cardgame-hub-20260101/1600/400"),
    status: STORE_FIELDS.STATUS_VALUES.ACTIVE,
    bio: "TCG enthusiast since 2010. Running local tournaments and selling authentic cards from my personal collection and distributor stock.",
    location: "Hyderabad, Telangana, India",
    socialLinks: { instagram: "https://instagram.com/cardgamehub.in", twitter: "https://twitter.com/cardgamehub" },
    returnPolicy: "5-day returns. Items must be in original packaging.",
    shippingPolicy: "Free shipping above ₹1,499. Ships within 48 hours via Shiprocket.",
    shippingConfig: {
      defaultProviderId: "provider-cardgame-standard",
      providers: [
        { providerId: "provider-cardgame-standard", label: "Standard", type: "shiprocket" as const, fee: { flatInPaise: 5900, freeAboveInPaise: 149900 }, etaDaysMin: 4, etaDaysMax: 7, requiresAwbUpload: true },
      ],
    },
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 4, averageRating: 4.5 },
    capabilities: ["host_auctions", "verified_seller", "create_coupons", "suggest_brands"] as StoreCapability[],
    createdAt: daysAgo(180),
    updatedAt: daysAgo(5),
  },

  // ── Store 5: Diecast Depot (Hot Wheels, Tomica, Matchbox) ─────────────────
  {
    id: "store-diecast-depot",
    storeSlug: "store-diecast-depot",
    ownerId: "user-ravi-diecast",
    storeName: "Diecast Depot",
    storeDescription:
      "India's premier diecast collectibles store. Hot Wheels mainline, Premium, Treasure Hunts, Super TH, Tomica, Matchbox, and Maisto. New arrivals every week.",
    storeCategory: "category-diecast-vehicles",
    storeLogoURL: seedExtMedia("https://picsum.photos/seed/store-logo-diecast-depot-20260101/400/400"),
    storeBannerURL: seedExtMedia("https://picsum.photos/seed/store-banner-diecast-depot-20260101/1600/400"),
    status: STORE_FIELDS.STATUS_VALUES.ACTIVE,
    bio: "Collecting diecast since 1998. Over 5,000 Hot Wheels in my personal collection. Now sharing the hobby with collectors across India.",
    location: "Delhi, NCR, India",
    socialLinks: { instagram: "https://instagram.com/diecastdepot.in", facebook: "https://facebook.com/diecastdepot" },
    returnPolicy: "3-day returns on carded items only. No returns on loose or opened items.",
    shippingPolicy: "Free shipping on 5+ items or orders above ₹999. Dispatched within 24 hours.",
    shippingConfig: {
      defaultProviderId: "provider-diecast-standard",
      providers: [
        { providerId: "provider-diecast-standard", label: "Standard", type: "shiprocket" as const, fee: { flatInPaise: 3900, freeAboveInPaise: 99900 }, etaDaysMin: 3, etaDaysMax: 5, requiresAwbUpload: true },
      ],
    },
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 12, averageRating: 4.6 },
    capabilities: ["verified_seller", "create_coupons", "suggest_brands", "bulk_listing_import"] as StoreCapability[],
    createdAt: daysAgo(250),
    updatedAt: daysAgo(2),
  },

  // ── Store 6: Beyblade Arena (spinning tops specialist) ────────────────────
  {
    id: "store-beyblade-arena",
    storeSlug: "store-beyblade-arena",
    ownerId: "user-tyson-blader",
    storeName: "Beyblade Arena",
    storeDescription:
      "Everything Beyblade — X, Burst, Metal Fight, and vintage original series. Takara-Tomy authentic stock, tournament-grade stadiums, launchers, and rare limited editions.",
    storeCategory: "category-spinning-tops",
    storeLogoURL: seedExtMedia("https://picsum.photos/seed/store-logo-beyblade-arena-20260101/400/400"),
    storeBannerURL: seedExtMedia("https://picsum.photos/seed/store-banner-beyblade-arena-20260101/1600/400"),
    status: STORE_FIELDS.STATUS_VALUES.ACTIVE,
    bio: "Beyblade champion turned seller. Importing authentic Takara-Tomy Beyblades directly from Japan. Let It Rip!",
    location: "Chennai, Tamil Nadu, India",
    socialLinks: { instagram: "https://instagram.com/beybladearena.in" },
    returnPolicy: "7-day returns on sealed items. No returns on used/battled Beyblades.",
    shippingPolicy: "Free shipping above ₹599. All items shipped in protective bubble wrap.",
    shippingConfig: {
      defaultProviderId: "provider-beyblade-standard",
      providers: [
        { providerId: "provider-beyblade-standard", label: "Standard", type: "shiprocket" as const, fee: { flatInPaise: 4500, freeAboveInPaise: 59900 }, etaDaysMin: 3, etaDaysMax: 6, requiresAwbUpload: true },
      ],
    },
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 6, averageRating: 4.8 },
    capabilities: ["host_preorders", "verified_seller", "create_coupons", "suggest_brands"] as StoreCapability[],
    createdAt: daysAgo(150),
    updatedAt: daysAgo(4),
  },

  // ── Store 7: Tokyo Toys India (anime figures + model kits) ────────────────
  {
    id: "store-tokyo-toys-india",
    storeSlug: "store-tokyo-toys-india",
    ownerId: "user-megumi-figures",
    storeName: "Tokyo Toys India",
    storeDescription:
      "Anime figures and model kits imported from Japan. Nendoroid, S.H.Figuarts, figma, Funko Pop, and scale figures. Plus Gunpla and 30 Minutes Missions kits.",
    storeCategory: "category-action-figures",
    storeLogoURL: seedExtMedia("https://picsum.photos/seed/store-logo-tokyo-toys-india-20260101/400/400"),
    storeBannerURL: seedExtMedia("https://picsum.photos/seed/store-banner-tokyo-toys-india-20260101/1600/400"),
    status: STORE_FIELDS.STATUS_VALUES.ACTIVE,
    bio: "Direct imports from Akihabara and Nipponbashi. Authentic figures with original Japanese packaging. No bootlegs, ever.",
    location: "Pune, Maharashtra, India",
    website: "https://tokyotoys.in",
    socialLinks: { instagram: "https://instagram.com/tokyotoys.in", twitter: "https://twitter.com/tokyotoysindia" },
    returnPolicy: "7-day returns on unopened figures. Damaged-in-transit claims within 48 hours with photo proof.",
    shippingPolicy: "Free shipping above ₹1,999. All figures double-boxed with foam inserts. 5–8 business days.",
    shippingConfig: {
      defaultProviderId: "provider-tokyo-standard",
      providers: [
        { providerId: "provider-tokyo-standard", label: "Standard (Double-Box)", type: "shiprocket" as const, fee: { flatInPaise: 9900, freeAboveInPaise: 199900 }, etaDaysMin: 5, etaDaysMax: 8, requiresAwbUpload: true },
        { providerId: "provider-tokyo-express", label: "Express", type: "shiprocket" as const, fee: { flatInPaise: 19900 }, etaDaysMin: 2, etaDaysMax: 3, requiresAwbUpload: true },
      ],
    },
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 3, averageRating: 4.9 },
    capabilities: ["host_preorders", "verified_seller", "create_coupons", "suggest_brands", "advanced_analytics"] as StoreCapability[],
    createdAt: daysAgo(120),
    updatedAt: daysAgo(2),
  },

  // ── Store 8: Gundam Galaxy (Gunpla + mecha model kits) ────────────────────
  {
    id: "store-gundam-galaxy",
    storeSlug: "store-gundam-galaxy",
    ownerId: "user-amuro-builder",
    storeName: "Gundam Galaxy",
    storeDescription:
      "Gunpla and mecha model kits — HG, RG, MG, PG, SD grades by Bandai, plus Frame Arms by Kotobukiya and 30 Minutes Missions. Tools, paints, and accessories.",
    storeCategory: "category-model-kits",
    storeLogoURL: seedExtMedia("https://picsum.photos/seed/store-logo-gundam-galaxy-20260101/400/400"),
    storeBannerURL: seedExtMedia("https://picsum.photos/seed/store-banner-gundam-galaxy-20260101/1600/400"),
    status: STORE_FIELDS.STATUS_VALUES.ACTIVE,
    bio: "Building Gunpla since 2005. Over 200 kits built. Importing directly from Bandai Hobby distributors in Japan and Hong Kong.",
    location: "Kolkata, West Bengal, India",
    socialLinks: { instagram: "https://instagram.com/gundamgalaxy.in" },
    returnPolicy: "7-day returns on sealed kits. No returns on opened or partially built kits.",
    shippingPolicy: "Free shipping above ₹1,499. Kits shipped in original Bandai outer boxes. 4–7 business days.",
    shippingConfig: {
      defaultProviderId: "provider-gundam-standard",
      providers: [
        { providerId: "provider-gundam-standard", label: "Standard", type: "shiprocket" as const, fee: { flatInPaise: 7900, freeAboveInPaise: 149900 }, etaDaysMin: 4, etaDaysMax: 7, requiresAwbUpload: true },
      ],
    },
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 0, itemsSold: 0, totalReviews: 2, averageRating: 4.7 },
    capabilities: ["host_preorders", "create_coupons", "suggest_brands"] as StoreCapability[],
    createdAt: daysAgo(90),
    updatedAt: daysAgo(6),
  },
];
