import { Row, SIEVE_OP, sieveAnd, sieveFilter } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React from "react";
import { categoryCrumbs, withTrailHead } from "../utils/breadcrumb-chain";
import { ownTotalFor, descendantTotalFor } from "../schemas/category-counts";
import Link from "next/link";
import {
  categoriesRepository,
  productRepository,
  storeRepository,
} from "../../../repositories";
import { Container, Div, Heading, Main, Section, Span, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { RichTextRenderer } from "../../../ui/rich-text/RichTextRenderer";
import { CategoryDetailTabs } from "./CategoryDetailTabs";
import { CategoryGrid } from "./CategoryGrid";
import { CategoryHighlightsAndFaqSection } from "./CategoryHighlightsAndFaqSection";
import { BreadcrumbTrail } from "./BreadcrumbTrail";
import { LastCategoryBeacon } from "./LastCategoryBeacon";
import { GroupedListingsCarousel } from "../../grouped/components/GroupedListingsCarousel";
import { ModelCompositionPanel } from "../../parts/components/ModelCompositionPanel";
import { getCompositionsForCategory } from "../../../_internal/server/features/parts/data";
import { ROUTES } from "../../../next/routing/route-map";
import { getGroupsForCategory } from "../../../_internal/server/features/grouped/data";
import {
  listingTabCounts,
  type ListingTabCounts,
} from "../../../_internal/server/features/products/listing-tab-counts";
import { CATEGORY_PAGE_TABS } from "../../products/constants/listing-tabs";
import { enabledCategoryTypes, enabledListingTypes } from "../../../_internal/shared/listing-types/feature-flags";
import { siteSettingsRepository } from "../../../repositories";
import { safeRead } from "../../../errors/safe-read";
import {
  breadcrumbJsonLd,
  collectionPageJsonLd,
  faqJsonLd,
} from "../../../seo/json-ld";
import type { CategoryItem } from "../types";
import { toStoreListItem } from "../../../_internal/server/features/stores/adapters";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";

const __O = {
  hidden: "overflow-hidden",
  xAuto: "overflow-x-auto",
} as const;

/**
 * Read and display bounds for this page. Every one of these replaced an
 * unbounded read — see the comments at each use site for what each one cost.
 */
/** Tiles rendered in "Related Categories". A sample, not an index. */
const RELATED_CATEGORY_LIMIT = 24;
/** Documents read to fill those tiles. Headroom for the non-listing filter. */
const RELATED_CATEGORY_FETCH = 60;
/** Descendant slugs the Stores tab will match on → at most 4 chunked queries. */
const STORE_CATEGORY_SLUG_MAX = 120;

export interface CategoryDetailPageViewProps {
  slug: string;
}

export async function CategoryDetailPageView({ slug }: CategoryDetailPageViewProps) {
  // The category IS this page's subject — a read failure must surface rather
  // than render an anonymous, empty category page. `undefined` still means
  // "no such category slug".
  const categoryDoc = await categoriesRepository.getCategoryBySlug(slug);
  const category = (categoryDoc ?? undefined) as CategoryItem | undefined;
  /*
   * 🛑 Read from the DOCUMENT, not from the `CategoryItem` cast.
   *
   * `contentBody` is deliberately PRIVATE on the list projection — it is
   * 400–900 chars of HTML per row and `CategoryInlineSelect` fetches 200 rows
   * on every seller-form open, so publishing it there would be the
   * Fast-Origin-Transfer shape of Root Cause #104. Adding it to `CategoryItem`
   * to satisfy this one render site would invite exactly that. The detail page
   * holds the whole document server-side, which is what the adapter's own
   * comment says this field's reader does.
   */
  const contentBody =
    typeof categoryDoc?.contentBody === "string" ? categoryDoc.contentBody : null;

  // Products carry their FULL ancestor chain in `categorySlugs`, so matching on
  // this category's own id already returns the whole subtree — no descendant
  // expansion needed. Expanding it was also a latent outage: `categoriesIn` is
  // applied as `array-contains-any`, which Firestore caps at 30 values, and
  // every caller here wraps the query in `.catch(() => null)` — so a category
  // tree deeper than a couple of levels would have turned into a silently blank
  // page rather than an error (Root Cause #59).
  const categoriesIn = category?.id ? [category.id] : null;

  const [productsResult, tabCounts, bundlesResult, childCategories, rootSiblingCategories, groupedListings, settings, liveCounts, compositions] = await Promise.all([
    categoriesIn
      ? safeRead<Awaited<ReturnType<typeof productRepository.list>> | null>(
          () =>
            productRepository.list(
              {
                filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("listingType", SIEVE_OP.EQ, "standard")),
                sorts: sortBy("createdAt", "DESC"),
                page: 1,
                pageSize: 24,
              },
              { categoriesIn },
            ),
          { route: "/categories/[slug]", key: "category.products", fallback: null },
        )
      : Promise.resolve(null),
    // One count per tab, derived from CATEGORY_PAGE_TABS itself — so every
    // listing type is counted and a type with nothing in this category hides.
    // Four of the ten tabs used to have no count at all and could never hide.
    categoriesIn
      ? listingTabCounts(CATEGORY_PAGE_TABS, { categoriesIn })
      : Promise.resolve({} as ListingTabCounts),
    // SB-UNI-D — bundles fetched from the categories collection. We pull
    // all active bundle rows; the carousel filters by category affinity.
    categoriesIn
      ? safeRead(
          () =>
            categoriesRepository
              .listByType("bundle", { activeOnly: true, limit: 50 })
              .then(hidePublicTestData),
          { route: "/categories/[slug]", key: "category.bundles", fallback: [] },
        )
      : Promise.resolve([]),
    /*
     * Every DESCENDANT, not just the direct children this used to fetch. A
     * four-tier tree showed only tier+1 here, so the whole lower half of the
     * catalogue was unreachable from the page that is supposed to be its index —
     * you had to already know a sub-sub-category existed to navigate to it.
     * `getDescendants` is one array-contains query over `parentIds`, which holds
     * the full ancestor chain, so depth costs nothing extra.
     */
    category?.id
      ? safeRead(() => categoriesRepository.getDescendants(category.id), {
          route: "/categories/[slug]",
          key: "category.descendants",
          fallback: [],
        }) as unknown as Promise<CategoryItem[]>
      : Promise.resolve([] as CategoryItem[]),
    // Related categories — every other category sharing this category's root
    // (siblings + cousins across the tree, up to the tier-0/1/2 depth the
    // catalog actually uses), not just direct children.
    //
    // 🛑 BOUNDED. This read is a display grid, and it used to be an unbounded
    // `.get()` over the whole root subtree — ~9% of a 50K/day Firestore budget
    // for one page render once the forest reaches ~330 nodes, and it rendered
    // every one of those as a tile. The section is a SAMPLE of nearby
    // categories; the tier-grouped children grid above it is the real index.
    // Fetch headroom is larger than the display cap because the filter below
    // drops this category plus every brand/bundle/sublisting row.
    // `buildTree` still passes no limit — a truncated node list there would
    // silently drop whole branches.
    category?.rootId
      ? safeRead(() => categoriesRepository.getCategoriesByRootId(category.rootId!, { limit: RELATED_CATEGORY_FETCH }), {
          route: "/categories/[slug]",
          key: "category.rootSiblings",
          fallback: [],
        }) as unknown as Promise<CategoryItem[]>
      : Promise.resolve([] as CategoryItem[]),
    category?.slug
      ? safeRead(() => getGroupsForCategory(category.slug), {
          route: "/categories/[slug]",
          key: "category.groupedListings",
          fallback: [] as Awaited<ReturnType<typeof getGroupsForCategory>>,
        })
      : Promise.resolve([]),
    // Listing/category-type feature flags. This page accepted the props all
    // along but never passed them, so an admin disabling a listing type still
    // saw its tab here while the store page correctly hid it.
    safeRead(() => siteSettingsRepository.findById("global"), {
      route: "/categories/[slug]",
      key: "category.siteSettings",
      fallback: null,
    }),
    /*
     * G3b — this category's OWN vs ROLLUP counts, so the page can say "1 here,
     * 53 in subcategories" instead of one ambiguous number.
     *
     * 🛑 ONE document by id, not a query — `categoryCounts/{id}` holds both
     * figures, so the distinction costs a single read and `getAll` is not even
     * needed. Added to this `Promise.all`, so it is PARALLEL with the other
     * seven and adds no latency: Rule #6's budget is ~3 SEQUENTIAL round trips,
     * and the plan's warning that "a sidecar collection would add an eighth"
     * was about latency, which parallelism answers.
     *
     * 🛑 `null` on failure, never a zero. An unknown count must stay
     * distinguishable from a count of nothing (Root Cause #72), so the caller
     * falls back to the single `metrics` figure and renders exactly as before.
     */
    category?.id
      ? safeRead(
          () => categoriesRepository.getLiveCounts(category.id),
          { route: "/categories/[slug]", key: "category.liveCounts", fallback: null },
        )
      : Promise.resolve(null),
    /*
     * D12 — the PART COMPOSITION, when this category is a named model.
     *
     * 🛑 ONE indexed equality on `categoryId`, added to this same
     * `Promise.all` for the reason G3b's read above records: Rule #6's budget
     * is ~3 SEQUENTIAL round trips, and a ninth PARALLEL read adds no
     * latency. The plan's "a sidecar collection would add an eighth read"
     * warning was about latency; parallelism is the answer to it, and the
     * sibling collection is what keeps `onCategoryWrite` — which calls
     * `notifyRevalidate` unconditionally — from dropping this page's ISR
     * entry every time a composition is reseeded.
     *
     * 🛑 Resolved against this category's OWN id, so only a model leaf gets a
     * panel. A line or generation node matches nothing and renders nothing,
     * which is correct: "Burst GT" is not made of parts, the beys under it
     * are. 210 of 259 compositions joined to a category, so the 49 that did
     * not simply render no panel rather than a wrong one.
     */
    category?.id
      ? safeRead(() => getCompositionsForCategory(category.id), {
          route: "/categories/[slug]",
          key: "parts.compositionsForCategory",
          fallback: [],
        })
      : Promise.resolve([]),
  ]);

  const relatedCategories = rootSiblingCategories
    .filter((c) => c.id !== category?.id && (!c.categoryType || c.categoryType === "category"))
    .slice(0, RELATED_CATEGORY_LIMIT);

  // Stores tab — stores whose storeCategory is this category or ANY descendant.
  //
  // `storeCategory` is a single slug with no ancestor chain (unlike a product's
  // categorySlugs), so the descendant list genuinely is needed here. It used to
  // use direct children only, which meant a store filed under a tier-3 category
  // was invisible on its root's Stores tab, and it issued one query per slug —
  // an unbounded N+1. Both are fixed by pipe-joining the slugs into OR-groups:
  // the enhanced Sieve adapter turns a same-field OR into a Firestore `in`,
  // which caps at 30 values, hence the chunking.
  //
  // 🛑 The descendant ids are REUSED from `childCategories` above, not fetched
  // again. `getDescendantIds` is literally `getDescendants().map(d => d.id)`,
  // so calling it here ran the identical paginated subtree query a second time
  // and threw the documents away — on a ~330-node root that is ~330 wasted
  // reads per page view, and the two answers could disagree if one read failed
  // while the other succeeded.
  //
  // 🛑 And the fan-out is CAPPED, nearest-first. One `listStores` query per 30
  // slugs is 11 queries at ~330 nodes and 51 at ~1,500; sorting by tier takes
  // the closest descendants, which is what someone browsing a root cares
  // about. `storeCount` was already a floor (each chunk caps at pageSize 50),
  // so this tightens a floor rather than making an exact number wrong.
  const descendantIdsByProximity = [...childCategories]
    .sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))
    .map((c) => c.id);
  const storeCategorySlugs = [slug, ...descendantIdsByProximity]
    .filter(Boolean)
    .slice(0, STORE_CATEGORY_SLUG_MAX);
  const SLUG_CHUNK = 30;
  const slugChunks: string[][] = [];
  for (let i = 0; i < storeCategorySlugs.length; i += SLUG_CHUNK) {
    slugChunks.push(storeCategorySlugs.slice(i, i + SLUG_CHUNK));
  }
  const storeResults = await Promise.all(
    slugChunks.map((chunk) =>
      safeRead<Awaited<ReturnType<typeof storeRepository.listStores>> | null>(
        () =>
          storeRepository.listStores(
            { filters: sieveFilter("storeCategory", SIEVE_OP.EQ, chunk.join("|")), page: 1, pageSize: 50 },
            true,
          ),
        { route: "/categories/[slug]", key: "category.stores", fallback: null },
      ),
    ),
  );
  const seen = new Set<string>();
  const categoryStores = storeResults
    .flatMap((r) => r?.items ?? [])
    .filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    /*
     * 🛑 F1 #28 CLOSED — this was a SIXTH hand-rolled copy of
     * `toStoreListItem`, the adapter Root Cause #70 created to collapse the
     * three that existed then and which three public store APIs now share.
     *
     * It was recorded as "not a drive-by fix" because the adapter lives in
     * `_internal/server/` and this file in `features/`, making adoption an
     * import-graph decision. MEASURED, that decision is free: the adapter
     * module's only imports are two `import type` lines, and this file already
     * imports four other `_internal/server/*` modules (parts, grouped,
     * listing-tab-counts, tester visibility). So the boundary argument did not
     * apply to this particular module, and the copy stayed alive on a
     * hypothetical.
     *
     * The behavioural differences the copy carried, both now gone: it defaulted
     * `storeSlug` to the id and `isPublic` to `true` (the adapter forwards what
     * the document says, and a store with no `isPublic` is not assumed public),
     * and it cast `createdAt` through `as unknown as string` where the adapter
     * converts a Timestamp properly.
     */
    .map((s) => toStoreListItem(s));

  const storeCount = categoryStores.length;
  // `tabCounts` is keyed by tabSlug and already covers every listing type plus
  // bundles; `stores` is added here because this page resolves its store list
  // eagerly to render the tab body anyway.
  const counts: ListingTabCounts = { ...tabCounts, stores: storeCount };

  // Header pills read the same numbers the tabs do. `?? 0` is safe here (a pill
  // simply doesn't render) — unlike the tab bar, where an unknown count must
  // stay visible rather than collapse to "hide me".
  const productCount = counts.products ?? category?.metrics?.totalProductCount ?? category?.metrics?.productCount ?? 0;
  const auctionCount = counts.auctions ?? category?.metrics?.totalAuctionCount ?? category?.metrics?.auctionCount ?? 0;
  const preOrderCount = counts["pre-orders"] ?? 0;

  /*
   * G3b — OWN vs CHILDREN, so one number stops answering two questions.
   *
   * 🛑 `total` ALREADY INCLUDES `own`, so these are never added: the children
   * figure is `total − own`, derived by `descendantTotalFor`. Summing them
   * double-counts everything filed directly here, and on a LEAF — where
   * `total === own` — it doubles the whole count.
   *
   * Verified across the live tree: for all 67 branch nodes
   * `own + Σ(direct children's total) === total` exactly, and for all 314
   * leaves `total === own`. The root reads `own 1 + children 53 = 54`.
   *
   * 🛑 Shown only when there IS something below. On a leaf the children figure
   * is 0 and "0 in subcategories" is noise that reads as a missing number
   * rather than an inapplicable one — the same reason the invoice table hides
   * its HSN column when no line carries one.
   *
   * `undefined` when no counts document exists yet, so nothing renders and the
   * single `metrics` figure above stands unchanged.
   */
  const ownHere = liveCounts ? ownTotalFor(liveCounts) : undefined;
  const inSubcategories = liveCounts ? descendantTotalFor(liveCounts) : undefined;
  const showCountSplit =
    ownHere !== undefined && inSubcategories !== undefined && inSubcategories > 0;

  const coverImage = category?.display?.coverImage;
  const hasCover = Boolean(coverImage);

  /*
   * ── D4: structured data. This page emitted NONE ─────────────────────────
   *
   * Verified before building: zero `ld+json` anywhere under
   * `features/categories/`, and `collectionPageJsonLd`/`itemListJsonLd` did
   * not exist at all. Meanwhile worldhobbyshop — the SEO leader of the fifteen
   * crawled — ships a 6-level `BreadcrumbList` plus a `CollectionPage`, and no
   * Shopify competitor has either. §5 ranks this the highest-impact SEO change
   * in the plan.
   *
   * 🛑 It costs ZERO extra reads. The route is already fully dynamic SSR, and
   * `ancestors[]`, `name`, `description`, `faqs` and the counts all ride reads
   * this component already performs — which is why it was worth doing here
   * rather than deferring it behind a data change.
   */
  const categoryPath = String(ROUTES.PUBLIC.CATEGORY_DETAIL(slug));

  /*
   * 🛑 SORTED BY TIER, not trusted in stored order.
   *
   * My first version asserted `ancestors[]` is stored root-first and used it as
   * given. The existing `BreadcrumbTrail` — the visible breadcrumb on this very
   * page — explicitly does `.sort((a, b) => a.tier - b.tier)` before rendering,
   * so the stored order is NOT relied on anywhere else either. Following the
   * precedent rather than my assumption: a `BreadcrumbList` is the one node
   * whose entire value is the order, and a leaf announced before its parent is
   * worse than no breadcrumb at all.
   *
   * `.slice()` first because `sort` mutates, and this array came off the
   * category document that the rest of the render still reads.
   *
   * The URL uses `ancestor.id`, matching `BreadcrumbTrail` — `CategoryAncestor`
   * carries `id`/`name`/`tier` and no `slug`.
   */
  /*
   * D4b — ONE chain builder shared with the brand page, the product pages and
   * the visible `BreadcrumbTrail`, so a crawler and a visitor cannot be shown
   * different hierarchies for this page. `categoryCrumbs` sorts by tier (never
   * trusting stored order), omits an ancestor it cannot label rather than
   * leaving a gap, and `withTrailHead` drops the last crumb's URL because the
   * final breadcrumb is the page you are on.
   */
  const trail = withTrailHead(
    categoryCrumbs({
      name: category?.name ?? "Category",
      url: categoryPath,
      ancestors: category?.ancestors,
      hrefFor: (id) => String(ROUTES.PUBLIC.CATEGORY_DETAIL(id)),
    }),
    [
      { name: "Home", url: "/" },
      { name: "Categories", url: String(ROUTES.PUBLIC.CATEGORIES) },
    ],
  );
  /*
   * 🛑 ONE ARRAY, two surfaces. The visible trail below renders `trail` and the
   * markup here serialises the same `trail` — so they cannot disagree, which is
   * exactly what happened while the page hand-rolled a three-crumb `<Nav>`
   * beside an eight-crumb `BreadcrumbList`.
   */
  const ldBreadcrumb = breadcrumbJsonLd(trail);

  /*
   * 🛑 Items are the CHILD CATEGORIES, not the products.
   *
   * Two reasons, and the second is the one that matters. A product list would
   * want prices to be useful markup, and a price here is blocked outright
   * (`audit-guest-price-leak` R3) because the page shows none to a signed-out
   * crawler — which is exactly what hobbykartindia does and §2 records as the
   * thing not to copy. And a category page's real contribution to a crawl is
   * TAXONOMY ROUTING: telling the crawler which sub-collections exist is what
   * made worldhobbyshop's 6-level tree its biggest edge, and it is the one
   * thing a grid of product cards does not say in markup.
   */
  const ldCollection = collectionPageJsonLd({
    name: category?.name ?? "Category",
    url: categoryPath,
    ...(category?.description ? { description: category.description } : {}),
    items: childCategories.map((c) => ({
      name: c.name,
      url: String(ROUTES.PUBLIC.CATEGORY_DETAIL(c.id)),
    })),
    /*
     * The real total, so page 1 of a paginated collection does not declare the
     * collection's size as this page's length — the list-envelope lesson,
     * applied to markup.
     */
    totalItems: childCategories.length,
  });

  /*
   * 🛑 Per-category FAQs, which is the tcgindia pattern nobody else in the
   * crawl uses and which no page here emitted. Omitted entirely when the
   * category has none — an empty `FAQPage` is a claim that there are no
   * questions, which is different from having nothing to say.
   */
  const ldFaq =
    category?.faqs && category.faqs.length > 0
      ? faqJsonLd(category.faqs.map((f) => ({ question: f.question, answer: f.answer })))
      : null;

  return (
    <Main>
      {/* One script per node, which is what every other page here does — a
          single @graph would also be valid but would make the three
          independently-omittable nodes a single all-or-nothing blob. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldCollection) }}
      />
      {ldFaq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldFaq) }}
        />
      )}
      {/* ── Hero / Banner ───────────────────────────────────────────────── */}
      <Section className={`relative ${__O.hidden} ${hasCover ? "min-h-[220px] md:min-h-[280px]" : "bg-[var(--appkit-color-bg)]"}`}>
        {hasCover && (
          <>
            <Div className="absolute inset-0">
              <MediaImage src={coverImage} alt="" size="banner" />
            </Div>
            <Div surface="overlay-md" className="absolute inset-0" />
          </>
        )}

        <Div className="relative z-10 max-w-7xl mx-auto" paddingY={hasCover ? "y-3xl" : "y-xl"} padding="x-md">
          {/*
            * 🛑 ONE trail component, fed the SAME `trail` array the JSON-LD
            * above serialises. This was a hand-rolled `<Nav>` with
            * `text-white/70` conditionals — three crumbs, no collapse — beside
            * a `BreadcrumbList` carrying the full chain, so a tier-4 category
            * showed a visitor three levels and a crawler eight. The cover-photo
            * ink it existed for is now `tone="on-media"` on the primitive.
            */}
          <BreadcrumbTrail
            crumbs={trail}
            className="mb-4"
            tone={hasCover ? "on-media" : "default"}
          />
          {/* Records this category for a product page's contextual trail (I5b).
              sessionStorage, one key, no network. */}
          {category?.id && <LastCategoryBeacon categoryId={category.id} />}

          {/* Title + metrics */}
          <Heading color="inverse" level={1} className={`mb-2 ${hasCover ? "" : "text-[var(--appkit-color-text)]"}`} size="3xl" mdSize="4xl" weight="bold">
            {category?.name ?? slug}
          </Heading>

          {category?.description && typeof category.description === "string" && !category.description.startsWith("{") && (
            <Text color={hasCover ? "inverse" : "muted"} className={`max-w-2xl mb-4 ${hasCover ? "/80" : ""}`} size="base">
              {category.description}
            </Text>
          )}

          <Row wrap gap="sm">
            {productCount > 0 && (
              <Span layout="inline-flex" gap="xs" color="inverse" size="xs" weight="medium" className={hasCover ? "bg-[rgba(255,255,255,0.2)] backdrop-blur-sm" : "bg-primary/10 text-primary-700 dark:text-primary-400"} rounded="full" padding="pill-sm-tall">
                {productCount.toLocaleString()} {productCount === 1 ? "product" : "products"}
              </Span>
            )}
            {/*
              * G3b — the split, as its own pill rather than inside the one above.
              *
              * 🛑 The two figures are NEVER added: `total` already includes
              * `own`, so `ownHere + inSubcategories === total` by construction
              * and printing their sum would double every item filed here. Shown
              * only when something is actually below (a leaf would read
              * "0 in subcategories", which looks like a missing number).
              */}
            {showCountSplit && (
              <Span layout="inline-flex" gap="xs" color={hasCover ? "inverse" : "muted"} size="xs" className={hasCover ? "bg-[rgba(255,255,255,0.2)] backdrop-blur-sm" : ""} rounded="full" padding="pill-sm-tall">
                {ownHere!.toLocaleString()} here · {inSubcategories!.toLocaleString()} in subcategories
              </Span>
            )}
            {auctionCount > 0 && (
              <Span layout="inline-flex" gap="xs" color={hasCover ? "inverse" : "warning"} surface={hasCover ? undefined : "warning-surface"} size="xs" weight="medium" className={hasCover ? "bg-[rgba(255,255,255,0.2)] backdrop-blur-sm" : ""} rounded="full" padding="pill-sm-tall">
                {auctionCount.toLocaleString()} {auctionCount === 1 ? "auction" : "auctions"}
              </Span>
            )}
            {preOrderCount > 0 && (
              <Span layout="inline-flex" gap="xs" color={hasCover ? "inverse" : "info"} surface={hasCover ? undefined : "info-surface"} size="xs" weight="medium" className={hasCover ? "bg-[rgba(255,255,255,0.2)] backdrop-blur-sm" : ""} rounded="full" padding="pill-sm-tall">
                {preOrderCount.toLocaleString()} {preOrderCount === 1 ? "pre-order" : "pre-orders"}
              </Span>
            )}
            {storeCount > 0 && (
              <Span layout="inline-flex" gap="xs" color={hasCover ? "inverse" : "success"} surface={hasCover ? undefined : "success-surface"} size="xs" weight="medium" className={hasCover ? "bg-[rgba(255,255,255,0.2)] backdrop-blur-sm" : ""} rounded="full" padding="pill-sm-tall">
                {storeCount.toLocaleString()} {storeCount === 1 ? "store" : "stores"}
              </Span>
            )}
          </Row>
        </Div>
      </Section>

      {/* ── D4 / I7: the category's OWN content ────────────────────────────
          🛑 `contentBody` has existed on the schema since B3, has an admin
          editor, and `category-content.ts` claimed it rendered "on the category
          page" — it had NO render site anywhere. So the one field this plan
          measured as worldhobbyshop's actual ranking mechanism (36 of their 46
          categories carry one; no Shopify competitor in the crawl has any) was
          authorable, storable, and invisible.

          Rendered through `RichTextRenderer`, which is what the field's own
          docstring specifies and is SSR-safe (content is sanitised at save
          time by `RichTextEditor`). Omitted entirely when absent — an empty
          prose block reads as a broken page, which is the `{{partBreakdown}}`
          lesson. */}
      {contentBody && contentBody.trim().length > 0 && (
        <Section padding="y-lg">
          <Container size="xl">
            <RichTextRenderer html={contentBody} />
          </Container>
        </Section>
      )}

      <CategoryHighlightsAndFaqSection highlights={category?.highlights} faqs={category?.faqs} />

      {/* ── D12: what this model is MADE OF ─────────────────────────────────
          Renders only on a named-model leaf, because only a leaf has a
          composition. No `parts` map is passed: 963 of 963 slots carry their
          own `weightG`, which is the weight AS FITTED and the better figure
          than the mould's — so hydrating the glossary would be a second read
          for a value we already have. */}
      {compositions.length > 0 && (
        <Section border="subtle" surface="default" className="border-b">
          <Div className="max-w-7xl mx-auto" padding="section">
            <Stack gap="md" className="min-w-0">
              <Heading level={2} size="lg">
                What it is made of
              </Heading>
              <ModelCompositionPanel
                compositions={compositions}
                hrefForPart={(slot, tail) => String(ROUTES.PUBLIC.PART_DETAIL(slot, tail))}
              />
            </Stack>
          </Div>
        </Section>
      )}

      {/* ── Sub-categories horizontal scroller ──────────────────────────── */}
      {childCategories.length > 0 && (
        <Section border="subtle" surface="default" className="border-b">
          <Div className="max-w-7xl mx-auto" padding="inline">
            {/*
              * Grouped by DEPTH BELOW THIS CATEGORY, not by absolute tier — the
              * same subtree shape has to read the same whether you opened it from
              * a root or from halfway down. One scroller per depth: a flat list of
              * every descendant is accurate and unreadable, because nothing in it
              * says which rows are children of which.
              */}
            {Array.from(
              new Set(childCategories.map((c) => c.tier)),
            )
              .sort((a, b) => a - b)
              .map((tier) => (
            <Div key={tier} padding="b-2xs">
              <Text size="xs" color="muted" weight="medium" className="mb-[var(--appkit-space-1-5)]">
                {tier - (category?.tier ?? 0) === 1
                  ? "Subcategories"
                  : `${tier - (category?.tier ?? 0)} levels down`}
              </Text>
            <Div layout="flex" gap="2"
              className={`.5 ${__O.xAuto} [scrollbar-width:none]`} padding="b-2xs"
            >
              {childCategories.filter((c) => c.tier === tier).map((child) => (
                <Link
                  key={child.id}
                  href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(child.slug))}
                  // audit-responsive-wrap-ok: deliberate horizontal-scroll chip row (parent has overflow-x-auto) — each chip staying single-line is the intended design, not hidden content
                  className="flex-shrink-0 flex items-center gap-[var(--appkit-space-1-5)] rounded-full border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-elevated)] px-[var(--appkit-space-4)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-sm)] font-medium text-[var(--appkit-color-text-muted)] hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
                >
                  {child.display?.icon && (
                    <Span className="leading-none">{child.display.icon}</Span>
                  )}
                  {child.name}
                  {/*
                   * 🛑 THE ROLLUP, not the own count — `totalProductCount`, the
                   * same number the header pill above reads (line ~194) and the
                   * same one `CategoryGrid` shows.
                   *
                   * These chips used to read `metrics.productCount`, which is
                   * items filed DIRECTLY under that child and excludes its own
                   * descendants. So on a parent whose header said 20, the chips
                   * beneath it could sum to 5 — two different questions answered
                   * with the same-looking number, side by side, with nothing
                   * saying which was which. The rule the catalogue is built on:
                   * a category's count is its own items plus every descendant's,
                   * and clicking it lists exactly those items.
                   *
                   * Admin surfaces that genuinely need both still show both —
                   * CategoryTableColumns renders "own (total)" explicitly.
                   */}
                  {(child.metrics?.totalProductCount ?? child.metrics?.productCount ?? 0) > 0 && (
                    <Span size="xs" color="muted">
                      {(child.metrics?.totalProductCount ?? child.metrics?.productCount ?? 0).toLocaleString()}
                    </Span>
                  )}
                </Link>
              ))}
            </Div>
            </Div>
              ))}
          </Div>
        </Section>
      )}

      {/* ── Tabs: Products / Auctions / Pre-Orders ──────────────────────── */}
      <Section padding="y-lg">
        <Container size="xl">
          <CategoryDetailTabs
            categorySlug={slug}
            categoryId={category?.id}
            initialProductsData={productsResult ?? undefined}
            initialBundles={bundlesResult ?? []}
            initialStores={categoryStores}
            counts={counts}
            enabledListingTypes={enabledListingTypes(settings)}
            enabledCategoryTypes={enabledCategoryTypes(settings)}
          />
        </Container>
      </Section>

      {groupedListings.length > 0 && (
        <Section padding="y-lg">
          <Container size="xl">
            <GroupedListingsCarousel groups={groupedListings} />
          </Container>
        </Section>
      )}

      {/* ── Related categories ───────────────────────────────────────────── */}
      {relatedCategories.length > 0 && (
        <Section border="subtle" surface="default" className="border-t" padding="y-lg">
          <Container size="xl">
            <Heading level={2} className="mb-4" size="xl" weight="semibold">
              Related Categories
            </Heading>
            <CategoryGrid
              categories={relatedCategories}
              getHref={(c) => String(ROUTES.PUBLIC.CATEGORY_DETAIL(c.slug))}
            />
          </Container>
        </Section>
      )}
    </Main>
  );
}
