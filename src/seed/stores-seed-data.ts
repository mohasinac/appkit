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
    // S-SBUNI-RULES 2026-05-13 — ShippingProviderConfig seed
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
      ],
    },
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
    // S-SBUNI-RULES 2026-05-13 — ShippingProviderConfig seed
    shippingConfig: {
      defaultProviderId: "provider-palace-standard",
      providers: [
        {
          providerId: "provider-palace-standard",
          label: "Bubble Mailer (Singles)",
          type: "self-courier" as const,
          fee: { flatInPaise: 4900, freeAboveInPaise: 149900 },
          etaDaysMin: 3,
          etaDaysMax: 7,
        },
        {
          providerId: "provider-palace-box",
          label: "Double-boxed (Sealed Product)",
          type: "self-courier" as const,
          fee: { flatInPaise: 14900 },
          etaDaysMin: 4,
          etaDaysMax: 7,
        },
        {
          providerId: "provider-palace-pickup",
          label: "Store Pickup — Mumbai",
          type: "store-pickup" as const,
          fee: { flatInPaise: 0 },
          etaDaysMin: 0,
          etaDaysMax: 1,
          regions: ["400"],
        },
      ],
    },
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

  // ── Store 6: Tokyo Toys India (Anime Figures, Gundam, Funko Pop) ──────────
  {
    id: "store-tokyo-toys-india",
    storeSlug: "store-tokyo-toys-india",
    ownerId: "user-priya-singh",
    storeName: "Tokyo Toys India",
    storeDescription:
      "India's premier anime figure and Gundam store. Nendoroids, S.H.Figuarts, scale PVC figures, Real Grade and High Grade Gunpla, and Funko Pops. All sourced from Akihabara, Good Smile Company, and Bandai Spirits directly.",
    storeCategory: "category-anime-figures",
    storeLogoURL:
      "https://images.unsplash.com/photo-1608889825271-9696283b84bd?w=400&h=400&fit=crop",
    storeBannerURL:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&h=400&fit=crop",
    status: "active",
    bio: "I visit Akihabara twice a year and bring back genuine figures direct from Good Smile, Bandai Spirits, and Kotobukiya. All products have original Japanese box with serial number. No grey-market, no bootlegs. Specialising in Nendoroids and S.H.Figuarts with a growing Gunpla section.",
    location: "Chennai, Tamil Nadu, India",
    socialLinks: {
      instagram: "https://instagram.com/priya.tokyotoys",
      twitter: "https://twitter.com/tokyotoysindia",
    },
    returnPolicy:
      "7-day return on factory-sealed product (seal must be intact). Figures with broken or missing accessories: 3-day return window, photographic evidence required. No returns on opened Nendoroids.",
    shippingPolicy:
      "Each figure individually bubble-wrapped in rigid box with foam padding. Free shipping on orders above ₹999. 3–5 business days. Japan-sourced items dispatched within 24 hours of arrival.",
    isPublic: true,
    isVacationMode: false,
    stats: {
      totalProducts: 0,
      itemsSold: 52,
      totalReviews: 28,
      averageRating: 4.8,
    },
    createdAt: daysAgo(260),
    updatedAt: daysAgo(1),
  },

  // ── Store 7: Gundam Galaxy (Gunpla model kits specialist) ─────────────────
  {
    id: "store-gundam-galaxy",
    storeSlug: "store-gundam-galaxy",
    ownerId: "user-amit-sharma",
    storeName: "Gundam Galaxy",
    storeDescription:
      "Gunpla model kit specialists — High Grade, Real Grade, Master Grade, and Perfect Grade kits. Bandai authentic stock only, sourced directly from official distributors in Japan and Singapore. Beginner kits to advanced PG builds.",
    storeCategory: "category-gunpla",
    storeLogoURL:
      "https://images.unsplash.com/photo-1657664072470-99b02c2143f2?w=400&h=400&fit=crop",
    storeBannerURL:
      "https://images.unsplash.com/photo-1657664072470-99b02c2143f2?w=1600&h=400&fit=crop",
    status: "active",
    bio: "Master Grade builder and competitive Gunpla modeller since 2016. All kits sourced from official Bandai distributors — no Malaysian bootlegs, no resealed boxes. YouTube channel with build tutorials for MG and RG kits. Discord server for India Gunpla community with 1,500+ members.",
    location: "Bengaluru, Karnataka, India",
    socialLinks: {
      instagram: "https://instagram.com/amit.gundamgalaxy",
      twitter: "https://twitter.com/gundamgalaxy",
    },
    returnPolicy:
      "7-day return on factory-sealed kits (outer shrink wrap must be intact). Loose runner returns: 3-day window if misrepresented. No returns on started/built kits.",
    shippingPolicy:
      "All kits double-boxed in rigid cardboard. Free shipping on orders above ₹999. 3–5 business days. PG kits shipped with additional foam corner protection.",
    isPublic: true,
    isVacationMode: false,
    stats: {
      totalProducts: 0,
      itemsSold: 41,
      totalReviews: 22,
      averageRating: 4.7,
    },
    createdAt: daysAgo(230),
    updatedAt: daysAgo(2),
  },

  // ── Store 8: Vintage Vault (vintage collectibles — WOTC era + 80s toys) ───
  {
    id: "store-vintage-vault",
    storeSlug: "store-vintage-vault",
    ownerId: "user-kavya-iyer",
    storeName: "Vintage Vault",
    storeDescription:
      "Vintage collectibles from the golden era. Pokémon WOTC-era raw and graded cards, 1980s action figures (Masters of the Universe, TMNT, Star Wars vintage), vintage Hot Wheels Redlines, and rare Japanese toys from the Shōwa period. Sourced from estate sales, Tokyo flea markets, and private collector networks.",
    storeCategory: "category-vintage-rare",
    storeLogoURL:
      "https://images.unsplash.com/photo-1578301978162-7aae4d755744?w=400&h=400&fit=crop",
    storeBannerURL:
      "https://images.unsplash.com/photo-1578301978162-7aae4d755744?w=1600&h=400&fit=crop",
    status: "active",
    bio: "20+ years sourcing vintage collectibles from Japan, the UK, and the US. Every item in my store has a provenance story. I travel to Japan twice a year — Tokyo Toy Show and the Shinjuku/Shibuya flea market circuit. Specialist in Pokémon WOTC era (Base Set through Skyridge) and vintage Redline Hot Wheels.",
    location: "Kolkata, West Bengal, India",
    socialLinks: {
      instagram: "https://instagram.com/kavya.vintagevault",
    },
    returnPolicy:
      "3-day return on all vintage items if misrepresented. Detailed grading photos taken before shipping. Any dispute handled promptly and fairly — reputation is everything in vintage.",
    shippingPolicy:
      "All vintage items individually sleeved and packed in rigid mailers with foam. Insured shipping on items above ₹5,000. Free standard shipping on orders above ₹999. 4–6 business days.",
    isPublic: true,
    isVacationMode: false,
    stats: {
      totalProducts: 0,
      itemsSold: 34,
      totalReviews: 19,
      averageRating: 4.9,
    },
    createdAt: daysAgo(200),
    updatedAt: daysAgo(3),
  },
];
