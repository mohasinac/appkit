import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Div, Grid, Row, Span, Stack, Text } from "../../../ui";
import { DynamicBgDiv } from "../../../ui/components/DynamicBgDiv";
import { MediaImage } from "../../media/MediaImage";

import type { CategoryItem } from "../types";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_FEATURED_DOT = "absolute left-2 top-2 rounded-full bg-warning-surface p-[var(--appkit-space-1)] leading-none";

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
  // totalProductCount is the rollup (self + all descendant categories),
  // maintained incrementally by onProductWrite — prefer it over the
  // own-node-only productCount so a parent category's card shows the same
  // "N products" a visitor actually sees once they open the page.
  const productCount =
    category.metrics?.totalProductCount ?? category.metrics?.productCount ?? (category as any).productCount ?? 0;

  const inner = (
    <Stack className="h-full">
      {/* Image area — fixed aspect ratio */}
      <Div surface="muted" className={`relative aspect-[4/3] w-full ${__O.hidden} flex-shrink-0`}>
        {category.display?.coverImage ? (
          <MediaImage
            src={category.display.coverImage}
            alt={category.name}
            size="card"
            className="transition-transform duration-300 group-hover:scale-105"
          />
        ) : category.display?.color ? (
          <DynamicBgDiv color={category.display.color} className="h-full w-full opacity-80" />
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
        <Text color="inverse" className={`leading-snug text-[var(--appkit-color-text)] dark:`} truncate={2} size="sm" weight="semibold">
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
          <Span layout="inline-flex" gap="xs" size="xs" weight="medium" border="default" className="group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-colors" rounded="md" padding="pill-sm-tall" color="muted">
            Browse <ArrowRight className="h-3 w-3" />
          </Span>
        </Row>
      </Stack>
    </Stack>
  );

  const cardClass = `group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-[var(--appkit-color-surface)] border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] shadow-sm transition hover:shadow-md h-full ${className}`;

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
      <Text paddingY="3xl" className="text-[var(--appkit-color-text-muted)]" size="sm" align="start">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Grid cols="categoryCards" gap="md" className={className}>
      {categories.map((cat) => (
        <CategoryCard
          key={cat.id}
          category={cat}
          href={getHref ? getHref(cat) : undefined}
          onClick={!getHref ? onCategoryClick : undefined}
        />
      ))}
    </Grid>
  );
}
