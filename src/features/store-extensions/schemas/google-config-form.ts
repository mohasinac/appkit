/*
 * WHY: `PUT /api/store/google-reviews` spread the raw request body into
 *      Firestore on both the create and the update branch, with `storeId`
 *      pinned and nothing else checked.
 *
 * ## 🛑 The field that makes this worth doing carefully
 *
 * `StoreGoogleConfigDocument` declares `oauthRefreshToken` — a long-lived
 * Google credential. The raw spread meant a request body could set it, and the
 * sibling `GET` returns the document WHOLE, so it was also being sent to the
 * browser on every load of the seller's Google Reviews settings page.
 *
 * It is scoped to the caller's own store, so this is not a cross-tenant leak.
 * It is still a secret in a page payload for no reason: a repo-wide grep finds
 * **no reader and no writer** for that field anywhere — nothing sets it and
 * nothing consumes it. Per the public-projection rule, a field nobody can name
 * a reader for is private by default.
 *
 * So this schema deliberately does NOT declare it, and the route projects it
 * out of the response. The field itself is left on the document rather than
 * deleted — removing a schema field is a data-model change and deserves its
 * own decision, not a drive-by inside a validation fix.
 *
 * ## `averageRating` / `totalReviews` / `lastSyncedAt` are absent too
 *
 * Those are SYNC OUTPUT — what Google last told us. A seller typing their own
 * review count in is not configuration, it is fabricating the number the
 * storefront displays.
 *
 * EXPORTS:
 *   storeGoogleConfigUpdateSchema, toSellerGoogleConfig,
 *   type StoreGoogleConfigFormValues, type SellerGoogleConfig
 *
 * @tag domain:store-extensions,google-reviews
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:/api/store/google-reviews
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import type { StoreGoogleConfigDocument } from "./firestore";

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const storeGoogleConfigUpdateSchema = z
  .object({
    isConnected: annotate(z.boolean().optional(), {
      section: "google",
      sectionLabel: "Google Reviews",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "quarter",
    }),
    placeId: annotate(z.string().max(256).optional(), {
      section: "google",
      quick: true,
      order: 2,
      row: "pair",
      help: "The Google Place ID for this store's listing.",
    }),
    businessName: annotate(z.string().max(200).optional(), {
      section: "google",
      quick: true,
      order: 3,
      row: "pair",
    }),
  })
  .strict();

export type StoreGoogleConfigFormValues = z.infer<typeof storeGoogleConfigUpdateSchema>;

/**
 * What the seller's own settings page may see.
 *
 * An ALLOW-list, built as a new object — never the document with keys deleted.
 * A deny-list publishes every field nobody thought to remove, including ones
 * the interface does not declare, which is exactly how a decrypted API token
 * and an unmasked ad-credentials blob reached anonymous callers before
 * (Recurrent Root Cause #70).
 *
 * PUBLIC (to the store owner):
 *   storeId, isConnected — what the page renders
 *   placeId, businessName — what the page lets them edit
 *   averageRating, totalReviews, lastSyncedAt — sync output they need to see
 *   id, createdAt, updatedAt — ordinary record metadata
 *
 * PRIVATE:
 *   oauthRefreshToken — a long-lived Google credential with no reader and no
 *     writer anywhere in either tree. It was being sent to the browser on every
 *     load simply because the route returned the document whole.
 */
export function toSellerGoogleConfig(doc: StoreGoogleConfigDocument) {
  return {
    id: doc.id,
    storeId: doc.storeId,
    isConnected: doc.isConnected,
    placeId: doc.placeId,
    businessName: doc.businessName,
    averageRating: doc.averageRating,
    totalReviews: doc.totalReviews,
    lastSyncedAt: doc.lastSyncedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export type SellerGoogleConfig = ReturnType<typeof toSellerGoogleConfig>;
