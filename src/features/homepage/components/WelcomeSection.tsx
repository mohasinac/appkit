"use client";

import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Button, Div, Grid, Heading, Row, Section, SiteLogo, Span, Stack, Text, TextLink } from "../../../ui";

// --- Props -------------------------------------------------------------------
export interface WelcomeSectionChip {
  key: string;
  emoji: string;
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
  isLoading?: boolean;
  brandLogoText?: string;
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
  isLoading = false,
  brandLogoText = "",
  className = "",
}: WelcomeSectionProps) {
  const { themed, flex } = THEME_CONSTANTS;

  if (isLoading) {
    return (
      <Section
        className={`relative overflow-hidden md:py-24 px-4 ${className}`} padding="y-4xl"
      >
        <Div className="animate-pulse max-w-4xl mx-auto text-center">
          <Div className="h-6 w-52 mx-auto mb-6" surface="subtle" rounded="full" />
          <Div className="h-20 mb-4 max-w-2xl mx-auto" surface="subtle" rounded="lg" />
          <Div className="h-6 mb-8 max-w-lg mx-auto" surface="subtle" rounded="lg" />
          <Row justify="center" gap="md">
            <Div className="h-12 w-36" surface="subtle" rounded="xl" />
            <Div className="h-12 w-36" surface="subtle" rounded="xl" />
          </Row>
        </Div>
      </Section>
    );
  }

  return (
    <Section
      className={`relative overflow-hidden py-20 md:py-28 ${className}`} padding="x-md"
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
          <Div className="text-center lg:text-left">
            {/* Pill badge */}
            {pillLabel && (
              <Div>
                <Span layout="inline-flex" gap="md" size="xs" weight="medium" className="border border-primary-500/30 bg-primary-500/10 px-5 py-1.5 tracking-[0.2em] text-primary-700 dark:text-primary-400 backdrop-blur-sm" rounded="full" transform="uppercase">
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
              className="mt-4 font-display md:text-6xl lg:text-7xl xl:text-8xl leading-[1.1] tracking-tight" size="5xl"
            >
              {title}
            </Heading>

            {/* Subtitle */}
            {subtitle && (
              <Text
                className={`mt-4 ${themed.textSecondary} max-w-xl leading-relaxed mx-auto lg:mx-0`} size="xl"
              >
                {subtitle}
              </Text>
            )}

            {/* CTAs */}
            {showCTA && (
              <Row
                wrap
                gap="md"
                className="mt-8 lg:justify-start" justify="center"
              >
                {ctaHref ? (
                  <TextLink rounded="xl" 
                    href={ctaHref}
                    className="inline-flex items-center justify-center px-8 py-3.5 !bg-primary hover:!bg-primary-600 text-white dark:!bg-primary dark:hover:!bg-primary-600 dark:text-white btn-glow transition-all hover:scale-[1.02]" size="base" weight="bold"
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
                    className="inline-flex items-center justify-center border-2 border-cobalt/40 dark:border-cobalt-400/40 px-8 py-3.5 text-cobalt-700 dark:text-cobalt-300 hover:bg-cobalt-50 dark:hover:bg-cobalt-900/20 transition-all hover:scale-[1.02]" size="base" weight="semibold"
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
                className="mt-6 lg:justify-start" justify="center"
              >
                {trustChips.map((chip) => (
                  <Span layout="inline-flex" gap="xs" 
                    key={chip.key}
                    size="xs" weight="medium"
                    className=".5 border border-zinc-200 dark:border-slate-700 px-3.5 py-1.5" rounded="full" surface="subtle" color="muted"
                  >
                    {chip.emoji} {chip.label}
                  </Span>
                ))}
              </Row>
            )}
          </Div>

          {/* Right: brand logo (desktop only) */}
          <Div className="hidden lg:block">
            <Div
              className={`relative overflow-hidden aspect-[4/3] bg-[image:var(--appkit-gradient-section-mesh)] shadow-2xl`} border="default" rounded="3xl"
            >
              <Div className="absolute inset-0 bg-[image:var(--appkit-gradient-glass)]" />
              <Row centered className={`absolute inset-0 ${flex.center} px-10`}>
                <SiteLogo
                  title={brandLogoText || "LetItRip.in"}
                  size="hero"
                />
              </Row>
            </Div>
          </Div>
        </Grid>
      </Div>
    </Section>
  );
}
