/**
 * toProductItem — Firestore doc → card-grid `ProductItem` mapper.
 *
 * Lives in `_internal/shared/` (client+server safe), NOT in
 * `_internal/server/features/products/data.ts` where it was originally
 * written. It is a pure field mapping with no server dependencies of its
 * own, but `data.ts` transitively reaches `providers/db-firebase/admin.js`
 * (firebase-admin), and `GroupedListingsCarousel.tsx` is a `"use client"`
 * component that imports this function as a VALUE. Turbopack resolves a
 * module's full static import graph before tree-shaking, so that single
 * import dragged the whole firebase-admin chain into the client bundle and
 * failed the production build outright:
 *
 *   Module not found: .../providers/db-firebase/admin.js
 *     [Client Component Browser] → GroupedListingsCarousel
 *     → _internal/server/features/products/data.js
 *
 * This is the Turbopack client-bundle trap from CLAUDE.md's appkit Export
 * Rules / Recurrent Root Cause #6, reached through an ordinary deep import
 * rather than a barrel. Keep this file free of any server-only import so a
 * client component can always call it directly.
 */

import type { FirestoreDocument } from "../../../../schemas/types";
import type { ProductItem } from "../../../../features/products/types";

export function toProductItem(doc: FirestoreDocument): ProductItem {
  return {
    id: String(doc.id ?? ""),
    title: String(doc.title ?? doc.name ?? ""),
    price: typeof doc.price === "number" ? doc.price : 0,
    originalPrice: typeof doc.originalPrice === "number" ? doc.originalPrice : undefined,
    mainImage: Array.isArray(doc.images)
      ? (doc.images[0] as string | undefined)
      : typeof doc.mainImage === "string"
        ? doc.mainImage
        : undefined,
    status: (doc.status as ProductItem["status"]) ?? "published",
    slug: typeof doc.slug === "string" ? doc.slug : undefined,
    storeName: typeof doc.storeName === "string" ? doc.storeName : undefined,
    rating: typeof doc.rating === "number" ? doc.rating : undefined,
    reviewCount: typeof doc.reviewCount === "number" ? doc.reviewCount : undefined,
    // Without this, every related-item card silently linked to the standard
    // PDP regardless of its real type (pluginFor() defaults to "standard"
    // when listingType is missing) — same bug class as the Phase 1 routing
    // fix, one hop further downstream in the related-items card link path.
    listingType: (doc.listingType as ProductItem["listingType"]) ?? undefined,
  };
}
