import React from "react";
import Link from "next/link";
import { Div, Heading, Row, Section, Span, Text } from "../../../ui";
export interface CTABannerSectionProps {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
}

export function CTABannerSection({
  title = "Thousands of collectibles. One marketplace.",
  subtitle,
  primaryLabel = "Shop All Products →",
  primaryHref = "/products",
  secondaryLabel = "Browse Auctions →",
  secondaryHref = "/auctions",
  className = "",
}: CTABannerSectionProps) {
  return (
    <Section tone="accent-banner" className={`px-4 ${className}`} padding="y-4xl">
      <Div className="mx-auto max-w-3xl text-center">
        <Span className="mb-4 inline-block" size="2xl" aria-hidden="true">
          ✨
        </Span>
        <Heading level={2} className="text-white md:text-3xl lg:text-4xl" size="2xl" weight="bold">
          {title}
        </Heading>
        {subtitle && (
          <Text className="mt-3 text-white/80" size="base">{subtitle}</Text>
        )}
        <Row className="mt-8" align="center" justify="center" gap="md" wrap>
          <Link
            href={primaryHref}
            className="inline-flex items-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-primary-700 shadow-sm transition-all hover:bg-zinc-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
          >
            {primaryLabel}
          </Link>
          {secondaryHref && (
            <Link
              href={secondaryHref}
              className="inline-flex items-center rounded-full border-2 border-white/80 px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
            >
              {secondaryLabel}
            </Link>
          )}
        </Row>
      </Div>
    </Section>
  );
}
