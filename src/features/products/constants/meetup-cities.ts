/**
 * D5 — the cities that get their own local-SEO page.
 *
 * ## 🛑 Six, because six is what the data has
 *
 * Every entry here is a city a classified listing actually names in
 * `classified.meetupArea.city`, measured from the seed rather than chosen from
 * a list of big Indian cities. A page for a city with no listings is an empty
 * page with a city in its `<title>` — which is the doorway-page pattern Google
 * penalises, and the thing local SEO is most often got wrong by.
 *
 * 🛑 So the rule for adding one is: a city joins this list when listings name
 * it, not in anticipation of listings naming it. The page still renders when a
 * city's listings all sell — it says so in words rather than showing an empty
 * grid, because "nobody is selling here this week" is true and useful, while a
 * bare grid reads as broken.
 *
 * ## Why a constant rather than a query
 *
 * These routes are STATIC (`generateStaticParams`), which is the whole point:
 * a city page that awaited `searchParams` or queried for its own slug list
 * would be dynamic, and then every visitor and every crawler hit pays a render
 * — on the surface most likely to be crawled widely (Root Cause #94). A
 * `DISTINCT city` query is also not something Firestore offers, so deriving the
 * list would mean scanning the collection at build time for six strings.
 *
 * @tag domain:products
 * @tag layer:constant
 * @tag access:isomorphic
 */

export interface MeetupCity {
  /** URL segment. Lower-case, hyphenated — the page's own identity. */
  slug: string;
  /** Exactly as stored in `classified.meetupArea.city`, which the query matches on. */
  city: string;
  /** State, for the page's own prose and its `<title>`. Never queried. */
  state: string;
}

/**
 * 🛑 `city` must match the STORED value byte-for-byte. Firestore `==` is
 * byte-exact (Root Cause #33), so "New Delhi" and "new delhi" are two different
 * cities to the query and one of them returns nothing with no error — which is
 * exactly how a filter chip comes to look like it does nothing.
 */
export const MEETUP_CITIES: readonly MeetupCity[] = [
  { slug: "mumbai", city: "Mumbai", state: "Maharashtra" },
  { slug: "bengaluru", city: "Bengaluru", state: "Karnataka" },
  { slug: "pune", city: "Pune", state: "Maharashtra" },
  { slug: "new-delhi", city: "New Delhi", state: "Delhi" },
  { slug: "chennai", city: "Chennai", state: "Tamil Nadu" },
  { slug: "hyderabad", city: "Hyderabad", state: "Telangana" },
] as const;

/** The city for a URL segment, or `null` — which the route turns into a 404. */
export function meetupCityBySlug(slug: string): MeetupCity | null {
  const want = slug.trim().toLowerCase();
  return MEETUP_CITIES.find((c) => c.slug === want) ?? null;
}
