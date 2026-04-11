"use client";

import React from "react";
import { THEME_CONSTANTS } from "@mohasinac/tokens";
import { Button, Heading, Section, Span, Text } from "@mohasinac/ui";

// ─── Props ───────────────────────────────────────────────────────────────────

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
  onCtaClick?: () => void;
  secondaryCtaLabel?: string;
  onSecondaryCtaClick?: () => void;
  trustChips?: WelcomeSectionChip[];
  isLoading?: boolean;
  brandLogoText?: string;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WelcomeSection({
  title,
  subtitle,
  pillLabel,
  showCTA = true,
  ctaLabel = "Shop now",
  onCtaClick,
  secondaryCtaLabel = "Browse products",
  onSecondaryCtaClick,
  trustChips = [],
  isLoading = false,
  brandLogoText = "LIR",
  className = "",
}: WelcomeSectionProps) {
  const { themed, flex } = THEME_CONSTANTS;

  if (isLoading) {
    return (
      <Section
        className={`relative overflow-hidden py-16 md:py-24 px-4 ${className}`}
      >
        <div className="animate-pulse max-w-4xl mx-auto text-center">
          <div className="h-6 bg-zinc-200 dark:bg-slate-700 rounded-full w-52 mx-auto mb-6" />
          <div className="h-20 bg-zinc-200 dark:bg-slate-700 rounded-lg mb-4 max-w-2xl mx-auto" />
          <div className="h-6 bg-zinc-200 dark:bg-slate-700 rounded-lg mb-8 max-w-lg mx-auto" />
          <div className="flex justify-center gap-4">
            <div className="h-12 bg-zinc-200 dark:bg-slate-700 rounded-xl w-36" />
            <div className="h-12 bg-zinc-200 dark:bg-slate-700 rounded-xl w-36" />
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section
      className={`relative overflow-hidden py-16 md:py-24 px-4 ${className}`}
    >
      {/* Decorative rings */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full border border-dashed border-primary/10 animate-spin [animation-duration:60s]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full border border-dashed border-cobalt/10 animate-spin [animation-duration:80s] [animation-direction:reverse]"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-12 items-center">
          {/* Left: text content */}
          <div className="text-center lg:text-left">
            {/* Pill badge */}
            {pillLabel && (
              <div>
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
              className="mt-4 font-display text-5xl md:text-7xl lg:text-8xl bg-gradient-to-r from-primary via-cobalt to-secondary dark:from-secondary dark:via-cobalt dark:to-primary bg-clip-text text-transparent leading-tight"
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
              <div className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
                <Button variant="primary" size="lg" onClick={onCtaClick}>
                  {ctaLabel}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onSecondaryCtaClick}
                >
                  {secondaryCtaLabel}
                </Button>
              </div>
            )}

            {/* Trust chips */}
            {trustChips.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 justify-center lg:justify-start">
                {trustChips.map((chip) => (
                  <Span
                    key={chip.key}
                    className="bg-zinc-100 dark:bg-slate-800 rounded-full px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    {chip.emoji} {chip.label}
                  </Span>
                ))}
              </div>
            )}
          </div>

          {/* Right: brand placeholder (desktop only) */}
          <div className="hidden lg:block">
            <div
              className={`relative rounded-3xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-primary/10 via-cobalt/10 to-secondary/10 border ${themed.border}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cobalt/5" />
              <div className={`absolute inset-0 ${flex.center}`}>
                <Span className="font-display text-8xl text-primary/20 select-none">
                  {brandLogoText}
                </Span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
