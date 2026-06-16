import React from "react";
import { Div, Heading, Section, Text } from "../../../ui";

export interface PromotionProductItem {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  image?: string;
}

export interface PromotionsViewProductSectionProps {
  title: string;
  subtitle?: string;
  renderProducts: () => React.ReactNode;
  hasProducts?: boolean;
}

export function PromotionsViewProductSection({
  title,
  subtitle,
  renderProducts,
  hasProducts,
}: PromotionsViewProductSectionProps) {
  if (!hasProducts) return null;
  return (
    <Section>
      <Div className="mb-6">
        <Heading level={2}>{title}</Heading>
        {subtitle && (
          <Text variant="secondary" className="mt-1">
            {subtitle}
          </Text>
        )}
      </Div>
      {renderProducts()}
    </Section>
  );
}

export interface PromotionsHeroProps {
  labels: {
    exclusiveOffersBadge: string;
    title: string;
    subtitle: string;
  };
  heroBannerClass?: string;
}

/** Slim hero banner for the promotions page — tabs + content live in the page. */
export function PromotionsHero({
  labels,
  heroBannerClass = "",
}: PromotionsHeroProps) {
  return (
    <Section tone="accent-banner" className={`${heroBannerClass} text-white`} padding="y-2-5xl">
      <Div className="max-w-5xl mx-auto sm:px-6 lg:px-8 text-center" padding="x-md">
        <Text className="text-white mb-2 tracking-widest" size="sm" weight="medium" transform="uppercase">
          🎉 {labels.exclusiveOffersBadge}
        </Text>
        <Heading level={1} variant="none" className="text-white mb-4">
          {labels.title}
        </Heading>
        <Text variant="none" className="text-white/90 max-w-2xl mx-auto" size="lg">
          {labels.subtitle}
        </Text>
      </Div>
    </Section>
  );
}

// ---- Legacy PromotionsView kept for backward-compat ----------------------------

export interface PromotionsViewProps {
  labels: {
    exclusiveOffersBadge: string;
    title: string;
    subtitle: string;
    emptyDeals: string;
    checkBack: string;
    couponsTitle: string;
    couponsSubtitle: string;
    emptyCoupons: string;
    dealsTitle: string;
    dealsSubtitle: string;
    featuredTitle: string;
    featuredSubtitle: string;
  };
  hasContent: boolean;
  heroBannerClass?: string;
  renderCoupons?: () => React.ReactNode;
  couponsCount?: number;
  renderDealsSection?: () => React.ReactNode;
  renderFeaturedSection?: () => React.ReactNode;
}

/** @deprecated Use PromotionsHero + per-tab content in your page instead. */
export function PromotionsView({
  labels,
  hasContent,
  heroBannerClass = "",
  renderCoupons,
  couponsCount = 0,
  renderDealsSection,
  renderFeaturedSection,
}: PromotionsViewProps) {
  return (
    <Div surface="default" className="min-h-screen">
      <PromotionsHero labels={labels} heroBannerClass={heroBannerClass} />

      <Div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12" padding="y-3xl">
        {!hasContent && (
          <Div className="text-center" padding="y-4xl">
            <Heading level={2} className="mb-2">{labels.emptyDeals}</Heading>
            <Text variant="secondary">{labels.checkBack}</Text>
          </Div>
        )}

        {hasContent && (
          <Div className="space-y-12">
            {/* Coupons section — only rendered if renderCoupons is provided */}
            {renderCoupons && (
              <Section>
                <Div className="mb-6">
                  <Heading level={2}>{labels.couponsTitle}</Heading>
                  {couponsCount > 0 && (
                    <Text variant="secondary" className="mt-1">
                      {labels.couponsSubtitle}
                    </Text>
                  )}
                </Div>
                {couponsCount > 0 ? (
                  renderCoupons()
                ) : (
                  <Text variant="secondary" size="sm">
                    {labels.emptyCoupons}
                  </Text>
                )}
              </Section>
            )}

            {renderDealsSection?.()}
            {renderFeaturedSection?.()}
          </Div>
        )}
      </Div>
    </Div>
  );
}
