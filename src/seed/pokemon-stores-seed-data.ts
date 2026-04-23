/**
 * Pokemon Base Set 151 - Stores Seed Data
 *
 * Store documents aligned with pokemonUsersSeedData seller identities.
 */

import type { StoreDocument } from "../features/stores/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const pokemonStoresSeedData: Partial<StoreDocument>[] = [
  {
    id: "store-mistys-water-cards",
    storeSlug: "store-mistys-water-cards",
    ownerId: "user-misty-water-gym-misty",
    storeName: "Misty's Water Cards",
    storeDescription:
      "Cerulean City specialty store for Water-type Base Set singles and graded collectibles.",
    storeCategory: "pokemon-cards",
    storeLogoURL: "https://images.pokemontcg.io/base1/2_hires.png",
    storeBannerURL: "https://images.pokemontcg.io/base1/14_hires.png",
    status: "active",
    bio: "Water-type specialist - Blastoise, Lapras, Starmie and more.",
    location: "Cerulean City",
    isPublic: true,
    isVacationMode: false,
    stats: {
      totalProducts: 34,
      itemsSold: 45,
      totalReviews: 12,
      averageRating: 4.8,
    },
    createdAt: daysAgo(180),
    updatedAt: daysAgo(2),
  },
  {
    id: "store-surges-electric-emporium",
    storeSlug: "store-surges-electric-emporium",
    ownerId: "user-lt-surge-electric-surge",
    storeName: "Surge's Electric Emporium",
    storeDescription:
      "Vermilion City's Electric-type marketplace for Pikachu, Raichu and Zapdos collectors.",
    storeCategory: "pokemon-cards",
    storeLogoURL: "https://images.pokemontcg.io/base1/58_hires.png",
    storeBannerURL: "https://images.pokemontcg.io/base1/16_hires.png",
    status: "active",
    bio: "Electric lineup deals - from commons to holo rares.",
    location: "Vermilion City",
    isPublic: true,
    isVacationMode: false,
    stats: {
      totalProducts: 33,
      itemsSold: 70,
      totalReviews: 22,
      averageRating: 4.7,
    },
    createdAt: daysAgo(200),
    updatedAt: daysAgo(3),
  },
  {
    id: "store-blaines-fire-shoppe",
    storeSlug: "store-blaines-fire-shoppe",
    ownerId: "user-blaine-fire-gym-blaine",
    storeName: "Blaine's Fire Shoppe",
    storeDescription:
      "Cinnabar Island destination for Fire-type Base Set icons led by Charizard.",
    storeCategory: "pokemon-cards",
    storeLogoURL: "https://images.pokemontcg.io/base1/4_hires.png",
    storeBannerURL: "https://images.pokemontcg.io/base1/6_hires.png",
    status: "active",
    bio: "Fire-type premium cards, sealed classics and showcase pieces.",
    location: "Cinnabar Island",
    isPublic: true,
    isVacationMode: false,
    stats: {
      totalProducts: 34,
      itemsSold: 120,
      totalReviews: 40,
      averageRating: 4.9,
    },
    createdAt: daysAgo(220),
    updatedAt: daysAgo(1),
  },
];
