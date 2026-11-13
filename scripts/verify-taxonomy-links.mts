/**
 * verify-taxonomy-links — a taxonomy tile must point at an OPEN surface.
 *
 * 🛑 THE DEFECT THIS EXISTS FOR DISAPPEARED A WHOLE HOMEPAGE BAND, SILENTLY.
 *
 * `ShopByCategorySection` linked each tile to `/categories/<slug>` and
 * `BrandsSection` to `/brands/<slug>`. Both 404 by decision
 * (`browsePages.*: false` → `guardBrowsePage` → `notFound()` on the subtree).
 * `HOMEPAGE_SECTION_BROWSE_PAGE` then correctly stripped any band funnelling
 * into a closed browse page — so the category and brand sections never
 * rendered at all.
 *
 * ⚠ The visible symptom was an ABSENT SECTION, not a broken link, and nothing
 * reported it. Four independent checks were green while the band was gone:
 *
 *     /api/categories?tier=0   → 6 roots          ✅
 *     section-renderer map     → `categories` present ✅
 *     homepageSections row     → enabled, order 5 ✅
 *     Firestore composite index→ READY            ✅
 *
 * Every one of them sat DOWNSTREAM of the gate that removed the section. That
 * is why this check is about the LINK rather than about the band: the link is
 * the only thing upstream.
 *
 * Run: npx tsx scripts/verify-taxonomy-links.mts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ROUTES } from "../src/next/routing/route-map";

const here = dirname(fileURLToPath(import.meta.url));
const src = (p: string) => readFileSync(join(here, "..", "src", p), "utf8");

let fail = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) fail += 1;
  console.log(`  ${ok ? "✅" : "🛑"} ${label}${detail ? `  — ${detail}` : ""}`);
};

console.log("\n  ── the helpers build a filter, not a destination ──\n");
check(
  ROUTES.PUBLIC.PRODUCTS_BY_CATEGORY("tops") === "/products?category=tops",
  "PRODUCTS_BY_CATEGORY builds a /products filter",
  ROUTES.PUBLIC.PRODUCTS_BY_CATEGORY("tops"),
);
check(
  ROUTES.PUBLIC.PRODUCTS_BY_BRAND("hasbro") === "/products?brand=hasbro",
  "PRODUCTS_BY_BRAND builds a /products filter",
  ROUTES.PUBLIC.PRODUCTS_BY_BRAND("hasbro"),
);
/* A slug with a slash or ampersand must not escape the query parameter. */
check(
  ROUTES.PUBLIC.PRODUCTS_BY_CATEGORY("a/b&c=1") === "/products?category=a%2Fb%26c%3D1",
  "slugs are URL-encoded — a slug cannot inject another parameter",
  ROUTES.PUBLIC.PRODUCTS_BY_CATEGORY("a/b&c=1"),
);

console.log("\n  ── no taxonomy BAND links to a closed browse page ──\n");

/*
 * 🛑 Source-level, deliberately. The alternative is rendering the components,
 * which needs a React tree, a query client and a session — and the thing that
 * actually broke is one identifier at one call site, which source can see
 * exactly. ⚠ The weakness of a source check is that a comment can satisfy it,
 * so each pattern below excludes comment lines.
 */
const BANDS: { file: string; closed: RegExp; open: RegExp; name: string }[] = [
  {
    name: "ShopByCategorySection tile",
    file: "features/homepage/components/ShopByCategorySection.tsx",
    closed: /^\s*href=\{resolveSectionHref\(ROUTES\.PUBLIC\.CATEGORY_DETAIL/m,
    open: /^\s*href=\{resolveSectionHref\(ROUTES\.PUBLIC\.PRODUCTS_BY_CATEGORY/m,
  },
  {
    name: "BrandsSection tile",
    file: "features/homepage/components/BrandsSection.tsx",
    closed: /^\s*href=\{resolveSectionHref\(ROUTES\.PUBLIC\.BRAND_DETAIL/m,
    open: /^\s*href=\{resolveSectionHref\(ROUTES\.PUBLIC\.PRODUCTS_BY_BRAND/m,
  },
];

for (const b of BANDS) {
  const text = src(b.file);
  check(b.open.test(text), `${b.name} links to a FILTER`);
  check(!b.closed.test(text), `${b.name} does NOT link to the closed detail route`);
}

/* The band's "see all" must not land on a closed index either. */
const renderer = src("features/homepage/lib/section-renderer.tsx");
const viewMoreClosed = [...renderer.matchAll(/viewMoreHref=\{ROUTES\.PUBLIC\.(CATEGORIES|BRANDS)\}/g)];
check(
  viewMoreClosed.length === 0,
  "no band's 'see all' points at the closed /categories or /brands index",
  viewMoreClosed.length ? `${viewMoreClosed.length} still do` : "none",
);

console.log("\n  ── the gate no longer strips a band that points somewhere open ──\n");
const view = src("features/homepage/components/MarketplaceHomepageView.tsx");
const gateBlock = /HOMEPAGE_SECTION_BROWSE_PAGE[^=]*=\s*\{([\s\S]*?)\};/.exec(view)?.[1] ?? "";
const gateEntries = [...gateBlock.matchAll(/^\s*([a-z-]+):\s*"/gm)].map((m) => m[1]);
check(!gateEntries.includes("categories"), "`categories` is not browse-page gated");
check(!gateEntries.includes("brands"), "`brands` is not browse-page gated");
/*
 * 🛑 And `stores` MUST still be gated. R1 is single-vendor: there is no store
 * directory, and "filter by store" over one store is not a thing a buyer
 * wants. Removing all three would have been the lazy fix.
 */
check(gateEntries.includes("stores"), "`stores` IS still gated — R1 is single-vendor", gateEntries.join(", "));

console.log(`\n${fail === 0 ? "✅ taxonomy links point at open surfaces" : `🛑 ${fail} failure(s)`}`);
process.exit(fail === 0 ? 0 : 1);
