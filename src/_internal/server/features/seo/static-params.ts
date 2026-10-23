/**
 * Slug enumerators for `generateStaticParams`.
 *
 * ## Why this exists
 *
 * Measured against production 2026-10-24: on EVERY dynamic route
 * (`/products/[slug]`, `/brands/[slug]`, `/categories/[slug]`, `/blog/[slug]`,
 * `/beys/[slug]`, `/parts/[c]/[code]`) the `<head>` ended at byte 8,180 with
 * **no `<title>`, no `og:title` and no `description`** — the real `<title>` sat
 * at byte 563,190, inside `<body>`. Google Search Console reported **12 indexed
 * pages against 249 not indexed** on a 4,773-URL sitemap.
 *
 * The cause is that Next STREAMS metadata whenever a route is dynamic, and
 * `.next/prerender-manifest.json` confirms no content detail route is in either
 * the static or the ISR list — because only three files in the whole app export
 * `generateStaticParams` (`[locale]/layout.tsx`, `parts/[classification]`,
 * `collectibles/[city]`). Giving a route this function moves its metadata into
 * `<head>` at build time and removes the streaming question entirely.
 *
 * `next.config.js`'s `htmlLimitedBots` is the belt for crawlers that cannot
 * render; this is the braces.
 *
 * ## Why in appkit rather than inline in each `page.tsx`
 *
 * Four routes need the same bounded slug query. CLAUDE.md § SSR Architecture
 * lists "a `page.tsx` with non-trivial Firestore querying" as a red flag and
 * caps consumer shims at ~30 lines, and four hand-rolled copies would be past
 * the Duplication Framework's Rule of Three before the first one shipped — the
 * shape Root Cause #59 and #75 both describe.
 *
 * ## Three properties that are load-bearing
 *
 * 1. 🛑 **Every function FAILS OPEN, returning `[]`.** `generateStaticParams`
 *    runs at BUILD time, where a Firestore credential problem is a plausible
 *    environment failure rather than a code fault. Returning `[]` means "no
 *    page is prerendered", which is exactly today's behaviour — so a build
 *    degrades to the status quo instead of failing. Throwing here would turn a
 *    transient admin-SDK hiccup into a failed deploy.
 * 2. 🛑 **`dynamicParams` stays at its default of `true`.** A slug absent from
 *    the returned list still renders on demand, so a product created after the
 *    last build is reachable immediately and is never a 404. Nothing here needs
 *    to be exhaustive to be correct — it is a prerender hint, not an allow-list.
 * 3. **Test fixtures are excluded in memory, never by a Firestore inequality.**
 *    `where("isTestData", "!=", true)` excludes every document that LACKS the
 *    field — i.e. all real content — so such a query returns only test data.
 *    Same trap as `sitemap.ts` and CLAUDE.md § Tester QA Program. The field must
 *    therefore appear in each `.select(...)` list or nothing is filtered.
 */

import { normalizeError } from "../../../../errors/normalize";
import { getAdminDb } from "../../../../providers/db-firebase";
import { PRODUCT_COLLECTION } from "../../../../features/products/schemas/firestore";
import { BLOG_POSTS_COLLECTION, BLOG_POST_FIELDS } from "../../../../features/blog/schemas/firestore";
import { CATEGORIES_COLLECTION, CATEGORY_FIELDS } from "../../../../features/categories/schemas/firestore";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import { serverLogger } from "../../../../monitoring/server-logger";
import { PRODUCT_DETAIL_LISTING_TYPES } from "./product-detail-types";

const PRODUCT_STATUS = "status";
const PRODUCT_STATUS_PUBLISHED = "published";
const SLUG = "slug";
const TEST_DATA_FIELD = PRODUCT_FIELDS.IS_TEST_DATA;

/**
 * A prerender budget, not a correctness bound — see property 2 above.
 *
 * Deliberately well above today's real counts (14 products, 28 brands, 22
 * posts, 8 franchises, measured 2026-10-24) so growth is covered, and well
 * below the point where build time becomes the concern. The parts (2,488) and
 * beys (1,988) corpora are an order of magnitude larger and are NOT wired here
 * yet: they need a build-memory measurement first, because a cold build on this
 * repo already peaks near 8,100 MB against Hobby's 8,192 MB ceiling.
 */
const MAX_PRERENDER = 2000;

interface MaybeTestDataDoc {
  isTestData?: boolean;
}

const isTestDoc = (data: MaybeTestDataDoc): boolean => data.isTestData === true;

/**
 * Shared shape: project the slug field only, drop test fixtures, de-duplicate,
 * and never throw.
 *
 * `.select()` matters for cost — Rule #6's Firestore budget is per document
 * read, and projecting one field keeps a 2,000-row enumeration cheap.
 */
async function slugsFrom(
  label: string,
  build: (db: ReturnType<typeof getAdminDb>) => FirebaseFirestore.Query,
): Promise<string[]> {
  try {
    const snap = await build(getAdminDb()).select(SLUG, TEST_DATA_FIELD).limit(MAX_PRERENDER).get();
    const slugs = snap.docs
      .filter((doc) => !isTestDoc(doc.data() as MaybeTestDataDoc))
      .map((doc) => ((doc.data() as Record<string, unknown>)[SLUG] as string | undefined) ?? doc.id)
      .filter((slug): slug is string => Boolean(slug));
    // A duplicate param crashes the build with "duplicate slug" rather than
    // being ignored, and `slug` is denormalised alongside the doc id on several
    // of these collections, so two rows CAN carry the same value.
    const unique = [...new Set(slugs)];
    if (snap.size >= MAX_PRERENDER) {
      serverLogger.warn(
        `generateStaticParams: "${label}" hit the ${MAX_PRERENDER}-document prerender budget; the remainder render on demand`,
        { section: label },
      );
    }
    return unique;
  } catch (err) {
    void normalizeError(err);
    // Fail OPEN — see property 1. Logged at error so a section silently
    // dropping to zero is greppable, matching sitemap.ts's convention.
    serverLogger.error(`generateStaticParams: "${label}" failed and prerendered 0 pages`, {
      section: label,
      error: err,
    });
    return [];
  }
}

/**
 * `/products/[slug]`.
 *
 * Scoped to the listing types whose plugin `detailRoute` actually RESOLVES to
 * this route — `standard`, `art`, `stickers` and `spares` all return
 * `ROUTES.PUBLIC.PRODUCT_DETAIL`. Every other type owns a dedicated route and
 * the page `permanentRedirect`s away from here, so prerendering one would bake
 * a redirect into the build output.
 *
 * 🛑 Imported rather than re-declared, because this list and `sitemap.ts`'s
 * drifting apart is how `spares` ended up renderable at `/products/{slug}` and
 * absent from the sitemap (measured 2026-10-24: 14 product URLs submitted
 * against 15 that resolve).
 */
export function productDetailSlugs(): Promise<string[]> {
  return slugsFrom("product", (db) =>
    db
      .collection(PRODUCT_COLLECTION)
      .where(PRODUCT_STATUS, "==", PRODUCT_STATUS_PUBLISHED)
      .where("listingType", "in", [...PRODUCT_DETAIL_LISTING_TYPES]),
  );
}

/**
 * `/brands/[slug]` — `categoryType: "brand"` rows. Brands are categories
 * discriminated by that field, not a separate collection.
 */
export function brandDetailSlugs(): Promise<string[]> {
  return slugsFrom("brand", (db) =>
    db
      .collection(CATEGORIES_COLLECTION)
      .where(CATEGORY_FIELDS.CATEGORY_TYPE, "==", "brand")
      .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true),
  );
}

/**
 * `/franchise/[slug]`.
 *
 * 🛑 Only 1 of the 8 seeded franchises is `isActive` (measured 2026-10-24) —
 * the other seven are deliberately inactive because a facet with no stock
 * "renders as a card in the grid that opens an empty page" (`brand-rows.ts`
 * trap 3). Their detail pages still RESOLVE, they are just not prerendered and
 * not advertised, which is the correct treatment for a page that exists only so
 * `CharacterHotspot`'s seventeen `/franchise/*` links land somewhere honest.
 */
export function franchiseDetailSlugs(): Promise<string[]> {
  return slugsFrom("franchise", (db) =>
    db
      .collection(CATEGORIES_COLLECTION)
      .where(CATEGORY_FIELDS.CATEGORY_TYPE, "==", "franchise")
      .where(CATEGORY_FIELDS.IS_ACTIVE, "==", true),
  );
}

/** `/blog/[slug]` — published posts only; drafts must not be prerendered. */
export function blogPostSlugs(): Promise<string[]> {
  return slugsFrom("blog", (db) =>
    db.collection(BLOG_POSTS_COLLECTION).where(BLOG_POST_FIELDS.STATUS, "==", "published"),
  );
}
