/*
 * WHY: Provides a minimal, Beyblade-focused category hierarchy plus brand entries for the
 *      demo seed. The site itself stays generically branded as a collectibles marketplace —
 *      only the seeded catalog data is narrowed to Beyblade so the demo has a coherent,
 *      small dataset instead of a sprawling multi-franchise catalog.
 * WHAT: Exports categoriesSeedData — 1 root category (Spinning Tops) + 4 generation leaves
 *       (Original, Metal Fight, Burst, X) + 2 brands (categoryType:"brand").
 *       Products tag BOTH a leaf category AND its root so array-contains queries work at
 *       both levels simultaneously.
 *
 * EXPORTS:
 *   categoriesSeedData — array of Partial<CategoryDocument> for the seed runner
 *
 * @tag domain:categories,brands
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type { CategoryDocument } from "../features/categories/schemas";
import { CATEGORY_FIELDS } from "../constants/field-names";
import { seedExtMedia } from "./_helpers/media";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const emptyMetrics = {
  productCount: 0,
  productIds: [],
  auctionCount: 0,
  auctionIds: [],
  totalProductCount: 0,
  totalAuctionCount: 0,
  totalItemCount: 0,
  lastUpdated: daysAgo(1),
};

// ──────────────────────────────────────────────────────────────────────────────
// Categories: 1 root (Spinning Tops) + 4 Beyblade generations
// ──────────────────────────────────────────────────────────────────────────────
const rawCategories: Partial<CategoryDocument>[] = [

  // ── ROOT: Spinning Tops ─────────────────────────────────────────────────────
  {
    id: "category-spinning-tops",
    slug: "category-spinning-tops",
    name: "Spinning Tops",
    description: "Collectible spinning tops and battle systems — Beyblade Original, Metal Fight, Burst, X, and accessories.",
    rootId: "category-spinning-tops",
    parentIds: [],
    childrenIds: ["category-beyblade-original", "category-beyblade-metal", "category-beyblade-burst", "category-beyblade-x"],
    tier: 0,
    path: "spinning-tops",
    order: 1,
    isLeaf: false,
    position: 0,
    subtreeSize: 4,
    metrics: emptyMetrics,
    isFeatured: true,
    featuredPriority: 1,
    isBrand: false,
    seo: { title: "Spinning Tops | LetItRip", description: "Buy Beyblade and spinning tops — Original, Metal Fight, Burst, X, and accessories.", keywords: ["beyblade", "spinning tops", "beyblade x", "beyblade burst"] },
    display: { icon: "🌀", coverImage: seedExtMedia("https://picsum.photos/seed/category-image-spinning-tops-20260101/1200/600"), color: "#0891b2", showInMenu: true, showInFooter: true },
    isActive: true,
    isSearchable: true,
    showOnHomepage: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(1),
  },
  {
    id: "category-beyblade-original",
    slug: "category-beyblade-original",
    name: "Beyblade Original",
    description: "The original Beyblade series (1999–2003) by Takara — Plastic Generation tops, Ultimate Beyblade, and the launchers that started the franchise.",
    rootId: "category-spinning-tops",
    parentIds: ["category-spinning-tops"],
    childrenIds: [],
    tier: 1,
    path: "spinning-tops/beyblade-original",
    order: 1,
    isLeaf: true,
    position: 0,
    subtreeSize: 0,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: { title: "Beyblade Original | LetItRip", description: "Buy original-series Beyblade tops and launchers — Plastic Generation, 1999-2003.", keywords: ["beyblade original", "plastic generation", "vintage beyblade", "beyblade 1999"] },
    display: { icon: "🪀", coverImage: seedExtMedia("https://picsum.photos/seed/category-image-beyblade-original-20260101/1200/600"), color: "#b45309", showInMenu: true, showInFooter: false },
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(1),
  },
  {
    id: "category-beyblade-metal",
    slug: "category-beyblade-metal",
    name: "Beyblade Metal Fight",
    description: "Classic Beyblade Metal Fight series — Metal Fusion, Metal Masters, Metal Fury, and Zero-G. Highly collectible vintage tops.",
    rootId: "category-spinning-tops",
    parentIds: ["category-spinning-tops"],
    childrenIds: [],
    tier: 1,
    path: "spinning-tops/beyblade-metal",
    order: 2,
    isLeaf: true,
    position: 1,
    subtreeSize: 0,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: { title: "Beyblade Metal Fight | LetItRip", description: "Buy vintage Beyblade Metal Fight tops — Fusion, Masters, Fury.", keywords: ["beyblade metal fight", "metal fusion", "metal masters", "vintage beyblade"] },
    display: { icon: "⚙️", coverImage: seedExtMedia("https://picsum.photos/seed/category-image-beyblade-metal-20260101/1200/600"), color: "#64748b", showInMenu: true, showInFooter: false },
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(1),
  },
  {
    id: "category-beyblade-burst",
    slug: "category-beyblade-burst",
    name: "Beyblade Burst",
    description: "Beyblade Burst by Takara-Tomy/Hasbro — Burst system tops, launchers, and stadiums from all Burst sub-generations.",
    rootId: "category-spinning-tops",
    parentIds: ["category-spinning-tops"],
    childrenIds: [],
    tier: 1,
    path: "spinning-tops/beyblade-burst",
    order: 3,
    isLeaf: true,
    position: 2,
    subtreeSize: 0,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: { title: "Beyblade Burst | LetItRip", description: "Buy Beyblade Burst tops, launchers, and stadiums.", keywords: ["beyblade burst", "burst system", "beyblade burst pro"] },
    display: { icon: "💥", coverImage: seedExtMedia("https://picsum.photos/seed/category-image-beyblade-burst-20260101/1200/600"), color: "#059669", showInMenu: true, showInFooter: false },
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(1),
  },
  {
    id: "category-beyblade-x",
    slug: "category-beyblade-x",
    name: "Beyblade X",
    description: "Beyblade X by Takara-Tomy — the latest generation with Xtreme Gear system, X Dash, and tournament-grade stadiums.",
    rootId: "category-spinning-tops",
    parentIds: ["category-spinning-tops"],
    childrenIds: [],
    tier: 1,
    path: "spinning-tops/beyblade-x",
    order: 4,
    isLeaf: true,
    position: 3,
    subtreeSize: 0,
    metrics: emptyMetrics,
    isFeatured: true,
    isBrand: false,
    seo: { title: "Beyblade X | LetItRip", description: "Buy Beyblade X tops and stadiums by Takara-Tomy.", keywords: ["beyblade x", "xtreme gear", "beyblade x starter", "takara tomy beyblade"] },
    display: { icon: "💫", coverImage: seedExtMedia("https://picsum.photos/seed/category-image-beyblade-x-20260101/1200/600"), color: "#0d9488", showInMenu: true, showInFooter: false },
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(1),
  },
];

const sublistingRows: Partial<CategoryDocument>[] = [];

// ──────────────────────────────────────────────────────────────────────────────
// Brands (categoryType:"brand") — narrowed to the two brands relevant to the
// Beyblade catalog. Takara-Tomy is a real manufacturer (also makes Tomica,
// Transformers Japan) so it stays generic; Beyblade is the franchise brand.
// ──────────────────────────────────────────────────────────────────────────────
const brandRows: Partial<CategoryDocument>[] = [
  {
    id: "brand-takara-tomy",
    slug: "brand-takara-tomy",
    name: "Takara-Tomy",
    categoryType: CATEGORY_FIELDS.CATEGORY_TYPE_VALUES.BRAND,
    description: "Japanese toy company behind Beyblade, Tomica, Transformers (Japan), and Duel Masters. Known for premium quality and Japan-exclusive releases.",
    brandWebsite: "https://www.takaratomy.co.jp",
    brandCountry: "Japan",
    brandFounded: 2006,
    rootId: "brand-takara-tomy",
    parentIds: [],
    tier: 0,
    path: "brand-takara-tomy",
    isLeaf: true,
    order: 1,
    display: { coverImage: seedExtMedia("https://picsum.photos/seed/brand-logo-takara-tomy-20260101/800/800"), showInMenu: false, showInFooter: true },
    isFeatured: true,
    isBrand: true,
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(30),
    seo: { title: "Takara-Tomy | LetItRip", description: "Shop Takara-Tomy collectibles — Beyblade, Tomica, Transformers.", keywords: ["takara tomy", "takara tomy beyblade", "tomica takara"] },
  },
  {
    id: "brand-beyblade",
    slug: "brand-beyblade",
    name: "Beyblade",
    categoryType: CATEGORY_FIELDS.CATEGORY_TYPE_VALUES.BRAND,
    description: "Spinning top battle franchise by Takara-Tomy (Japan) and Hasbro (international). Covers the Original series, Metal Fight, Burst, and the latest Beyblade X generation.",
    brandWebsite: "https://beyblade.takaratomy.co.jp",
    brandCountry: "Japan",
    brandFounded: 1999,
    rootId: "brand-beyblade",
    parentIds: [],
    tier: 0,
    path: "brand-beyblade",
    isLeaf: true,
    order: 2,
    display: { coverImage: seedExtMedia("https://picsum.photos/seed/brand-logo-beyblade-20260101/800/800"), showInMenu: false, showInFooter: true },
    isFeatured: true,
    isBrand: true,
    isActive: true,
    isSearchable: true,
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(300),
    updatedAt: daysAgo(30),
    seo: { title: "Beyblade | LetItRip", description: "Shop Beyblade — Original, X, Burst, Metal Fight tops and stadiums.", keywords: ["beyblade", "beyblade x", "beyblade burst", "spinning top battle"] },
  },
];

export const categoriesSeedData: Partial<CategoryDocument>[] = [
  ...rawCategories.map((c) => ({ ancestors: [] as any[], ...c, createdByType: "admin" as const })),
  ...sublistingRows.map((s) => ({ ancestors: [] as any[], ...s, createdByType: "admin" as const })),
  ...brandRows.map((b) => ({ ancestors: [] as any[], ...b, createdByType: "admin" as const })),
];

// P-1 default seed: identical to categoriesSeedData now that bundle rows have been removed.
export const categoriesP1SeedData: Partial<CategoryDocument>[] = [
  ...rawCategories.map((c) => ({ ancestors: [] as any[], ...c, createdByType: "admin" as const })),
  ...sublistingRows.map((s) => ({ ancestors: [] as any[], ...s, createdByType: "admin" as const })),
  ...brandRows.map((b) => ({ ancestors: [] as any[], ...b, createdByType: "admin" as const })),
];
