/**
 * Which PAGE paths a write to a collection makes stale.
 *
 * ## Why this exists
 *
 * Detail routes used to carry very short `revalidate` windows — 30s on
 * `collector-drops/[id]`, 60s on `products/[slug]` — not because anyone wanted that
 * freshness, but because **the window was the only freshness mechanism in the
 * app**. Measured 2026-10-09: `revalidatePath` appeared three times in the whole
 * repository, all `revalidatePath("/")`, and `revalidateTag` zero times.
 *
 * Short windows × many unique paths is how you manufacture ISR writes. 95
 * products at 60s is up to 137K regenerations/day from one route, and the
 * project was suspended for exceeding 200K ISR writes with 3.1M — the signature
 * being writes outnumbering reads 3:1, i.e. entries regenerating before anyone
 * read them twice.
 *
 * Invalidation keyed on the WRITE is both cheaper and more correct than any
 * clock: a product that changed is stale immediately, and one that did not never
 * regenerates at all.
 *
 * ## Contract
 *
 * Returns **locale-less** paths. The caller is responsible for prefixing each
 * with the locales it serves — see the revalidate route, which does that from
 * `routing.locales`, because prerendered entries live at `/en/...`.
 *
 * Paths are returned on a best-effort basis: a caller that cannot supply hints
 * still gets the always-stale list, which is the part that matters for a
 * listing. Over-revalidating is cheap (it marks an entry stale; it does not
 * render). Under-revalidating is the failure that shows a buyer a sold-out
 * listing as in stock, so when in doubt this returns MORE paths, not fewer.
 */

/** What the caller knows about the written document, when it knows anything. */
import { ROUTES } from "../../../next/routing/route-map";
import { LISTING_TYPE_REGISTRY } from "../listing-types/_registry";

export interface RevalidateHints {
  /** `standard` | `collector drop` | `pre-order` | … — picks the right detail route. */
  listingType?: string;
  /** Full ancestor chain; every category page listing this product goes stale. */
  categorySlugs?: string[];
  brandSlug?: string;
  storeId?: string;
}

/*
 * 🛑 DERIVED from `LISTING_TYPE_REGISTRY`, never hand-written.
 *
 * This file carried its own nine-entry `PRODUCT_DETAIL_BY_TYPE` literal and its
 * own `listingTypeFromId` prefix ladder, and both had already drifted by the
 * time the union reached ten — exactly the tenth-enumeration failure Root Cause
 * #61 is about. Measured 2026-10-26, while invalidating after a catalogue purge
 * that deleted 7 `spares` and 2 `stickers`:
 *
 *   - **`spares` was absent from both.** A `spare-…` id fell through to the
 *     "unknown type" branch, which marks every OTHER type's detail route and
 *     therefore never marks `/products/spare-…` — the one page that existed.
 *   - **`/art`, `/stickers` and `/spares` were never marked at all.** The browse
 *     path was derived by stripping the last segment off the detail route, and
 *     all three types detail at `/products/{slug}`, so the strip yielded
 *     `/products` and the `!== ROUTES.PUBLIC.PRODUCTS` test discarded it. Their
 *     dedicated browse pages are in `MAIN_NAV_ITEMS` and went stale on a clock.
 *
 * `browseRoute` and `slugPrefix` are required plugin fields, so a type cannot
 * join the union without answering both — which is the property the literal
 * could never have.
 */
const PLUGINS = Object.values(LISTING_TYPE_REGISTRY);

/**
 * Infer the listing type from the id prefix when no hint was supplied.
 *
 * Calls the shipped `slugPrefix` on each plugin rather than re-deriving the
 * prefix map — the same decision `audit-seed-listing-type`'s R3 makes, and the
 * reason that audit caught five `stickers-` ids against a registered
 * `sticker-` prefix. Returns `undefined` rather than `detectListingTypeFromSlug`'s
 * `"standard"` default: here, "no prefix matched" must widen to every detail
 * route, not silently narrow to one.
 */
function listingTypeFromId(id: string): string | undefined {
  for (const p of PLUGINS) {
    if (p.slugPrefix && id.startsWith(p.slugPrefix)) return p.listingType;
  }
  return undefined;
}

function productTargets(id: string | undefined, hints?: RevalidateHints): string[] {
  const out: string[] = [ROUTES.HOME, ROUTES.PUBLIC.PRODUCTS];

  if (!id) {
    /*
     * Bulk / unknown write — a seed load, a purge, or the admin "invalidate
     * everything" button. `/products` alone is not "every listing page": five
     * types are deliberately OUT of the general catalogue
     * (`inGeneralCatalogue: false`) and are reachable only at their own browse
     * route, so a bulk invalidation that marks `/products` leaves `/collector-drops`,
     * `/pre-orders`, `/random-lots`, `/art`, `/stickers` and `/spares` serving
     * rows that no longer exist.
     */
    for (const p of PLUGINS) if (p.browseRoute) out.push(String(p.browseRoute));
    return Array.from(new Set(out));
  }

  const type = hints?.listingType ?? listingTypeFromId(id);
  const plugin = type ? LISTING_TYPE_REGISTRY[type as keyof typeof LISTING_TYPE_REGISTRY] : undefined;
  if (plugin) {
    out.push(String(plugin.detailRoute(id)));
    // The type's own browse page. Read off the plugin, NOT derived by stripping
    // the detail route's last segment: art/stickers/spares all detail at
    // `/products/{slug}`, so stripping yields `/products` and loses `/art`,
    // `/stickers` and `/spares` entirely.
    if (plugin.browseRoute) out.push(String(plugin.browseRoute));
  } else {
    /*
     * Unknown type: revalidate EVERY detail and browse route for this id rather
     * than guessing one. A couple of dozen entries marked stale, none of which
     * renders until requested — strictly cheaper than leaving the real one live.
     */
    for (const p of PLUGINS) {
      out.push(String(p.detailRoute(id)));
      if (p.browseRoute) out.push(String(p.browseRoute));
    }
  }

  // A product's price/stock/status is rendered on every taxonomy page that
  // lists it. `categorySlugs` is the full ancestor chain, so this covers the
  // leaf and every parent up to the root.
  for (const slug of hints?.categorySlugs ?? []) out.push(`/categories/${slug}`);
  if (hints?.brandSlug) out.push(`/brands/${hints.brandSlug}`);
  if (hints?.storeId) out.push(`/stores/${hints.storeId}`);

  return out;
}

/**
 * Page paths made stale by a write to `collection`.
 *
 * `id` and `hints` are optional; omitting them yields only the always-stale
 * listing pages, which is the correct answer for a bulk or unknown write.
 */
export function revalidateTargetsFor(
  collection: string,
  id?: string,
  hints?: RevalidateHints,
): string[] {
  let paths: string[];
  switch (collection) {
    case "products":
      paths = productTargets(id, hints);
      break;
    case "categories":
      // Brands and pricing bundles are `categories` rows discriminated by
      // `categoryType`, so all three detail shapes are marked.
      paths = [ROUTES.HOME, ROUTES.PUBLIC.CATEGORIES];
      if (id) paths.push(`/categories/${id}`, `/brands/${id}`, `/bundles/${id}`);
      break;
    case "blogPosts":
      paths = [ROUTES.HOME, ROUTES.BLOG.LIST];
      if (id) paths.push(`/blog/${id}`);
      break;
    case "events":
      paths = [ROUTES.HOME, ROUTES.PUBLIC.EVENTS];
      if (id) paths.push(`/events/${id}`);
      break;
    case "reviews":
      // A new review changes the product's rating and the homepage stat.
      paths = [ROUTES.HOME, ROUTES.PUBLIC.REVIEWS];
      break;
    case "stores":
      paths = [ROUTES.HOME, ROUTES.PUBLIC.STORES];
      if (id) paths.push(`/stores/${id}`);
      break;
    case "carouselSlides":
    case "homepageSections":
    case "siteSettings":
      paths = ["/"];
      break;
    case "faqs":
      paths = [ROUTES.HOME, ROUTES.PUBLIC.FAQS];
      break;
    default:
      paths = [];
  }
  return Array.from(new Set(paths));
}
