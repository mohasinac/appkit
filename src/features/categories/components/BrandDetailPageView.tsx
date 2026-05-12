import React from "react";
import Link from "next/link";
import { categoriesRepository, productRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Main, Section } from "../../../ui";
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

  const [productsResult, auctionsResult, preOrdersResult] = await Promise.all([
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
  ]);

  const coverImage = brand?.display?.coverImage;
  const hasCover = Boolean(coverImage);
  const brandColor = brand?.display?.color || "#6366f1";

  const counts = {
    products: productsResult?.total ?? brand?.metrics?.productCount ?? 0,
    auctions: auctionsResult?.total ?? brand?.metrics?.auctionCount ?? 0,
    preOrders: preOrdersResult?.total ?? 0,
  };

  const totalItems = counts.products + counts.auctions + counts.preOrders;

  return (
    <Main>
      {/* ── Brand Hero ──────────────────────────────────────────────────── */}
      <section className={`relative overflow-hidden ${hasCover ? "min-h-[220px] md:min-h-[280px]" : "bg-zinc-50 dark:bg-zinc-900"}`}>
        {hasCover && (
          <>
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{ backgroundImage: `url(${coverImage})` }}
            />
            <div className="absolute inset-0 bg-black/55" />
          </>
        )}
        {!hasCover && (
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundColor: brandColor }}
          />
        )}

        <div className={`relative z-10 max-w-7xl mx-auto px-4 ${hasCover ? "py-12" : "py-8"}`}>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm mb-4" aria-label="Breadcrumb">
            <Link
              href={String(ROUTES.HOME)}
              className={hasCover ? "text-white/70 hover:text-white transition-colors" : "text-zinc-500 hover:text-primary-600 transition-colors"}
            >
              Home
            </Link>
            <span className={hasCover ? "text-white/40" : "text-zinc-400"}>/</span>
            <Link
              href={String((ROUTES.PUBLIC as any).BRANDS ?? "/brands")}
              className={hasCover ? "text-white/70 hover:text-white transition-colors" : "text-zinc-500 hover:text-primary-600 transition-colors"}
            >
              Brands
            </Link>
            <span className={hasCover ? "text-white/40" : "text-zinc-400"}>/</span>
            <span className={hasCover ? "text-white font-medium" : "text-zinc-900 dark:text-zinc-100 font-medium"}>
              {brand?.name ?? slug}
            </span>
          </nav>

          {/* Brand logo + name */}
          <div className="flex items-center gap-4 mb-3">
            {brand?.display?.icon && (
              <span className={`text-5xl leading-none ${!hasCover ? "" : ""}`}>
                {brand.display.icon}
              </span>
            )}
            <div>
              <h1 className={`text-3xl md:text-4xl font-bold ${hasCover ? "text-white" : "text-zinc-900 dark:text-zinc-50"}`}>
                {brand?.name ?? slug}
              </h1>
              {brand?.description && typeof brand.description === "string" && !brand.description.startsWith("{") && (
                <p className={`text-base max-w-2xl mt-1 ${hasCover ? "text-white/80" : "text-zinc-600 dark:text-zinc-400"}`}>
                  {brand.description}
                </p>
              )}
            </div>
          </div>

          {/* Item count chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {counts.products > 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-primary/10 text-primary-700 dark:text-primary-400"
              }`}>
                {counts.products.toLocaleString()} {counts.products === 1 ? "product" : "products"}
              </span>
            )}
            {counts.auctions > 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}>
                {counts.auctions.toLocaleString()} {counts.auctions === 1 ? "auction" : "auctions"}
              </span>
            )}
            {counts.preOrders > 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                hasCover ? "bg-white/20 text-white backdrop-blur-sm" : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              }`}>
                {counts.preOrders.toLocaleString()} {counts.preOrders === 1 ? "pre-order" : "pre-orders"}
              </span>
            )}
            {totalItems === 0 && (
              <span className={`text-sm ${hasCover ? "text-white/60" : "text-zinc-400"}`}>
                No items listed yet
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Tabs: Products / Auctions / Pre-Orders ──────────────────────── */}
      <Section className="py-6">
        <Container size="xl">
          {brandName ? (
            <BrandDetailTabs
              brandName={brandName}
              initialProductsData={productsResult ?? undefined}
              counts={counts}
            />
          ) : (
            <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Brand not found.
            </p>
          )}
        </Container>
      </Section>
    </Main>
  );
}
