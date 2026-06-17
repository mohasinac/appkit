import { Row, SIEVE_OP, sieveAnd, sieveFilter } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
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

const __O = {
  hidden: "overflow-hidden",
} as const;

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
            filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("brand", SIEVE_OP.EQ, brandName), sieveFilter("listingType", SIEVE_OP.EQ, "standard")),
            sorts: sortBy("createdAt", "DESC"),
            page: 1,
            pageSize: 24,
          })
          .catch(() => null)
      : Promise.resolve(null),
    brandName
      ? productRepository
          .list({
            filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("brand", SIEVE_OP.EQ, brandName), sieveFilter("listingType", SIEVE_OP.EQ, "auction")),
            sorts: sortBy("auctionEndDate", "ASC"),
            page: 1,
            pageSize: 1,
          })
          .catch(() => null)
      : Promise.resolve(null),
    brandName
      ? productRepository
          .list({
            filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("brand", SIEVE_OP.EQ, brandName), sieveFilter("listingType", SIEVE_OP.EQ, "pre-order")),
            sorts: sortBy("createdAt", "DESC"),
            page: 1,
            pageSize: 1,
          })
          .catch(() => null)
      : Promise.resolve(null),
    brandName
      ? productRepository
          .list({
            filters: sieveAnd(sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("brand", SIEVE_OP.EQ, brandName), sieveFilter("listingType", SIEVE_OP.EQ, "prize-draw")),
            sorts: sortBy("createdAt", "DESC"),
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
  // Brand accent — falls back to the primary theme token when the brand hasn't
  // configured one. The value is consumed as `style={{ backgroundColor }}` so it
  // accepts both CSS vars and raw hex written by an admin.
  const brandColor = brand?.display?.color || "var(--appkit-color-primary)";

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
      <Section className={`relative ${__O.hidden} ${hasCover ? "min-h-[220px] md:min-h-[280px]" : "bg-zinc-50 dark:bg-zinc-900"}`}>
        {hasCover && (
          <>
            <div
              className="absolute inset-0 bg-center bg-cover"
              // audit-inline-style-ok: dynamic image URL
              style={{ backgroundImage: `url(${coverImage})` }}
            />
            <Div surface="overlay-md" className="absolute inset-0" />
          </>
        )}
        {!hasCover && (
          <div
            className="absolute inset-0 opacity-10"
            // audit-inline-style-ok: runtime theme color
            style={{ backgroundColor: brandColor }}
          />
        )}

        <Div className={`relative z-10 max-w-7xl mx-auto ${hasCover ? "py-12" : "py-8"}`} padding="x-md">
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
          <Row className="mb-3" align="center" gap="md">
            {brand?.display?.icon && (
              <Span className="leading-none" size="5xl">
                {brand.display.icon}
              </Span>
            )}
            <>
              <Heading color="inverse" level={1} className={`md:text-4xl ${hasCover ? "" : "text-zinc-900 dark:text-zinc-50"}`} size="3xl" weight="bold">
                {brand?.name ?? slug}
              </Heading>
              {brand?.description && typeof brand.description === "string" && !brand.description.startsWith("{") && (
                <Text color="inverse" className={`max-w-2xl mt-1 ${hasCover ? "/80" : "text-zinc-600 dark:text-zinc-400"}`} size="base">
                  {brand.description}
                </Text>
              )}
            </>
          </Row>

          {/* Item count chips */}
          <Row gap="sm" className="flex-wrap mt-3">
            {counts.products > 0 && (
              <Span layout="inline-flex" gap="xs" color="inverse" size="xs" weight="medium" className={`${ hasCover ? "bg-white/20 backdrop-blur-sm" : "bg-primary/10 text-primary-700 dark:text-primary-400" }`} rounded="full" padding="pill-sm-tall">
                {counts.products.toLocaleString()} {counts.products === 1 ? "product" : "products"}
              </Span>
            )}
            {counts.auctions > 0 && (
              <Span layout="inline-flex" gap="xs" color="inverse" size="xs" weight="medium" className={`${ hasCover ? "bg-white/20 backdrop-blur-sm" : "bg-warning-surface text-warning dark:bg-warning-surface dark:text-warning" }`} rounded="full" padding="pill-sm-tall">
                {counts.auctions.toLocaleString()} {counts.auctions === 1 ? "auction" : "auctions"}
              </Span>
            )}
            {counts.preOrders > 0 && (
              <Span layout="inline-flex" gap="xs" color="inverse" size="xs" weight="medium" className={`${ hasCover ? "bg-white/20 backdrop-blur-sm" : "bg-info-surface text-info dark:bg-info-surface dark:text-info" }`} rounded="full" padding="pill-sm-tall">
                {counts.preOrders.toLocaleString()} {counts.preOrders === 1 ? "pre-order" : "pre-orders"}
              </Span>
            )}
            {totalItems === 0 && (
              <Span size="sm" className={hasCover ? "text-white/60" : "text-zinc-400"}>
                No items listed yet
              </Span>
            )}
          </Row>
        </Div>
      </Section>

      {/* ── Tabs: Products / Auctions / Pre-Orders ──────────────────────── */}
      <Section padding="y-lg">
        <Container size="xl">
          {brandName ? (
            <BrandDetailTabs
              brandName={brandName}
              initialProductsData={productsResult ?? undefined}
              initialBundles={brandBundles as any}
              counts={counts}
            />
          ) : (
            <Text paddingY="3xl" color="muted" size="sm" align="center">
              Brand not found.
            </Text>
          )}
        </Container>
      </Section>
    </Main>
  );
}
