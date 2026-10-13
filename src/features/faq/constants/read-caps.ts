/**
 * How many FAQ rows the homepage and footer reads may fetch — F1 #36.
 *
 * 🛑 `getHomepageFAQs()` had NO `.limit()`, so it fetched every
 * `showOnHomepage` row and the section sliced to `displayCount` in memory: 20
 * Firestore reads per render of `/` — the most-crawled route in the app — to
 * display 10, growing with every FAQ anyone flags. A real Hobby cost item
 * rather than a correctness one, on a project that has already been paused for
 * exceeding its quota.
 *
 * 🛑 A cap rather than exactly `displayCount`, because the section renders a
 * "+N" badge from the full count: reading only what it shows would make that
 * badge permanently "+0". The cap bounds the cost, and the renderer stops
 * CLAIMING a number once the read saturates — an unknown count must never
 * render as a precise one (Root Cause #72's rule, one surface over).
 *
 * 🛑 It lives in `constants/` and NOT on the repository, even though the
 * repository is its main consumer: the homepage section renderer needs the
 * same number, and importing a repository module there would put
 * `providers/db-firebase` — and therefore firebase-admin — into the import
 * chain of a render module (Root Cause #6/#24).
 *
 * @tag domain:faq
 * @tag layer:constant
 * @tag access:isomorphic
 */

export const FAQ_HOMEPAGE_READ_CAP = 24;

/** The same bound for the footer list, which renders a fixed handful of links. */
export const FAQ_FOOTER_READ_CAP = 24;
