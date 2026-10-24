/**
 * FeaturedBundlesSection — S-SBUNI-3 2026-05-13 rebuild.
 *
 * Rebuilt after SB-UNI-V deletion. Renders a horizontal grid of bundle
 * cards driven by `initialItems` (CategoryDocument with categoryType:"bundle").
 * Server-friendly — no data fetching here; the renderer passes pre-fetched
 * items from `MarketplaceHomepageView.sectionData.bundles`.
 */

"use client";

import React from "react";
import Link from "next/link";
/*
 * 🛑 The import list shrank with the card. Badge, GatedPrice, PricesOnly,
 * MediaImage, Div, formatCurrency, BUNDLE_STOCK_VARIANT,
 * computeBundleDiscount, the two className constants and the placeholder
 * emoji were ALL only reachable from the deleted `FeaturedBundleCard`.
 * `tsc` does not flag an unused import, so leaving them would have kept a
 * card's worth of dependencies on a file that no longer draws a card — and
 * `MarketplaceBundleCard` owns every one of those concerns now.
 */
import { Grid, Heading, Row, Section, Stack, Text } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";
import { BUNDLE_COPY } from "../../../_internal/shared/features/categories/bundle-copy";
import { MarketplaceBundleCard } from "../../products/components/MarketplaceBundleCard";
import { BundleBuyNowCta } from "../../categories/components/BundleBuyNowCta";
import { useHandMode } from "../../../_internal/client/hand-mode";
import type { CategoryDocument } from "../../categories/schemas";

export interface FeaturedBundlesSectionProps {
  title?: string;
  description?: string;
  initialItems?: CategoryDocument[];
  /** Cap the rendered bundles. Items are supplied pre-fetched, so this slices. */
  maxItems?: number;
  /** Show the "N% off" badge on each cover. Defaults to `true`. */
  /**
   * 🛑 ACCEPTED AND NOT READ — the savings badge renders unconditionally, so
   * passing `false` has never hidden it. Declared because callers pass it;
   * either wire it to the badge or delete it with its 7 call sites.
   */
  showSavingsBadge?: boolean;
  /** "View all" link label. */
  viewMoreLabel?: string;
  className?: string;
  onBuyNow?: (input: { bundleSlug: string }) => Promise<unknown>;
}

export function FeaturedBundlesSection({
  title = BUNDLE_COPY.featuredDefaultTitle,
  description,
  initialItems = [],
  maxItems,
  viewMoreLabel = BUNDLE_COPY.featured.viewAll,
  className = "",
  onBuyNow,
}: FeaturedBundlesSectionProps) {
  const { hand } = useHandMode();
  const bundles = initialItems.filter((c) => c.categoryType === "bundle");
  const items = maxItems && maxItems > 0 ? bundles.slice(0, maxItems) : bundles;
  if (items.length === 0) return null;

  return (
    <Section className={`${className}`} padding="y-2xl">
      <Stack gap="md">
        <Row gap="sm" align="center" justify="between" wrap reverse={hand === "left"}>
          <Stack gap="xs">
            <Heading
              level={2} size="2xl" weight="semibold" color="primary">
              {title}
            </Heading>
            {description && (
              <Text size="sm" color="muted">
                {description}
              </Text>
            )}
          </Stack>
          {/* Solid fill, matching SectionCarousel — see BrandsSection's note.
              Was a plain teal text link, one of five out of eleven. */}
          <Link
            href={String(ROUTES.PUBLIC.BUNDLES)}
            className="inline-flex items-center gap-[0.375rem] rounded-[var(--appkit-radius-md)] px-[var(--appkit-space-3)] py-[var(--appkit-space-1)] text-[length:var(--appkit-text-sm)] font-semibold transition-colors bg-primary text-white hover:bg-primary-600"
          >
            {viewMoreLabel}
          </Link>
        </Row>

        {/*
          🛑 THE SAME CARD `/bundles` USES, not a homepage-only one.

          This section rendered a bespoke `FeaturedBundleCard` whose hero was
          `bundle.display?.coverImage` and nothing else — the CATEGORY row's
          own cover, which for every seeded bundle is a generic placeholder.
          So the homepage advertised bundles as flat placeholder tiles while
          `/bundles` showed what is actually in them.

          `MarketplaceBundleCard` renders the CONTENTS first — a collage built
          from `bundleItemDetails`, with a `+N` overflow tile — and falls back
          to the cover only when there are fewer than two member images. That
          ordering is the documented rule: every bundle also carries a generic
          cover, so a card that tests the cover first never shows the collage.

          It needs no new data. Its prop type is a `Pick<CategoryDocument, …>`
          and this section is already handed full `CategoryDocument`s.
        */}
        <Grid cols="cards" gap="3">
          {items.map((bundle) => (
            <Stack key={bundle.id}>
              <MarketplaceBundleCard bundle={bundle} />
              {/*
                The Buy-Now CTA stays a sibling, exactly as
                `CategoryBundlesListing` mounts it on /bundles — the card is a
                link to the detail page and a button nested in an anchor is
                invalid HTML.
              */}
              {onBuyNow && (
                <BundleBuyNowCta
                  bundleSlug={bundle.slug}
                  outOfStock={bundle.bundleStockStatus === "out_of_stock"}
                  onBuyNow={onBuyNow}
                  compact
                />
              )}
            </Stack>
          ))}
        </Grid>
      </Stack>
    </Section>
  );
}


/*
 * The bespoke `FeaturedBundleCard` that used to live here is DELETED, not
 * left sitting beside its replacement. It rendered `display.coverImage` and
 * nothing else, so the homepage showed a generic placeholder where /bundles
 * showed what is actually in the bundle — two surfaces disagreeing about
 * what a bundle looks like. Keeping a second card around is how they came
 * to disagree in the first place.
 */
