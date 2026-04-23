"use client";

import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Button, Grid, Heading, Row, Section, Span, Text, TextLink } from "../../../ui";

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
        <div className="animate-pulse max-w-4xl mx-auto text-center" data-section="welcomesection-div-382">
          <div className="h-6 bg-zinc-200 dark:bg-slate-700 rounded-full w-52 mx-auto mb-6" />
          <div className="h-20 bg-zinc-200 dark:bg-slate-700 rounded-lg mb-4 max-w-2xl mx-auto" />
          <div className="h-6 bg-zinc-200 dark:bg-slate-700 rounded-lg mb-8 max-w-lg mx-auto" />
          <div className="flex justify-center gap-4" data-section="welcomesection-div-383">
            <div className="h-12 bg-zinc-200 dark:bg-slate-700 rounded-xl w-36" />
            <div className="h-12 bg-zinc-200 dark:bg-slate-700 rounded-xl w-36" />
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section
      className={`relative overflow-hidden py-20 md:py-28 px-4 ${className}`}
    >
      {/* Decorative ambient glows */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-secondary/10 dark:bg-secondary/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto" data-section="welcomesection-div-384">
        <Grid
          gap="2xl"
          className="grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 items-center"
        >
          {/* Left: text content */}
          <div className="text-center lg:text-left" data-section="welcomesection-div-385">
            {/* Pill badge */}
            {pillLabel && (
              <div data-section="welcomesection-div-386">
                <Span className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-5 py-1.5 text-xs font-medium tracking-[0.2em] uppercase text-primary-700 dark:text-primary-400 backdrop-blur-sm">
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
              </div>
            )}

            {/* H1 */}
            <Heading
              level={1}
              variant="none"
              className="mt-4 font-display text-5xl md:text-6xl lg:text-7xl xl:text-8xl bg-gradient-to-r from-primary-600 via-cobalt to-primary-400 dark:from-secondary dark:via-cobalt-400 dark:to-secondary-300 bg-clip-text text-transparent leading-[1.1] tracking-tight"
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
                    className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-base font-bold !bg-primary hover:!bg-primary-500 !text-zinc-900 dark:!bg-secondary dark:hover:!bg-secondary-600 dark:!text-white shadow-lg shadow-primary/25 dark:shadow-secondary/25 transition-all hover:scale-[1.02]"
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
                    className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-slate-800 border border-zinc-200 dark:border-slate-700 rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    {chip.emoji} {chip.label}
                  </Span>
                ))}
              </Row>
            )}
          </div>

          {/* Right: brand placeholder (desktop only) */}
          <div className="hidden lg:block" data-section="welcomesection-div-387">
            <div
              className={`relative rounded-3xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-primary-100 via-cobalt-100/60 to-secondary-100 dark:from-primary-950/60 dark:via-cobalt-950/40 dark:to-secondary-950/60 border ${themed.border} shadow-2xl`}
             data-section="welcomesection-div-388">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cobalt/5" />
              <div className={`absolute inset-0 ${flex.center}`} data-section="welcomesection-div-389">
                <Span className="font-display text-9xl font-black text-primary-400/30 dark:text-secondary-400/30 select-none">
                  {brandLogoText}
                </Span>
              </div>
            </div>
          </div>
        </Grid>
      </div>
    </Section>
  );
}
