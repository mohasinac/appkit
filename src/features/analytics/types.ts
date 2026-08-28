/** Shared client+server type for page-view tracking — kept out of
 * page-views.repository.ts (server-only, imports firebase-admin) so the
 * client-side tracker component can import just this without pulling
 * firebase-admin into the client bundle. */
export const PAGE_VIEW_ENTITY_TYPES = [
  "product",
  "store",
  "category",
  "homepage",
  "auction",
  "review",
  "user-profile",
  "blog",
  "event",
  "pre-order",
  "prize-draw",
  "classified",
  "digital-code",
  "live",
  "bundle",
  /** A `groupedListings` document's own page. Distinct from "bundle" — a
   *  bundle is a priced, all-or-nothing set; a group is pick-as-you-wish. */
  "grouped-listing",
  /**
   * A public BROWSE page — `/products`, `/auctions`, `/stores`, … — as opposed
   * to one entity's detail page.
   *
   * 🛑 `entityId` must be the bare route name ("products"), NEVER the filtered
   * URL. `pageViews` doc ids are `${date}_${entityType}_${entityId}` with a
   * `FieldValue.increment`, so a bounded id costs ONE write per day per page,
   * while keying on a query string would create a new document per filter
   * combination — unbounded doc creation on the highest-traffic pages, against
   * the Firestore write budget in Rule #6. The full URL still travels in the
   * `url` field, which is recorded but not part of the key.
   */
  "listing",
] as const;

export type PageViewEntityType = (typeof PAGE_VIEW_ENTITY_TYPES)[number];
