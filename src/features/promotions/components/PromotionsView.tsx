import React from "react";
import { Div, Heading, Section, Text } from "@mohasinac/ui";

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
  /** Render the product grid — use your app's ProductGrid/ProductCard here */
  renderProducts: () => React.ReactNode;
  /** If false/undefined, the section is hidden */
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
  /** Render the coupon grid */
  renderCoupons?: () => React.ReactNode;
  couponsCount?: number;
  /** Render the promoted products section */
  renderDealsSection?: () => React.ReactNode;
  /** Render the featured products section */
  renderFeaturedSection?: () => React.ReactNode;
}

export function PromotionsView({
  labels,
  hasContent,
  heroBannerClass = "bg-gradient-to-br from-rose-500 to-orange-500",
  renderCoupons,
  couponsCount = 0,
  renderDealsSection,
  renderFeaturedSection,
}: PromotionsViewProps) {
  return (
    <Div className="min-h-screen bg-white dark:bg-slate-900">
      <Div className={`${heroBannerClass} text-white py-16`}>
        <Div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Text className="text-white font-medium mb-2 uppercase tracking-widest text-sm">
            🎉 {labels.exclusiveOffersBadge}
          </Text>
          <Heading level={1} variant="none" className="text-white mb-4">
            {labels.title}
          </Heading>
          <Text variant="none" className="text-lg text-white/90 max-w-2xl mx-auto">
            {labels.subtitle}
          </Text>
        </Div>
      </Div>

      <Div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {!hasContent && (
          <Div className="text-center py-16">
            <Heading level={2} className="mb-2">{labels.emptyDeals}</Heading>
            <Text variant="secondary">{labels.checkBack}</Text>
          </Div>
        )}

        {hasContent && (
          <Div className="space-y-12">
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
                renderCoupons?.()
              ) : (
                <Text variant="secondary" size="sm">
                  {labels.emptyCoupons}
                </Text>
              )}
            </Section>

            {renderDealsSection?.()}
            {renderFeaturedSection?.()}
          </Div>
        )}
      </Div>
    </Div>
  );
}
