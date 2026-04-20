import React from "react";
import { Div, Grid, Text } from "../../../ui";
import type { CategoryItem } from "../types";

// ─── CategoryCard ─────────────────────────────────────────────────────────────

export interface CategoryCardProps {
  category: CategoryItem;
  onClick?: (category: CategoryItem) => void;
  className?: string;
}

export function CategoryCard({
  category,
  onClick,
  className = "",
}: CategoryCardProps) {
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
      className={`group relative overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 shadow-sm transition hover:shadow-md ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {category.display?.coverImage ? (
        <Div className="aspect-video w-full overflow-hidden bg-neutral-100 dark:bg-zinc-800">
          <Div
            role="img"
            aria-label={category.name}
            className="h-full w-full bg-center bg-cover transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: `url(${category.display.coverImage})` }}
          />
        </Div>
      ) : (
        <Div className="aspect-video w-full bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-zinc-800 dark:to-zinc-700" />
      )}
      <Div className="p-4">
        <Text className="font-semibold text-neutral-900 dark:text-white line-clamp-2">
          {category.name}
        </Text>
        {category.description && (
          <Text className="mt-1 text-sm text-neutral-500 dark:text-zinc-400 line-clamp-2">
            {category.description}
          </Text>
        )}
        {category.metrics && (
          <Text className="mt-2 text-xs text-neutral-400 dark:text-zinc-500">
            {category.metrics.productCount.toLocaleString()} items
          </Text>
        )}
      </Div>
    </Div>
  );
}

// ─── CategoryGrid ─────────────────────────────────────────────────────────────

export interface CategoryGridProps {
  categories: CategoryItem[];
  onCategoryClick?: (category: CategoryItem) => void;
  emptyLabel?: string;
  className?: string;
}

export function CategoryGrid({
  categories,
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
    <Grid cols="categoryCards" className={className}>
      {categories.map((cat) => (
        <CategoryCard key={cat.id} category={cat} onClick={onCategoryClick} />
      ))}
    </Grid>
  );
}
