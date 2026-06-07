import React from "react";
import Link from "next/link";
import {
  categoriesRepository,
  productRepository,
} from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Div, Heading, Main, Nav, Section, Span, Text } from "../../../ui";
import { BrandDetailTabs } from "./BrandDetailTabs";
import type { CategoryItem } from "../types";
import type { CategoryDocument } from "../schemas/firestore";

export interface BrandDetailPageViewProps {
  slug: string;
  initialBrand?: CategoryDocument | null;
}

export async function BrandDetailPageView({ slug, initialBrand }: BrandDetailPageViewProps) {
  const brand = (initialBrand ?? (await categoriesRepository
    .getCategoryBySlug(slug)
    .catch(() => undefined))) as CategoryItem | undefined;

  const brandName = brand?.name;

  const [productsResult, auctionsResult, preOrdersResult, prizeDrawsResult, allBundles] = await Promise.all([
    brandName
      ? productRepository
          .list({
            filters: `status==published,brand==${brandName},listingType==standard`,
            sorts: "-createdAt",
            page: 1,
            pageSize: 24,
          })
          .catch(() => null)
      : Promise.resolve(null),
    brandName
      ? productRepository
          .list({
            filters: `status==published,brand==${brandName},listingType==auction`,
            sorts: "auctionEndDate",
            page: 1,
            pageSize: 1,
          })
          .catch(() => null)
      : Promise.resolve(null),
    brandName
      ? productRepository
          .list({
            filters: `status==published,brand==${brandName},listingType==pre-order`,
            sorts: "-createdAt",
            page: 1,
            pageSize: 1,
          })
          .catch(() => null)
      : Promise.resolve(null),
    brandName
      ? productRepository
          .list({
            filters: `status==published,brand==${brandName},listingType==prize-draw`,
            sorts: "-createdAt",
            page: 1,
            pageSize: 1,
          })
          .catch(() => null)
      : Promise.resolve(null),
    // SB-UNI-D — bundles are categoryType:"bundle" rows on the categories
    // collection. We pull all bundle categories and filter client-side by
    // brand affinity until the bundle storage carries an explicit brandSlug.
    brandName
      ? categoriesRepository
          .listByType("bundle", { activeOnly: true, limit: 50 })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const brandLower = brandName?.toLowerCase();
  const brandBundles = brandLower
    ? (allBundles as CategoryDocument[]).filter((b) => {
        const seo = b.seo?.keywords?.map((k) => k.toLowerCase()) ?? [];
        return seo.includes(brandLower);
      })
    : [];

  const coverImage = brand?.display?.coverImage;
  const hasCover = Boolean(coverImage);
  const brandColor = brand?.display?.color || "#6366f1";

  const counts = {
    products: productsResult?.total ?? brand?.metrics?.productCount ?? 0,
    auctions: auctionsResult?.total ?? brand?.metrics?.auctionCount ?? 0,
    preOrders: preOrdersResult?.total ?? 0,
    prizeDraws: prizeDrawsResult?.total ?? 0,
    bundles: brandBundles.length,
  };

  const totalItems =
    counts.products +
    counts.auctions +
    counts.preOrders +
    counts.prizeDraws +
    counts.bundles;

  return (
    <Main>
      {/* ── Brand Hero ──────────────────────────────────────────────────── */}
      <Section className={`relative overflow-hidden ${hasCover ? "min-h-[220px] md:min-h-[280px]" : "bg-zinc-50 dark:bg-zinc-900"}`}>
        {hasCover && (
          <>
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{ backgroundImage: `url(${coverImage})` }}
            />
            <Div className="absolute inset-0 bg-black/55" />
          </>
        )}
        {!hasCover && (
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundColor: brandColor }}
          />
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
              href={String((ROUTES.PUBLIC as any).BRANDS ?? "/brands")}
              className={hasCover ? "text-white/70 hover:text-white transition-colors" : "text-zinc-500 dark:text-zinc-400 hover:text-primary-600 transition-colors"}
            >
              Brands
            </Link>
            <Span className={hasCover ? "text-white/40" : "text-zinc-400"}>/</Span>
            <Span weight="medium" className={hasCover ? "text-white" : "text-zinc-900 dark:text-zinc-100"}>
              {brand?.name ?? slug}
            </Span>
          </Nav>

          {/* Brand logo + name */}
          <Div className="flex items-center gap-4 mb-3">
            {brand?.display?.icon && (
              <Span className="text-5xl leading-none">
                {brand.display.icon}
              </Span>
            )}
            <>
              <Heading level={1} className={`text-3xl md:text-4xl font-bold ${hasCover ? "text-white" : "text-zinc-900 dark:text-zinc-50"}`}>
                {brand?.name ?? slug}
              </Heading>
              {brand?.description && typeof brand.description === "string" && !brand.description.startsWith("{") && (
                <Text className={`text-base max-w-2xl mt-1 ${hasCover ? "text-white/80" : "text-zinc-600 dark:text-zinc-400"}`}>
                  {brand.description}
                </Text>
              )}
            </>
          </Div>

          {/* Item count chips */}
          <Div className="flex flex-wrap gap-2 mt-3">
            {counts.products > 0 && (
              <Span size="xs" weight="medium" className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-primary/10 text-primary-700 dark:text-primary-400"
              }`}>
                {counts.products.toLocaleString()} {counts.products === 1 ? "product" : "products"}
              </Span>
            )}
            {counts.auctions > 0 && (
              <Span size="xs" weight="medium" className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}>
                {counts.auctions.toLocaleString()} {counts.auctions === 1 ? "auction" : "auctions"}
              </Span>
            )}
            {counts.preOrders > 0 && (
              <Span size="xs" weight="medium" className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              }`}>
                {counts.preOrders.toLocaleString()} {counts.preOrders === 1 ? "pre-order" : "pre-orders"}
              </Span>
            )}
            {totalItems === 0 && (
              <Span size="sm" className={hasCover ? "text-white/60" : "text-zinc-400"}>
                No items listed yet
              </Span>
            )}
          </Div>
        </Div>
      </Section>

      {/* ── Tabs: Products / Auctions / Pre-Orders ──────────────────────── */}
      <Section className="py-6">
        <Container size="xl">
          {brandName ? (
            <BrandDetailTabs
              brandName={brandName}
              initialProductsData={productsResult ?? undefined}
              initialBundles={brandBundles as any}
              counts={counts}
            />
          ) : (
            <Text className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Brand not found.
            </Text>
          )}
        </Container>
      </Section>
    </Main>
  );
}
