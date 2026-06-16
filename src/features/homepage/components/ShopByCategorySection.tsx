"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { THEME_CONSTANTS } from "../../../tokens";
import { Div, Heading, HorizontalScroller, Row, Section, Span, Stack, Text } from "../../../ui";
import { ROUTES } from "../../../next";
import { useTopCategories } from "../hooks/useTopCategories";
import type { CategoryItem } from "../../categories/types";
import type { SectionCTA } from "../schemas/firestore";
import { CAROUSEL_PER_VIEW } from "../constants/carousel-per-view";

const __P = {
  p3: "p-3",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

export interface ShopByCategorySectionProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  className?: string;
  initialItems?: CategoryItem[];
  cta?: SectionCTA;
  filters?: {
    featuredOnly?: boolean;
    rootOnly?: boolean;
    rootCategoryId?: string;
  };
}

function isImageUrl(s: string): boolean {
  return s.startsWith("http") || s.startsWith("/") || s.startsWith("data:");
}

function CategoryChip({ category }: { category: CategoryItem }) {
  const iconSrc = category.display?.icon;
  const coverImage = category.display?.coverImage;
  const initial = category.name[0]?.toUpperCase() ?? "?";
  const productCount = category.metrics?.productCount ?? 0;
  return (
    <Link
      href={ROUTES.PUBLIC.CATEGORY_DETAIL(category.slug)}
      className="group flex w-full min-h-[180px] sm:min-h-[220px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-primary-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary-600"
    >
      {coverImage && isImageUrl(coverImage) ? (
        <Div className={`aspect-video w-full ${__O.hidden}`} surface="subtle">
          <Image
            src={coverImage}
            alt={category.name}
            width={320}
            height={180}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Div>
      ) : (
        <Div surface="muted" className="aspect-video w-full" />
      )}

      <Stack className={`flex-1 ${__P.p3} text-left`}>
        <Row className="mb-2 h-9 w-9 bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-300" align="center" justify="center" rounded="lg">
          {iconSrc && isImageUrl(iconSrc) ? (
            <Image
              src={iconSrc}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 rounded object-cover"
              aria-hidden={true}
            />
          ) : iconSrc ? (
            <Span size="lg" aria-hidden="true" className="leading-none">{iconSrc}</Span>
          ) : (
            initial
          )}
        </Row>
        <Text size="sm" weight="semibold" color="primary" truncate={2}>
          {category.name}
        </Text>
        <Text className="mt-1" color="muted" size="xs">
          {productCount.toLocaleString()} items
        </Text>
        <Text className="mt-auto pt-3 text-primary dark:text-primary-400" size="xs" weight="medium">
          Browse category →
        </Text>
      </Stack>
    </Link>
  );
}

const CTA_CLASSES: Record<SectionCTA["variant"], string> = {
  filled: "rounded-lg bg-[var(--appkit-color-primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90",
  outline: "rounded-lg border border-[var(--appkit-color-primary)] px-5 py-2 text-sm font-semibold text-[var(--appkit-color-primary)] hover:bg-[var(--appkit-color-primary)]/10",
  text: "text-sm font-medium text-[var(--appkit-color-primary)] hover:underline",
};

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-[var(--appkit-color-primary)] bg-[var(--appkit-color-primary)] text-white"
          : "border-zinc-300 bg-white text-zinc-600 hover:border-[var(--appkit-color-primary)] dark:border-slate-600 dark:bg-slate-800 dark:text-zinc-300",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export function ShopByCategorySection({
  title = "Shop by Category",
  subtitle,
  limit = 12,
  viewMoreHref,
  viewMoreLabel = "View all categories →",
  className = "",
  initialItems,
  cta,
  filters,
}: ShopByCategorySectionProps) {
  const { themed } = THEME_CONSTANTS;
  const { data: allCategories = [], isLoading } = useTopCategories(limit, { initialData: initialItems });
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Build client-side filter chip options from root-level parent IDs
  const rootIds = filters?.rootCategoryId
    ? [filters.rootCategoryId]
    : Array.from(new Set(allCategories.flatMap((c) => c.parentIds ?? [c.id]).filter(Boolean)));

  const hasFilters = !!(
    filters?.featuredOnly !== undefined ||
    filters?.rootCategoryId ||
    rootIds.length > 1
  );

  const filtered = allCategories.filter((cat) => {
    if (activeFilter !== "all") {
      const inParents = cat.parentIds?.includes(activeFilter) ?? false;
      if (!inParents && cat.id !== activeFilter) return false;
    }
    if (filters?.featuredOnly && !cat.isFeatured) return false;
    if (filters?.rootOnly && (cat.parentIds?.length ?? 0) > 0) return false;
    return true;
  });

  const categories = filtered.length > 0 ? filtered : allCategories;

  if (!isLoading && allCategories.length === 0) return null;

  return (
    <Section className={`px-4 md:py-12 ${className}`} surface="subtle" padding="y-2xl">
      <Div className="mx-auto max-w-7xl">
        <Div className="mb-6 text-center">
          <Heading level={2} className={`md:text-3xl ${themed.textPrimary}`} size="2xl" weight="bold">
            {title}
          </Heading>
          {subtitle && (
            <Text variant="secondary" className="mt-1" size="sm">
              {subtitle}
            </Text>
          )}
        </Div>

        {/* Filter chips */}
        {hasFilters && !isLoading && (
          <Div className="mb-4 flex flex-wrap gap-2">
            <FilterChip label="All" active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
            {rootIds.slice(0, 5).map((id) => {
              const cat = allCategories.find((c) => c.id === id);
              if (!cat) return null;
              return (
                <FilterChip
                  key={id}
                  label={cat.name}
                  active={activeFilter === id}
                  onClick={() => setActiveFilter(activeFilter === id ? "all" : id)}
                />
              );
            })}
          </Div>
        )}

        {isLoading ? (
          <Div className={`flex gap-3 ${__O.hidden} px-1`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Div key={i} className="flex-none h-[104px] w-[108px] animate-pulse" surface="subtle" rounded="xl" />
            ))}
          </Div>
        ) : (
          <HorizontalScroller
            items={categories}
            renderItem={(cat) => <CategoryChip category={cat} />}
            perView={CAROUSEL_PER_VIEW.standard}
            gap={16}
            keyExtractor={(cat) => cat.id}
            autoScroll
            autoScrollInterval={3500}
            showArrows
            snapToItems
            showFadeEdges
            showScrollbar={false}
            loop
            pauseOnHover
          />
        )}

        {/* CTA button */}
        {cta && !isLoading && (
          <Div className="mt-6 text-center">
            <Link href={cta.href} className={CTA_CLASSES[cta.variant]}>
              {cta.label}
            </Link>
          </Div>
        )}

        {/* Fallback view-more link when no CTA configured */}
        {!cta && viewMoreHref && !isLoading && (
          <Div className="mt-6 text-center">
            <Link href={viewMoreHref} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--appkit-color-primary)] hover:opacity-80">
              {viewMoreLabel}
            </Link>
          </Div>
        )}
      </Div>
    </Section>
  );
}
