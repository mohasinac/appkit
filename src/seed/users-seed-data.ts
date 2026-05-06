/**
 * Users Seed Data — Collectibles Marketplace
 * 9 users: 1 admin, 4 sellers (one per collectibles vertical), 4 buyers.
 * id === uid === slug convention. Indian market locale.
 */

import { getDefaultPhonePrefix } from "./seed-market-config";
import type { UserDocument } from "../features/auth/schemas";

const _ph = getDefaultPhonePrefix();
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const usersSeedData: Partial<UserDocument>[] = [
  // ── Admin ──────────────────────────────────────────────────────────────────
  {
    uid: "user-admin-letitrip",
    email: "admin@letitrip.in",
    phoneNumber: `${_ph}9876500000`,
    phoneVerified: true,
    displayName: "LetItRip Admin",
    photoURL: null,
    avatarMetadata: null,
    role: "admin",
    emailVerified: true,
    disabled: false,
    storeId: "store-letitrip-official",
    storeSlug: "store-letitrip-official",
    storeStatus: "approved",
    publicProfile: {
      isPublic: false,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: false,
      bio: "LetItRip platform administrator.",
    },
    stats: { totalOrders: 0, auctionsWon: 0, itemsSold: 0, reviewsCount: 0 },
    metadata: {
      lastSignInTime: daysAgo(1),
      creationTime: daysAgo(400).toISOString(),
      loginCount: 300,
    },
    createdAt: daysAgo(400),
    updatedAt: daysAgo(1),
  },

  // ── Sellers ────────────────────────────────────────────────────────────────

  // Seller 1: Pokémon TCG specialist
  {
    uid: "user-aryan-kapoor",
    email: "aryan@pokemonpalace.in",
    phoneNumber: `${_ph}9876501001`,
    phoneVerified: true,
    displayName: "Aryan Kapoor",
    photoURL:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    avatarMetadata: null,
    role: "seller",
    emailVerified: true,
    disabled: false,
    storeId: "store-pokemon-palace",
    storeSlug: "store-pokemon-palace",
    storeStatus: "approved",
    publicProfile: {
      isPublic: true,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: false,
      bio: "Pokémon TCG enthusiast and collector since 2010. Specialising in sealed product, graded slabs, and rare vintage cards.",
      location: "Mumbai, Maharashtra",
      socialLinks: { instagram: "https://instagram.com/aryan.pokecollector" },
      storeName: "Pokémon Palace",
      storeCategory: "trading-cards",
    },
    stats: { totalOrders: 12, auctionsWon: 3, itemsSold: 87, reviewsCount: 42 },
    metadata: {
      lastSignInTime: daysAgo(2),
      creationTime: daysAgo(380).toISOString(),
      loginCount: 95,
    },
    createdAt: daysAgo(380),
    updatedAt: daysAgo(2),
  },

  // Seller 2: Yu-Gi-Oh! & Trading Cards
  {
    uid: "user-nisha-reddy",
    email: "nisha@cardgamehub.in",
    phoneNumber: `${_ph}9876502002`,
    phoneVerified: true,
    displayName: "Nisha Reddy",
    photoURL:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
    avatarMetadata: null,
    role: "seller",
    emailVerified: true,
    disabled: false,
    storeId: "store-cardgame-hub",
    storeSlug: "store-cardgame-hub",
    storeStatus: "approved",
    publicProfile: {
      isPublic: true,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: false,
      bio: "Yu-Gi-Oh! TCG player and sealed product trader. WCS 2022 qualifier. Top-grade singles and booster boxes.",
      location: "Hyderabad, Telangana",
      socialLinks: { instagram: "https://instagram.com/nisha.cardgamehub" },
      storeName: "CardGame Hub",
      storeCategory: "trading-cards",
    },
    stats: { totalOrders: 8, auctionsWon: 1, itemsSold: 64, reviewsCount: 31 },
    metadata: {
      lastSignInTime: daysAgo(3),
      creationTime: daysAgo(350).toISOString(),
      loginCount: 67,
    },
    createdAt: daysAgo(350),
    updatedAt: daysAgo(3),
  },

  // Seller 3: Diecast cars (Hot Wheels + Tomica)
  {
    uid: "user-vikram-mehta",
    email: "vikram@diecastdepot.in",
    phoneNumber: `${_ph}9876503003`,
    phoneVerified: true,
    displayName: "Vikram Mehta",
    photoURL:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    avatarMetadata: null,
    role: "seller",
    emailVerified: true,
    disabled: false,
    storeId: "store-diecast-depot",
    storeSlug: "store-diecast-depot",
    storeStatus: "approved",
    publicProfile: {
      isPublic: true,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: false,
      bio: "Hot Wheels and Tomica collector since 2005. STH hunter, Car Culture completionist, and Tomica Limited Vintage dealer.",
      location: "Delhi, NCR",
      socialLinks: {
        instagram: "https://instagram.com/vikram.diecastdepot",
        facebook: "https://facebook.com/diecastdepot",
      },
      storeName: "Diecast Depot",
      storeCategory: "diecast-vehicles",
    },
    stats: { totalOrders: 5, auctionsWon: 2, itemsSold: 115, reviewsCount: 58 },
    metadata: {
      lastSignInTime: daysAgo(1),
      creationTime: daysAgo(320).toISOString(),
      loginCount: 140,
    },
    createdAt: daysAgo(320),
    updatedAt: daysAgo(1),
  },

  // Seller 4: Beyblade X + Burst
  {
    uid: "user-rohit-joshi",
    email: "rohit@beyladearena.in",
    phoneNumber: `${_ph}9876504004`,
    phoneVerified: true,
    displayName: "Rohit Joshi",
    photoURL:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
    avatarMetadata: null,
    role: "seller",
    emailVerified: true,
    disabled: false,
    storeId: "store-beyblade-arena",
    storeSlug: "store-beyblade-arena",
    storeStatus: "approved",
    publicProfile: {
      isPublic: true,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: false,
      bio: "India's top Beyblade X and Burst supplier. Directly importing from Takara Tomy Japan. Official tops, launchers, and XStadiums.",
      location: "Pune, Maharashtra",
      socialLinks: {
        instagram: "https://instagram.com/rohit.beyaladearena",
      },
      storeName: "Beyblade Arena",
      storeCategory: "spinning-tops",
    },
    stats: { totalOrders: 9, auctionsWon: 0, itemsSold: 73, reviewsCount: 47 },
    metadata: {
      lastSignInTime: daysAgo(2),
      creationTime: daysAgo(290).toISOString(),
      loginCount: 88,
    },
    createdAt: daysAgo(290),
    updatedAt: daysAgo(2),
  },

  // ── Buyers ─────────────────────────────────────────────────────────────────

  // Buyer 1
  {
    uid: "user-rahul-sharma",
    email: "rahul.sharma@gmail.com",
    phoneNumber: `${_ph}9876511001`,
    phoneVerified: false,
    displayName: "Rahul Sharma",
    photoURL: null,
    avatarMetadata: null,
    role: "user",
    emailVerified: true,
    disabled: false,
    publicProfile: {
      isPublic: false,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: false,
      bio: "Pokémon TCG collector. Chasing Base Set and Jungle holos.",
      location: "Bengaluru, Karnataka",
    },
    stats: { totalOrders: 7, auctionsWon: 2, itemsSold: 0, reviewsCount: 5 },
    metadata: {
      lastSignInTime: daysAgo(4),
      creationTime: daysAgo(200).toISOString(),
      loginCount: 24,
    },
    createdAt: daysAgo(200),
    updatedAt: daysAgo(4),
  },

  // Buyer 2
  {
    uid: "user-priya-patel",
    email: "priya.patel@gmail.com",
    phoneNumber: `${_ph}9876512002`,
    phoneVerified: true,
    displayName: "Priya Patel",
    photoURL:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    avatarMetadata: null,
    role: "user",
    emailVerified: true,
    disabled: false,
    publicProfile: {
      isPublic: false,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: false,
      bio: "Nendoroid and figma collector. Good Smile Company fan.",
      location: "Ahmedabad, Gujarat",
    },
    stats: { totalOrders: 11, auctionsWon: 1, itemsSold: 0, reviewsCount: 8 },
    metadata: {
      lastSignInTime: daysAgo(2),
      creationTime: daysAgo(180).toISOString(),
      loginCount: 31,
    },
    createdAt: daysAgo(180),
    updatedAt: daysAgo(2),
  },

  // Buyer 3
  {
    uid: "user-arjun-singh",
    email: "arjun.singh@gmail.com",
    phoneNumber: `${_ph}9876513003`,
    phoneVerified: false,
    displayName: "Arjun Singh",
    photoURL: null,
    avatarMetadata: null,
    role: "user",
    emailVerified: true,
    disabled: false,
    publicProfile: {
      isPublic: false,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: false,
      bio: "Gunpla builder. Working through MG grade. Next target: PG Wing Zero.",
      location: "Jaipur, Rajasthan",
    },
    stats: { totalOrders: 4, auctionsWon: 0, itemsSold: 0, reviewsCount: 3 },
    metadata: {
      lastSignInTime: daysAgo(7),
      creationTime: daysAgo(150).toISOString(),
      loginCount: 12,
    },
    createdAt: daysAgo(150),
    updatedAt: daysAgo(7),
  },

  // Buyer 4
  {
    uid: "user-meera-nair",
    email: "meera.nair@gmail.com",
    phoneNumber: `${_ph}9876514004`,
    phoneVerified: true,
    displayName: "Meera Nair",
    photoURL:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
    avatarMetadata: null,
    role: "user",
    emailVerified: true,
    disabled: false,
    publicProfile: {
      isPublic: false,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: false,
      bio: "Hot Wheels STH hunter and Tomica Premium collector.",
      location: "Kochi, Kerala",
    },
    stats: { totalOrders: 6, auctionsWon: 3, itemsSold: 0, reviewsCount: 4 },
    metadata: {
      lastSignInTime: daysAgo(3),
      creationTime: daysAgo(120).toISOString(),
      loginCount: 19,
    },
    createdAt: daysAgo(120),
    updatedAt: daysAgo(3),
  },
];
