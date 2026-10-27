/**
 * Homepage SECTION-CONFIG gating — strip authored links that point at a closed
 * surface, and drop whatever is left with nothing to say.
 *
 * ## The gap this closes
 *
 * `MarketplaceHomepageView` has three section gates and they are all keyed on
 * `SectionType`: `HOMEPAGE_SECTION_LISTING_TYPE`,
 * `HOMEPAGE_SECTION_CATEGORY_TYPE`, `HOMEPAGE_SECTION_BROWSE_PAGE`. They work,
 * and they are enough for a section that IS a surface — the auctions rail, the
 * categories rail, the stores rail.
 *
 * They cannot see a `custom-cards`, `promo-grid`, `banner`, `welcome` or
 * `collection-cards` section, because those are one generic type holding
 * admin-authored content whose only tie to a surface is where its buttons
 * point. `gateCarouselSlides` is the same realisation for the `carousel` type;
 * this is the rest of the homepage.
 *
 * ## 🛑 Measured on the live homepage, 2026-10-27
 *
 * With all four browse pages closed since 2026-10-24, and `art`/`spares`
 * auto-hidden at count 0 (both already answering a real 404 at the edge), a
 * production fetch of `/` carried:
 *
 * | links | to | state |
 * |---|---|---|
 * | **34** | `/categories` + `/categories/{slug}` | section closed |
 * | 3 | `/art` | **404** |
 * | 3 | `/spares` | **404** |
 *
 * Three ungated sections produced all of it: `section-welcome-hero`
 * (`secondaryCtaLink`), `section-systems-matrix` (35 category buttons across 4
 * cards) and `section-generation-promos` (4 category banners). Plus
 * `section-shop-extras`, whose three cards pointed at `/art`, `/spares` and
 * `/bundles`.
 *
 * A rail that advertises a closed door is worse than an absent rail: the
 * visitor spends a click to find out, and a crawler spends budget.
 *
 * ## The three rules, in order
 *
 * 1. **A closed link is removed.** Button, banner, CTA — whatever carries it.
 * 2. **A container whose links were ALL closed is removed.** A card or banner
 *    with its CTAs stripped is a picture with no destination; it reads as a
 *    broken tile, not as a tidied one.
 * 3. **A section left with no linked content is removed.** This is rule 2 one
 *    level up, and it is what turns the systems matrix (every one of its 35
 *    buttons closed) from "four empty cards" into "not rendered".
 *
 * 🛑 Rule 3 applies ONLY to sections whose content IS the links. A `welcome`
 * hero that loses its secondary CTA keeps its heading, its copy and its
 * primary CTA to `/products`, and must still render — dropping it would blank
 * the top of the homepage because one of its two buttons was withdrawn. That
 * is why `LINK_BEARING_SECTIONS` is an explicit allow-list keyed on
 * `SectionType` rather than "any section with no links left".
 *
 * ## Fails OPEN throughout
 *
 * Every decision runs through `isClosedHref`, which classifies nothing when
 * the settings document is missing. A transient Firestore error therefore
 * leaves the homepage exactly as authored rather than stripping it to the
 * studs — the same direction as every other gate on this page (Root Cause
 * #72).
 *
 * @tag domain:homepage
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

import {
  isClosedHref,
  type ClosedSurfaceContext,
} from "../../../_internal/shared/listing-types/route-gating";
import type { HomepageSectionDocument, SectionType } from "../schemas/firestore";

/**
 * Section types whose entire substance is a set of linked tiles, and which are
 * therefore meaningless once every link is gone.
 *
 * 🛑 An explicit allow-list, not a heuristic. `welcome`, `banner` and
 * `newsletter` all carry links AND standalone copy — a `welcome` hero stripped
 * of its secondary CTA still has an h1, a description and a primary CTA, so
 * "no links left" must not drop it. Getting this backwards blanks the top of
 * the homepage.
 *
 * Keyed on `SectionType` so an unlisted type is never dropped by rule 3,
 * which is the safe default: a section that survives with a missing button is
 * a visible prompt to go and fix the content, while a section wrongly removed
 * is invisible.
 */
const LINK_BEARING_SECTIONS: ReadonlySet<SectionType> = new Set<SectionType>([
  "custom-cards",
  "promo-grid",
  "collection-cards",
]);

/**
 * Config keys that hold a single destination, paired with the sibling key that
 * labels it.
 *
 * Both are cleared together: a `secondaryCtaText` with no `secondaryCtaLink`
 * renders a button that goes nowhere, which is strictly worse than no button.
 * `banner`/`features` CTAs use `link`, `welcome`/`how-it-works` use
 * `ctaLink` — all three spellings are live in the seeded configs.
 */
const SCALAR_CTA_KEYS: ReadonlyArray<readonly [link: string, label: string]> = [
  ["ctaLink", "ctaText"],
  ["secondaryCtaLink", "secondaryCtaText"],
  ["learnMoreLink", "learnMoreLabel"],
  ["ctaUrl", "ctaLabel"],
];

/** Keys whose value is an array of `{ href | link | ctaUrl }` objects. */
const LINK_ARRAY_KEYS = ["buttons", "banners", "cards", "collections", "links", "items"] as const;

type Dict = Record<string, unknown>;

function isDict(v: unknown): v is Dict {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Every destination spelling an authored object may carry. */
function destinationOf(node: Dict): string | undefined {
  for (const key of ["href", "link", "url", "ctaUrl", "ctaLink"]) {
    const v = node[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

/**
 * Recursively prune closed destinations out of one config value.
 *
 * Returns `{ value, hadLinks, keptLinks }` so a caller can tell "this subtree
 * never advertised anything" from "this subtree advertised only closed
 * things" — the distinction rules 2 and 3 both turn on, and the one a bare
 * emptiness test gets wrong. `[].every()` is `true`, so an image-only card
 * would otherwise be dropped for having no surviving links when it never had
 * any (the same trap `isCardDisabled` documents in `slide-gating`).
 */
function prune(
  node: unknown,
  ctx: ClosedSurfaceContext,
): { value: unknown; hadLinks: number; keptLinks: number } {
  if (Array.isArray(node)) {
    let hadLinks = 0;
    let keptLinks = 0;
    const out: unknown[] = [];
    for (const item of node) {
      const r = prune(item, ctx);
      hadLinks += r.hadLinks;
      // Rule 2: a container that advertised only closed destinations goes.
      if (r.hadLinks > 0 && r.keptLinks === 0) continue;
      keptLinks += r.keptLinks;
      out.push(r.value);
    }
    return { value: out, hadLinks, keptLinks };
  }

  if (!isDict(node)) return { value: node, hadLinks: 0, keptLinks: 0 };

  const out: Dict = { ...node };
  let hadLinks = 0;
  let keptLinks = 0;

  // This object's own destination, if it has one.
  const own = destinationOf(node);
  if (own !== undefined) {
    hadLinks += 1;
    if (isClosedHref(own, ctx)) {
      for (const key of ["href", "link", "url", "ctaUrl", "ctaLink"]) delete out[key];
    } else {
      keptLinks += 1;
    }
  }

  // Scalar CTA pairs — cleared with their labels.
  for (const [linkKey, labelKey] of SCALAR_CTA_KEYS) {
    const v = node[linkKey];
    if (typeof v !== "string" || v.length === 0) continue;
    // Already counted above when it doubled as this object's own destination.
    const alreadyCounted = own === v;
    if (!alreadyCounted) hadLinks += 1;
    if (isClosedHref(v, ctx)) {
      delete out[linkKey];
      delete out[labelKey];
    } else if (!alreadyCounted) {
      keptLinks += 1;
    }
  }

  // Nested link-bearing arrays.
  for (const key of LINK_ARRAY_KEYS) {
    if (!Array.isArray(node[key])) continue;
    const r = prune(node[key], ctx);
    out[key] = r.value;
    hadLinks += r.hadLinks;
    keptLinks += r.keptLinks;
  }

  return { value: out, hadLinks, keptLinks };
}

/**
 * Strip closed destinations from one section, or return `null` to drop it.
 *
 * Exported for the audit and for direct use; `gateHomepageSections` is the
 * normal entry point.
 */
export function gateHomepageSection<T extends HomepageSectionDocument>(
  section: T,
  ctx: ClosedSurfaceContext,
): T | null {
  const { value, hadLinks, keptLinks } = prune(section.config, ctx);

  // Rule 3: a section whose whole substance is links, left with none.
  if (
    LINK_BEARING_SECTIONS.has(section.type as SectionType) &&
    hadLinks > 0 &&
    keptLinks === 0
  ) {
    return null;
  }

  // Nothing was pruned — return the original object so React sees a stable
  // reference and the common case allocates nothing.
  if (hadLinks === keptLinks) return section;

  return { ...section, config: value as T["config"] };
}

/**
 * Apply `gateHomepageSection` across an ordered section list.
 *
 * Returns a new array; input is not mutated.
 */
export function gateHomepageSections<T extends HomepageSectionDocument>(
  sections: readonly T[],
  ctx: ClosedSurfaceContext,
): T[] {
  const kept: T[] = [];
  for (const section of sections) {
    const gated = gateHomepageSection(section, ctx);
    if (gated !== null) kept.push(gated);
  }
  return kept;
}
