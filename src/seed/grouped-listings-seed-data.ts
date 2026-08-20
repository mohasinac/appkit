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

  // --- Coverage for every other listing type — previously only standard products had a
  //     group, so the public GroupedListingsCarousel (Phase 3) had nothing to render on
  //     any auction/pre-order/prize-draw/classified/digital-code/live/art/stickers page. ---
  {
    id: "group-beyblade-auction-highlights",
    slug: "group-beyblade-auction-highlights",
    title: "Auction Highlights",
    description: "Two of the rarest pieces currently up for auction on Beyblade Arena.",
    productIds: [
      "auction-beyblade-original-dragoon-storm",
      "auction-beyblade-metal-diablo-nemesis",
    ],
    coverImage: seedExtMedia("https://picsum.photos/seed/group-beyblade-auction-highlights-20260819/1200/900"),
    groupTheme: "related",
    minActiveMembers: 2,
    activeMemberCount: 2,
    visibilityStatus: "visible",
    isActive: true,
    isFeatured: false,
    storeId: "store-beyblade-arena",
    brandSlug: "brand-beyblade",
    categorySlug: "category-spinning-tops",
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(1),
  },
  {
    id: "group-beyblade-x-preorder-wave",
    slug: "group-beyblade-x-preorder-wave",
    title: "Beyblade X Pre-Order Wave",
    description: "Reserve your spot in the upcoming Beyblade X booster waves.",
    productIds: [
      "preorder-beyblade-x-bx-08-wave",
      "preorder-beyblade-x-bx-09-glide-ring",
    ],
    coverImage: seedExtMedia("https://picsum.photos/seed/group-beyblade-x-preorder-wave-20260819/1200/900"),
    groupTheme: "set",
    minActiveMembers: 2,
    activeMemberCount: 2,
    visibilityStatus: "visible",
    isActive: true,
    isFeatured: false,
    storeId: "store-beyblade-arena",
    brandSlug: "brand-takara-tomy",
    categorySlug: "category-beyblade-x",
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },
  {
    id: "group-beyblade-mystery-draws",
    slug: "group-beyblade-mystery-draws",
    title: "Mystery Draws You Might Like",
    description: "More prize draws with entries still open.",
    productIds: [
      "prizedraw-beyblade-mystery-box",
      "prizedraw-beyblade-x-legendary-vault",
      "prizedraw-beyblade-original-vintage-vault",
    ],
    coverImage: seedExtMedia("https://picsum.photos/seed/group-beyblade-mystery-draws-20260819/1200/900"),
    groupTheme: "related",
    minActiveMembers: 2,
    activeMemberCount: 3,
    visibilityStatus: "visible",
    isActive: true,
    isFeatured: true,
    storeId: "store-letitrip-official",
    brandSlug: "brand-beyblade",
    categorySlug: "category-spinning-tops",
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(1),
  },
  {
    id: "group-beyblade-local-meetup-picks",
    slug: "group-beyblade-local-meetup-picks",
    title: "Local Meetup Picks",
    description: "More classified listings from sellers open to meeting up.",
    productIds: [
      "classified-beyblade-stadium-set",
      "classified-beyblade-burst-collection-bengaluru",
      "classified-beyblade-x-starter-pune",
    ],
    coverImage: seedExtMedia("https://picsum.photos/seed/group-beyblade-local-meetup-picks-20260819/1200/900"),
    groupTheme: "related",
    minActiveMembers: 2,
    activeMemberCount: 3,
    visibilityStatus: "visible",
    isActive: true,
    isFeatured: false,
    storeId: "store-beyblade-arena",
    brandSlug: "brand-beyblade",
    categorySlug: "category-spinning-tops",
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
  {
    id: "group-beyblade-app-unlock-codes",
    slug: "group-beyblade-app-unlock-codes",
    title: "App Unlock Codes",
    description: "More companion-app digital codes to unlock tops, packs, and cosmetics.",
    productIds: [
      "digitalcode-beyblade-x-app-starter-pack",
      "digitalcode-beyblade-metal-app-classic-pack",
      "digitalcode-beyblade-burst-app-avatar-skins",
    ],
    coverImage: seedExtMedia("https://picsum.photos/seed/group-beyblade-app-unlock-codes-20260819/1200/900"),
    groupTheme: "related",
    minActiveMembers: 2,
    activeMemberCount: 3,
    visibilityStatus: "visible",
    isActive: true,
    isFeatured: false,
    storeId: "store-beyblade-arena",
    brandSlug: "brand-takara-tomy",
    categorySlug: "category-spinning-tops",
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
  {
    id: "group-beyblade-fan-art-and-stickers",
    slug: "group-beyblade-fan-art-and-stickers",
    title: "Fan Art & Stickers",
    description: "Prints and sticker sheets to go with your collection.",
    productIds: [
      "art-dranzer-phoenix-poster",
      "art-valkyrie-holographic-print",
      "stickers-beyblade-original-classic-sheet",
      "stickers-beyblade-x-holographic-pack",
    ],
    coverImage: seedExtMedia("https://picsum.photos/seed/group-beyblade-fan-art-and-stickers-20260819/1200/900"),
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
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: "group-beyblade-arena-extras",
    slug: "group-beyblade-arena-extras",
    title: "Beyblade Arena Extras",
    description: "A few off-catalog extras also listed by Beyblade Arena.",
    productIds: [
      "live-golden-retriever-puppy",
      "live-bonsai-juniper-10yr",
    ],
    coverImage: seedExtMedia("https://picsum.photos/seed/group-beyblade-arena-extras-20260819/1200/900"),
    groupTheme: "generic",
    minActiveMembers: 2,
    activeMemberCount: 2,
    visibilityStatus: "visible",
    isActive: true,
    isFeatured: false,
    storeId: "store-beyblade-arena",
    createdBy: "user-admin-letitrip",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
];
