import "server-only";
import { getDefaultPhonePrefix } from "./seed-market-config";

/**
 * Pokemon Base Set 151 — Users Seed Data
 * Themed around Pokémon trainers and gym leaders as sellers/buyers
 */

import type { UserDocument } from "../features/auth/schemas";

const _phonePrefix = getDefaultPhonePrefix();

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const pokemonUsersSeedData: Partial<UserDocument>[] = [
  // ── Admin ─────────────────────────────────────────────────────────────────
  {
    uid: "user-admin-user-admin",
    email: "admin@letitrip.in",
    phoneNumber: `${_phonePrefix}9876543210`,
    phoneVerified: true,
    displayName: "Admin User",
    photoURL: null,
    avatarMetadata: null,
    role: "admin",
    emailVerified: true,
    disabled: false,
    createdAt: daysAgo(365),
    updatedAt: daysAgo(1),
    publicProfile: {
      isPublic: false,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: false,
      bio: "System Administrator",
    },
    stats: { totalOrders: 0, auctionsWon: 0, itemsSold: 0, reviewsCount: 0 },
    metadata: {
      lastSignInTime: daysAgo(1),
      creationTime: daysAgo(365).toISOString(),
      loginCount: 200,
    },
  },

  // ── Sellers (Gym Leaders themed) ──────────────────────────────────────────

  // Misty's Water Cards — Water type seller
  {
    uid: "user-misty-water-gym-misty",
    email: "misty@letitrip.in",
    phoneNumber: `${_phonePrefix}9000000001`,
    phoneVerified: true,
    displayName: "Misty (Water Gym)",
    photoURL:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/120.png",
    avatarMetadata: null,
    role: "seller",
    emailVerified: true,
    disabled: false,
    createdAt: daysAgo(180),
    updatedAt: daysAgo(2),
    storeId: "store-mistys-water-cards",
    storeSlug: "mistys-water-cards",
    storeStatus: "approved",
    publicProfile: {
      isPublic: true,
      showEmail: true,
      showPhone: false,
      showOrders: false,
      showWishlist: true,
      bio: "Cerulean City Gym Leader. I specialise in Water-type Pokémon cards from the original Base Set.",
      storeName: "Misty's Water Cards",
      storeDescription:
        "The best source for Water-type Base Set singles — Blastoise, Lapras, Starmie and more.",
      storeLogoURL:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/134.png",
      storeBannerURL: "https://images.pokemontcg.io/base1/2_hires.png",
      storeReturnPolicy: "7-day returns on all NM cards.",
      storeShippingPolicy: "Ships in top-loaders with tracking.",
      storeCategory: "pokemon-cards",
      location: "Cerulean City",
      socialLinks: { instagram: "mistys_water_gym" },
    },
    stats: { totalOrders: 0, auctionsWon: 0, itemsSold: 45, reviewsCount: 12 },
    metadata: {
      lastSignInTime: daysAgo(2),
      creationTime: daysAgo(180).toISOString(),
      loginCount: 88,
    },
  },

  // Surge's Electric Emporium — Electric type seller
  {
    uid: "user-lt-surge-electric-surge",
    email: "surge@letitrip.in",
    phoneNumber: `${_phonePrefix}9000000002`,
    phoneVerified: true,
    displayName: "Lt. Surge (Electric Gym)",
    photoURL:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/26.png",
    avatarMetadata: null,
    role: "seller",
    emailVerified: true,
    disabled: false,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(3),
    storeId: "store-surges-electric-emporium",
    storeSlug: "surges-electric-emporium",
    storeStatus: "approved",
    publicProfile: {
      isPublic: true,
      showEmail: true,
      showPhone: false,
      showOrders: false,
      showWishlist: true,
      bio: "Vermilion City Gym Leader. Shock and awe — the best Electric-type cards at the best prices.",
      storeName: "Surge's Electric Emporium",
      storeDescription:
        "Pikachu, Raichu, Zapdos and all Base Set Electric singles.",
      storeLogoURL:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/26.png",
      storeBannerURL: "https://images.pokemontcg.io/base1/16_hires.png",
      storeReturnPolicy: "No returns on heavily played cards.",
      storeShippingPolicy: "Flat-rate ₹60 shipping, free over ₹2,000.",
      storeCategory: "pokemon-cards",
      location: "Vermilion City",
    },
    stats: { totalOrders: 0, auctionsWon: 0, itemsSold: 70, reviewsCount: 22 },
    metadata: {
      lastSignInTime: daysAgo(3),
      creationTime: daysAgo(200).toISOString(),
      loginCount: 120,
    },
  },

  // Blaine's Fire Shoppe — Fire type seller
  {
    uid: "user-blaine-fire-gym-blaine",
    email: "blaine@letitrip.in",
    phoneNumber: `${_phonePrefix}9000000003`,
    phoneVerified: true,
    displayName: "Blaine (Cinnabar Gym)",
    photoURL:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png",
    avatarMetadata: null,
    role: "seller",
    emailVerified: true,
    disabled: false,
    createdAt: daysAgo(220),
    updatedAt: daysAgo(1),
    storeId: "store-blaines-fire-shoppe",
    storeSlug: "blaines-fire-shoppe",
    storeStatus: "approved",
    publicProfile: {
      isPublic: true,
      showEmail: true,
      showPhone: false,
      showOrders: false,
      showWishlist: true,
      bio: "Cinnabar Island Gym Leader. No one can beat my Fire-type collection.",
      storeName: "Blaine's Fire Shoppe",
      storeDescription:
        "Charizard, Arcanine, Ninetales — the hottest Fire-type Base Set singles.",
      storeLogoURL:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/77.png",
      storeBannerURL: "https://images.pokemontcg.io/base1/4_hires.png",
      storeReturnPolicy: "3-day returns, card must be in original condition.",
      storeShippingPolicy: "All cards shipped in penny sleeves + top-loader.",
      storeCategory: "pokemon-cards",
      location: "Cinnabar Island",
    },
    stats: { totalOrders: 0, auctionsWon: 0, itemsSold: 120, reviewsCount: 40 },
    metadata: {
      lastSignInTime: daysAgo(1),
      creationTime: daysAgo(220).toISOString(),
      loginCount: 200,
    },
  },

  // ── Buyers (classic trainers) ─────────────────────────────────────────────

  {
    uid: "user-ash-ketchum-pallet-ash",
    email: "ash@pallet.town",
    phoneNumber: `${_phonePrefix}9111111111`,
    phoneVerified: false,
    displayName: "Ash Ketchum",
    photoURL:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
    avatarMetadata: null,
    role: "user",
    emailVerified: true,
    disabled: false,
    createdAt: daysAgo(100),
    updatedAt: daysAgo(5),
    publicProfile: {
      isPublic: true,
      showEmail: false,
      showPhone: false,
      showOrders: true,
      showWishlist: true,
      bio: "Pokémon trainer from Pallet Town. Gotta collect 'em all!",
      location: "Pallet Town",
    },
    stats: {
      totalOrders: 14,
      auctionsWon: 2,
      itemsSold: 0,
      reviewsCount: 8,
      rating: 4.9,
    },
    metadata: {
      lastSignInTime: daysAgo(5),
      creationTime: daysAgo(100).toISOString(),
      loginCount: 55,
    },
  },

  {
    uid: "user-gary-oak-pallet-gary",
    email: "gary@pallet.town",
    phoneNumber: `${_phonePrefix}9222222222`,
    phoneVerified: true,
    displayName: "Gary Oak",
    photoURL:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png",
    avatarMetadata: null,
    role: "user",
    emailVerified: true,
    disabled: false,
    createdAt: daysAgo(110),
    updatedAt: daysAgo(7),
    publicProfile: {
      isPublic: true,
      showEmail: false,
      showPhone: false,
      showOrders: true,
      showWishlist: false,
      bio: "My collection is better than yours.",
      location: "Pallet Town",
    },
    stats: {
      totalOrders: 30,
      auctionsWon: 5,
      itemsSold: 0,
      reviewsCount: 12,
      rating: 4.7,
    },
    metadata: {
      lastSignInTime: daysAgo(7),
      creationTime: daysAgo(110).toISOString(),
      loginCount: 80,
    },
  },

  {
    uid: "user-brock-pewter-brock",
    email: "brock@pewter.gym",
    phoneNumber: `${_phonePrefix}9333333333`,
    phoneVerified: true,
    displayName: "Brock",
    photoURL:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/74.png",
    avatarMetadata: null,
    role: "user",
    emailVerified: true,
    disabled: false,
    createdAt: daysAgo(90),
    updatedAt: daysAgo(10),
    publicProfile: {
      isPublic: true,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: true,
      bio: "Pewter City Gym Leader and rock-solid collector.",
      location: "Pewter City",
    },
    stats: { totalOrders: 8, auctionsWon: 1, itemsSold: 0, reviewsCount: 5 },
    metadata: {
      lastSignInTime: daysAgo(10),
      creationTime: daysAgo(90).toISOString(),
      loginCount: 30,
    },
  },

  {
    uid: "user-prof-oak-pallet-oak",
    email: "oak@pallettown.lab",
    phoneNumber: `${_phonePrefix}9444444444`,
    phoneVerified: true,
    displayName: "Professor Oak",
    photoURL:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/143.png",
    avatarMetadata: null,
    role: "user",
    emailVerified: true,
    disabled: false,
    createdAt: daysAgo(300),
    updatedAt: daysAgo(20),
    publicProfile: {
      isPublic: true,
      showEmail: true,
      showPhone: false,
      showOrders: false,
      showWishlist: true,
      bio: "Pokémon researcher. Looking for rare Base Set specimens for my Pokédex.",
      location: "Pallet Town",
    },
    stats: {
      totalOrders: 50,
      auctionsWon: 10,
      itemsSold: 0,
      reviewsCount: 30,
      rating: 5.0,
    },
    metadata: {
      lastSignInTime: daysAgo(20),
      creationTime: daysAgo(300).toISOString(),
      loginCount: 300,
    },
  },

  {
    uid: "user-sabrina-saffron-sabrina",
    email: "sabrina@saffron.gym",
    phoneNumber: `${_phonePrefix}9555555555`,
    phoneVerified: true,
    displayName: "Sabrina",
    photoURL:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/65.png",
    avatarMetadata: null,
    role: "user",
    emailVerified: true,
    disabled: false,
    createdAt: daysAgo(140),
    updatedAt: daysAgo(15),
    publicProfile: {
      isPublic: true,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: true,
      bio: "Psychic-type enthusiast from Saffron City. I only collect Psychic cards.",
      location: "Saffron City",
    },
    stats: { totalOrders: 20, auctionsWon: 3, itemsSold: 0, reviewsCount: 9 },
    metadata: {
      lastSignInTime: daysAgo(15),
      creationTime: daysAgo(140).toISOString(),
      loginCount: 60,
    },
  },

  {
    uid: "user-erika-celadon-erika",
    email: "erika@celadon.gym",
    phoneNumber: `${_phonePrefix}9666666666`,
    phoneVerified: false,
    displayName: "Erika",
    photoURL:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/45.png",
    avatarMetadata: null,
    role: "user",
    emailVerified: true,
    disabled: false,
    createdAt: daysAgo(70),
    updatedAt: daysAgo(3),
    publicProfile: {
      isPublic: true,
      showEmail: false,
      showPhone: false,
      showOrders: true,
      showWishlist: true,
      bio: "Celadon City Gym Leader. Passionate about Grass-type cards.",
      location: "Celadon City",
    },
    stats: { totalOrders: 6, auctionsWon: 0, itemsSold: 0, reviewsCount: 3 },
    metadata: {
      lastSignInTime: daysAgo(3),
      creationTime: daysAgo(70).toISOString(),
      loginCount: 25,
    },
  },

  // ── Moderator ─────────────────────────────────────────────────────────────
  {
    uid: "user-moderator-mod-user",
    email: "mod@letitrip.in",
    phoneNumber: `${_phonePrefix}9800000001`,
    phoneVerified: true,
    displayName: "Moderator",
    photoURL: null,
    avatarMetadata: null,
    role: "moderator",
    emailVerified: true,
    disabled: false,
    createdAt: daysAgo(300),
    updatedAt: daysAgo(5),
    publicProfile: {
      isPublic: false,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: false,
      bio: "Keeping the marketplace fair for all trainers.",
    },
    stats: { totalOrders: 0, auctionsWon: 0, itemsSold: 0, reviewsCount: 0 },
    metadata: {
      lastSignInTime: daysAgo(5),
      creationTime: daysAgo(300).toISOString(),
      loginCount: 90,
    },
  },

  // ── Edge-case users ───────────────────────────────────────────────────────
  {
    uid: "user-unverified-new-user",
    email: "newtrainer@example.com",
    phoneNumber: null,
    phoneVerified: false,
    displayName: "New Trainer",
    photoURL: null,
    avatarMetadata: null,
    role: "user",
    emailVerified: false,
    disabled: false,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    publicProfile: {
      isPublic: false,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: false,
    },
    stats: { totalOrders: 0, auctionsWon: 0, itemsSold: 0, reviewsCount: 0 },
    metadata: {
      lastSignInTime: daysAgo(1),
      creationTime: daysAgo(1).toISOString(),
      loginCount: 1,
    },
  },
  {
    uid: "user-pending-seller-pendingsl",
    email: "pendingseller@example.com",
    phoneNumber: `${_phonePrefix}9700000002`,
    phoneVerified: true,
    displayName: "Pending Seller",
    photoURL: null,
    avatarMetadata: null,
    role: "seller",
    emailVerified: true,
    disabled: false,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
    storeId: "store-pending-trainer-shop",
    storeSlug: "pending-trainer-shop",
    storeStatus: "pending",
    publicProfile: {
      isPublic: false,
      showEmail: false,
      showPhone: false,
      showOrders: false,
      showWishlist: false,
      storeName: "Pending Trainer Shop",
    },
    stats: { totalOrders: 0, auctionsWon: 0, itemsSold: 0, reviewsCount: 0 },
    metadata: {
      lastSignInTime: daysAgo(1),
      creationTime: daysAgo(3).toISOString(),
      loginCount: 2,
    },
  },
];
