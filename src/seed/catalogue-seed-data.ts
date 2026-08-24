/*
 * WHY: Seeds the personal catalogue (Feature B) — a handful of items owned
 *      by seeded buyers/sellers across each listingStatus, so the user
 *      dashboard, public profile tab, and admin approvals queue all have
 *      something to render.
 * WHAT: 6 items across not_listed/pending_admin_approval/listed/rejected,
 *       a mix of public/private visibility, one with a stale
 *       lastImageUpdateAt (>30 days) to exercise the freshness gate.
 *
 * EXPORTS: catalogueSeedData — Array of Partial<CatalogueItemDocument>
 */

import type { CatalogueItemDocument } from "../features/catalogue/schemas/firestore";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const catalogueSeedData: Partial<CatalogueItemDocument>[] = [
  {
    id: "mycatalog-user-rohit-collector-vintage-hotwheels-20260801-a1b2c3",
    ownerId: "user-rohit-collector",
    ownerRole: "user",
    title: "Vintage Hot Wheels Redline (1969)",
    description: "Original paint, minor wheel wear. Family collection.",
    images: [],
    mainImage: undefined,
    condition: "good",
    price: 4500,
    quantity: 1,
    visibility: "public",
    listingStatus: "not_listed",
    lastImageUpdateAt: daysAgo(5),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(5),
  },
  {
    id: "mycatalog-user-rohit-collector-charizard-holo-20260805-b2c3d4",
    ownerId: "user-rohit-collector",
    ownerRole: "user",
    title: "Charizard Holo 1st Edition (played)",
    images: [],
    condition: "fair",
    price: 12000,
    quantity: 1,
    visibility: "public",
    listingStatus: "pending_admin_approval",
    submittedForApprovalAt: daysAgo(2),
    lastImageUpdateAt: daysAgo(3),
    createdAt: daysAgo(8),
    updatedAt: daysAgo(2),
  },
  {
    id: "mycatalog-user-priya-cards-gundam-rx78-20260710-c3d4e5",
    ownerId: "user-priya-cards",
    ownerRole: "user",
    title: "Gundam RX-78-2 Model Kit (built)",
    images: [],
    condition: "like_new",
    price: 2500,
    quantity: 1,
    visibility: "public",
    listingStatus: "listed",
    linkedProductId: "product-gundam-rx78-2-model-kit-built",
    linkedProductSlug: "product-gundam-rx78-2-model-kit-built",
    lastImageUpdateAt: daysAgo(20),
    createdAt: daysAgo(25),
    updatedAt: daysAgo(20),
  },
  {
    id: "mycatalog-user-priya-cards-broken-beyblade-20260715-d4e5f6",
    ownerId: "user-priya-cards",
    ownerRole: "user",
    title: "Beyblade Burst (missing launcher)",
    images: [],
    condition: "poor",
    price: 300,
    quantity: 1,
    visibility: "private",
    listingStatus: "rejected",
    rejectionReason: "Missing launcher — please list as parts-only or add photos of the full working set.",
    submittedForApprovalAt: daysAgo(15),
    lastImageUpdateAt: daysAgo(18),
    createdAt: daysAgo(20),
    updatedAt: daysAgo(14),
  },
  {
    id: "mycatalog-user-tyson-blader-pokemon-binder-20260601-e5f6a7",
    ownerId: "user-tyson-blader",
    ownerRole: "seller",
    title: "Pokémon Binder — 180 cards, mixed sets",
    images: [],
    condition: "good",
    price: 8000,
    quantity: 1,
    visibility: "public",
    listingStatus: "not_listed",
    lastImageUpdateAt: daysAgo(45),
    createdAt: daysAgo(60),
    updatedAt: daysAgo(45),
  },
  {
    id: "mycatalog-user-arjun-gunpla-funko-batman-20260620-f6a7b8",
    ownerId: "user-arjun-gunpla",
    ownerRole: "user",
    title: "Funko Pop Batman (box wear only)",
    images: [],
    condition: "new",
    price: 1800,
    quantity: 2,
    visibility: "private",
    listingStatus: "not_listed",
    lastImageUpdateAt: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];
