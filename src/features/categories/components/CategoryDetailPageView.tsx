import { sieveAnd, sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
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
import { CategoryDetailTabs } from "./CategoryDetailTabs";
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

  // Use categorySlugs@=<id> (array-contains) — products store category FK in
  // the categorySlugs[] array, not the legacy `category` string field.
  const catFilter = category?.id ? sieveFilter("categorySlugs", SIEVE_OP.CONTAINS, category.id) : null;

  const [productsResult, auctionsCountResult, preOrdersCountResult, prizeDrawsCountResult, bundlesResult, childCategories] = await Promise.all([
    catFilter
      ? productRepository
          .list({
            filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), catFilter, sieveFilter("listingType", SIEVE_OP.EQ, "standard")),
            sorts: sortBy("createdAt", "DESC"),
            page: 1,
            pageSize: 24,
          })
          .catch(() => null)
      : Promise.resolve(null),
    catFilter
      ? productRepository
          .list({
            filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), catFilter, sieveFilter("listingType", SIEVE_OP.EQ, "auction")),
            sorts: sortBy("auctionEndDate", "ASC"),
            page: 1,
            pageSize: 1,
          })
          .catch(() => null)
      : Promise.resolve(null),
    catFilter
      ? productRepository
          .list({
            filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), catFilter, sieveFilter("listingType", SIEVE_OP.EQ, "pre-order")),
            sorts: sortBy("createdAt", "DESC"),
            page: 1,
            pageSize: 1,
          })
          .catch(() => null)
      : Promise.resolve(null),
    catFilter
      ? productRepository
          .list({
            filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), catFilter, sieveFilter("listingType", SIEVE_OP.EQ, "prize-draw")),
            sorts: sortBy("createdAt", "DESC"),
            page: 1,
            pageSize: 1,
          })
          .catch(() => null)
      : Promise.resolve(null),
    // SB-UNI-D — bundles fetched from the categories collection. We pull
    // all active bundle rows; the carousel filters by category affinity.
    catFilter
      ? categoriesRepository
          .listByType("bundle", { activeOnly: true, limit: 50 })
          .catch(() => [])
      : Promise.resolve([]),
    category?.id
      ? categoriesRepository.getChildren(category.id).catch(() => []) as Promise<CategoryItem[]>
      : Promise.resolve([] as CategoryItem[]),
  ]);

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

  const productCount = productsResult?.total ?? category?.metrics?.productCount ?? 0;
  const auctionCount = auctionsCountResult?.total ?? category?.metrics?.auctionCount ?? 0;
  const preOrderCount = preOrdersCountResult?.total ?? 0;
  const prizeDrawCount = prizeDrawsCountResult?.total ?? 0;
  const bundleCount = bundlesResult?.length ?? 0;
  const storeCount = categoryStores.length;
  const totalCount = productCount + auctionCount + preOrderCount + prizeDrawCount + bundleCount + storeCount;
  const coverImage = category?.display?.coverImage;
  const hasCover = Boolean(coverImage);

  return (
    <Main>
      {/* ── Hero / Banner ───────────────────────────────────────────────── */}
      <Section className={`relative ${__O.hidden} ${hasCover ? "min-h-[220px] md:min-h-[280px]" : "bg-zinc-50 dark:bg-zinc-900"}`}>
        {hasCover && (
          <>
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{ backgroundImage: `url(${coverImage})` }}
            />
            <Div className="absolute inset-0 bg-black/55" />
          </>
        )}

        <Div className={`relative z-10 max-w-7xl mx-auto px-4 ${hasCover ? "py-12" : "py-8"}`}>
          {/* Breadcrumb */}
          <Nav className="flex items-center gap-1.5 text-sm mb-4" aria-label="Breadcrumb">
            <Link
              href={String(ROUTES.HOME)}
              className={hasCover ? "text-white/70 hover:text-white transition-colors" : "text-zinc-500 dark:text-zinc-400 hover:text-primary-600 transition-colors"}
            >
              Home
            </Link>
            <Span className={hasCover ? "text-white/40" : "text-zinc-400"}>/</Span>
            <Link
              href={String(ROUTES.PUBLIC.CATEGORIES)}
              className={hasCover ? "text-white/70 hover:text-white transition-colors" : "text-zinc-500 dark:text-zinc-400 hover:text-primary-600 transition-colors"}
            >
              Categories
            </Link>
            <Span className={hasCover ? "text-white/40" : "text-zinc-400"}>/</Span>
            <Span weight="medium" className={hasCover ? "text-white" : "text-zinc-900 dark:text-zinc-100"}>
              {category?.name ?? slug}
            </Span>
          </Nav>

          {/* Title + metrics */}
          <Heading level={1} className={`text-3xl md:text-4xl font-bold mb-2 ${hasCover ? "text-white" : "text-zinc-900 dark:text-zinc-50"}`}>
            {category?.name ?? slug}
          </Heading>

          {category?.description && typeof category.description === "string" && !category.description.startsWith("{") && (
            <Text className={`text-base max-w-2xl mb-4 ${hasCover ? "text-white/80" : "text-zinc-600 dark:text-zinc-400"}`}>
              {category.description}
            </Text>
          )}

          <Div className="flex flex-wrap gap-2">
            {productCount > 0 && (
              <Span size="xs" weight="medium" className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-primary/10 text-primary-700 dark:text-primary-400"
              }`}>
                {productCount.toLocaleString()} {productCount === 1 ? "product" : "products"}
              </Span>
            )}
            {auctionCount > 0 && (
              <Span size="xs" weight="medium" className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}>
                {auctionCount.toLocaleString()} {auctionCount === 1 ? "auction" : "auctions"}
              </Span>
            )}
            {preOrderCount > 0 && (
              <Span size="xs" weight="medium" className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              }`}>
                {preOrderCount.toLocaleString()} {preOrderCount === 1 ? "pre-order" : "pre-orders"}
              </Span>
            )}
            {storeCount > 0 && (
              <Span size="xs" weight="medium" className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              }`}>
                {storeCount.toLocaleString()} {storeCount === 1 ? "store" : "stores"}
              </Span>
            )}
          </Div>
        </Div>
      </Section>

      {/* ── Sub-categories horizontal scroller ──────────────────────────── */}
      {childCategories.length > 0 && (
        <Section surface="default" className="border-b border-zinc-100 dark:border-zinc-800">
          <Div className="max-w-7xl mx-auto px-4 py-3">
            <Div className={`flex gap-2.5 ${__O.xAuto} pb-1`} style={{ scrollbarWidth: "none" }}>
              {childCategories.map((child) => (
                <Link
                  key={child.id}
                  href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(child.slug))}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
                >
                  {child.display?.icon && (
                    <Span className="leading-none">{child.display.icon}</Span>
                  )}
                  {child.name}
                  {(child.metrics?.productCount ?? 0) > 0 && (
                    <Span size="xs" className="text-zinc-400 dark:text-zinc-400">
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
      <Section className="py-6">
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
    </Main>
  );
}
