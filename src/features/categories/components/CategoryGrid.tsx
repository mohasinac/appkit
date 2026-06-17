import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Div, Row, Span, Stack, Text } from "../../../ui";

import type { CategoryItem } from "../types";

const __P = {
  p3: "p-3",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_FEATURED_DOT = "absolute left-2 top-2 rounded-full bg-warning-surface p-1 leading-none";

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
    <Stack className="h-full">
      {/* Image area — fixed aspect ratio */}
      <Div surface="muted" className={`relative aspect-[4/3] w-full ${__O.hidden} flex-shrink-0`}>
        {category.display?.coverImage ? (
          <Div
            role="img"
            aria-label={category.name}
            className="h-full w-full bg-center bg-cover transition-transform duration-300 group-hover:scale-105"
            // audit-inline-style-ok: dynamic image URL
            style={{ backgroundImage: `url(${category.display.coverImage})` }}
          />
        ) : category.display?.color ? (
          <Div
            className="h-full w-full opacity-80"
            // audit-inline-style-ok: runtime theme color
            style={{ backgroundColor: category.display.color }}
          />
        ) : null}
        {/* Icon overlay */}
        {category.display?.icon && (
          <Row textSize="4xl" className="absolute inset-0" align="center" justify="center">
            {category.display.icon}
          </Row>
        )}
        {/* Featured badge */}
        {category.isFeatured && (
          <Span size="xs" className={CLS_FEATURED_DOT}>
            ★
          </Span>
        )}
      </Div>

      {/* Content */}
      <Stack className={`flex-1 ${__P.p3}.5`}>
        <Text color="inverse" className={`leading-snug text-neutral-900 dark:text-neutral-100 dark:`} truncate={2} size="sm" weight="semibold">
          {category.name}
        </Text>
        {category.description && (
          <Text className={`mt-1 flex-1`} color="muted" truncate={2} size="xs">
            {category.description}
          </Text>
        )}
        <Row className="mt-2" align="center" justify="between" gap="sm">
          <Text size="xs" color="faint">
            {productCount.toLocaleString()} {productCount === 1 ? "item" : "items"}
          </Text>
          {/* audit-variant-ok: Browse pill — group-hover state transitions to primary bg/border/text; Span lacks group-hover variant */}
          <Span layout="inline-flex" gap="xs" size="xs" weight="medium" border="default" className="group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-colors" rounded="md" padding="pill-sm-tall" color="muted">
            Browse <ArrowRight className="h-3 w-3" />
          </Span>
        </Row>
      </Stack>
    </Stack>
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
      <Text paddingY="3xl" className="text-neutral-500 dark:text-neutral-400" size="sm" align="center">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Div layout="grid" gap="4" className={`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${className}`}>
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
