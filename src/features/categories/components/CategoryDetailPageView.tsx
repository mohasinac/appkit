import React from "react";
import Link from "next/link";
import {
  categoriesRepository,
  productRepository,
  storeRepository,
} from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Heading, Main, Section, Text } from "../../../ui";
import { CategoryDetailTabs } from "./CategoryDetailTabs";
import type { CategoryItem } from "../types";

export interface CategoryDetailPageViewProps {
  slug: string;
}

export async function CategoryDetailPageView({ slug }: CategoryDetailPageViewProps) {
  const category = await categoriesRepository
    .getCategoryBySlug(slug)
    .catch(() => undefined) as CategoryItem | undefined;

  // Use categorySlugs@=<id> (array-contains) — products store category FK in
  // the categorySlugs[] array, not the legacy `category` string field.
  const catFilter = category?.id ? `categorySlugs@=${category.id}` : null;

  const [productsResult, auctionsCountResult, preOrdersCountResult, prizeDrawsCountResult, bundlesResult, childCategories] = await Promise.all([
    catFilter
      ? productRepository
          .list({
            filters: `status==published,${catFilter},listingType==standard`,
            sorts: "-createdAt",
            page: 1,
            pageSize: 24,
          })
          .catch(() => null)
      : Promise.resolve(null),
    catFilter
      ? productRepository
          .list({
            filters: `status==published,${catFilter},listingType==auction`,
            sorts: "auctionEndDate",
            page: 1,
            pageSize: 1,
          })
          .catch(() => null)
      : Promise.resolve(null),
    catFilter
      ? productRepository
          .list({
            filters: `status==published,${catFilter},listingType==pre-order`,
            sorts: "-createdAt",
            page: 1,
            pageSize: 1,
          })
          .catch(() => null)
      : Promise.resolve(null),
    catFilter
      ? productRepository
          .list({
            filters: `status==published,${catFilter},listingType==prize-draw`,
            sorts: "-createdAt",
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
        .listStores({ filters: `storeCategory==${catSlug}`, page: 1, pageSize: 50 }, true)
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
      <Section className={`relative overflow-hidden ${hasCover ? "min-h-[220px] md:min-h-[280px]" : "bg-zinc-50 dark:bg-zinc-900"}`}>
        {hasCover && (
          <>
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{ backgroundImage: `url(${coverImage})` }}
            />
            <div className="absolute inset-0 bg-black/55" />
          </>
        )}

        <div className={`relative z-10 max-w-7xl mx-auto px-4 ${hasCover ? "py-12" : "py-8"}`}>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm mb-4" aria-label="Breadcrumb">
            <Link
              href={String(ROUTES.HOME)}
              className={hasCover ? "text-white/70 hover:text-white transition-colors" : "text-zinc-500 dark:text-zinc-400 hover:text-primary-600 transition-colors"}
            >
              Home
            </Link>
            <span className={hasCover ? "text-white/40" : "text-zinc-400"}>/</span>
            <Link
              href={String(ROUTES.PUBLIC.CATEGORIES)}
              className={hasCover ? "text-white/70 hover:text-white transition-colors" : "text-zinc-500 dark:text-zinc-400 hover:text-primary-600 transition-colors"}
            >
              Categories
            </Link>
            <span className={hasCover ? "text-white/40" : "text-zinc-400"}>/</span>
            <span className={hasCover ? "text-white font-medium" : "text-zinc-900 dark:text-zinc-100 font-medium"}>
              {category?.name ?? slug}
            </span>
          </nav>

          {/* Title + metrics */}
          <Heading level={1} className={`text-3xl md:text-4xl font-bold mb-2 ${hasCover ? "text-white" : "text-zinc-900 dark:text-zinc-50"}`}>
            {category?.name ?? slug}
          </Heading>

          {category?.description && typeof category.description === "string" && !category.description.startsWith("{") && (
            <Text className={`text-base max-w-2xl mb-4 ${hasCover ? "text-white/80" : "text-zinc-600 dark:text-zinc-400"}`}>
              {category.description}
            </Text>
          )}

          <div className="flex flex-wrap gap-2">
            {productCount > 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-primary/10 text-primary-700 dark:text-primary-400"
              }`}>
                {productCount.toLocaleString()} {productCount === 1 ? "product" : "products"}
              </span>
            )}
            {auctionCount > 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}>
                {auctionCount.toLocaleString()} {auctionCount === 1 ? "auction" : "auctions"}
              </span>
            )}
            {preOrderCount > 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              }`}>
                {preOrderCount.toLocaleString()} {preOrderCount === 1 ? "pre-order" : "pre-orders"}
              </span>
            )}
            {storeCount > 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              }`}>
                {storeCount.toLocaleString()} {storeCount === 1 ? "store" : "stores"}
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* ── Sub-categories horizontal scroller ──────────────────────────── */}
      {childCategories.length > 0 && (
        <Section surface="default" className="border-b border-zinc-100 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {childCategories.map((child) => (
                <Link
                  key={child.id}
                  href={String(ROUTES.PUBLIC.CATEGORY_DETAIL(child.slug))}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
                >
                  {child.display?.icon && (
                    <span className="text-base leading-none">{child.display.icon}</span>
                  )}
                  {child.name}
                  {(child.metrics?.productCount ?? 0) > 0 && (
                    <span className="text-xs text-zinc-400 dark:text-zinc-400">
                      {(child.metrics?.productCount ?? 0).toLocaleString()}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
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
