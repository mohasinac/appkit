import React from "react";
import { Breadcrumb } from "../../../ui/components/Breadcrumb";
import type { BreadcrumbItem } from "../../../ui/components/Breadcrumb";
import { Details, Summary } from "../../../ui/components/Details";
import { Div } from "../../../ui/components/Div";
import { Row, Stack } from "../../../ui/components/Layout";
import { Span } from "../../../ui/components/Typography";
import { TextLink } from "../../../ui/components/TextLink";
import { ROUTES } from "../../../next/routing/route-map";
import type { CategoryItem, CategoryAncestor } from "../types";
import {
  alternateAssignments,
  collapseTrail,
  type BreadcrumbCrumb,
} from "../utils/breadcrumb-chain";

// --- BreadcrumbTrail ----------------------------------------------------------

export interface BreadcrumbTrailProps {
  /**
   * The chain to render, root-first, with the final crumb carrying no `url`.
   *
   * 🛑 PREFER THIS over `category`. It is the same array the page hands to
   * `breadcrumbJsonLd`, which is what makes the visible trail, the markup and
   * `categoryNames` agree by construction rather than by discipline — D4b's
   * rule. Before this prop existed the category page and the product page each
   * hand-rolled their own `<Nav>`, and the product one rendered three crumbs
   * (`Home / Products / Category`) while its JSON-LD carried all eight.
   */
  crumbs?: readonly BreadcrumbCrumb[];
  /**
   * Legacy input: a category whose `ancestors` array becomes the chain.
   * Kept because it is the published prop shape; `crumbs` wins when both are
   * passed.
   */
  category?: CategoryItem;
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
   * 🛑 Needed independently of multi-assignment: a tier-4 part leaf is EIGHT
   * crumbs (`Home > Categories > Spinning Tops > Beyblade Metal > Metal Parts >
   * Performance Tips > Rubber Flat > <title>`) and 390px cannot hold it. D4b
   * measured that depth and never addressed how it wraps.
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
  /**
   * `"on-media"` when the trail sits over a cover photo — the category hero
   * does. Forwarded to the `Breadcrumb` primitive, which owns the ink.
   */
  tone?: "default" | "on-media";
}

/**
 * BreadcrumbTrail — one row of crumbs, with the middle and the alternates
 * collapsed behind real `<details>` dropdowns.
 *
 * 🛑 BOTH DROPDOWNS CONTAIN REAL `<a>` ELEMENTS IN THE SERVER-RENDERED DOM.
 * `<details>`/`<summary>` is native, needs no JavaScript, works on a keyboard,
 * and — the reason it was chosen over a hover menu — a crawler parsing the HTML
 * sees every link whether or not anything ever opens it. Links injected on
 * open would trade the SEO this exists for against tidiness, which is the
 * opposite of *"better for both crawler and users"*.
 *
 * 🛑 Collapsing is PRESENTATION ONLY. The JSON-LD is emitted by the page from
 * the full chain and must stay that way: a crawler never receives a truncated
 * hierarchy because a phone could not show it.
 *
 * @example
 * ```tsx
 * <BreadcrumbTrail crumbs={withTrailHead(categoryCrumbs(category), HEAD)} />
 * ```
 */
export function BreadcrumbTrail({
  crumbs,
  category,
  rootLabel = "All Categories",
  rootHref = String(ROUTES.PUBLIC.CATEGORIES),
  basePath = String(ROUTES.PUBLIC.CATEGORIES),
  showCurrent = true,
  className,
  collapse = true,
  alternates,
  tone = "default",
}: BreadcrumbTrailProps) {
  const chain: BreadcrumbCrumb[] = crumbs?.length
    ? [...crumbs]
    : category
      ? [
          { name: rootLabel, url: rootHref },
          ...(category.ancestors ?? [])
            .slice()
            .sort((a: CategoryAncestor, b: CategoryAncestor) => a.tier - b.tier)
            .map((ancestor: CategoryAncestor) => ({
              name: ancestor.name,
              url: `${basePath}/${ancestor.id}`,
            })),
          ...(showCurrent ? [{ name: category.name }] : []),
        ]
      : [];

  if (chain.length === 0) return null;

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

  const split = collapse ? collapseTrail(chain) : null;
  const hasCollapsed = Boolean(split && split.collapsed.length > 0);

  const visible: BreadcrumbItem[] = hasCollapsed
    ? [...split!.lead.map(fromCrumb), ...split!.tail.map(fromCrumb)]
    : chain.map(fromCrumb);

  /*
   * The collapsed middle is injected AFTER the lead rather than rendered as a
   * label-only crumb, so the hidden ancestors stay clickable. The previous
   * version rendered `… 3 more` as plain text, which told the visitor what was
   * missing and gave them no way to reach it.
   */
  const leadCount = hasCollapsed ? split!.lead.length : 0;

  return (
    /*
     * No marker class here — it lives on the `<Breadcrumb>` primitive this
     * renders below, which is also what the scam registry's pages use
     * directly. One owner; see `Breadcrumb.tsx`.
     */
    <Div className={className}>
      <Row align="center" gap="xs" wrap>
        <Breadcrumb items={visible.slice(0, leadCount)} tone={tone} />
        {hasCollapsed && (
          <Details tone="card" padding="sm" rounded="lg">
            <Summary size="xs" color="muted" ariaLabel={`Show ${split!.collapsed.length} hidden category levels`}>
              {`… ${split!.collapsed.length} more`}
            </Summary>
            <Div padding="t-xs">
              <Stack align="start" gap="xs">
                {split!.collapsed.map((c) => (
                  <TextLink key={c.url ?? c.name} href={c.url ?? rootHref} size="xs">
                    {c.name}
                  </TextLink>
                ))}
              </Stack>
            </Div>
          </Details>
        )}
        <Breadcrumb items={hasCollapsed ? visible.slice(leadCount) : visible} tone={tone} />
      </Row>

      {alt.mode === "inline" && (
        <Span size="xs" color="muted">
          Also in{" "}
          {alt.items.map((a, i) => (
            <React.Fragment key={a.url ?? a.name}>
              {i > 0 && " · "}
              <TextLink href={a.url ?? rootHref} size="xs">
                {a.name}
              </TextLink>
            </React.Fragment>
          ))}
        </Span>
      )}

      {alt.mode === "dropdown" && (
        <Details tone="card" padding="sm" rounded="lg">
          <Summary size="xs" color="muted" ariaLabel="Other categories this listing is filed under">
            {`Also in ${alt.items.length} more`}
          </Summary>
          <Div padding="t-xs">
            <Stack align="start" gap="xs">
              {alt.items.map((a) => (
                <TextLink key={a.url ?? a.name} href={a.url ?? rootHref} size="xs">
                  {a.name}
                </TextLink>
              ))}
            </Stack>
          </Div>
        </Details>
      )}
    </Div>
  );
}

function fromCrumb(c: BreadcrumbCrumb): BreadcrumbItem {
  return c.url ? { label: c.name, href: c.url } : { label: c.name };
}
