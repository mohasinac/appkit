"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SectionCarousel } from "./SectionCarousel";
import { useFeaturedProducts } from "../hooks/useFeaturedProducts";
import { InteractiveProductCard } from "../../products/components/InteractiveProductCard";
import { ROUTES } from "../../../next";
import { Section, Heading, Text } from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";
import type { ProductItem } from "../../products/types";
import type { SectionPagination } from "../schemas/firestore";

export interface FeaturedProductsSectionProps {
  title?: string;
  description?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  className?: string;
  filterByBrand?: string;
  initialItems?: ProductItem[];
  /** Number of grid rows (1–4). When 1 (default), renders the existing horizontal carousel. */
  rows?: number;
  /** Maximum items to show. Clamped to 5–20. */
  maxItems?: number;
  /** Pagination strategy for rows > 1. */
  pagination?: SectionPagination;
}

// --- Multi-row grid + pagination -----------------------------------------------

function ProductGrid({
  items,
  rows,
  maxItems,
  pagination,
  viewMoreHref,
  viewMoreLabel,
  title,
  description,
}: {
  items: ProductItem[];
  rows: number;
  maxItems: number;
  pagination: SectionPagination;
  viewMoreHref?: string;
  viewMoreLabel: string;
  title: string;
  description?: string;
}) {
  const { themed } = THEME_CONSTANTS;
  const pageSize = Math.min(rows * 5, maxItems);
  const [offset, setOffset] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalItems = Math.min(items.length, maxItems);
  const visible = items.slice(offset, Math.min(offset + pageSize, totalItems));

  const canNext = offset + pageSize < totalItems;
  const canPrev = offset > 0;

  const next = () => setOffset((o) => Math.min(o + pageSize, totalItems - pageSize));
  const prev = () => setOffset((o) => Math.max(o - pageSize, 0));

  useEffect(() => {
    if (pagination !== "auto-scroll") return;
    timerRef.current = setInterval(() => {
      setOffset((o) => {
        const nextOffset = o + pageSize;
        return nextOffset >= totalItems ? 0 : nextOffset;
      });
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pagination, pageSize, totalItems]);

  return (
    <Section className={`py-12 px-4 ${themed.bgPrimary}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <>
            <Heading level={2} className={`text-2xl font-bold md:text-3xl ${themed.textPrimary}`}>
              {title}
            </Heading>
            {description && (
              <Text variant="muted" className="mt-1 text-sm">{description}</Text>
            )}
          </>
          {pagination === "arrows" && (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={prev}
                disabled={!canPrev}
                aria-label="Previous"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:border-[var(--appkit-color-primary)] hover:text-[var(--appkit-color-primary)] disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-300"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canNext}
                aria-label="Next"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:border-[var(--appkit-color-primary)] hover:text-[var(--appkit-color-primary)] disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-300"
              >
                ›
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visible.map((product) => (
            <InteractiveProductCard
              key={product.id}
              product={product}
              href={String(ROUTES.PUBLIC.PRODUCT_DETAIL(product.slug ?? product.id ?? ""))}
            />
          ))}
        </div>

        {pagination === "load-more" && canNext && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={next}
              className="rounded-lg border border-zinc-300 bg-white px-6 py-2 text-sm font-medium text-zinc-700 hover:border-[var(--appkit-color-primary)] hover:text-[var(--appkit-color-primary)] dark:border-slate-600 dark:bg-slate-900 dark:text-zinc-300"
            >
              Load more
            </button>
          </div>
        )}

        {viewMoreHref && (
          <div className="mt-6 text-center">
            <Link
              href={viewMoreHref}
              className="text-sm font-medium text-[var(--appkit-color-primary)] hover:opacity-80"
            >
              {viewMoreLabel}
            </Link>
          </div>
        )}
      </div>
    </Section>
  );
}

// --- Main component -----------------------------------------------------------

export function FeaturedProductsSection({
  title = "Featured Products",
  description,
  viewMoreHref,
  viewMoreLabel = "View all products →",
  className = "",
  filterByBrand,
  initialItems,
  rows = 1,
  maxItems,
  pagination = "load-more",
}: FeaturedProductsSectionProps) {
  const effectiveRows = Math.min(Math.max(rows, 1), 4);
  const effectiveMaxItems = Math.min(Math.max(maxItems ?? effectiveRows * 5, 5), 20);

  const { data, isLoading } = useFeaturedProducts({
    filterByBrand,
    initialData: initialItems?.length
      ? { items: initialItems, total: initialItems.length, page: 1, pageSize: initialItems.length, totalPages: 1, hasMore: false }
      : undefined,
  });
  const items = data?.items ?? [];

  // Multi-row mode — render grid with pagination
  if (effectiveRows > 1) {
    if (isLoading) return null;
    return (
      <ProductGrid
        items={items}
        rows={effectiveRows}
        maxItems={effectiveMaxItems}
        pagination={pagination}
        viewMoreHref={viewMoreHref}
        viewMoreLabel={viewMoreLabel}
        title={title}
        description={description}
      />
    );
  }

  // Single-row mode — original horizontal carousel (backward-compat)
  return (
    <SectionCarousel
      title={title}
      description={description}
      pillLabel="Featured Products"
      headingVariant="editorial"
      viewMoreHref={viewMoreHref}
      viewMoreLabel={viewMoreLabel}
      items={items}
      isLoading={isLoading}
      skeletonCount={4}
      gap={16}
      keyExtractor={(product) => product.id}
      renderItem={(product: ProductItem) => (
        <InteractiveProductCard
          product={product}
          href={String(ROUTES.PUBLIC.PRODUCT_DETAIL(product.slug ?? product.id ?? ""))}
        />
      )}
      className={className}
    />
  );
}
