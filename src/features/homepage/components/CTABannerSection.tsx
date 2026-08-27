import React from "react";
import Link from "next/link";
import { Div, Heading, Row, Section, Span, Text } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";
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
  primaryHref = String(ROUTES.PUBLIC.PRODUCTS),
  secondaryLabel = "Browse Auctions →",
  secondaryHref = String(ROUTES.PUBLIC.AUCTIONS),
  className = "",
}: CTABannerSectionProps) {
  return (
    <Section tone="accent-banner" className={`${className}`} paddingY="y-4xl" paddingX="x-md">
      <Div className="mx-auto max-w-3xl text-left">
        <Span className="mb-4 inline-block" size="2xl" aria-hidden="true">
          ✨
        </Span>
        <Heading color="inverse" level={2} mdSize="3xl" lgSize="4xl" size="2xl" weight="bold">
          {title}
        </Heading>
        {subtitle && (
          <Text color="inverse" className="mt-3 /80" size="base">{subtitle}</Text>
        )}
        <Row className="mt-8" align="center" justify="start" gap="md" wrap>
          <Link
            href={primaryHref}
            className="inline-flex items-center rounded-full bg-white px-[var(--appkit-space-8)] py-[var(--appkit-space-3)] text-[length:var(--appkit-text-sm)] font-semibold text-primary-700 shadow-sm transition-all hover:bg-surface-hover hover:shadow-md focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
          >
            {primaryLabel}
          </Link>
          {secondaryHref && (
            <Link
              href={secondaryHref}
              className="inline-flex items-center rounded-full border-2 border-white/80 px-[var(--appkit-space-8)] py-[var(--appkit-space-3)] text-[length:var(--appkit-text-sm)] font-semibold text-white transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
            >
              {secondaryLabel}
            </Link>
          )}
        </Row>
      </Div>
    </Section>
  );
}
