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
import { BEYS_COLLECTION } from "../../../../features/beys/schemas/firestore";
import { PART_GLOSSARY_COLLECTION, ALL_PART_SLOTS } from "../../../../features/parts/schemas/firestore";
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
 * Sized to clear today's real counts with room: 15 products, 28 brands, 22
 * posts, 1 active franchise, **1,988 beys and 2,488 parts** (measured
 * 2026-10-24). The two reference corpora are what set this number.
 *
 * 🛑 Hitting the budget TRUNCATES silently in SEO terms — the remainder still
 * render on demand and still work, they just go back to streaming their
 * metadata. Both call sites therefore log when they saturate it, because
 * "some pages quietly stopped being prerendered" is exactly the kind of
 * regression that reads as normal.
 *
 * 🛑 Prerendering ~4,500 extra pages has a real build cost, and a cold build
 * on this repo already peaks near 8,100 MB against Hobby's 8,192 MB ceiling.
 * Measure before and after with
 * `node scripts/probe-build-docker.mjs --peak --memory 7g --cpus 2 --runs 3`
 * rather than assuming it fits.
 */
const MAX_PRERENDER = 5000;

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

/**
 * `/beys/[slug]` — 1,988 model reference pages.
 *
 * These carry real data (type, system, weight, spin, release code, parts) and
 * were invisible to search: zero in the sitemap, and no `<title>` in `<head>`
 * because the route is dynamic. The id IS the slug here, so the shared
 * `slugsFrom` projection applies unchanged.
 */
export function beyDetailSlugs(): Promise<string[]> {
  return slugsFrom("bey", (db) => db.collection(BEYS_COLLECTION));
}

/**
 * `/parts/[classification]/[code]` — 2,488 part reference pages.
 *
 * Two params, so this cannot use `slugsFrom`: the document id is
 * `{slot}--{tail}` and the route splits it across both segments. The URL
 * segment IS the slot (`partSlotFromSegment` is an identity lookup against
 * `ALL_PART_SLOTS`), so the split is the whole derivation.
 *
 * 🛑 Ids carrying no `--`, or an unrecognised slot, are SKIPPED rather than
 * guessed at — a prerendered param that does not resolve is a build-time 404
 * baked into the output. The count of skips is logged so a generator change
 * that breaks the id shape is visible rather than silently halving the set.
 */
export async function partDetailParams(): Promise<{ classification: string; code: string }[]> {
  try {
    const snap = await getAdminDb()
      .collection(PART_GLOSSARY_COLLECTION)
      .select()
      .limit(MAX_PRERENDER)
      .get();
    const slots = new Set<string>(ALL_PART_SLOTS as readonly string[]);
    let skipped = 0;
    const params: { classification: string; code: string }[] = [];
    for (const doc of snap.docs) {
      const sep = doc.id.indexOf("--");
      const classification = sep === -1 ? "" : doc.id.slice(0, sep);
      const code = sep === -1 ? "" : doc.id.slice(sep + 2);
      if (!code || !slots.has(classification)) {
        skipped++;
        continue;
      }
      params.push({ classification, code });
    }
    if (skipped > 0) {
      serverLogger.warn(
        `generateStaticParams: "part" skipped ${skipped} glossary id(s) that are not {slot}--{tail}`,
        { section: "part", skipped },
      );
    }
    if (snap.size >= MAX_PRERENDER) {
      serverLogger.warn(
        `generateStaticParams: "part" hit the ${MAX_PRERENDER}-document prerender budget; the remainder render on demand`,
        { section: "part" },
      );
    }
    return params;
  } catch (err) {
    void normalizeError(err);
    serverLogger.error('generateStaticParams: "part" failed and prerendered 0 pages', {
      section: "part",
      error: err,
    });
    return [];
  }
}
