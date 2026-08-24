/*
 * WHY: The three homepage listing hooks each hand-wrote a pre-URL-encoded
 *      `filters=` Sieve string — `listingType%3D%3Dauction%2Cstatus%3D%3D…`.
 *      Unreadable, unreviewable, and each one silently omitted any liveness
 *      bound, so all three showed sold-out / ended / closed rows. Worse, they
 *      run AFTER the SSR paint and replace it, so a fix to the server half
 *      alone would have been undone 30 seconds later (Root Cause #30).
 *
 * WHAT: Build the query string from the same TYPED params
 *       `parsePublicProductParams` reads on the other side, so a homepage
 *       strip asks precisely what its SSR counterpart asked.
 *
 * EXPORTS: buildHomepageListingQuery, HomepageListingQuery, MIN_HOMEPAGE_COUNT
 *
 * @tag domain:homepage
 * @tag layer:hook
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:useFeaturedAuctions,useFeaturedPreOrders,useFeaturedProducts
 * @tag sideEffects:none
 */

import { AVAILABILITY_VALUES } from "../../../constants/field-names";

/** How many cards a homepage carousel wants before it stops back-filling. */
export const MIN_HOMEPAGE_COUNT = 12;

export interface HomepageListingQuery {
  listingType?: string;
  brand?: string;
  featured?: boolean;
  isPromoted?: boolean;
  sorts?: string;
  pageSize: number;
}

/**
 * Always sends `availability=available`. The API treats an ABSENT value as
 * "all" so that non-browse callers are unaffected — which means omitting it
 * here is precisely how a homepage strip starts showing dead listings again.
 */
export function buildHomepageListingQuery(input: HomepageListingQuery): string {
  const sp = new URLSearchParams();
  sp.set("availability", AVAILABILITY_VALUES.AVAILABLE);
  if (input.listingType) sp.set("listingType", input.listingType);
  if (input.brand) sp.set("brand", input.brand);
  if (input.featured) sp.set("featured", "true");
  if (input.isPromoted) sp.set("isPromoted", "true");
  if (input.sorts) sp.set("sorts", input.sorts);
  sp.set("pageSize", String(input.pageSize));
  return sp.toString();
}
