/**
 * Which PAGE paths a write to a collection makes stale.
 *
 * ## Why this exists
 *
 * Detail routes used to carry very short `revalidate` windows — 30s on
 * `auctions/[id]`, 60s on `products/[slug]` — not because anyone wanted that
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
export interface RevalidateHints {
  /** `standard` | `auction` | `pre-order` | … — picks the right detail route. */
  listingType?: string;
  /** Full ancestor chain; every category page listing this product goes stale. */
  categorySlugs?: string[];
  brandSlug?: string;
  storeId?: string;
}

/** Detail route per listing type. Mirrors `ListingTypePlugin.detailRoute`. */
const PRODUCT_DETAIL_BY_TYPE: Readonly<Record<string, (id: string) => string>> = {
  standard: (id) => `/products/${id}`,
  art: (id) => `/products/${id}`,
  stickers: (id) => `/products/${id}`,
  auction: (id) => `/auctions/${id}`,
  "pre-order": (id) => `/pre-orders/${id}`,
  "prize-draw": (id) => `/prize-draws/${id}`,
  classified: (id) => `/classified/${id}`,
  "digital-code": (id) => `/digital-codes/${id}`,
  live: (id) => `/live/${id}`,
};

/**
 * Infer the listing type from the id prefix when no hint was supplied.
 *
 * The slug prefix system (CLAUDE.md § Slug Prefix System) makes this reliable
 * for seeded and generated ids — `auction-…`, `preorder-…`, `prizedraw-…` — and
 * it is only a fallback: the Firestore trigger reads the document and passes
 * `listingType` explicitly.
 */
function listingTypeFromId(id: string): string | undefined {
  if (id.startsWith("auction-")) return "auction";
  if (id.startsWith("preorder-")) return "pre-order";
  if (id.startsWith("prizedraw-")) return "prize-draw";
  if (id.startsWith("classified-")) return "classified";
  if (id.startsWith("digitalcode-")) return "digital-code";
  if (id.startsWith("live-")) return "live";
  if (id.startsWith("art-")) return "art";
  if (id.startsWith("sticker-")) return "stickers";
  if (id.startsWith("product-")) return "standard";
  return undefined;
}

function productTargets(id: string | undefined, hints?: RevalidateHints): string[] {
  const out: string[] = ["/", "/products"];
  if (!id) return out;

  const type = hints?.listingType ?? listingTypeFromId(id);
  if (type && PRODUCT_DETAIL_BY_TYPE[type]) {
    out.push(PRODUCT_DETAIL_BY_TYPE[type](id));
    // The type's own browse page, when it has one distinct from /products.
    const browse = PRODUCT_DETAIL_BY_TYPE[type](id).replace(/\/[^/]+$/, "");
    if (browse && browse !== "/products") out.push(browse);
  } else {
    /*
     * Unknown type: revalidate EVERY detail route for this id rather than
     * guessing one. At most nine entries marked stale, none of which renders
     * until requested — strictly cheaper than leaving the real one live.
     */
    for (const build of Object.values(PRODUCT_DETAIL_BY_TYPE)) out.push(build(id));
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
      paths = ["/", "/categories"];
      if (id) paths.push(`/categories/${id}`, `/brands/${id}`, `/bundles/${id}`);
      break;
    case "blogPosts":
      paths = ["/", "/blog"];
      if (id) paths.push(`/blog/${id}`);
      break;
    case "events":
      paths = ["/", "/events"];
      if (id) paths.push(`/events/${id}`);
      break;
    case "reviews":
      // A new review changes the product's rating and the homepage stat.
      paths = ["/", "/reviews"];
      break;
    case "stores":
      paths = ["/", "/stores"];
      if (id) paths.push(`/stores/${id}`);
      break;
    case "carouselSlides":
    case "homepageSections":
    case "siteSettings":
      paths = ["/"];
      break;
    case "faqs":
      paths = ["/", "/faqs"];
      break;
    default:
      paths = [];
  }
  return Array.from(new Set(paths));
}
