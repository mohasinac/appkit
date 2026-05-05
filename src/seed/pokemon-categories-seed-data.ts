/**
 * Multi-Franchise Collectibles â€” Categories Seed Data (35 categories)
 *
 * Franchises: PokÃ©mon TCG Â· Hot Wheels Â· Beyblade Burst Â· Transformers
 *
 * Hierarchy:
 *   PokÃ©mon Cards (root)         â€” tier 0
 *     Card Type                  â€” tier 1
 *       PokÃ©mon / Trainer / Energy â€” tier 2 leaf
 *     Element Type               â€” tier 1
 *       Water / Electric / Fire / Grass / Psychic / Fighting / Colorless â€” leaf
 *     Rarity                     â€” tier 1
 *       Holo Rare / Non-Holo / Uncommon / Common â€” leaf
 *   Hot Wheels (root)            â€” tier 0
 *     Basic Cars / Premium / Treasure Hunt / Track Sets â€” tier 1 leaf
 *   Beyblade Burst (root)        â€” tier 0
 *     Attack / Defense / Stamina / Balance / Stadium â€” tier 1 leaf
 *   Transformers (root)          â€” tier 0
 *     Autobots / Decepticons / Combiners â€” tier 1 leaf
 *   Sealed Products (root leaf)
 *   Accessories (root leaf)
 */

import type { CategoryDocument } from "../features/categories/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const ADMIN = "user-admin-user-admin";

function mkCat(partial: Partial<CategoryDocument>): Partial<CategoryDocument> {
  return {
    isActive: true,
    isSearchable: true,
    isFeatured: false,
    isBrand: false,
    showOnHomepage: false,
    createdBy: ADMIN,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
    ...partial,
  };
}

export const pokemonCategoriesSeedData: Partial<CategoryDocument>[] = [

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // POKÃ‰MON TCG
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  mkCat({
    id: "category-pokemon-cards",
    name: "PokÃ©mon Cards",
    slug: "category-pokemon-cards",
    description: "Original PokÃ©mon Base Set 151 cards â€” singles, lots, graded, and sealed",
    rootId: "category-pokemon-cards",
    parentIds: [],
    childrenIds: [
      "category-card-type-pokemon-cards",
      "category-element-type-pokemon-cards",
      "category-rarity-pokemon-cards",
    ],
    tier: 0,
    path: "pokemon-cards",
    order: 1,
    isLeaf: false,
    isFeatured: true,
    featuredPriority: 1,
    showOnHomepage: true,
    metrics: {
      productCount: 0, productIds: [], auctionCount: 0, auctionIds: [],
      totalProductCount: 80, totalAuctionCount: 6, totalItemCount: 86, lastUpdated: daysAgo(1),
    },
    seo: {
      title: "PokÃ©mon Cards â€” Base Set 151 | LetItRip",
      description: "Buy and sell original PokÃ©mon Base Set 151 singles, holos, and sealed packs.",
      keywords: ["pokemon cards", "base set", "151", "charizard", "pikachu"],
    },
    display: { showInFooter: true, icon: "ðŸƒ", coverImage: "https://images.pokemontcg.io/base1/logo.png", color: "#FFCB05", showInMenu: true },
    ancestors: [],
  }),

  mkCat({
    id: "category-card-type-pokemon-cards",
    name: "Card Type",
    slug: "category-card-type-pokemon-cards",
    description: "Filter by PokÃ©mon, Trainer, or Energy card",
    rootId: "category-pokemon-cards",
    parentIds: ["category-pokemon-cards"],
    childrenIds: ["category-pokemon-type-card-type", "category-trainer-type-card-type", "category-energy-type-card-type"],
    tier: 1, path: "pokemon-cards/card-type", order: 1, isLeaf: false,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 45, totalAuctionCount: 4, totalItemCount: 49, lastUpdated: daysAgo(1) },
    seo: { title: "Card Type â€” PokÃ©mon TCG", description: "Shop by card type.", keywords: ["pokemon card type"] },
    display: { showInFooter: false, icon: "ðŸŽ´", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }],
  }),

  mkCat({
    id: "category-pokemon-type-card-type",
    name: "PokÃ©mon Cards",
    slug: "category-pokemon-type-card-type",
    description: "Individual creature cards â€” the core of the Base Set",
    rootId: "category-pokemon-cards",
    parentIds: ["category-card-type-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/card-type/pokemon-type", order: 1, isLeaf: true,
    isFeatured: true, featuredPriority: 2, showOnHomepage: true,
    metrics: { productCount: 35, productIds: [], auctionCount: 4, auctionIds: [], totalProductCount: 35, totalAuctionCount: 4, totalItemCount: 39, lastUpdated: daysAgo(1) },
    seo: { title: "PokÃ©mon Cards â€” Base Set Singles", description: "Shop all Base Set creature singles.", keywords: ["pokemon singles", "charizard", "blastoise"] },
    display: { showInFooter: false, icon: "âš¡", coverImage: "https://images.pokemontcg.io/base1/4_hires.png", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-card-type-pokemon-cards", name: "Card Type", tier: 1 }],
  }),

  mkCat({
    id: "category-trainer-type-card-type",
    name: "Trainer Cards",
    slug: "category-trainer-type-card-type",
    description: "Supporter, Item, and Stadium trainer cards from Base Set",
    rootId: "category-pokemon-cards",
    parentIds: ["category-card-type-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/card-type/trainer-type", order: 2, isLeaf: true,
    metrics: { productCount: 8, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 8, totalAuctionCount: 0, totalItemCount: 8, lastUpdated: daysAgo(1) },
    seo: { title: "Trainer Cards â€” PokÃ©mon Base Set", description: "Professor Oak, Bill, Energy Removal and more.", keywords: ["trainer cards", "professor oak", "item cards"] },
    display: { showInFooter: false, icon: "ðŸ§‘â€ðŸ«", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-card-type-pokemon-cards", name: "Card Type", tier: 1 }],
  }),

  mkCat({
    id: "category-energy-type-card-type",
    name: "Energy Cards",
    slug: "category-energy-type-card-type",
    description: "Basic and Special Energy cards to power your PokÃ©mon",
    rootId: "category-pokemon-cards",
    parentIds: ["category-card-type-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/card-type/energy-type", order: 3, isLeaf: true,
    metrics: { productCount: 5, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 5, totalAuctionCount: 0, totalItemCount: 5, lastUpdated: daysAgo(1) },
    seo: { title: "Energy Cards â€” PokÃ©mon Base Set", description: "Basic Energy sets from the original print runs.", keywords: ["energy cards", "fire energy", "water energy"] },
    display: { showInFooter: false, icon: "âšª", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-card-type-pokemon-cards", name: "Card Type", tier: 1 }],
  }),

  mkCat({
    id: "category-element-type-pokemon-cards",
    name: "Element Type",
    slug: "category-element-type-pokemon-cards",
    description: "Shop by PokÃ©mon energy type",
    rootId: "category-pokemon-cards",
    parentIds: ["category-pokemon-cards"],
    childrenIds: ["category-water-element", "category-electric-element", "category-fire-element", "category-grass-element", "category-psychic-element", "category-fighting-element", "category-colorless-element"],
    tier: 1, path: "pokemon-cards/element-type", order: 2, isLeaf: false,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 35, totalAuctionCount: 4, totalItemCount: 39, lastUpdated: daysAgo(1) },
    seo: { title: "Element Types â€” PokÃ©mon TCG", description: "Water, Fire, Electric, Grass, Psychic, Fighting, and Colorless types.", keywords: ["pokemon elements", "fire type", "water type"] },
    display: { showInFooter: false, icon: "ðŸŒŠ", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }],
  }),

  mkCat({
    id: "category-water-element",
    name: "Water",
    slug: "category-water-element",
    description: "Water-type PokÃ©mon cards â€” Blastoise, Lapras, Starmie, Gyarados",
    rootId: "category-pokemon-cards",
    parentIds: ["category-element-type-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/element-type/water", order: 1, isLeaf: true,
    metrics: { productCount: 6, productIds: [], auctionCount: 1, auctionIds: [], totalProductCount: 6, totalAuctionCount: 1, totalItemCount: 7, lastUpdated: daysAgo(1) },
    seo: { title: "Water-Type PokÃ©mon Cards", description: "Blastoise, Lapras, Starmie and more.", keywords: ["water pokemon", "blastoise"] },
    display: { showInFooter: false, icon: "ðŸ’§", color: "#6DB6D4", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-element-type-pokemon-cards", name: "Element Type", tier: 1 }],
  }),

  mkCat({
    id: "category-electric-element",
    name: "Electric",
    slug: "category-electric-element",
    description: "Electric-type PokÃ©mon cards â€” Pikachu, Raichu, Zapdos, Electabuzz",
    rootId: "category-pokemon-cards",
    parentIds: ["category-element-type-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/element-type/electric", order: 2, isLeaf: true,
    metrics: { productCount: 5, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 5, totalAuctionCount: 0, totalItemCount: 5, lastUpdated: daysAgo(1) },
    seo: { title: "Electric-Type PokÃ©mon Cards", description: "Pikachu, Zapdos, Raichu and more.", keywords: ["electric pokemon", "pikachu", "zapdos"] },
    display: { showInFooter: false, icon: "âš¡", color: "#F7D02C", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-element-type-pokemon-cards", name: "Element Type", tier: 1 }],
  }),

  mkCat({
    id: "category-fire-element",
    name: "Fire",
    slug: "category-fire-element",
    description: "Fire-type PokÃ©mon cards â€” Charizard, Arcanine, Ninetales, Moltres",
    rootId: "category-pokemon-cards",
    parentIds: ["category-element-type-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/element-type/fire", order: 3, isLeaf: true,
    isFeatured: true, featuredPriority: 3, showOnHomepage: true,
    metrics: { productCount: 6, productIds: [], auctionCount: 2, auctionIds: [], totalProductCount: 6, totalAuctionCount: 2, totalItemCount: 8, lastUpdated: daysAgo(1) },
    seo: { title: "Fire-Type PokÃ©mon Cards", description: "Charizard, Arcanine, Ninetales and more.", keywords: ["fire pokemon", "charizard"] },
    display: { showInFooter: false, icon: "ðŸ”¥", color: "#EE8130", coverImage: "https://images.pokemontcg.io/base1/4_hires.png", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-element-type-pokemon-cards", name: "Element Type", tier: 1 }],
  }),

  mkCat({
    id: "category-grass-element",
    name: "Grass",
    slug: "category-grass-element",
    description: "Grass-type PokÃ©mon cards â€” Venusaur, Scyther, Pinsir, Clefairy",
    rootId: "category-pokemon-cards",
    parentIds: ["category-element-type-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/element-type/grass", order: 4, isLeaf: true,
    metrics: { productCount: 4, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 4, totalAuctionCount: 0, totalItemCount: 4, lastUpdated: daysAgo(1) },
    seo: { title: "Grass-Type PokÃ©mon Cards", description: "Venusaur, Scyther, Pinsir and more.", keywords: ["grass pokemon", "venusaur"] },
    display: { showInFooter: false, icon: "ðŸŒ¿", color: "#7AC74C", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-element-type-pokemon-cards", name: "Element Type", tier: 1 }],
  }),

  mkCat({
    id: "category-psychic-element",
    name: "Psychic",
    slug: "category-psychic-element",
    description: "Psychic-type PokÃ©mon cards â€” Mewtwo, Gengar, Jynx, Alakazam",
    rootId: "category-pokemon-cards",
    parentIds: ["category-element-type-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/element-type/psychic", order: 5, isLeaf: true,
    isFeatured: true, featuredPriority: 4,
    metrics: { productCount: 5, productIds: [], auctionCount: 1, auctionIds: [], totalProductCount: 5, totalAuctionCount: 1, totalItemCount: 6, lastUpdated: daysAgo(1) },
    seo: { title: "Psychic-Type PokÃ©mon Cards", description: "Mewtwo, Gengar, Alakazam and more.", keywords: ["psychic pokemon", "mewtwo", "gengar"] },
    display: { showInFooter: false, icon: "ðŸ”®", color: "#F95587", coverImage: "https://images.pokemontcg.io/base1/10_hires.png", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-element-type-pokemon-cards", name: "Element Type", tier: 1 }],
  }),

  mkCat({
    id: "category-fighting-element",
    name: "Fighting",
    slug: "category-fighting-element",
    description: "Fighting-type PokÃ©mon cards â€” Machamp, Hitmonchan, Primeape, Onix",
    rootId: "category-pokemon-cards",
    parentIds: ["category-element-type-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/element-type/fighting", order: 6, isLeaf: true,
    metrics: { productCount: 3, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 3, totalAuctionCount: 0, totalItemCount: 3, lastUpdated: daysAgo(1) },
    seo: { title: "Fighting-Type PokÃ©mon Cards", description: "Machamp, Hitmonchan and more.", keywords: ["fighting pokemon", "machamp"] },
    display: { showInFooter: false, icon: "ðŸ¥Š", color: "#C22E28", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-element-type-pokemon-cards", name: "Element Type", tier: 1 }],
  }),

  mkCat({
    id: "category-colorless-element",
    name: "Colorless",
    slug: "category-colorless-element",
    description: "Colorless-type PokÃ©mon cards â€” Chansey, Snorlax, Dragonite, Kangaskhan",
    rootId: "category-pokemon-cards",
    parentIds: ["category-element-type-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/element-type/colorless", order: 7, isLeaf: true,
    metrics: { productCount: 4, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 4, totalAuctionCount: 0, totalItemCount: 4, lastUpdated: daysAgo(1) },
    seo: { title: "Colorless-Type PokÃ©mon Cards", description: "Chansey, Snorlax, Dragonite and more.", keywords: ["colorless pokemon", "chansey", "snorlax"] },
    display: { showInFooter: false, icon: "âšª", color: "#A8A77A", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-element-type-pokemon-cards", name: "Element Type", tier: 1 }],
  }),

  mkCat({
    id: "category-rarity-pokemon-cards",
    name: "Rarity",
    slug: "category-rarity-pokemon-cards",
    description: "Shop by card rarity level",
    rootId: "category-pokemon-cards",
    parentIds: ["category-pokemon-cards"],
    childrenIds: ["category-holo-rare-rarity", "category-non-holo-rare-rarity", "category-uncommon-rarity", "category-common-rarity"],
    tier: 1, path: "pokemon-cards/rarity", order: 3, isLeaf: false,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 35, totalAuctionCount: 4, totalItemCount: 39, lastUpdated: daysAgo(1) },
    seo: { title: "Rarity â€” PokÃ©mon TCG", description: "Browse Holo Rare, Uncommon, and Common PokÃ©mon cards.", keywords: ["pokemon rarity", "holo rare", "uncommon"] },
    display: { showInFooter: false, icon: "â­", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }],
  }),

  mkCat({
    id: "category-holo-rare-rarity",
    name: "Holo Rare",
    slug: "category-holo-rare-rarity",
    description: "Holographic Rare cards â€” the crown jewels of any Base Set collection",
    rootId: "category-pokemon-cards",
    parentIds: ["category-rarity-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/rarity/holo-rare", order: 1, isLeaf: true,
    isFeatured: true, featuredPriority: 1, showOnHomepage: true,
    metrics: { productCount: 16, productIds: [], auctionCount: 4, auctionIds: [], totalProductCount: 16, totalAuctionCount: 4, totalItemCount: 20, lastUpdated: daysAgo(1) },
    seo: { title: "Holo Rare PokÃ©mon Cards â€” Base Set", description: "All 16 Holo Rares from the original PokÃ©mon Base Set.", keywords: ["holo rare", "holographic", "charizard", "mewtwo"] },
    display: { showInFooter: true, icon: "âœ¨", coverImage: "https://images.pokemontcg.io/base1/4_hires.png", color: "#B8860B", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-rarity-pokemon-cards", name: "Rarity", tier: 1 }],
  }),

  mkCat({
    id: "category-non-holo-rare-rarity",
    name: "Non-Holo Rare",
    slug: "category-non-holo-rare-rarity",
    description: "Rare cards without holo foiling â€” often overlooked, great value",
    rootId: "category-pokemon-cards",
    parentIds: ["category-rarity-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/rarity/non-holo-rare", order: 2, isLeaf: true,
    metrics: { productCount: 10, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 10, totalAuctionCount: 0, totalItemCount: 10, lastUpdated: daysAgo(1) },
    seo: { title: "Non-Holo Rare PokÃ©mon Cards", description: "Rare cards without holo foil from Base Set.", keywords: ["non holo rare", "rare pokemon cards"] },
    display: { showInFooter: false, icon: "ðŸŒŸ", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-rarity-pokemon-cards", name: "Rarity", tier: 1 }],
  }),

  mkCat({
    id: "category-uncommon-rarity",
    name: "Uncommon",
    slug: "category-uncommon-rarity",
    description: "Uncommon cards â€” playable staples at accessible prices",
    rootId: "category-pokemon-cards",
    parentIds: ["category-rarity-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/rarity/uncommon", order: 3, isLeaf: true,
    metrics: { productCount: 6, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 6, totalAuctionCount: 0, totalItemCount: 6, lastUpdated: daysAgo(1) },
    seo: { title: "Uncommon PokÃ©mon Cards â€” Base Set", description: "Budget-friendly uncommon singles from the original print run.", keywords: ["uncommon pokemon cards", "base set uncommon"] },
    display: { showInFooter: false, icon: "ðŸ’Ž", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-rarity-pokemon-cards", name: "Rarity", tier: 1 }],
  }),

  mkCat({
    id: "category-common-rarity",
    name: "Common",
    slug: "category-common-rarity",
    description: "Common cards â€” great for play sets and completing your collection",
    rootId: "category-pokemon-cards",
    parentIds: ["category-rarity-pokemon-cards"],
    childrenIds: [], tier: 2, path: "pokemon-cards/rarity/common", order: 4, isLeaf: true,
    metrics: { productCount: 6, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 6, totalAuctionCount: 0, totalItemCount: 6, lastUpdated: daysAgo(1) },
    seo: { title: "Common PokÃ©mon Cards â€” Base Set", description: "Affordable common singles from the original Base Set.", keywords: ["common pokemon cards", "base set common"] },
    display: { showInFooter: false, icon: "ðŸƒ", showInMenu: true },
    ancestors: [{ id: "category-pokemon-cards", name: "PokÃ©mon Cards", tier: 0 }, { id: "category-rarity-pokemon-cards", name: "Rarity", tier: 1 }],
  }),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // HOT WHEELS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  mkCat({
    id: "category-hot-wheels",
    name: "Hot Wheels",
    slug: "category-hot-wheels",
    description: "Die-cast Hot Wheels cars â€” basic, premium, Treasure Hunt, and track sets",
    rootId: "category-hot-wheels",
    parentIds: [],
    childrenIds: ["category-hw-basic-cars", "category-hw-premium", "category-hw-treasure-hunt", "category-hw-track-sets"],
    tier: 0, path: "hot-wheels", order: 2, isLeaf: false,
    isFeatured: true, featuredPriority: 2, showOnHomepage: true,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 35, totalAuctionCount: 3, totalItemCount: 38, lastUpdated: daysAgo(1) },
    seo: { title: "Hot Wheels Die-Cast Cars | LetItRip", description: "Shop Hot Wheels basic, premium, Treasure Hunt, and collector cars.", keywords: ["hot wheels", "die cast", "toy cars", "treasure hunt"] },
    display: { showInFooter: true, icon: "ðŸš—", color: "#e74c3c", coverImage: "https://picsum.photos/seed/hw-root/600/400", showInMenu: true },
    ancestors: [],
  }),

  mkCat({
    id: "category-hw-basic-cars",
    name: "Basic Die-Cast Cars",
    slug: "category-hw-basic-cars",
    description: "Everyday Hot Wheels cars â€” from movie vehicles to original designs",
    rootId: "category-hot-wheels",
    parentIds: ["category-hot-wheels"],
    childrenIds: [], tier: 1, path: "hot-wheels/basic-cars", order: 1, isLeaf: true,
    isFeatured: true, featuredPriority: 5,
    metrics: { productCount: 15, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 15, totalAuctionCount: 0, totalItemCount: 15, lastUpdated: daysAgo(1) },
    seo: { title: "Hot Wheels Basic Cars", description: "Everyday mainline Hot Wheels die-cast cars.", keywords: ["hot wheels basic", "mainline", "die cast cars"] },
    display: { showInFooter: false, icon: "ðŸš™", color: "#e74c3c", showInMenu: true },
    ancestors: [{ id: "category-hot-wheels", name: "Hot Wheels", tier: 0 }],
  }),

  mkCat({
    id: "category-hw-premium",
    name: "Premium Cars",
    slug: "category-hw-premium",
    description: "Hot Wheels premium lines â€” Car Culture, Boulevard, Real Riders with rubber tyres",
    rootId: "category-hot-wheels",
    parentIds: ["category-hot-wheels"],
    childrenIds: [], tier: 1, path: "hot-wheels/premium", order: 2, isLeaf: true,
    isFeatured: true, featuredPriority: 6,
    metrics: { productCount: 10, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 10, totalAuctionCount: 0, totalItemCount: 10, lastUpdated: daysAgo(1) },
    seo: { title: "Hot Wheels Premium Cars â€” Car Culture, Boulevard", description: "Premium Hot Wheels with real rubber tyres and premium packaging.", keywords: ["hot wheels premium", "car culture", "boulevard", "real riders"] },
    display: { showInFooter: false, icon: "ðŸŽï¸", color: "#c0392b", showInMenu: true },
    ancestors: [{ id: "category-hot-wheels", name: "Hot Wheels", tier: 0 }],
  }),

  mkCat({
    id: "category-hw-treasure-hunt",
    name: "Treasure Hunt",
    slug: "category-hw-treasure-hunt",
    description: "Super Treasure Hunt (STH) and regular Treasure Hunt â€” the most sought-after Hot Wheels",
    rootId: "category-hot-wheels",
    parentIds: ["category-hot-wheels"],
    childrenIds: [], tier: 1, path: "hot-wheels/treasure-hunt", order: 3, isLeaf: true,
    isFeatured: true, featuredPriority: 7,
    metrics: { productCount: 5, productIds: [], auctionCount: 3, auctionIds: [], totalProductCount: 5, totalAuctionCount: 3, totalItemCount: 8, lastUpdated: daysAgo(1) },
    seo: { title: "Hot Wheels Treasure Hunt & Super Treasure Hunt", description: "Rare and super-rare Treasure Hunt Hot Wheels cars.", keywords: ["super treasure hunt", "STH", "hot wheels rare"] },
    display: { showInFooter: false, icon: "ðŸ†", color: "#d4ac0d", showInMenu: true },
    ancestors: [{ id: "category-hot-wheels", name: "Hot Wheels", tier: 0 }],
  }),

  mkCat({
    id: "category-hw-track-sets",
    name: "Track Sets & Playsets",
    slug: "category-hw-track-sets",
    description: "Hot Wheels track sets, loop launchers, garages, and city playsets",
    rootId: "category-hot-wheels",
    parentIds: ["category-hot-wheels"],
    childrenIds: [], tier: 1, path: "hot-wheels/track-sets", order: 4, isLeaf: true,
    metrics: { productCount: 5, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 5, totalAuctionCount: 0, totalItemCount: 5, lastUpdated: daysAgo(1) },
    seo: { title: "Hot Wheels Track Sets and Playsets", description: "Loops, launchers, garages, and city sets from Hot Wheels.", keywords: ["hot wheels track", "loop set", "playset", "garage"] },
    display: { showInFooter: false, icon: "ðŸ›¤ï¸", showInMenu: true },
    ancestors: [{ id: "category-hot-wheels", name: "Hot Wheels", tier: 0 }],
  }),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // BEYBLADE BURST
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  mkCat({
    id: "category-beyblade-burst",
    name: "Beyblade Burst",
    slug: "category-beyblade-burst",
    description: "Beyblade Burst spinning tops â€” Attack, Defense, Stamina, and Balance types",
    rootId: "category-beyblade-burst",
    parentIds: [],
    childrenIds: ["category-bb-attack-type", "category-bb-defense-type", "category-bb-stamina-type", "category-bb-balance-type", "category-bb-stadium"],
    tier: 0, path: "beyblade-burst", order: 3, isLeaf: false,
    isFeatured: true, featuredPriority: 3, showOnHomepage: true,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 24, totalAuctionCount: 2, totalItemCount: 26, lastUpdated: daysAgo(1) },
    seo: { title: "Beyblade Burst Tops | LetItRip", description: "Shop Beyblade Burst spinning tops â€” all types and series.", keywords: ["beyblade burst", "spinning top", "beyblade", "valtryek", "spriggan"] },
    display: { showInFooter: true, icon: "ðŸŒ€", color: "#2980b9", coverImage: "https://picsum.photos/seed/bb-root/600/400", showInMenu: true },
    ancestors: [],
  }),

  mkCat({
    id: "category-bb-attack-type",
    name: "Attack Type",
    slug: "category-bb-attack-type",
    description: "Aggressive attack-type Beyblade Burst tops â€” built for raw power and KOs",
    rootId: "category-beyblade-burst",
    parentIds: ["category-beyblade-burst"],
    childrenIds: [], tier: 1, path: "beyblade-burst/attack-type", order: 1, isLeaf: true,
    isFeatured: true, featuredPriority: 8,
    metrics: { productCount: 6, productIds: [], auctionCount: 1, auctionIds: [], totalProductCount: 6, totalAuctionCount: 1, totalItemCount: 7, lastUpdated: daysAgo(1) },
    seo: { title: "Attack Type Beyblades â€” Burst", description: "Valtryek, Spriggan, Achilles and top attack-type Beyblade Burst tops.", keywords: ["attack type beyblade", "valtryek", "achilles"] },
    display: { showInFooter: false, icon: "âš”ï¸", color: "#e74c3c", showInMenu: true },
    ancestors: [{ id: "category-beyblade-burst", name: "Beyblade Burst", tier: 0 }],
  }),

  mkCat({
    id: "category-bb-defense-type",
    name: "Defense Type",
    slug: "category-bb-defense-type",
    description: "Defense-type Beyblade Burst tops â€” wide, heavy layers that resist attacks",
    rootId: "category-beyblade-burst",
    parentIds: ["category-beyblade-burst"],
    childrenIds: [], tier: 1, path: "beyblade-burst/defense-type", order: 2, isLeaf: true,
    metrics: { productCount: 4, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 4, totalAuctionCount: 0, totalItemCount: 4, lastUpdated: daysAgo(1) },
    seo: { title: "Defense Type Beyblades â€” Burst", description: "Garuda, Balkesh, and top defense-type Beyblades.", keywords: ["defense type beyblade", "garuda"] },
    display: { showInFooter: false, icon: "ðŸ›¡ï¸", color: "#2c3e50", showInMenu: true },
    ancestors: [{ id: "category-beyblade-burst", name: "Beyblade Burst", tier: 0 }],
  }),

  mkCat({
    id: "category-bb-stamina-type",
    name: "Stamina Type",
    slug: "category-bb-stamina-type",
    description: "Stamina-type tops â€” long-spinning, outlast opponents in the stadium",
    rootId: "category-beyblade-burst",
    parentIds: ["category-beyblade-burst"],
    childrenIds: [], tier: 1, path: "beyblade-burst/stamina-type", order: 3, isLeaf: true,
    metrics: { productCount: 5, productIds: [], auctionCount: 1, auctionIds: [], totalProductCount: 5, totalAuctionCount: 1, totalItemCount: 6, lastUpdated: daysAgo(1) },
    seo: { title: "Stamina Type Beyblades â€” Burst", description: "Nepstrius, Phoenix, and top stamina-type Beyblades.", keywords: ["stamina type beyblade", "nepstrius", "phoenix"] },
    display: { showInFooter: false, icon: "ðŸŒ€", color: "#27ae60", showInMenu: true },
    ancestors: [{ id: "category-beyblade-burst", name: "Beyblade Burst", tier: 0 }],
  }),

  mkCat({
    id: "category-bb-balance-type",
    name: "Balance Type",
    slug: "category-bb-balance-type",
    description: "Balance-type tops â€” versatile performance across attack, defense, and stamina",
    rootId: "category-beyblade-burst",
    parentIds: ["category-beyblade-burst"],
    childrenIds: [], tier: 1, path: "beyblade-burst/balance-type", order: 4, isLeaf: true,
    metrics: { productCount: 3, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 3, totalAuctionCount: 0, totalItemCount: 3, lastUpdated: daysAgo(1) },
    seo: { title: "Balance Type Beyblades â€” Burst", description: "Genesis Drago, Achilles, Dead Hades â€” all-round balance tops.", keywords: ["balance type beyblade", "genesis drago"] },
    display: { showInFooter: false, icon: "âš–ï¸", color: "#8e44ad", showInMenu: true },
    ancestors: [{ id: "category-beyblade-burst", name: "Beyblade Burst", tier: 0 }],
  }),

  mkCat({
    id: "category-bb-stadium",
    name: "Stadiums & Accessories",
    slug: "category-bb-stadium",
    description: "Beyblade Burst stadiums, launchers, string tops, and customisation parts",
    rootId: "category-beyblade-burst",
    parentIds: ["category-beyblade-burst"],
    childrenIds: [], tier: 1, path: "beyblade-burst/stadium", order: 5, isLeaf: true,
    metrics: { productCount: 4, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 4, totalAuctionCount: 0, totalItemCount: 4, lastUpdated: daysAgo(1) },
    seo: { title: "Beyblade Burst Stadiums & Accessories", description: "Official Beyblade stadiums, launchers, and custom parts.", keywords: ["beyblade stadium", "beystadium", "launcher"] },
    display: { showInFooter: false, icon: "ðŸŸï¸", showInMenu: true },
    ancestors: [{ id: "category-beyblade-burst", name: "Beyblade Burst", tier: 0 }],
  }),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // TRANSFORMERS
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  mkCat({
    id: "category-transformers",
    name: "Transformers",
    slug: "category-transformers",
    description: "Transformers action figures â€” Autobots, Decepticons, Combiners, G1 and modern",
    rootId: "category-transformers",
    parentIds: [],
    childrenIds: ["category-tf-autobots", "category-tf-decepticons", "category-tf-combiners"],
    tier: 0, path: "transformers", order: 4, isLeaf: false,
    isFeatured: true, featuredPriority: 4, showOnHomepage: true,
    metrics: { productCount: 0, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 12, totalAuctionCount: 1, totalItemCount: 13, lastUpdated: daysAgo(1) },
    seo: { title: "Transformers Action Figures | LetItRip", description: "Shop Transformers figures â€” Autobots, Decepticons, and Combiners.", keywords: ["transformers", "optimus prime", "megatron", "autobots"] },
    display: { showInFooter: true, icon: "ðŸ¤–", color: "#e67e22", coverImage: "https://picsum.photos/seed/tf-root/600/400", showInMenu: true },
    ancestors: [],
  }),

  mkCat({
    id: "category-tf-autobots",
    name: "Autobots",
    slug: "category-tf-autobots",
    description: "Autobot Transformers â€” Optimus Prime, Bumblebee, Jazz, Ironhide and more",
    rootId: "category-transformers",
    parentIds: ["category-transformers"],
    childrenIds: [], tier: 1, path: "transformers/autobots", order: 1, isLeaf: true,
    isFeatured: true, featuredPriority: 9,
    metrics: { productCount: 6, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 6, totalAuctionCount: 0, totalItemCount: 6, lastUpdated: daysAgo(1) },
    seo: { title: "Autobot Transformers Figures", description: "Optimus Prime, Bumblebee, Jazz, and all Autobot figures.", keywords: ["autobots", "optimus prime", "bumblebee", "transformers"] },
    display: { showInFooter: false, icon: "ðŸ”µ", color: "#2980b9", showInMenu: true },
    ancestors: [{ id: "category-transformers", name: "Transformers", tier: 0 }],
  }),

  mkCat({
    id: "category-tf-decepticons",
    name: "Decepticons",
    slug: "category-tf-decepticons",
    description: "Decepticon Transformers â€” Megatron, Starscream, Soundwave, Shockwave",
    rootId: "category-transformers",
    parentIds: ["category-transformers"],
    childrenIds: [], tier: 1, path: "transformers/decepticons", order: 2, isLeaf: true,
    metrics: { productCount: 4, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 4, totalAuctionCount: 0, totalItemCount: 4, lastUpdated: daysAgo(1) },
    seo: { title: "Decepticon Transformers Figures", description: "Megatron, Starscream, Soundwave, and all Decepticon figures.", keywords: ["decepticons", "megatron", "starscream", "soundwave"] },
    display: { showInFooter: false, icon: "ðŸ”´", color: "#922b21", showInMenu: true },
    ancestors: [{ id: "category-transformers", name: "Transformers", tier: 0 }],
  }),

  mkCat({
    id: "category-tf-combiners",
    name: "Combiners & Special Teams",
    slug: "category-tf-combiners",
    description: "Combiner Wars, Siege, and Legacy combiner sets â€” Devastator, Superion and more",
    rootId: "category-transformers",
    parentIds: ["category-transformers"],
    childrenIds: [], tier: 1, path: "transformers/combiners", order: 3, isLeaf: true,
    metrics: { productCount: 2, productIds: [], auctionCount: 1, auctionIds: [], totalProductCount: 2, totalAuctionCount: 1, totalItemCount: 3, lastUpdated: daysAgo(1) },
    seo: { title: "Transformers Combiner Sets", description: "Devastator, Superion, Menasor â€” all Transformers combiner sets.", keywords: ["combiners", "devastator", "superion", "combiner wars"] },
    display: { showInFooter: false, icon: "ðŸ¦¾", color: "#641e16", showInMenu: true },
    ancestors: [{ id: "category-transformers", name: "Transformers", tier: 0 }],
  }),

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // CROSS-FRANCHISE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  mkCat({
    id: "category-sealed-products",
    name: "Sealed Products",
    slug: "category-sealed-products",
    description: "Factory-sealed booster boxes, packs, starter sets, and collector bundles",
    rootId: "category-sealed-products",
    parentIds: [],
    childrenIds: [], tier: 0, path: "sealed-products", order: 5, isLeaf: true,
    isFeatured: true, featuredPriority: 10, showOnHomepage: true,
    metrics: { productCount: 8, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 8, totalAuctionCount: 0, totalItemCount: 8, lastUpdated: daysAgo(1) },
    seo: { title: "Sealed Products â€” PokÃ©mon, Hot Wheels & More | LetItRip", description: "Factory-sealed collectibles â€” PokÃ©mon packs, Hot Wheels cases, Beyblade sets.", keywords: ["sealed products", "booster box", "factory sealed"] },
    display: { showInFooter: true, icon: "ðŸ“¦", showInMenu: true },
    ancestors: [],
  }),

  mkCat({
    id: "category-accessories",
    name: "Accessories & Display",
    slug: "category-accessories",
    description: "Card sleeves, top-loaders, binders, display stands, and storage solutions",
    rootId: "category-accessories",
    parentIds: [],
    childrenIds: [], tier: 0, path: "accessories", order: 6, isLeaf: true,
    metrics: { productCount: 6, productIds: [], auctionCount: 0, auctionIds: [], totalProductCount: 6, totalAuctionCount: 0, totalItemCount: 6, lastUpdated: daysAgo(1) },
    seo: { title: "Accessories & Display Products | LetItRip", description: "Card sleeves, binders, top-loaders, display cases, and storage.", keywords: ["card sleeves", "top loader", "binder", "display case"] },
    display: { showInFooter: true, icon: "ðŸ—‚ï¸", showInMenu: true },
    ancestors: [],
  }),
];
