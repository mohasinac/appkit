import React from "react";
import { Text } from "@mohasinac/ui";
import type { CategoryItem } from "../types";

interface CategoryCardProps {
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
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick(category)
          : undefined
      }
      onClick={onClick ? () => onClick(category) : undefined}
      className={`group relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {category.display?.coverImage ? (
        <div className="aspect-video w-full overflow-hidden bg-neutral-100">
          <div
            role="img"
            aria-label={category.name}
            className="h-full w-full bg-center bg-cover transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: `url(${category.display.coverImage})` }}
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-gradient-to-br from-neutral-100 to-neutral-200" />
      )}
      <div className="p-4">
        <Text className="font-semibold text-neutral-900">{category.name}</Text>
        {category.description && (
          <Text className="mt-1 text-sm text-neutral-500 line-clamp-2">
            {category.description}
          </Text>
        )}
        {category.metrics && (
          <Text className="mt-2 text-xs text-neutral-400">
            {category.metrics.productCount} items
          </Text>
        )}
      </div>
    </div>
  );
}

interface CategoryGridProps {
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
      <Text className="py-12 text-center text-sm text-neutral-500">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <div
      className={`grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-4 ${className}`}
    >
      {categories.map((cat) => (
        <CategoryCard key={cat.id} category={cat} onClick={onCategoryClick} />
      ))}
    </div>
  );
}
