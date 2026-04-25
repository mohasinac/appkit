"use client";
import React from "react";
import Link from "next/link";
import { THEME_CONSTANTS } from "../../../tokens";
import { Heading, HorizontalScroller, Section, Text } from "../../../ui";
import { ROUTES } from "../../../next";
import { useTopBrands } from "../hooks/useTopBrands";
import type { CategoryItem } from "../../categories/types";

export interface BrandsSectionProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  className?: string;
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
        <img
          src={iconSrc ?? coverImage}
          alt={brand.name}
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
}: BrandsSectionProps) {
  const { themed } = THEME_CONSTANTS;
  const { data: brands = [], isLoading } = useTopBrands(limit);

  if (!isLoading && brands.length === 0) return null;

  return (
    <Section className={`py-12 px-4 ${themed.bgSecondary} ${className}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Heading level={2} className={`text-2xl font-bold md:text-3xl ${themed.textPrimary}`}>
              {title}
            </Heading>
            {subtitle && (
              <Text variant="secondary" className="mt-1 text-sm">
                {subtitle}
              </Text>
            )}
          </div>
          {viewMoreHref && (
            <Link href={viewMoreHref} className="text-sm font-medium text-primary hover:underline">
              {viewMoreLabel}
            </Link>
          )}
        </div>

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
      </div>
    </Section>
  );
}
