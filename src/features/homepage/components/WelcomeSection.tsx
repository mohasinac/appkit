"use client";

import React from "react";
import { THEMED_TEXT_SECONDARY, FLEX_CENTER } from "../../../_internal/shared/styles/themed";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Icon } from "../../../ui/components/Icon";
import { ImageMosaic } from "../../../ui/components/ImageMosaic";
import { Section } from "../../../ui/components/Semantic";
import { SiteLogo } from "../../../ui/components/SiteLogo";
import { SiteMark } from "../../../ui/components/SiteMark";
import { TextLink } from "../../../ui/components/TextLink";
import type { IconKey } from "../../../ui/icons/icon-registry";

// --- Props -------------------------------------------------------------------
export interface WelcomeSectionChip {
  key: string;
  /** Registry icon key. Replaces `emoji`, which no utility could size. */
  iconName: IconKey;
  label: string;
}

export interface WelcomeSectionProps {
  title: string;
  subtitle?: string;
  pillLabel?: string;
  showCTA?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  onSecondaryCtaClick?: () => void;
  trustChips?: WelcomeSectionChip[];
  /**
   * Decorative hero imagery for the mosaic's SMALL cells — the large cell is
   * always the brand panel now, so these no longer compete for it.
   *
   * 🛑 Pass REAL images only. A caller sourcing these from
   * `display.coverImage` must drop `SEED_TILE_PREFIX` values first: those are
   * six flat generated SVGs, and a hero built from them is four coloured
   * rectangles claiming to be a product preview.
   *
   * Must be deterministic: `ImageMosaic` is explicit that `Math.random()` here
   * would break SSR/hydration agreement, so the caller passes a stable
   * configured order rather than a shuffle.
   */
  heroImages?: readonly string[];
  isLoading?: boolean;
  brandLogoText?: string;
  /**
   * Wordmark caption under the hero logo, e.g. "Let It Rip India".
   *
   * Consumer-supplied, never defaulted to a literal here: appkit is a library
   * and a brand string baked into it is the encapsulation break
   * `audit-ssr-in-appkit` Rule 3 exists to prevent. Omitted = no caption.
   */
  brandCaption?: string;
  className?: string;
}

// --- Component ---------------------------------------------------------------

export function WelcomeSection({
  title,
  subtitle,
  pillLabel,
  showCTA = true,
  ctaLabel = "Shop now",
  ctaHref,
  onCtaClick,
  secondaryCtaLabel = "Browse products",
  secondaryCtaHref,
  onSecondaryCtaClick,
  trustChips = [],
  heroImages,
  isLoading = false,
  brandLogoText = "",
  brandCaption,
  className = "",
}: WelcomeSectionProps) {
const themed = { textSecondary: THEMED_TEXT_SECONDARY };
const flex = { center: FLEX_CENTER };
if (isLoading) {
    return (
      <Section
        className={`relative overflow-hidden pt-[0px] pb-[var(--appkit-space-16)] md:pt-[0px] md:pb-[6rem] ${className}`} paddingX="x-md"
      >
        <Div className="animate-pulse max-w-4xl mx-auto text-left">
          <Div className="h-6 w-52 mb-6" surface="subtle" rounded="full" />
          <Div className="h-20 mb-4 max-w-2xl" surface="subtle" rounded="lg" />
          <Div className="h-6 mb-8 max-w-lg" surface="subtle" rounded="lg" />
          <Row justify="start" gap="md">
            <Div className="h-12 w-36" surface="subtle" rounded="xl" />
            <Div className="h-12 w-36" surface="subtle" rounded="xl" />
          </Row>
        </Div>
      </Section>
    );
  }

  return (
    <Section
      className={`relative overflow-hidden pt-[0px] pb-[var(--appkit-space-20)] md:pt-[0px] md:pb-[7rem] ${className}`} paddingX="x-md"
    >
      {/* Decorative ambient glows */}
      <Div
        className="pointer-events-none absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-primary/10 blur-3xl" rounded="full"
        aria-hidden="true"
      />
      <Div
        className="pointer-events-none absolute -bottom-40 -right-40 w-[36rem] h-[36rem] bg-secondary/10 dark:bg-secondary/15 blur-3xl" rounded="full"
        aria-hidden="true"
      />

      <Div className="relative z-10 max-w-7xl mx-auto">
        <Grid align="center" 
          gap="2xl"
          className="grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2"
        >
          {/* Left: text content */}
          <Div className="text-left">
            {/* Pill badge */}
            {pillLabel && (
              <Div>
                <Span layout="inline-flex" gap="md" size="xs" weight="medium" className={/* audit-variant-ok: colour+alpha border (primary-500/30); the `border` variant takes a token name, not an rgba step */ "border border-primary-500/30 bg-primary-500/10 px-[1.25rem] py-[0.375rem] tracking-[0.2em] text-primary-700 dark:text-primary-400 backdrop-blur-sm"} rounded="full" transform="uppercase">
                  <Span
                    className="w-1.5 h-1.5 bg-primary-500 inline-block" rounded="full"
                    aria-hidden="true"
                  />
                  {pillLabel}
                  <Span
                    className="w-1.5 h-1.5 bg-primary-500 inline-block" rounded="full"
                    aria-hidden="true"
                  />
                </Span>
              </Div>
            )}

            {/* H1 */}
            <Heading
              level={1}
              variant="none"
              gradient="brand-tri"
              className="mt-4 font-display leading-[1.1] tracking-tight break-words" size="5xl" mdSize="6xl" lgSize="7xl" xlSize="7xl"
            >
              {title}
            </Heading>

            {/* Subtitle */}
            {subtitle && (
              <Text
                className={`mt-4 ${themed.textSecondary} max-w-xl leading-relaxed`} size="xl"
              >
                {subtitle}
              </Text>
            )}

            {/* CTAs */}
            {showCTA && (
              <Row
                wrap
                gap="md"
                className="mt-8" justify="start"
              >
                {ctaHref ? (
                  <TextLink rounded="xl"
                    href={ctaHref}
                    layout="inline-flex" align="center" justify="center"
                    className="px-[2rem] py-[0.875rem] !bg-primary hover:!bg-primary-600 text-white dark:!bg-primary dark:hover:!bg-primary-600 dark:text-white btn-glow transition-all hover:scale-[1.02]" size="base" weight="bold"
                  >
                    {ctaLabel}
                  </TextLink>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={onCtaClick}
                  >
                    {ctaLabel}
                  </Button>
                )}
                {secondaryCtaHref ? (
                  <TextLink rounded="xl"
                    href={secondaryCtaHref}
                    layout="inline-flex" align="center" justify="center"
                    className="border-2 border-cobalt/40 dark:border-cobalt-400/40 px-[2rem] py-[0.875rem] text-cobalt-700 dark:text-cobalt-300 hover:bg-primary-surface transition-all hover:scale-[1.02]" size="base" weight="semibold"
                  >
                    {secondaryCtaLabel}
                  </TextLink>
                ) : (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={onSecondaryCtaClick}
                  >
                    {secondaryCtaLabel}
                  </Button>
                )}
              </Row>
            )}

            {/* Trust chips */}
            {trustChips.length > 0 && (
              <Row
                wrap
                gap="sm"
                className="mt-6" justify="start"
              >
                {/* One theme-INVERTING border token, not a light/dark pair. This
                  * was `border-zinc-[200] dark:border-slate-[700]` — both
                  * malformed (a palette step cannot go in brackets), so neither
                  * ever generated and the chip had no border in either theme.
                  * Root Cause #79: remove the light class, don't repair two
                  * classes that fight. */}
                {/* `surface="default"` + a shadow rather than `surface="subtle"`:
                    a reassurance row should lift off the page, not sink into it.
                    One accent tone across all four — four different colours on
                    four chips reads as a legend, not a reassurance. */}
                {trustChips.map((chip) => (
                  <Row
                    key={chip.key}
                    align="center"
                    gap="xs"
                    surface="default"
                    border="subtle"
                    rounded="full"
                    shadow="sm"
                    className="px-[0.875rem] py-[0.375rem]"
                  >
                    <Icon name={chip.iconName} size="sm" tone="success" />
                    <Span size="xs" weight="medium" color="muted">{chip.label}</Span>
                  </Row>
                ))}
              </Row>
            )}
          </Div>

          {/*
            Right: the brand panel in the large cell, real imagery beside it.

            🛑 THE LARGE CELL IS NO LONGER AN IMAGE, and that is a reversal of
            what this block used to argue. It read: "a hero whose hero image is
            its own wordmark is the 'we had no photograph' tell" — true as
            stated, and it is why the mosaic was built. What it did not account
            for is that `display.coverImage` on a top-level category is a
            GENERATED placeholder for every row the hero actually draws from,
            so the large cell rendered `/images/seed-tiles/312e81.svg`: a flat
            indigo rectangle with three concentric rings. Not a photograph, and
            not a wordmark either — just a tile pretending to be content.

            The brand panel is the honest occupant of a cell with nothing to
            put in it, and the objection above survives in the small column:
            that is where real `/media/<id>` art goes, unfiltered placeholders
            excluded by the caller.

            `heroImages` may legitimately be empty — `MOSAIC_MIN` does not
            apply in `leadSlot` mode, and the mosaic collapses to the panel
            alone at full width rather than rendering an empty gutter.
          */}
          <Div className="hidden lg:block">
            <ImageMosaic
              size="hero"
              images={heroImages ?? []}
              alt={`${brandLogoText || "Marketplace"} collection highlights`}
              leadSlot={
                <Div
                  className="absolute inset-0 bg-[image:var(--appkit-gradient-section-mesh)]"
                >
                  <Div className="absolute inset-0 bg-[image:var(--appkit-gradient-glass)]" />
                  {/* `padding="xl"` (= --appkit-space-8), not a `p-[2rem]`
                      className: an arbitrary utility only exists if Tailwind
                      happened to scan it, and `audit-dead-css-classes` caught
                      exactly that here. The token map is generated by
                      construction. */}
                  <Stack centered gap="sm" padding="xl" className={`absolute inset-0 ${flex.center}`}>
                    <SiteMark title={brandLogoText || "LetItRip.in"} size="xl" />
                    <SiteLogo
                      title={brandLogoText || "LetItRip.in"}
                      size="xl"
                    />
                    {brandCaption && (
                      <Text
                        align="center"
                        size="sm"
                        weight="semibold"
                        transform="uppercase"
                        className="tracking-widest text-primary-700 dark:text-primary-300"
                      >
                        {brandCaption}
                      </Text>
                    )}
                  </Stack>
                </Div>
              }
            />
          </Div>
        </Grid>
      </Div>
    </Section>
  );
}
