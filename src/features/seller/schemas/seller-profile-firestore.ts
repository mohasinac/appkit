/**
 * Seller Profile Firestore Document Types & Constants
 *
 * A SIDECAR to `users/{uid}`, keyed on the SAME Firebase Auth UID — not a
 * parallel account. `users/{uid}` stays the one account record for every
 * role (email, displayName, `role`, etc.); only the seller-specific fields
 * that used to live mixed into that document move here.
 *
 * Owner's direct instruction: "also split the seller and user collections
 * do not mix them together." Scoped via three parallel investigations
 * before any code was touched (see the approved plan at
 * C:\Users\mohsi\.claude\plans\swirling-watching-tiger.md) — the real
 * finding was that `stores` is already the de facto seller business
 * identity for almost everything (products/orders/payouts/reviews/offers/
 * coupons all query by the store's SLUG, not a seller UID), so this is a
 * narrow sidecar, not a redesign of how seller identity works.
 *
 * Migration strategy, owner-confirmed: no production data exists yet (all
 * seed/test data) — single-source, no dual-write period, one backfill pass.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type {
  SellerShippingConfig,
  SellerPayoutDetails,
} from "../../auth/schemas/firestore";

export interface SellerProfileDocument extends BaseDocument {
  /** Same value as the id — the owning account's Firebase Auth UID. Kept as
   * a real field (not just the doc id) so repository methods that take a
   * full document never have to re-derive it. */
  uid: string;

  storeId?: string;
  storeSlug?: string;
  storeStatus?: "pending" | "approved" | "rejected";

  shippingConfig?: SellerShippingConfig;
  payoutDetails?: SellerPayoutDetails;

  /*
   * 🛑 `UserDocument.publicProfile.store*` (storeName/storeDescription/
   * storeCategory/storeLogoURL/storeBannerURL/storeReturnPolicy/
   * storeShippingPolicy/isVacationMode/vacationMessage) is DELIBERATELY NOT
   * moved here. Confirmed no real application write path sets it (every
   * occurrence found was seed-authored fixture copy, "display copy on the
   * person's own profile" per the seed file's own comment) — moving an
   * unwired field forward would just carry the same "declared but never
   * populated" problem into the new collection. Scoped out of this pass;
   * `storeId`/`storeSlug`/`storeStatus`/`shippingConfig`/`payoutDetails`
   * were the fields with real, active read/write paths (identity + money),
   * which is what "split the seller and user collections" was actually
   * about.
   */
}

export const SELLER_PROFILE_COLLECTION = "sellerProfiles" as const;

export const SELLER_PROFILE_FIELDS = {
  ID: "id",
  UID: "uid",
  STORE_ID: "storeId",
  STORE_SLUG: "storeSlug",
  STORE_STATUS: "storeStatus",
  SHIPPING_CONFIG: "shippingConfig",
  PAYOUT_DETAILS: "payoutDetails",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

export const SELLER_PROFILE_INDEXED_FIELDS = [
  "uid",
  "storeId",
  "storeSlug",
  "storeStatus",
] as const;

export type SellerProfileCreateInput = Pick<SellerProfileDocument, "uid"> &
  Partial<Pick<SellerProfileDocument, "storeId" | "storeSlug" | "storeStatus" | "shippingConfig" | "payoutDetails">>;

export type SellerProfileUpdateInput = Partial<
  Pick<SellerProfileDocument, "storeId" | "storeSlug" | "storeStatus" | "shippingConfig" | "payoutDetails">
>;
