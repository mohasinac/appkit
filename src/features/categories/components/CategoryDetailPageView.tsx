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
import type { CategoryItem } from "../types";

const __O = {
  hidden: "overflow-hidden",
  xAuto: "overflow-x-auto",
} as const;

export interface CategoryDetailPageViewProps {
  slug: string;
}

export async function CategoryDetailPageView({ slug }: CategoryDetailPageViewProps) {
  const category = await categoriesRepository
    .getCategoryBySlug(slug)
    .catch(() => undefined) as CategoryItem | undefined;

  // Roll up descendant categories so a parent category page shows products
  // filed under any of its children too, not just products tagged with the
  // parent's own id — parentIds stores the full ancestor chain, so a single
  // array-contains query already returns the whole subtree (see
  // categoriesRepository.getDescendantIds).
  const descendantIds = category?.id
    ? await categoriesRepository.getDescendantIds(category.id).catch(() => [])
    : [];
  const categoriesIn = category?.id ? [category.id, ...descendantIds] : null;

  const [productsResult, auctionsCountResult, preOrdersCountResult, prizeDrawsCountResult, bundlesResult, childCategories, rootSiblingCategories] = await Promise.all([
    categoriesIn
      ? productRepository
          .list(
            {
              filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("listingType", SIEVE_OP.EQ, "standard")),
              sorts: sortBy("createdAt", "DESC"),
              page: 1,
              pageSize: 24,
            },
            { categoriesIn },
          )
          .catch(() => null)
      : Promise.resolve(null),
    categoriesIn
      ? productRepository
          .list(
            {
              filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("listingType", SIEVE_OP.EQ, "auction")),
              sorts: sortBy("auctionEndDate", "ASC"),
              page: 1,
              pageSize: 1,
            },
            { categoriesIn },
          )
          .catch(() => null)
      : Promise.resolve(null),
    categoriesIn
      ? productRepository
          .list(
            {
              filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("listingType", SIEVE_OP.EQ, "pre-order")),
              sorts: sortBy("createdAt", "DESC"),
              page: 1,
              pageSize: 1,
            },
            { categoriesIn },
          )
          .catch(() => null)
      : Promise.resolve(null),
    categoriesIn
      ? productRepository
          .list(
            {
              filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("listingType", SIEVE_OP.EQ, "prize-draw")),
              sorts: sortBy("createdAt", "DESC"),
              page: 1,
              pageSize: 1,
            },
            { categoriesIn },
          )
          .catch(() => null)
      : Promise.resolve(null),
    // SB-UNI-D — bundles fetched from the categories collection. We pull
    // all active bundle rows; the carousel filters by category affinity.
    categoriesIn
      ? categoriesRepository
          .listByType("bundle", { activeOnly: true, limit: 50 })
          .catch(() => [])
      : Promise.resolve([]),
    category?.id
      ? categoriesRepository.getChildren(category.id).catch(() => []) as Promise<CategoryItem[]>
      : Promise.resolve([] as CategoryItem[]),
    // Related categories — every other category sharing this category's root
    // (siblings + cousins across the tree, up to the tier-0/1/2 depth the
    // catalog actually uses), not just direct children.
    category?.rootId
      ? categoriesRepository.getCategoriesByRootId(category.rootId).catch(() => []) as Promise<CategoryItem[]>
      : Promise.resolve([] as CategoryItem[]),
  ]);

  const relatedCategories = rootSiblingCategories.filter(
    (c) => c.id !== category?.id && (!c.categoryType || c.categoryType === "category"),
  );

  // Stores tab — query stores whose storeCategory matches this category or any child
  const storeCategorySlugs = [
    slug,
    ...childCategories.map((c) => c.slug).filter(Boolean),
  ];
  const storeResults = await Promise.all(
    storeCategorySlugs.map((catSlug) =>
      storeRepository
        .listStores({ filters: sieveFilter("storeCategory", SIEVE_OP.EQ, catSlug), page: 1, pageSize: 50 }, true)
        .catch(() => null),
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

  const productCount = productsResult?.total ?? category?.metrics?.totalProductCount ?? category?.metrics?.productCount ?? 0;
  const auctionCount = auctionsCountResult?.total ?? category?.metrics?.totalAuctionCount ?? category?.metrics?.auctionCount ?? 0;
  const preOrderCount = preOrdersCountResult?.total ?? 0;
  const prizeDrawCount = prizeDrawsCountResult?.total ?? 0;
  const bundleCount = bundlesResult?.length ?? 0;
  const storeCount = categoryStores.length;
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
            counts={{
              products: productCount,
              auctions: auctionCount,
              preOrders: preOrderCount,
              prizeDraws: prizeDrawCount,
              bundles: bundleCount,
              stores: storeCount,
            }}
          />
        </Container>
      </Section>

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
