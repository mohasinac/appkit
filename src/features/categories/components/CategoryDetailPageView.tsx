import { Row, SIEVE_OP, sieveAnd, sieveFilter } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React from "react";
import Link from "next/link";
import {
  categoriesRepository,
  productRepository,
  storeRepository,
} from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Div, Heading, Main, Nav, Section, Span, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { CategoryDetailTabs } from "./CategoryDetailTabs";
import { CategoryGrid } from "./CategoryGrid";
import { CategoryHighlightsAndFaqSection } from "./CategoryHighlightsAndFaqSection";
import { GroupedListingsCarousel } from "../../grouped/components/GroupedListingsCarousel";
import { getGroupsForCategory } from "../../../_internal/server/features/grouped/data";
import {
  listingTabCounts,
  type ListingTabCounts,
} from "../../../_internal/server/features/products/listing-tab-counts";
import { CATEGORY_PAGE_TABS } from "../../products/constants/listing-tabs";
import { enabledCategoryTypes, enabledListingTypes } from "../../../_internal/shared/listing-types/feature-flags";
import { siteSettingsRepository } from "../../../repositories";
import { safeRead } from "../../../errors/safe-read";
import type { CategoryItem } from "../types";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";

const __O = {
  hidden: "overflow-hidden",
  xAuto: "overflow-x-auto",
} as const;

export interface CategoryDetailPageViewProps {
  slug: string;
}

export async function CategoryDetailPageView({ slug }: CategoryDetailPageViewProps) {
  // The category IS this page's subject — a read failure must surface rather
  // than render an anonymous, empty category page. `undefined` still means
  // "no such category slug".
  const category = ((await categoriesRepository
    .getCategoryBySlug(slug)) ?? undefined) as CategoryItem | undefined;

  // Products carry their FULL ancestor chain in `categorySlugs`, so matching on
  // this category's own id already returns the whole subtree — no descendant
  // expansion needed. Expanding it was also a latent outage: `categoriesIn` is
  // applied as `array-contains-any`, which Firestore caps at 30 values, and
  // every caller here wraps the query in `.catch(() => null)` — so a category
  // tree deeper than a couple of levels would have turned into a silently blank
  // page rather than an error (Root Cause #59).
  const categoriesIn = category?.id ? [category.id] : null;

  const [productsResult, tabCounts, bundlesResult, childCategories, rootSiblingCategories, groupedListings, settings] = await Promise.all([
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
    category?.id
      ? safeRead(() => categoriesRepository.getChildren(category.id), {
          route: "/categories/[slug]",
          key: "category.children",
          fallback: [],
        }) as unknown as Promise<CategoryItem[]>
      : Promise.resolve([] as CategoryItem[]),
    // Related categories — every other category sharing this category's root
    // (siblings + cousins across the tree, up to the tier-0/1/2 depth the
    // catalog actually uses), not just direct children.
    category?.rootId
      ? safeRead(() => categoriesRepository.getCategoriesByRootId(category.rootId!), {
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
  ]);

  const relatedCategories = rootSiblingCategories.filter(
    (c) => c.id !== category?.id && (!c.categoryType || c.categoryType === "category"),
  );

  // Stores tab — stores whose storeCategory is this category or ANY descendant.
  //
  // `storeCategory` is a single slug with no ancestor chain (unlike a product's
  // categorySlugs), so the descendant list genuinely is needed here. It used to
  // use direct children only, which meant a store filed under a tier-3 category
  // was invisible on its root's Stores tab, and it issued one query per slug —
  // an unbounded N+1. Both are fixed by pipe-joining the slugs into OR-groups:
  // the enhanced Sieve adapter turns a same-field OR into a Firestore `in`,
  // which caps at 30 values, hence the chunking.
  const storeCategorySlugs = [
    slug,
    ...(await safeRead(() => categoriesRepository.getDescendantIds(category?.id ?? ""), {
      route: "/categories/[slug]",
      key: "category.descendantIds",
      fallback: [] as string[],
    })),
  ].filter(Boolean);
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
    .map((s) => ({
      id: s.id,
      storeSlug: s.storeSlug ?? s.id,
      ownerId: s.ownerId,
      storeName: s.storeName,
      storeDescription: s.storeDescription,
      storeCategory: s.storeCategory,
      storeLogoURL: s.storeLogoURL,
      storeBannerURL: s.storeBannerURL,
      status: s.status,
      isPublic: s.isPublic ?? true,
      totalProducts: s.stats?.totalProducts,
      itemsSold: s.stats?.itemsSold,
      totalReviews: s.stats?.totalReviews,
      averageRating: s.stats?.averageRating,
      createdAt: s.createdAt as unknown as string,
    }));

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
  const coverImage = category?.display?.coverImage;
  const hasCover = Boolean(coverImage);

  return (
    <Main>
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
          {/* Breadcrumb */}
          <Nav layout="flex" gap="2xs" textSize="sm" className="mb-4" aria-label="Breadcrumb">
            <Link
              href={String(ROUTES.HOME)}
              className={hasCover ? "text-white/70 hover:text-white transition-colors" : "text-[var(--appkit-color-text-muted)] hover:text-primary-600 transition-colors"}
            >
              Home
            </Link>
            <Span className={hasCover ? "text-white/40" : "text-zinc-400"}>/</Span>
            <Link
              href={String(ROUTES.PUBLIC.CATEGORIES)}
              className={hasCover ? "text-white/70 hover:text-white transition-colors" : "text-[var(--appkit-color-text-muted)] hover:text-primary-600 transition-colors"}
            >
              Categories
            </Link>
            <Span className={hasCover ? "text-white/40" : "text-zinc-400"}>/</Span>
            <Span weight="medium" className={hasCover ? "text-white" : "text-[var(--appkit-color-text)]"}>
              {category?.name ?? slug}
            </Span>
          </Nav>

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

      <CategoryHighlightsAndFaqSection highlights={category?.highlights} faqs={category?.faqs} />

      {/* ── Sub-categories horizontal scroller ──────────────────────────── */}
      {childCategories.length > 0 && (
        <Section border="subtle" surface="default" className="border-b">
          <Div className="max-w-7xl mx-auto" padding="inline">
            <Div layout="flex" gap="2"
              className={`.5 ${__O.xAuto} [scrollbar-width:none]`} padding="b-2xs"
            >
              {childCategories.map((child) => (
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
                  {(child.metrics?.productCount ?? 0) > 0 && (
                    <Span size="xs" color="muted">
                      {(child.metrics?.productCount ?? 0).toLocaleString()}
                    </Span>
                  )}
                </Link>
              ))}
            </Div>
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
