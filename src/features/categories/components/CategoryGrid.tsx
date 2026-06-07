import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Div, Span, Text } from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";
import type { CategoryItem } from "../types";

const __P = {
  p3: "p-3",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_FEATURED_DOT = "absolute left-2 top-2 rounded-full bg-amber-400 p-1 leading-none";

// --- CategoryCard -------------------------------------------------------------

export interface CategoryCardProps {
  category: CategoryItem;
  href?: string;
  onClick?: (category: CategoryItem) => void;
  className?: string;
}

export function CategoryCard({
  category,
  href,
  onClick,
  className = "",
}: CategoryCardProps) {
  const productCount =
    category.metrics?.productCount ?? (category as any).productCount ?? 0;

  const inner = (
    <Div className="flex h-full flex-col">
      {/* Image area — fixed aspect ratio */}
      <Div className={`relative aspect-[4/3] w-full ${__O.hidden} bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-zinc-800 dark:to-zinc-700 flex-shrink-0`}>
        {category.display?.coverImage ? (
          <Div
            role="img"
            aria-label={category.name}
            className="h-full w-full bg-center bg-cover transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: `url(${category.display.coverImage})` }}
          />
        ) : category.display?.color ? (
          <Div
            className="h-full w-full opacity-80"
            style={{ backgroundColor: category.display.color }}
          />
        ) : null}
        {/* Icon overlay */}
        {category.display?.icon && (
          <Div className="absolute inset-0 flex items-center justify-center text-4xl">
            {category.display.icon}
          </Div>
        )}
        {/* Featured badge */}
        {category.isFeatured && (
          <Span size="xs" className={CLS_FEATURED_DOT}>
            ★
          </Span>
        )}
      </Div>

      {/* Content */}
      <Div className={`flex flex-1 flex-col ${__P.p3}.5`}>
        <Text className={`font-semibold text-sm leading-snug ${THEME_CONSTANTS.utilities.textClamp2} text-neutral-900 dark:text-white`}>
          {category.name}
        </Text>
        {category.description && (
          <Text className={`mt-1 text-xs ${THEME_CONSTANTS.utilities.textClamp2} text-neutral-500 dark:text-zinc-400 flex-1`}>
            {category.description}
          </Text>
        )}
        <Div className="mt-2 flex items-center justify-between gap-2">
          <Text className="text-xs text-zinc-400 dark:text-zinc-400">
            {productCount.toLocaleString()} {productCount === 1 ? "item" : "items"}
          </Text>
          <Span size="xs" weight="medium" className="inline-flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-zinc-600 dark:text-zinc-300 group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-colors">
            Browse <ArrowRight className="h-3 w-3" />
          </Span>
        </Div>
      </Div>
    </Div>
  );

  const cardClass = `group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 shadow-sm transition hover:shadow-md h-full ${className}`;

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {inner}
      </Link>
    );
  }

  return (
    <Div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(category)
          : undefined
      }
      onClick={onClick ? () => onClick(category) : undefined}
      className={cardClass}
    >
      {inner}
    </Div>
  );
}

// --- CategoryGrid -------------------------------------------------------------

export interface CategoryGridProps {
  categories: CategoryItem[];
  getHref?: (category: CategoryItem) => string;
  onCategoryClick?: (category: CategoryItem) => void;
  emptyLabel?: string;
  className?: string;
}

export function CategoryGrid({
  categories,
  getHref,
  onCategoryClick,
  emptyLabel = "No categories found",
  className = "",
}: CategoryGridProps) {
  if (categories.length === 0) {
    return (
      <Text className="py-12 text-center text-sm text-neutral-500 dark:text-zinc-500">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${className}`}>
      {categories.map((cat) => (
        <CategoryCard
          key={cat.id}
          category={cat}
          href={getHref ? getHref(cat) : undefined}
          onClick={!getHref ? onCategoryClick : undefined}
        />
      ))}
    </Div>
  );
}
