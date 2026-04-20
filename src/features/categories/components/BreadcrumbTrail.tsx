import React from "react";
import { Breadcrumb } from "../../../ui";
import type { BreadcrumbItem } from "../../../ui";
import type { CategoryItem, CategoryAncestor } from "../types";

// ─── BreadcrumbTrail ──────────────────────────────────────────────────────────

export interface BreadcrumbTrailProps {
  /**
   * The current (leaf) category whose ancestry should be shown as breadcrumbs.
   * Uses `category.ancestors` if present, otherwise only the category itself.
   */
  category: CategoryItem;
  /**
   * Label for the implicit root item prepended to the trail.
   * Default: "All Categories"
   */
  rootLabel?: string;
  /**
   * Href for the root breadcrumb item.
   * Default: "/categories"
   */
  rootHref?: string;
  /**
   * Base path used to construct hrefs for ancestor items.
   * Each ancestor's href becomes `${basePath}/${ancestor.id}`.
   * Default: "/categories"
   */
  basePath?: string;
  /**
   * When true, the current (leaf) category is rendered as a non-link text item.
   * Default: true
   */
  showCurrent?: boolean;
  className?: string;
}

/**
 * BreadcrumbTrail — a category-aware breadcrumb component.
 *
 * Renders the full ancestor chain for a category using the `ancestors` array
 * stored on `CategoryItem`. Falls back gracefully when `ancestors` is absent
 * (shows only the root + current category).
 *
 * @example
 * ```tsx
 * <BreadcrumbTrail
 *   category={category}
 *   rootHref="/categories"
 *   basePath="/categories"
 * />
 * ```
 */
export function BreadcrumbTrail({
  category,
  rootLabel = "All Categories",
  rootHref = "/categories",
  basePath = "/categories",
  showCurrent = true,
  className,
}: BreadcrumbTrailProps) {
  const items: BreadcrumbItem[] = [
    // Root
    { label: rootLabel, href: rootHref },
    // Ancestors (sorted by tier ascending so root → leaf order)
    ...(category.ancestors ?? [])
      .slice()
      .sort((a: CategoryAncestor, b: CategoryAncestor) => a.tier - b.tier)
      .map((ancestor: CategoryAncestor) => ({
        label: ancestor.name,
        href: `${basePath}/${ancestor.id}`,
      })),
    // Current category (no href so it renders as the active item)
    ...(showCurrent ? [{ label: category.name }] : []),
  ];

  return <Breadcrumb items={items} className={className} />;
}
