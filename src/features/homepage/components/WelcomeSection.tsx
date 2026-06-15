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
        className={`relative overflow-hidden py-16 md:py-24 px-4 ${className}`}
      >
        <Div className="animate-pulse max-w-4xl mx-auto text-center">
          <Div className="h-6 bg-zinc-200 dark:bg-slate-700 rounded-full w-52 mx-auto mb-6" />
          <Div className="h-20 bg-zinc-200 dark:bg-slate-700 rounded-lg mb-4 max-w-2xl mx-auto" />
          <Div className="h-6 bg-zinc-200 dark:bg-slate-700 rounded-lg mb-8 max-w-lg mx-auto" />
          <Row justify="center" gap="md">
            <Div className="h-12 bg-zinc-200 dark:bg-slate-700 rounded-xl w-36" />
            <Div className="h-12 bg-zinc-200 dark:bg-slate-700 rounded-xl w-36" />
          </Row>
        </Div>
      </Section>
    );
  }

  return (
    <Section
      className={`relative overflow-hidden py-20 md:py-28 px-4 ${className}`}
    >
      {/* Decorative ambient glows */}
      <Div
        className="pointer-events-none absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <Div
        className="pointer-events-none absolute -bottom-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-secondary/10 dark:bg-secondary/15 blur-3xl"
        aria-hidden="true"
      />

      <Div className="relative z-10 max-w-7xl mx-auto">
        <Grid
          gap="2xl"
          className="grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 items-center"
        >
          {/* Left: text content */}
          <Div className="text-center lg:text-left">
            {/* Pill badge */}
            {pillLabel && (
              <Div>
                <Span size="xs" weight="medium" className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-5 py-1.5 tracking-[0.2em] text-primary-700 dark:text-primary-400 backdrop-blur-sm" transform="uppercase">
                  <Span
                    className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block"
                    aria-hidden="true"
                  />
                  {pillLabel}
                  <Span
                    className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block"
                    aria-hidden="true"
                  />
                </Span>
              </Div>
            )}

            {/* H1 */}
            <Heading
              level={1}
              variant="none"
              className="mt-4 font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl bg-gradient-to-r from-primary-700 via-cobalt to-secondary-400 dark:from-primary dark:via-cobalt-400 dark:to-primary-300 bg-clip-text text-transparent leading-[1.1] tracking-tight"
            >
              {title}
            </Heading>

            {/* Subtitle */}
            {subtitle && (
              <Text
                className={`mt-4 text-xl ${themed.textSecondary} max-w-xl leading-relaxed mx-auto lg:mx-0`}
              >
                {subtitle}
              </Text>
            )}

            {/* CTAs */}
            {showCTA && (
              <Row
                wrap
                gap="md"
                className="mt-8 justify-center lg:justify-start"
              >
                {ctaHref ? (
                  <TextLink
                    href={ctaHref}
                    className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-base font-bold !bg-primary hover:!bg-primary-600 text-white dark:!bg-primary dark:hover:!bg-primary-600 dark:text-white btn-glow transition-all hover:scale-[1.02]"
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
                  <TextLink
                    href={secondaryCtaHref}
                    className="inline-flex items-center justify-center rounded-xl border-2 border-cobalt/40 dark:border-cobalt-400/40 px-8 py-3.5 text-base font-semibold text-cobalt-700 dark:text-cobalt-300 hover:bg-cobalt-50 dark:hover:bg-cobalt-900/20 transition-all hover:scale-[1.02]"
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
                className="mt-6 justify-center lg:justify-start"
              >
                {trustChips.map((chip) => (
                  <Span
                    key={chip.key}
                    size="xs" weight="medium"
                    className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-full px-3.5 py-1.5 text-zinc-700 dark:text-zinc-300"
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
              className={`relative rounded-3xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-primary-100 via-cobalt-100/60 to-secondary-100 dark:from-primary-950/60 dark:via-cobalt-950/40 dark:to-secondary-950/60 border ${themed.border} shadow-2xl`}
            >
              <Div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cobalt/5" />
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
