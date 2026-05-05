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
    id: "mistys-water-cards",
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
    id: "surges-electric-emporium",
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
    id: "blaines-fire-shoppe",
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
    id: "speed-king-diecast",
    storeSlug: "speed-king-diecast",
    ownerId: "user-speed-king-diecast",
    storeName: "Speed King Diecast",
    storeDescription:
      "India's largest Hot Wheels collector store. Basic mainline cars, premium Car Culture, Treasure Hunt and Super Treasure Hunt, track sets, and Transformers Studio Series figures. Worldwide shipping available.",
    storeCategory: "hot-wheels",
    storeLogoURL: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Hot_Wheels_Modellauto.jpg",
    storeBannerURL: "https://upload.wikimedia.org/wikipedia/commons/b/b7/Mycars.JPG",
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
    id: "bladers-paradise",
    storeSlug: "bladers-paradise",
    ownerId: "user-bladers-paradise",
    storeName: "Bladers Paradise",
    storeDescription:
      "Your one-stop shop for Beyblade Burst tops, stadiums, launchers, and accessories. All Burst series — Classic, Turbo, GT, Superking, QuadDrive, and MCC. Let it rip!",
    storeCategory: "beyblade-burst",
    storeLogoURL: "https://upload.wikimedia.org/wikipedia/commons/e/e9/Beyblade.jpg",
    storeBannerURL: "https://cdn11.bigcommerce.com/s-0kvv9/products/383353/images/591091/bbbqdcosmicvectorbatset__42004.1712908213.500.750.jpg",
    status: "active",
    bio: "Attack · Defense · Stamina · Balance · Stadiums · Launchers",
    location: "Bangalore, India",
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 52, itemsSold: 143, totalReviews: 48, averageRating: 4.5 },
    createdAt: daysAgo(120),
    updatedAt: daysAgo(2),
  },

  // 6. Anime Vault India — Anime Figures (DBZ, Naruto, One Piece, MHA)
  {
    id: "store-anime-vault-india",
    storeSlug: "anime-vault-india",
    ownerId: "user-anime-vault-owner",
    storeName: "Anime Vault India",
    storeDescription:
      "India's premier destination for authentic anime figures — S.H.Figuarts, DXF, Ichibansho, and rare vintage collectibles from Dragon Ball Z, Naruto, One Piece, and My Hero Academia. Every figure authenticated.",
    storeCategory: "anime-figures",
    storeLogoURL: "https://upload.wikimedia.org/wikipedia/commons/7/7f/DFC_4147_Colorful_anime_figurines_on_display_at_a_bustling_convention_table_each_character_full_of_personality_and_detail.jpg",
    storeBannerURL: "https://upload.wikimedia.org/wikipedia/commons/7/7f/DFC_4147_Colorful_anime_figurines_on_display_at_a_bustling_convention_table_each_character_full_of_personality_and_detail.jpg",
    status: "active",
    bio: "Dragon Ball Z · Naruto · One Piece · My Hero Academia — all fandoms covered.",
    location: "Mumbai, India",
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 60, itemsSold: 182, totalReviews: 74, averageRating: 4.8 },
    createdAt: daysAgo(100),
    updatedAt: daysAgo(1),
  },

  // 7. Retro Vault India — Vintage Gaming & Classic Diecast
  {
    id: "store-retro-vault-india",
    storeSlug: "retro-vault-india",
    ownerId: "user-retro-vault-owner",
    storeName: "Retro Vault India",
    storeDescription:
      "Curated vintage gaming and classic diecast — original Nintendo, SEGA consoles, Corgi, Matchbox, Dinky, and Schuco from their golden eras. Every item authenticity-checked and condition-graded before listing.",
    storeCategory: "vintage-collectibles",
    storeLogoURL: "https://upload.wikimedia.org/wikipedia/commons/3/31/Pyrkon_2022_Pokemon_Trading_Card_Game.jpg",
    storeBannerURL: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Hot_Wheels_Modellauto.jpg",
    status: "active",
    bio: "Nintendo · SEGA · Corgi · Matchbox · Dinky — all from the golden age.",
    location: "Delhi, India",
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 35, itemsSold: 94, totalReviews: 38, averageRating: 4.7 },
    createdAt: daysAgo(150),
    updatedAt: daysAgo(2),
  },

  // 8. CosPlay India Hub — Cosplay Props & TCG Accessories
  {
    id: "store-cosplay-india-hub",
    storeSlug: "cosplay-india-hub",
    ownerId: "user-cosplay-india-owner",
    storeName: "CosPlay India Hub",
    storeDescription:
      "Convention-ready cosplay props, TCG card accessories, and premium collector display solutions. Anime headbands, replica weapons, card sleeves, toploaders, display cases, and enamel pins — everything the modern collector needs.",
    storeCategory: "cosplay-accessories",
    storeLogoURL: "https://upload.wikimedia.org/wikipedia/commons/7/7f/DFC_4147_Colorful_anime_figurines_on_display_at_a_bustling_convention_table_each_character_full_of_personality_and_detail.jpg",
    storeBannerURL: "https://upload.wikimedia.org/wikipedia/commons/7/7f/DFC_4147_Colorful_anime_figurines_on_display_at_a_bustling_convention_table_each_character_full_of_personality_and_detail.jpg",
    status: "active",
    bio: "Props · Card Accessories · Display Solutions · Enamel Pins",
    location: "Hyderabad, India",
    isPublic: true,
    isVacationMode: false,
    stats: { totalProducts: 45, itemsSold: 341, totalReviews: 112, averageRating: 4.7 },
    createdAt: daysAgo(80),
    updatedAt: daysAgo(1),
  },
];
