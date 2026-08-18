/*
 * WHY: Shared tester sandbox — a small self-contained category tree (root + 2 leaves),
 *      1 brand row, and 1 bundle row so testers can exercise browsing/filtering/bundle
 *      flows without touching real catalog data. Auto-expires after 7 days.
 * WHAT: Exports categoriesTesterSeedData — 3 plain categories + 1 categoryType:"brand" +
 *       1 categoryType:"bundle" (bundleProductIds references products-tester-seed-data.ts).
 *
 * EXPORTS:
 *   categoriesTesterSeedData — Array of Partial<CategoryDocument> for the seed runner
 *
 * @tag domain:categories,tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed-cli.mjs
 * @tag sideEffects:none
 */

import type { CategoryDocument } from "../../categories/schemas";
import { CATEGORY_FIELDS } from "../../../constants/field-names";
import { seedExtMedia } from "../../../seed/_helpers/media";
import { testDataExpiresAt } from "./tester-ttl";

const emptyMetrics = {
  productCount: 0,
  productIds: [],
  auctionCount: 0,
  auctionIds: [],
  totalProductCount: 0,
  totalAuctionCount: 0,
  totalItemCount: 0,
  lastUpdated: new Date(),
};

export const categoriesTesterSeedData: Partial<CategoryDocument>[] = [
  // ── ROOT: Tester Sandbox ─────────────────────────────────────────────────
  {
    id: "category-tester-sandbox",
    slug: "category-tester-sandbox",
    name: "Tester Sandbox",
    description: "Disposable test category tree for the tester QA program.",
    rootId: "category-tester-sandbox",
    parentIds: [],
    childrenIds: ["category-tester-gadgets", "category-tester-collectibles"],
    tier: 0,
    path: "tester-sandbox",
    order: 999,
    isLeaf: false,
    position: 0,
    subtreeSize: 2,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    seo: { title: "Tester Sandbox", description: "Disposable test category.", keywords: ["test"] },
    display: { icon: "🧪", coverImage: seedExtMedia("https://picsum.photos/seed/category-image-tester-sandbox-20260101/1200/600"), color: "#64748b", showInMenu: false, showInFooter: false },
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Partial<CategoryDocument>,
  {
    id: "category-tester-gadgets",
    slug: "category-tester-gadgets",
    name: "Test Gadgets",
    description: "Disposable test gadgets category.",
    rootId: "category-tester-sandbox",
    parentIds: ["category-tester-sandbox"],
    childrenIds: [],
    tier: 1,
    path: "tester-sandbox/gadgets",
    order: 1,
    isLeaf: true,
    position: 0,
    subtreeSize: 0,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Partial<CategoryDocument>,
  {
    id: "category-tester-collectibles",
    slug: "category-tester-collectibles",
    name: "Test Collectibles",
    description: "Disposable test collectibles category.",
    rootId: "category-tester-sandbox",
    parentIds: ["category-tester-sandbox"],
    childrenIds: [],
    tier: 1,
    path: "tester-sandbox/collectibles",
    order: 2,
    isLeaf: true,
    position: 1,
    subtreeSize: 0,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Partial<CategoryDocument>,
  // ── BRAND ────────────────────────────────────────────────────────────────
  {
    id: "brand-tester-sandbox",
    slug: "brand-tester-sandbox",
    name: "TestBrand",
    categoryType: CATEGORY_FIELDS.CATEGORY_TYPE_VALUES.BRAND,
    description: "Disposable test brand for the tester QA program.",
    brandWebsite: "https://example.com",
    brandCountry: "India",
    rootId: "brand-tester-sandbox",
    parentIds: [],
    childrenIds: [],
    tier: 0,
    path: "brand-tester-sandbox",
    order: 999,
    isLeaf: true,
    position: 0,
    subtreeSize: 0,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: true,
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Partial<CategoryDocument>,
  // ── BUNDLE ───────────────────────────────────────────────────────────────
  {
    id: "bundle-tester-sandbox",
    slug: "bundle-tester-sandbox",
    name: "Test Bundle",
    description: "Two disposable test products bundled at a discount — for testing the bundle flow.",
    categoryType: "bundle",
    bundleKind: "special",
    bundlePrice: 199,
    bundleQueryRule: {
      type: "static",
      productIds: ["product-tester-standard-1", "product-tester-standard-2"],
    },
    rootId: "bundle-tester-sandbox",
    parentIds: [],
    childrenIds: [],
    tier: 0,
    path: "bundle-tester-sandbox",
    order: 999,
    isLeaf: true,
    position: 0,
    subtreeSize: 0,
    metrics: emptyMetrics,
    isFeatured: false,
    isBrand: false,
    isActive: true,
    isSearchable: true,
    showOnHomepage: false,
    createdBy: "user-admin-letitrip",
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Partial<CategoryDocument>,
];
