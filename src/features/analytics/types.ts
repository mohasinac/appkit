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
] as const;

export type PageViewEntityType = (typeof PAGE_VIEW_ENTITY_TYPES)[number];
