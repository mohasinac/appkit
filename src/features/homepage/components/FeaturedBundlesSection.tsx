/**
 * FeaturedBundlesSection — S-SBUNI-3 2026-05-13 rebuild.
 *
 * Rebuilt after SB-UNI-V deletion. Renders a horizontal grid of bundle
 * cards driven by `initialItems` (CategoryDocument with categoryType:"bundle").
 * Server-friendly — no data fetching here; the renderer passes pre-fetched
 * items from `MarketplaceHomepageView.sectionData.bundles`.
 */

import React from "react";
import Link from "next/link";
import { Badge, Div, Heading, Row, Section, Stack, Text } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";
import { formatCurrency } from "../../../utils/number.formatter";
import {
  BUNDLE_COPY,
  BUNDLE_STOCK_VARIANT,
} from "../../../_internal/shared/features/categories/bundle-copy";
import type { CategoryDocument } from "../../categories/schemas";
import { BundleBuyNowCta } from "../../categories/components/BundleBuyNowCta";

const __P = {
  p3: "p-3",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const PLACEHOLDER_EMOJI = "📦" as const;

export interface FeaturedBundlesSectionProps {
  title?: string;
  description?: string;
  initialItems?: CategoryDocument[];
  className?: string;
  onBuyNow?: (input: { bundleSlug: string }) => Promise<unknown>;
}

export function FeaturedBundlesSection({
  title = BUNDLE_COPY.featuredDefaultTitle,
  description,
  initialItems = [],
  className = "",
  onBuyNow,
}: FeaturedBundlesSectionProps) {
  const items = initialItems.filter((c) => c.categoryType === "bundle");

  return (
    <Section className={`py-10 ${className}`}>
      <Stack gap="md">
        <Row gap="sm" align="center" justify="between" className="flex-wrap">
          <Stack gap="xs">
            <Heading
              level={2}
              className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {title}
            </Heading>
            {description && (
              <Text size="sm" color="muted">
                {description}
              </Text>
            )}
          </Stack>
          <Link
            href={String(ROUTES.PUBLIC.BUNDLES ?? "/bundles")}
            className="text-sm font-medium text-[var(--appkit-color-primary)] hover:underline"
          >
            {BUNDLE_COPY.featured.viewAll}
          </Link>
        </Row>

        {items.length === 0 ? (
          <Div className="rounded-xl border border-dashed border-zinc-200 py-12 text-center dark:border-zinc-700">
            <Text color="muted">{BUNDLE_COPY.featured.empty}</Text>
          </Div>
        ) : (
          <Div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((bundle) => (
              <FeaturedBundleCard key={bundle.id} bundle={bundle} onBuyNow={onBuyNow} />
            ))}
          </Div>
        )}
      </Stack>
    </Section>
  );
}

interface FeaturedBundleCardProps {
  bundle: CategoryDocument;
  onBuyNow?: (input: { bundleSlug: string }) => Promise<unknown>;
}

function FeaturedBundleCard({ bundle, onBuyNow }: FeaturedBundleCardProps) {
  const stock = bundle.bundleStockStatus ?? "in_stock";
  const memberCount = bundle.bundleProductIds?.length ?? 0;
  const cover = bundle.display?.coverImage;
  const href = String(ROUTES.PUBLIC.BUNDLE_DETAIL?.(bundle.slug) ?? "#");

  return (
    <Stack
      gap="none"
      className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
    >
      <Link href={href} className="group block p-3 hover:no-underline">
        <Div className={`mb-2 aspect-square ${__O.hidden} rounded-lg bg-zinc-100 dark:bg-zinc-800`}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element, lir/no-raw-media-elements
            <img
              src={cover}
              alt={bundle.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <Div className="flex h-full w-full items-center justify-center text-3xl">
              {PLACEHOLDER_EMOJI}
            </Div>
          )}
        </Div>
        <Text className="line-clamp-2 text-sm font-semibold">{bundle.name}</Text>
        <Row gap="sm" align="center" className="mt-1 flex-wrap">
          <Text size="sm" weight="bold">
            {bundle.bundlePriceInPaise
              ? formatCurrency(bundle.bundlePriceInPaise / 100, "INR")
              : BUNDLE_COPY.featured.priceFallback}
          </Text>
          <Text size="xs" color="muted">
            · {BUNDLE_COPY.featured.itemCount(memberCount)}
          </Text>
          {stock !== "in_stock" && (
            <Badge variant={BUNDLE_STOCK_VARIANT[stock]}>
              {BUNDLE_COPY.stockBadge.listVariantOutOfStock}
            </Badge>
          )}
        </Row>
      </Link>
      {onBuyNow && (
        <Div className={`border-t border-zinc-100 ${__P.p3} pt-2 dark:border-zinc-800`}>
          <BundleBuyNowCta
            bundleSlug={bundle.slug}
            outOfStock={stock === "out_of_stock"}
            onBuyNow={onBuyNow}
            compact
          />
        </Div>
      )}
    </Stack>
  );
}
