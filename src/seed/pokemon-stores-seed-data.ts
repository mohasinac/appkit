/**
 * Multi-Franchise Collectibles — Stores Seed Data (5 stores)
 * Pokémon TCG · Hot Wheels · Beyblade Burst · Transformers
 */

import type { StoreDocument } from "../features/stores/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const pokemonStoresSeedData: Partial<StoreDocument>[] = [
  // 1. Misty's Water Cards — Pokémon TCG Water-type
  {
    id: "store-mistys-water-cards",
    storeSlug: "mistys-water-cards",
    ownerId: "user-misty-water-gym-misty",
    storeName: "Misty's Water Cards",
    storeDescription:
      "Cerulean City specialty store for Water-type Base Set singles and graded collectibles. Blastoise, Lapras, Starmie, Gyarados — all grades available.",
    storeCategory: "pokemon-cards",
    storeLogoURL: "https://images.pokemontcg.io/base1/2_hires.png",
    storeBannerURL: "https://images.pokemontcg.io/base1/14_hires.png",
    status: "active",
    bio: "Water-type specialist — Blastoise, Lapras, Starmie and more.",
    location: "Cerulean City",
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 40, itemsSold: 45, totalReviews: 12, averageRating: 4.8 },
    createdAt: daysAgo(180),
    updatedAt: daysAgo(2),
  },

  // 2. Surge's Electric Emporium — Pokémon TCG Electric-type
  {
    id: "store-surges-electric-emporium",
    storeSlug: "surges-electric-emporium",
    ownerId: "user-lt-surge-electric-surge",
    storeName: "Surge's Electric Emporium",
    storeDescription:
      "Vermilion City's Electric-type marketplace for Pikachu, Raichu, and Zapdos collectors. Uncommons to Holo Rares, all conditions available.",
    storeCategory: "pokemon-cards",
    storeLogoURL: "https://images.pokemontcg.io/base1/58_hires.png",
    storeBannerURL: "https://images.pokemontcg.io/base1/16_hires.png",
    status: "active",
    bio: "Electric lineup deals — from commons to holo rares.",
    location: "Vermilion City",
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 38, itemsSold: 70, totalReviews: 22, averageRating: 4.7 },
    createdAt: daysAgo(200),
    updatedAt: daysAgo(3),
  },

  // 3. Blaine's Fire Shoppe — Pokémon TCG Fire-type
  {
    id: "store-blaines-fire-shoppe",
    storeSlug: "blaines-fire-shoppe",
    ownerId: "user-blaine-fire-gym-blaine",
    storeName: "Blaine's Fire Shoppe",
    storeDescription:
      "Cinnabar Island's premier Fire-type card shop. Charizard, Arcanine, Ninetales, and Moltres in all conditions. Graded slabs available on request.",
    storeCategory: "pokemon-cards",
    storeLogoURL: "https://images.pokemontcg.io/base1/4_hires.png",
    storeBannerURL: "https://images.pokemontcg.io/base1/12_hires.png",
    status: "active",
    bio: "Fire-type specialist — Charizard, Ninetales, Moltres and Arcanine.",
    location: "Cinnabar Island",
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 42, itemsSold: 38, totalReviews: 15, averageRating: 4.9 },
    createdAt: daysAgo(220),
    updatedAt: daysAgo(1),
  },

  // 4. Speed King Diecast — Hot Wheels + Transformers
  {
    id: "store-speed-king-diecast",
    storeSlug: "speed-king-diecast",
    ownerId: "user-speed-king-diecast",
    storeName: "Speed King Diecast",
    storeDescription:
      "India's largest Hot Wheels collector store. Basic mainline cars, premium Car Culture, Treasure Hunt and Super Treasure Hunt, track sets, and Transformers Studio Series figures. Worldwide shipping available.",
    storeCategory: "hot-wheels",
    storeLogoURL: "https://picsum.photos/seed/speedking-logo/200/200",
    storeBannerURL: "https://picsum.photos/seed/speedking-banner/1200/400",
    status: "active",
    bio: "Treasure Hunts · Car Culture · Premium · Track Sets · Transformers",
    location: "Mumbai, India",
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 68, itemsSold: 215, totalReviews: 67, averageRating: 4.6 },
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1),
  },

  // 5. Bladers Paradise — Beyblade Burst + some Transformers
  {
    id: "store-bladers-paradise",
    storeSlug: "bladers-paradise",
    ownerId: "user-bladers-paradise",
    storeName: "Bladers Paradise",
    storeDescription:
      "Your one-stop shop for Beyblade Burst tops, stadiums, launchers, and accessories. All Burst series — Classic, Turbo, GT, Superking, QuadDrive, and MCC. Let it rip!",
    storeCategory: "beyblade-burst",
    storeLogoURL: "https://picsum.photos/seed/bladers-logo/200/200",
    storeBannerURL: "https://picsum.photos/seed/bladers-banner/1200/400",
    status: "active",
    bio: "Attack · Defense · Stamina · Balance · Stadiums · Launchers",
    location: "Bangalore, India",
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 52, itemsSold: 143, totalReviews: 48, averageRating: 4.5 },
    createdAt: daysAgo(120),
    updatedAt: daysAgo(2),
  },
];
