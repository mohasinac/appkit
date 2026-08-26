/**
 * BundleDetailView — public detail page for a bundle (categoryType:"bundle"
 * row on the categories collection). Slot-shell pattern: parent passes the
 * doc + the resolved product members; this view stays presentational.
 *
 * Members rendered as a simple grid of product cards (links to PDPs). The
 * "Buy now" CTA is wired via the `onBuyNow` prop — the consumer page action
 * delegates to addBundleToCartAction + redirect to checkout
 * (see src/actions/bundle.actions.ts).
 */

import React from "react";
import {
  Badge,
  Container,
  Div,
  Heading,
  Li,
  Main,
  Row,
  Section,
  Span,
  Stack,
  Text,
  Ul,
} from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";
import type { CategoryDocument } from "../schemas";
import type { ProductDocument } from "../../products/schemas/firestore";

import Link from "next/link";
import {
  BUNDLE_COPY,
  BUNDLE_STOCK_VARIANT,
} from "../../../_internal/shared/features/categories/bundle-copy";
import { BundleBuyNowCta } from "./BundleBuyNowCta";
import { BundleCollage } from "./BundleCollage";
import { MediaImage } from "../../media/MediaImage";
import { ROUTES } from "../../../next/routing/route-map";
import { computeBundleDiscount } from "../../../_internal/shared/features/categories/bundle-pricing";
import { CategoryGrid } from "./CategoryGrid";
import type { CategoryItem } from "../types";

const __O = {
  hidden: "overflow-hidden",
} as const;

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
  onBuyNow?: (input: { bundleSlug: string; quantity: number }) => Promise<unknown>;
  /** Adds the bundle without leaving the page — the only way it can reach the
   *  cart and stay there to be edited. */
  onAddToCart?: (input: { bundleSlug: string; quantity: number }) => Promise<unknown>;
  /** Other active bundles, excluding this one — renders a "Related Bundles" section when non-empty. */
  relatedBundles?: CategoryDocument[];
}

export function BundleDetailView({
  bundle,
  members = [],
  onBuyNow,
  onAddToCart,
  relatedBundles = [],
}: BundleDetailViewProps) {
  const memberCount = members.length || bundle.bundleProductIds?.length || 0;
  const stock = bundle.bundleStockStatus ?? "in_stock";
  const cover = bundle.display?.coverImage;
  const priceLabel = bundle.bundlePrice
    ? formatCurrency(bundle.bundlePrice, "INR")
    : BUNDLE_COPY.detail.priceFallback;
  const discount = computeBundleDiscount(bundle.bundlePrice, bundle.bundleOriginalTotal);

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Stack gap="lg">
            <Stack gap="lg" direction="md-row" align="start">
              <Div className="w-full md:w-2/5">
                {members.length > 0 ? (
                  <BundleCollage members={members} />
                ) : (
                  <Div className={`aspect-video w-full ${__O.hidden}`} rounded="2xl" surface="subtle">
                    <Div className="h-full w-full">
                      <MediaImage src={cover} alt={bundle.name} size="hero" fallback={PLACEHOLDER_EMOJI} />
                    </Div>
                  </Div>
                )}
              </Div>

              <Stack gap="md" className="flex-1">
                <Heading
                  level={1} size="3xl" weight="semibold" color="primary">
                  {bundle.name}
                </Heading>

                <Row gap="sm" align="center" wrap>
                  <Text size="lg" weight="bold">
                    {priceLabel}
                  </Text>
                  {discount && (
                    <>
                      <Text size="sm" color="muted" className="line-through">
                        {formatCurrency(discount.originalTotal, "INR")}
                      </Text>
                      <Badge variant="success">
                        {BUNDLE_COPY.detail.discountBadge(discount.percent)}
                      </Badge>
                    </>
                  )}
                  <Text size="sm" color="muted">
                    · {BUNDLE_COPY.detail.itemCount(memberCount)}
                  </Text>
                  <Badge variant={BUNDLE_STOCK_VARIANT[stock]}>
                    {STOCK_BADGE_TEXT[stock]}
                  </Badge>
                </Row>
                {discount && (
                  <Text size="sm" color="success" weight="medium">
                    {BUNDLE_COPY.detail.savingsLabel(formatCurrency(discount.savings, "INR"))}
                  </Text>
                )}

                {bundle.description && (
                  <Stack gap="xs">
                    <Heading level={2} className="text-[var(--appkit-color-text-muted)]" size="sm" weight="semibold">
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
                    onAddToCart={onAddToCart}
                  />
                ) : (
                  <Div textSize="sm" 
                    className="border-dashed" border="strong" surface="muted" rounded="xl" padding="md"
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
            </Stack>

            <Stack gap="md">
              <Heading
                level={2} size="xl" weight="semibold" color="primary">
                {BUNDLE_COPY.detailItemsHeading}
              </Heading>

              {members.length === 0 ? (
                <Text color="muted">{BUNDLE_COPY.detail.emptyMembers}</Text>
              ) : (
                <Ul gap="2" className="grid grid-cols-1 sm:grid-cols-2">
                  {members.map((p, i) => (
                    <Li key={p.id} layout="flex-center" gap="2" rounded="lg" border="subtle" padding="inlineSm" textSize="sm">
                      <Span size="xs" weight="semibold" className="w-5" color="faint">#{i + 1}</Span>
                      <Link
                        href={String(ROUTES.PUBLIC.PRODUCT_DETAIL?.(p.slug ?? p.id) ?? "#")}
                        className="flex-1 truncate font-medium hover:underline hover:text-primary"
                      >
                        {p.title}
                      </Link>
                      <Span size="xs" color="muted">
                        {formatCurrency(p.price ?? 0, p.currency ?? "INR")}
                      </Span>
                    </Li>
                  ))}
                </Ul>
              )}
            </Stack>
          </Stack>
        </Container>
      </Section>

      {relatedBundles.length > 0 && (
        <Section border="subtle" surface="default" className="border-t" padding="y-lg">
          <Container size="xl">
            <Heading level={2} className="mb-4" size="xl" weight="semibold">
              Related Bundles
            </Heading>
            <CategoryGrid
              categories={relatedBundles as unknown as CategoryItem[]}
              getHref={(c) => String(ROUTES.PUBLIC.BUNDLE_DETAIL(c.slug))}
            />
          </Container>
        </Section>
      )}
    </Main>
  );
}

