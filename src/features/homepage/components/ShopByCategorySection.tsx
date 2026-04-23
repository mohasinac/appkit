"use client";
import React from "react";
import Link from "next/link";
import { THEME_CONSTANTS } from "../../../tokens";
import { Heading, HorizontalScroller, Section, Text } from "../../../ui";
import { ROUTES } from "../../../next";
import { useTopCategories } from "../hooks/useTopCategories";
import type { CategoryItem } from "../../categories/types";

export interface ShopByCategorySectionProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  className?: string;
}

function CategoryChip({ category }: { category: CategoryItem }) {
  const iconSrc = category.display?.icon;
  const coverImage = category.display?.coverImage;
  const initial = category.name[0]?.toUpperCase() ?? "?";
  const productCount = category.metrics?.productCount ?? 0;
  return (
    <Link
      href={ROUTES.PUBLIC.CATEGORY_DETAIL(category.slug)}
      className="group flex min-h-[220px] min-w-[180px] max-w-[220px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-primary-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary-600"
    >
      {coverImage ? (
        <div className="aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-slate-800" data-section="shopbycategorysection-div-362">
          <img
            src={coverImage}
            alt={category.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-slate-800 dark:to-slate-700" />
      )}

      <div className="flex flex-1 flex-col p-3 text-left" data-section="shopbycategorysection-div-363">
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-300" data-section="shopbycategorysection-div-364">
          {iconSrc ? (
            <img
              src={iconSrc}
              alt=""
              className="h-6 w-6 rounded object-cover"
              aria-hidden="true"
            />
          ) : (
            initial
          )}
        </div>
        <Text className="line-clamp-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {category.name}
        </Text>
        <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {productCount.toLocaleString()} items
        </Text>
        <Text className="mt-auto pt-3 text-xs font-medium text-primary dark:text-primary-400">
          Browse category →
        </Text>
      </div>
    </Link>
  );
}

export function ShopByCategorySection({
  title = "Shop by Category",
  subtitle,
  limit = 12,
  viewMoreHref,
  viewMoreLabel = "View all categories →",
  className = "",
}: ShopByCategorySectionProps) {
  const { themed } = THEME_CONSTANTS;
  const { data: categories = [], isLoading } = useTopCategories(limit);

  if (!isLoading && categories.length === 0) return null;

  return (
    <Section className={`py-12 px-4 ${themed.bgSecondary} ${className}`}>
      <div className="mx-auto max-w-7xl" data-section="shopbycategorysection-div-365">
        <div className="mb-6 text-center" data-section="shopbycategorysection-div-366">
          <Heading level={2} className={`text-2xl font-bold md:text-3xl ${themed.textPrimary}`}>
            {title}
          </Heading>
          {subtitle && (
            <Text variant="secondary" className="mt-1 text-sm">
              {subtitle}
            </Text>
          )}
        </div>

        {isLoading ? (
          <div className="flex gap-3 overflow-hidden px-1" data-section="shopbycategorysection-div-367">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex-none h-[104px] w-[108px] animate-pulse rounded-xl bg-zinc-200 dark:bg-slate-700"
              />
            ))}
          </div>
        ) : (
          <HorizontalScroller
            items={categories}
            renderItem={(cat) => <CategoryChip category={cat} />}
            perView={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
            gap={16}
            keyExtractor={(cat) => cat.id}
            minItemWidth={180}
          />
        )}

        {viewMoreHref && !isLoading && (
          <div className="mt-6 text-center" data-section="shopbycategorysection-div-368">
            <Link
              href={viewMoreHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
            >
              {viewMoreLabel}
            </Link>
          </div>
        )}
      </div>
    </Section>
  );
}
