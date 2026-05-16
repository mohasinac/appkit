/**
 * BundleDetailView — public detail page for a bundle (categoryType:"bundle"
 * row on the categories collection). Rebuilt in S-SBUNI-3 2026-05-13 after
 * the SB-UNI-V deletion. Slot-shell pattern: parent passes the doc + the
 * resolved product members; this view stays presentational.
 *
 * Members rendered as a simple grid of product cards (links to PDPs). The
 * "Buy bundle" CTA + non-refundable consent modal are intentionally NOT
 * wired yet — bundle add-to-cart needs the SB-UNI-3 carry-over cohort
 * (cart line `{bundleCategorySlug, qty}` + N-line checkout expansion).
 */

import React from "react";
import {
  Badge,
  Container,
  Div,
  Heading,
  Main,
  Row,
  Section,
  Stack,
  Text,
} from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";
import type { CategoryDocument } from "../schemas";
import type { ProductDocument } from "../../products/schemas/firestore";

import {
  BUNDLE_COPY,
  BUNDLE_STOCK_VARIANT,
} from "../../../_internal/shared/features/categories/bundle-copy";
import { BundleBuyNowCta } from "./BundleBuyNowCta";
import { BundleCollage } from "./BundleCollage";

type StockKey = NonNullable<CategoryDocument["bundleStockStatus"]>;

const STOCK_BADGE_TEXT: Record<StockKey, string> = {
  in_stock: BUNDLE_COPY.stockBadge.in_stock,
  out_of_stock: BUNDLE_COPY.stockBadge.out_of_stock,
};

const PLACEHOLDER_EMOJI = "📦" as const;

export interface BundleDetailViewProps {
  bundle: CategoryDocument;
  members?: ProductDocument[];
  /** Direct-checkout callback (S-SBUNI-RULES). When supplied, renders the "Buy now" CTA. */
  onBuyNow?: (input: { bundleSlug: string }) => Promise<unknown>;
}

export function BundleDetailView({
  bundle,
  members = [],
  onBuyNow,
}: BundleDetailViewProps) {
  const memberCount = members.length || bundle.bundleProductIds?.length || 0;
  const stock = bundle.bundleStockStatus ?? "in_stock";
  const cover = bundle.display?.coverImage;
  const priceLabel = bundle.bundlePriceInPaise
    ? formatCurrency(bundle.bundlePriceInPaise / 100, "INR")
    : BUNDLE_COPY.detail.priceFallback;

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Stack gap="lg">
            <Row gap="lg" align="start" className="flex-col md:flex-row">
              <Div className="aspect-video w-full overflow-hidden rounded-2xl bg-zinc-100 md:w-1/2 dark:bg-zinc-800">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element, lir/no-raw-media-elements
                  <img
                    src={cover}
                    alt={bundle.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Div className="flex h-full w-full items-center justify-center text-6xl">
                    {PLACEHOLDER_EMOJI}
                  </Div>
                )}
              </Div>

              <Stack gap="md" className="flex-1">
                <Heading
                  level={1}
                  className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100"
                >
                  {bundle.name}
                </Heading>

                <Row gap="sm" align="center">
                  <Text size="lg" weight="bold">
                    {priceLabel}
                  </Text>
                  <Text size="sm" color="muted">
                    · {BUNDLE_COPY.detail.itemCount(memberCount)}
                  </Text>
                  <Badge variant={BUNDLE_STOCK_VARIANT[stock]}>
                    {STOCK_BADGE_TEXT[stock]}
                  </Badge>
                </Row>

                {bundle.description && (
                  <Stack gap="xs">
                    <Heading level={2} className="text-sm font-semibold text-[var(--appkit-color-text-muted)]">
                      {BUNDLE_COPY.detailDescriptionHeading}
                    </Heading>
                    <Text className="whitespace-pre-line">
                      {bundle.description}
                    </Text>
                  </Stack>
                )}

                {onBuyNow ? (
                  <BundleBuyNowCta
                    bundleSlug={bundle.slug}
                    outOfStock={stock === "out_of_stock"}
                    onBuyNow={onBuyNow}
                  />
                ) : (
                  <Div
                    className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    aria-live="polite"
                  >
                    <Text weight="semibold" className="mb-1 block">
                      {BUNDLE_COPY.detail.ctaDisabled}
                    </Text>
                    <Text size="sm" color="muted">
                      {BUNDLE_COPY.detail.ctaHint}
                    </Text>
                  </Div>
                )}
              </Stack>
            </Row>

            <Stack gap="md">
              <Heading
                level={2}
                className="text-xl font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {BUNDLE_COPY.detailItemsHeading}
              </Heading>

              {members.length === 0 ? (
                <Text color="muted">{BUNDLE_COPY.detail.emptyMembers}</Text>
              ) : (
                <BundleCollage members={members} />
              )}
            </Stack>
          </Stack>
        </Container>
      </Section>
    </Main>
  );
}

