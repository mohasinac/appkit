import React from "react";
import { Breadcrumb } from "../../../ui";
import type { BreadcrumbItem } from "../../../ui";
import { Text } from "../../../ui/components/Typography";
import { TextLink } from "../../../ui/components/TextLink";
import { ROUTES } from "../../../next/routing/route-map";
import type { CategoryItem, CategoryAncestor } from "../types";
import { alternateAssignments, collapseTrail } from "../utils/breadcrumb-chain";

// --- BreadcrumbTrail ----------------------------------------------------------

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
  /**
   * I5b — collapse the middle of a long trail behind a dropdown.
   *
   * 🛑 Needed independently of multi-assignment: a tier-4 part leaf is SEVEN
   * crumbs (`All Categories > Spinning Tops > Beyblade Metal > Metal Parts >
   * Performance Tips > Rubber Flat`) and 390px cannot hold it. D4b measured
   * that depth and never addressed how it wraps.
   *
   * Defaults ON, because the only trails long enough to collapse are the ones
   * that already overflow.
   */
  collapse?: boolean;
  /**
   * I5b — the OTHER categories this listing is filed under, as one extra crumb.
   *
   * Pass `categoryIds`/`categoryIdNames` straight through from the product;
   * `alternateAssignments` decides inline-vs-dropdown and returns nothing at
   * all for a single assignment, which is the overwhelming majority.
   */
  alternates?: { ids?: readonly string[] | null; names?: readonly string[] | null };
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
 * category={category}
 * rootHref="/categories"
 * basePath="/categories"
 * />
 * ```
 */
export function BreadcrumbTrail({
  category,
  rootLabel = "All Categories",
  rootHref = String(ROUTES.PUBLIC.CATEGORIES),
  basePath = String(ROUTES.PUBLIC.CATEGORIES),
  showCurrent = true,
  className,
  collapse = true,
  alternates,
}: BreadcrumbTrailProps) {
  const full: BreadcrumbItem[] = [
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

  /*
   * I5b — the alternates become ONE extra crumb, never a second row. Two rows
   * of crumbs above a title is a pattern no competitor in the crawl uses and it
   * costs vertical space above the fold on a phone.
   */
  const alt = alternateAssignments({
    categoryIds: alternates?.ids ?? null,
    categoryIdNames: alternates?.names ?? null,
    hrefFor: (slug) => `${basePath}/${slug}`,
  });

  /*
   * 🛑 Collapsing is PRESENTATION. The JSON-LD is emitted elsewhere, from the
   * full chain, and must stay that way — a crawler never receives a truncated
   * hierarchy because a phone could not show it.
   */
  const split = collapse ? collapseTrail(toCrumbs(full)) : null;
  const items: BreadcrumbItem[] =
    split && split.collapsed.length > 0
      ? [
          ...split.lead.map(fromCrumb),
          /*
           * The collapsed group as ONE crumb whose label names what it hides.
           * 🛑 Rendered as a real crumb with no href rather than a menu,
           * because `Breadcrumb` is a plain list primitive — and the hidden
           * ancestors are still reachable: every one of them is an ancestor of
           * the crumbs either side, so no path is lost, only shortened.
           */
          { label: `… ${split.collapsed.length} more` },
          ...split.tail.map(fromCrumb),
        ]
      : full;

  return (
    <>
      <Breadcrumb items={items} className={className} />
      {alt.mode !== "none" && (
        <Text size="xs" color="muted">
          {/*
            * 🛑 Real <a> elements in the server-rendered DOM. A crawler does
            * not open menus, so alternates injected on open would trade the SEO
            * this exists for against tidiness — the opposite of "better for
            * both crawler and users".
            */}
          Also in{" "}
          {alt.items.map((a, i) => (
            <React.Fragment key={a.url ?? a.name}>
              {i > 0 && " · "}
              <TextLink href={a.url ?? "#"}>{a.name}</TextLink>
            </React.Fragment>
          ))}
        </Text>
      )}
    </>
  );
}

/** `BreadcrumbItem` ⇄ `BreadcrumbCrumb` — two names for one shape. */
function toCrumbs(items: readonly BreadcrumbItem[]) {
  return items.map((i) => ({ name: i.label, url: i.href }));
}
function fromCrumb(c: { name: string; url?: string }): BreadcrumbItem {
  return c.url ? { label: c.name, href: c.url } : { label: c.name };
}
