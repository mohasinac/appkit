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
] as const;

export type PageViewEntityType = (typeof PAGE_VIEW_ENTITY_TYPES)[number];
