"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { THEME_CONSTANTS } from "../../../tokens";
import { Heading, HorizontalScroller, Section, Text } from "../../../ui";
import { ROUTES } from "../../../next";
import { useTopBrands } from "../hooks/useTopBrands";
import type { CategoryItem } from "../../categories/types";
import type { SectionCTA } from "../schemas/firestore";

const CTA_CLASSES: Record<SectionCTA["variant"], string> = {
  filled: "rounded-lg bg-[var(--appkit-color-primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90",
  outline: "rounded-lg border border-[var(--appkit-color-primary)] px-5 py-2 text-sm font-semibold text-[var(--appkit-color-primary)] hover:bg-[var(--appkit-color-primary)]/10",
  text: "text-sm font-medium text-[var(--appkit-color-primary)] hover:underline",
};

function BrandFilterChip({
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

export interface BrandsSectionProps {
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
    byCountry?: string;
  };
}

function BrandLogo({ brand }: { brand: CategoryItem }) {
  const iconSrc = brand.display?.icon;
  const coverImage = brand.display?.coverImage;
  const initial = brand.name[0]?.toUpperCase() ?? "?";
  return (
    <Link
      href={ROUTES.PUBLIC.CATEGORY_DETAIL(brand.slug)}
      className="flex h-24 w-28 flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition-all hover:border-primary-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
    >
      {iconSrc || coverImage ? (
        <Image
          src={iconSrc ?? coverImage!}
          alt={brand.name}
          width={40}
          height={40}
          className="h-10 w-10 rounded object-contain"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
          {initial}
        </div>
      )}
      <Text className="w-full truncate text-center text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {brand.name}
      </Text>
    </Link>
  );
}

export function BrandsSection({
  title = "Top Brands",
  subtitle,
  limit = 12,
  viewMoreHref,
  viewMoreLabel = "All brands →",
  className = "",
  initialItems,
  cta,
  filters,
}: BrandsSectionProps) {
  const { themed } = THEME_CONSTANTS;
  const { data: allBrands = [], isLoading } = useTopBrands(limit, { initialData: initialItems });
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Available filter chips: "All" + "Featured" when featuredOnly filter is configured
  const showFeaturedChip = filters?.featuredOnly !== undefined;

  const brands = allBrands.filter((brand) => {
    if (activeFilter === "featured" && !brand.isFeatured) return false;
    return true;
  });

  if (!isLoading && allBrands.length === 0) return null;

  return (
    <Section className={`py-12 px-4 ${themed.bgSecondary} ${className}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <>
            <Heading level={2} className={`text-2xl font-bold md:text-3xl ${themed.textPrimary}`}>
              {title}
            </Heading>
            {subtitle && (
              <Text variant="secondary" className="mt-1 text-sm">
                {subtitle}
              </Text>
            )}
          </>
          {!cta && viewMoreHref && (
            <Link href={viewMoreHref} className="text-sm font-medium text-[var(--appkit-color-primary)] hover:underline">
              {viewMoreLabel}
            </Link>
          )}
        </div>

        {/* Filter chips */}
        {showFeaturedChip && !isLoading && (
          <div className="mb-4 flex flex-wrap gap-2">
            <BrandFilterChip label="All" active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
            <BrandFilterChip label="Featured" active={activeFilter === "featured"} onClick={() => setActiveFilter(activeFilter === "featured" ? "all" : "featured")} />
          </div>
        )}

        {isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 w-28 flex-none animate-pulse rounded-xl bg-zinc-200 dark:bg-slate-700" />
            ))}
          </div>
        ) : (
          <HorizontalScroller
            items={brands}
            renderItem={(brand: CategoryItem) => <BrandLogo brand={brand} />}
            keyExtractor={(brand) => brand.id}
            gap={12}
            showArrows
            showScrollbar={false}
          />
        )}

        {/* CTA button */}
        {cta && !isLoading && (
          <div className="mt-6 text-center">
            <Link href={cta.href} className={CTA_CLASSES[cta.variant]}>
              {cta.label}
            </Link>
          </div>
        )}
      </div>
    </Section>
  );
}
