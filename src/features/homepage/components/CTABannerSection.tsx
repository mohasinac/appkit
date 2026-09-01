import React from "react";
import Link from "next/link";
import { Div, Heading, Row, Scrim, Section, Span, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { ROUTES } from "../../../next/routing/route-map";
import { SECTION_TITLE, SECTION_COPY } from "../constants/section-copy";

export type CTABannerHeight = "sm" | "md" | "lg" | "xl";

/**
 * `height` maps onto the existing spacing scale rather than emitting a
 * `min-h-[300px]`-style utility.
 *
 * Two reasons. A class generated only inside appkit and absent from the
 * consumer's `src/**` is purged from the production CSS (Root Cause #3), and
 * `BANNER_HEIGHTS`' raw px values would be exactly that. And padding keeps the
 * banner sized by its content, so a long headline grows the box instead of
 * overflowing a fixed height.
 */
const HEIGHT_PADDING_Y = {
  sm: "y-2xl",
  md: "y-4xl",
  lg: "y-5xl",
  xl: "y-6xl",
} as const satisfies Record<CTABannerHeight, string>;

export interface CTABannerSectionProps {
  title?: string;
  subtitle?: string;
  /** Longer supporting paragraph below the subtitle. */
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** Vertical presence of the band. Defaults to `"md"`. */
  height?: CTABannerHeight;
  /**
   * Full-bleed background image behind the copy. Rendered through
   * `MediaImage` (so it flows through the media proxy and watermark pipeline)
   * with a scrim, because the copy is fixed-inverse ink and needs a
   * guaranteed-dark backdrop to stay readable — Root Cause #67.
   *
   * There is deliberately no `backgroundColor`/`gradient` equivalent: an
   * arbitrary admin-chosen fill under fixed white text is a contrast failure
   * with no safe fallback, and the themed `accent-banner` tone already gives a
   * brand gradient that follows the active theme.
   */
  backgroundImage?: string;
  className?: string;
}

export function CTABannerSection({
  title = SECTION_TITLE.banner,
  subtitle,
  description,
  primaryLabel = SECTION_COPY.bannerPrimaryCta,
  primaryHref = String(ROUTES.PUBLIC.PRODUCTS),
  secondaryLabel = SECTION_COPY.bannerSecondaryCta,
  secondaryHref = String(ROUTES.PUBLIC.AUCTIONS),
  height = "md",
  backgroundImage,
  className = "",
}: CTABannerSectionProps) {
  return (
    <Section
      tone="accent-banner"
      className={`relative ${className}`}
      overflow="hidden"
      paddingY={HEIGHT_PADDING_Y[height]}
      paddingX="x-md"
    >
      {backgroundImage && (
        <>
          <Div className="absolute inset-0">
            <MediaImage src={backgroundImage} alt="" size="banner" objectFit="cover" />
          </Div>
          <Scrim direction="left-to-right" intensity="strong" className="absolute inset-0" />
        </>
      )}
      <Div className="relative mx-auto max-w-3xl text-left">
        <Span className="mb-4 inline-block" size="2xl" aria-hidden="true">
          ✨
        </Span>
        <Heading color="inverse" level={2} mdSize="3xl" lgSize="4xl" size="2xl" weight="bold">
          {title}
        </Heading>
        {subtitle && (
          <Text color="inverse" className="mt-3 /80" size="base">{subtitle}</Text>
        )}
        {description && (
          <Text color="inverse" className="mt-2 /70 max-w-2xl" size="sm">{description}</Text>
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
