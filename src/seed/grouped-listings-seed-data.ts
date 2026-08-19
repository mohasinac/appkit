/*
 * WHY: Seeds groupedListings — theme groups (horizontal "you might also like" scrollers
 * linking related listings on the detail page, no pricing semantics). See SB-UNI-V in
 * appkit/src/features/grouped/schemas/firestore.ts: this collection was re-scoped away
 * from the old bundle/pricing shape (bundlePrice/originalPrice/discountPercent) — pricing
 * bundles now live on the categories collection with categoryType:"bundle" (SB-UNI-D, see
 * categories-seed-data.ts's bundleRows).
 * WHAT: 3 theme groups over the real Beyblade catalog (products-standard-seed-data.ts —
 * currently the only standard products seeded). Rewritten 2026-08-19: the previous version
 * of this file exported ProductDocument-shaped rows (isGroupParent/groupChildSlugs) that
 * (a) referenced product slugs that don't exist anywhere in seed data, and (b) were written
 * to the groupedListings collection despite not matching GroupedListingDocument's shape at
 * all — a stale leftover from before the SB-UNI-V re-scope.
 *
 * EXPORTS:
 *   groupedListingsSeedData — Array of GroupedListingDocument for seed runner
 *
 * @tag domain:products,grouped
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { GroupedListingDocument } from "../features/grouped/schemas/firestore";
import { seedExtMedia } from "./_helpers/media";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const groupedListingsSeedData: Partial<GroupedListingDocument>[] = [
  {
    id: "group-beyblade-original-lineage",
    slug: "group-beyblade-original-lineage",
    title: "Original Series Lineage",
    description: "Dranzer S and Driger V — the original-generation Beyblades that started it all.",
    productIds: [
      "product-beyblade-original-dranzer-s",
      "product-beyblade-original-driger-v",
    ],
    coverImage: seedExtMedia("https://picsum.photos/seed/group-beyblade-original-lineage-20260101/1200/900"),
    groupTheme: "lineage",
    minActiveMembers: 2,
    activeMemberCount: 2,
    visibilityStatus: "visible",
    isActive: true,
    isFeatured: true,
    storeId: "store-beyblade-arena",
    brandSlug: "brand-beyblade",
    categorySlug: "category-spinning-tops",
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(5),
  },
  {
    id: "group-beyblade-metal-fusion-set",
    slug: "group-beyblade-metal-fusion-set",
    title: "Metal Fusion Rivals",
    description: "Storm Pegasus and Flame Sagittario — the classic Metal Fight Beyblade rivalry, same set.",
    productIds: [
      "product-beyblade-metal-storm-pegasus",
      "product-beyblade-metal-flame-sagittario",
    ],
    coverImage: seedExtMedia("https://picsum.photos/seed/group-beyblade-metal-fusion-set-20260101/1200/900"),
    groupTheme: "set",
    minActiveMembers: 2,
    activeMemberCount: 2,
    visibilityStatus: "visible",
    isActive: true,
    isFeatured: false,
    storeId: "store-beyblade-arena",
    brandSlug: "brand-beyblade",
    categorySlug: "category-spinning-tops",
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(18),
    updatedAt: daysAgo(4),
  },
  {
    id: "group-beyblade-burst-x-related",
    slug: "group-beyblade-burst-x-related",
    title: "Burst & X Attackers You Might Like",
    description: "Top-tier attack-type Beyblades across the Burst and X eras.",
    productIds: [
      "product-beyblade-burst-valkyrie",
      "product-beyblade-burst-regalia-genesis",
      "product-beyblade-x-wizard-arrow",
      "product-beyblade-x-knife-shinobi",
    ],
    coverImage: seedExtMedia("https://picsum.photos/seed/group-beyblade-burst-x-related-20260101/1200/900"),
    groupTheme: "related",
    minActiveMembers: 2,
    activeMemberCount: 4,
    visibilityStatus: "visible",
    isActive: true,
    isFeatured: false,
    storeId: "store-beyblade-arena",
    brandSlug: "brand-beyblade",
    categorySlug: "category-spinning-tops",
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(3),
  },
];
