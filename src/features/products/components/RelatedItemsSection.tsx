import { Stack } from "../../../ui/components/Layout";
import {
  PILOT_REGIONS,
  PILOT_WIDGET_DEFS,
  RELATED_DEFAULT_INSTANCES,
  asRelatedScrollerConfig,
  mergedInstances,
  resolveScrollerTitle,
  resolveWidgetTree,
  type RelatedSource,
  type WidgetInstance,
} from "../../../ui/widgets";
import { getWidgetInstances } from "../../../_internal/server/features/widgets/widget-instances";
import type { ProductItem } from "../types";
import { RelatedProductsCarousel } from "./RelatedProductsCarousel";

/** The region every listing-type detail view resolves for its related rail. See the note on sharing below. */
const RELATED_REGION_ID = "products-slug:related";

export interface RelatedItemsSectionProps {
  relatedItems: ProductItem[];
  relatedByBrand: ProductItem[];
  relatedByTags: ProductItem[];
  relatedByStore: ProductItem[];
  categoryLabel?: string;
  brandLabel?: string;
  storeLabel?: string;
  /**
   * Stored widget instances for the `products-slug:related` region.
   *
   * Omitted → this component reads them itself via `getWidgetInstances` and
   * merges them onto `RELATED_DEFAULT_INSTANCES`. Supply it only to bypass
   * that read (a caller that already has them, or a test).
   *
   * 🛑 Absent STORED rows still mean the template default, which reproduces
   * the four carousels this component used to hardcode. That is the
   * sparse-by-absence guarantee the cost model rests on
   * (docs/overhaul/widget-architecture.md §12.4): a page with nothing
   * configured renders byte-identically to before the widget system existed.
   */
  instances?: readonly WidgetInstance[];
}

/**
 * The same-shape "More in category / More by brand / You might also like /
 * More from store" carousel stack, shared by every listing-type detail page
 * that surfaces `computeRelatedItems()` results.
 *
 * ---------------------------------------------------------------------------
 * 🛑 WHAT CHANGED, AND WHY IT IS NOT A SECOND MECHANISM
 * ---------------------------------------------------------------------------
 *
 * This file used to be four JSX branches that differed ONLY in which array
 * they read and what heading they printed:
 *
 *   {relatedItems.length   > 0 && <RelatedProductsCarousel items={relatedItems}   title={`More in ${categoryLabel}`} />}
 *   {relatedByBrand.length > 0 && <RelatedProductsCarousel items={relatedByBrand} title={`More by ${brandLabel}`} />}
 *   {relatedByTags.length  > 0 && <RelatedProductsCarousel items={relatedByTags}  title="You might also like" />}
 *   {relatedByStore.length > 0 && <RelatedProductsCarousel items={relatedByStore} title={`More from ${storeLabel}`} />}
 *
 * i.e. four hardcoded instances of one widget, where the difference was pure
 * configuration. The owner named all four of them as widgets by name
 * ("horizontal scrollers, related items, recommendations, sellers other
 * items"), so they are now ONE registered type (`row.horizontalScroller`) with
 * four config instances resolved through `resolveWidgetTree`.
 *
 * ## This reuses the `functionalSlot` pattern rather than competing with it
 *
 * `functionalSlot` (`recent-entry.ts`, piloted on this very page's offer and
 * buy actions) already answers the hard half of config-driven rendering:
 * **config decides placement, the PAGE supplies the live content**, threaded
 * down as a `Partial<Record<SlotId, ReactNode>>` map, with an honest
 * "not available on this page" fallback for an id the page cannot serve.
 *
 * The four `ProductItem[]` props here are exactly that map, one level earlier:
 * the page has already fetched them server-side, and config picks WHICH of
 * them a given scroller reads via its closed `source` vocabulary. So this is
 * the same mechanism applied to data instead of to nodes — deliberately not a
 * second way of getting page state into a configured widget. A widget whose
 * `source` resolves to an empty array renders nothing, which is the same
 * behaviour the `.length > 0` guards gave.
 *
 * ## What is NOT duplicated
 *
 * The whole-block on/off switch stays where it already is — the
 * `SectionVisibilityGate surfaceId="pdp-sections" sectionKey="related"` that
 * wraps this component in `ProductDetailPageView`. That is a different GRAIN
 * (the entire related block) from a widget instance's `state` (one carousel),
 * so they are one switch each, not two switches for one thing. 🚩 When the
 * `widgetInstances` collection lands, the region instance should carry
 * `aliases: ["pdp-sections:related"]` so the existing admin toggle keeps
 * resolving — the §4.4 rule, because re-deriving that key is precisely the
 * nav-badge trap.
 *
 * ## One region id is SHARED by all seven detail-page views, deliberately
 *
 * This component is rendered by seven views — product, clearance, classified,
 * collector-drop, digital-code, live and pre-order — and they all resolve the
 * single `products-slug:related` region, so configuring the related rail
 * changes it on all seven at once.
 *
 * That is the EXISTING convention here, not a new compromise: all seven of
 * those views already call `getFieldVisibility("pdp-sections")` with the same
 * literal surface id (verified: 7 call sites, one id), so the related block's
 * on/off switch is already shared across them. Giving each view its own region
 * id would introduce a divergence from a convention the admin UI already
 * exposes, which is the opposite of what this work is for.
 *
 * 🚩 Flagged as an owner decision rather than assumed to be settled: if the
 * related rail should be configurable PER listing type, that is a region id
 * per view plus seven default instance lists — real work, and a change to how
 * `pdp-sections` already behaves. Not done unilaterally.
 */
export async function RelatedItemsSection({
  relatedItems,
  relatedByBrand,
  relatedByTags,
  relatedByStore,
  categoryLabel,
  brandLabel,
  storeLabel,
  instances,
}: RelatedItemsSectionProps) {
  /*
   * 🛑 Read HERE rather than threaded down from each page, deliberately, and
   * with direct precedent: `SectionVisibilityGate` calls `useFieldVisibility`
   * itself per mount for exactly this reason — its own doc comment says "a
   * page's sections aren't threaded through one shared options object the way
   * a form's fields are".
   *
   * Three reasons it is right here specifically:
   *  - SEVEN views render this component and all seven resolve the SAME
   *    region. Threading would mean seven call sites that must agree forever,
   *    and the first one that forgot would render a different rail from the
   *    other six while returning 200 — invisible.
   *  - `getWidgetInstances` is `React.cache`-wrapped on `regionId`, so seven
   *    callers cost ONE read per request, not seven.
   *  - It keeps the change inside this lane's territory. Threading would mean
   *    editing six other views plus their pages.
   *
   * Degrades to `[]` on any read failure (`safeRead`), so a config outage
   * falls back to the template default — i.e. to today's behaviour — never to
   * a blank rail.
   */
  const stored = instances ?? (await getWidgetInstances(RELATED_REGION_ID));
  const effective = mergedInstances(RELATED_DEFAULT_INSTANCES, stored);

  const itemsBySource: Record<RelatedSource, ProductItem[]> = {
    category: relatedItems,
    brand: relatedByBrand,
    tags: relatedByTags,
    store: relatedByStore,
  };

  const labelBySource: Record<RelatedSource, string | undefined> = {
    category: categoryLabel,
    brand: brandLabel,
    tags: undefined,
    store: storeLabel,
  };

  const resolved = resolveWidgetTree(PILOT_WIDGET_DEFS, PILOT_REGIONS, effective, {
    surface: "product",
  });

  const rows = resolved.roots
    .filter((node) => node.visible && node.instance.regionId === RELATED_REGION_ID)
    .map((node) => {
      const cfg = asRelatedScrollerConfig(node.instance.config);
      if (!cfg) return null;
      const items = itemsBySource[cfg.source];
      if (!items || items.length === 0) return null;
      return {
        id: node.instance.id,
        title: resolveScrollerTitle(cfg, labelBySource[cfg.source]),
        items: cfg.maxItems ? items.slice(0, cfg.maxItems) : items,
      };
    })
    .filter((row): row is { id: string; title: string; items: ProductItem[] } => row !== null);

  // Identical to the original's combined emptiness guard: nothing to show
  // means no heading, no empty frame and no grid space taken.
  if (rows.length === 0) return null;

  return (
    <Stack gap="xl">
      {rows.map((row) => (
        <RelatedProductsCarousel key={row.id} items={row.items} title={row.title} />
      ))}
    </Stack>
  );
}
