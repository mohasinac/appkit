/**
 * Stores Seed Data — Collectibles Marketplace
 * 5 stores: 1 admin/official store + 4 seller stores covering the 5 collectibles verticals.
 * id === storeSlug convention enforced throughout.
 */

import type { StoreDocument } from "../features/stores/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const storesSeedData: Partial<StoreDocument>[] = [
  // ── Store 1: LetItRip Official (admin-owned multi-category curated store) ──
  {
    id: "store-letitrip-official",
    storeSlug: "store-letitrip-official",
    ownerId: "user-admin-letitrip",
    storeName: "LetItRip Official",
    storeDescription:
      "The official LetItRip curated store. Hand-picked premium collectibles across Pokémon TCG, Hot Wheels, Beyblade X, and anime figures. Verified authentic, carefully packaged.",
    storeCategory: "category-action-figures",
    storeLogoURL:
      "https://images.unsplash.com/photo-1614108831137-558fffac9ead?w=400&h=400&fit=crop",
    storeBannerURL:
      "https://images.unsplash.com/photo-1614108831137-558fffac9ead?w=1600&h=400&fit=crop",
    status: "active",
    bio: "Curated by the LetItRip team. Every item is personally inspected and authenticated before listing. Fast dispatch, safe packaging.",
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
      "Free shipping on orders above ₹999. Orders dispatched within 24 hours. 3–5 business day delivery across India. Express shipping available.",
    isPublic: true,
    isVacationMode: false,
    stats: {
      totalProducts: 0,
      itemsSold: 0,
      totalReviews: 0,
      averageRating: 0,
    },
    createdAt: daysAgo(400),
    updatedAt: daysAgo(1),
  },

  // ── Store 2: Pokémon Palace (Pokémon TCG) ──────────────────────────────────
  {
    id: "store-pokemon-palace",
    storeSlug: "store-pokemon-palace",
    ownerId: "user-aryan-kapoor",
    storeName: "Pokémon Palace",
    storeDescription:
      "India's premier Pokémon TCG store. Specialising in booster packs, Elite Trainer Boxes, sealed booster boxes, PSA/BGS graded slabs, and rare vintage cards from Base Set to Scarlet & Violet.",
    storeCategory: "category-pokemon-tcg",
    storeLogoURL:
      "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=400&h=400&fit=crop",
    storeBannerURL:
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1600&h=400&fit=crop",
    status: "active",
    bio: "Pokémon TCG enthusiast since 2010 and PTCGO tournament player. All cards are inspected under bright light and sleeved before shipping. Sealed product is sourced directly from official distributors.",
    location: "Mumbai, Maharashtra, India",
    socialLinks: {
      instagram: "https://instagram.com/aryan.pokecollector",
    },
    returnPolicy:
      "7-day return policy on factory-sealed product (seal must be intact). No returns on opened packs or singles. Graded slabs: 3-day return if slab is cracked on arrival.",
    shippingPolicy:
      "Singles and small orders: bubble-padded envelope (₹49 shipping). Sealed boxes and ETBs: double-boxed with foam inserts. Free shipping on orders above ₹1,499. 3–7 business days.",
    isPublic: true,
    isVacationMode: false,
    stats: {
      totalProducts: 0,
      itemsSold: 87,
      totalReviews: 42,
      averageRating: 4.8,
    },
    createdAt: daysAgo(380),
    updatedAt: daysAgo(2),
  },

  // ── Store 3: CardGame Hub (Yu-Gi-Oh! + Mixed TCG) ─────────────────────────
  {
    id: "store-cardgame-hub",
    storeSlug: "store-cardgame-hub",
    ownerId: "user-nisha-reddy",
    storeName: "CardGame Hub",
    storeDescription:
      "Yu-Gi-Oh! TCG specialist. Tournament-grade singles, booster boxes, structure decks, collector tins, and sealed product. Also stocks Pokémon ETBs and mixed TCG accessories.",
    storeCategory: "category-yugioh-tcg",
    storeLogoURL:
      "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=400&fit=crop",
    storeBannerURL:
      "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=1600&h=400&fit=crop",
    status: "active",
    bio: "WCS 2022 qualifier and competitive Yu-Gi-Oh! player. Tournament-tested cards, sleeve recommendations, and deck-building advice on request. Bulk orders welcome.",
    location: "Hyderabad, Telangana, India",
    socialLinks: {
      instagram: "https://instagram.com/nisha.cardgamehub",
    },
    returnPolicy:
      "Singles: 3-day return if card is misrepresented in condition grading. Sealed: 7-day return on factory-sealed only. No returns on opened product.",
    shippingPolicy:
      "Singles shipped in toploader and penny sleeve inside padded envelope. Sealed product double-boxed. Free shipping on orders above ₹1,199. 4–6 business days.",
    isPublic: true,
    isVacationMode: false,
    stats: {
      totalProducts: 0,
      itemsSold: 64,
      totalReviews: 31,
      averageRating: 4.6,
    },
    createdAt: daysAgo(350),
    updatedAt: daysAgo(3),
  },

  // ── Store 4: Diecast Depot (Hot Wheels + Tomica) ───────────────────────────
  {
    id: "store-diecast-depot",
    storeSlug: "store-diecast-depot",
    ownerId: "user-vikram-mehta",
    storeName: "Diecast Depot",
    storeDescription:
      "Hot Wheels and Tomica diecast car specialists. Treasure Hunts (TH), Super Treasure Hunts (STH), Car Culture sets, Team Transport, premium Tomica Limited Vintage, and 1:18 scale cars.",
    storeCategory: "category-hot-wheels",
    storeLogoURL:
      "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400&h=400&fit=crop",
    storeBannerURL:
      "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=1600&h=400&fit=crop",
    status: "active",
    bio: "Collector since 2005. STH hunter, Car Culture completionist, Tomica Limited Vintage dealer. All cars are fresh from retail, blister-checked, and never displayed. I source from Tokyo flea markets on my annual Japan trip.",
    location: "Delhi, NCR, India",
    socialLinks: {
      instagram: "https://instagram.com/vikram.diecastdepot",
      facebook: "https://facebook.com/diecastdepot",
    },
    returnPolicy:
      "7-day return on factory-sealed blister-pack cars (blister must be unopened). Loose cars: 3-day return if car is misrepresented. No returns on custom or modified cars.",
    shippingPolicy:
      "Each car bubble-wrapped individually and packed in rigid mailer. Multiple cars in padded box. Free shipping on orders above ₹999. Express India Post or Shiprocket: 3–5 business days.",
    isPublic: true,
    isVacationMode: false,
    stats: {
      totalProducts: 0,
      itemsSold: 115,
      totalReviews: 58,
      averageRating: 4.9,
    },
    createdAt: daysAgo(320),
    updatedAt: daysAgo(1),
  },

  // ── Store 5: Beyblade Arena (Beyblade X + Burst) ───────────────────────────
  {
    id: "store-beyblade-arena",
    storeSlug: "store-beyblade-arena",
    ownerId: "user-rohit-joshi",
    storeName: "Beyblade Arena",
    storeDescription:
      "India's #1 Beyblade X and Burst store. Direct import from Takara Tomy Japan. Official tops, launchers, XStadiums, and combo sets. Competitive-grade product, genuine Japanese releases.",
    storeCategory: "category-beyblade-x",
    storeLogoURL:
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&h=400&fit=crop",
    storeBannerURL:
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=1600&h=400&fit=crop",
    status: "active",
    bio: "Importing Beyblade X directly from Japan since 2023. All stock is Takara Tomy authentic — no knockoffs. Run weekly online tournaments with prizes. Discord community with 2,000+ members.",
    location: "Pune, Maharashtra, India",
    socialLinks: {
      instagram: "https://instagram.com/rohit.beyladearena",
    },
    returnPolicy:
      "7-day return on factory-sealed Beyblade product (box must be unopened). Launcher or stadium returns accepted within 3 days if manufacturing defect. No returns on opened combo sets.",
    shippingPolicy:
      "All tops packed individually in foam-lined boxes. Free shipping on orders above ₹799. Standard: 4–6 business days. Express available. Japan-sourced items may take 7–10 business days.",
    isPublic: true,
    isVacationMode: false,
    stats: {
      totalProducts: 0,
      itemsSold: 73,
      totalReviews: 47,
      averageRating: 4.7,
    },
    createdAt: daysAgo(290),
    updatedAt: daysAgo(2),
  },
];
