"use client";

import React from "react";
import { Button, Heading, Section, Span, Text } from "@mohasinac/ui";
import { MediaImage } from "@mohasinac/feat-media";
import { ArrowRight, Sparkles } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdvertisementBannerProps {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  backgroundImage?: string;
  backgroundColor?: string;
  tagLabel?: string;
  isLoading?: boolean;
  compact?: boolean;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AdvertisementBanner({
  title,
  subtitle,
  ctaLabel = "Shop now",
  onCtaClick,
  backgroundImage,
  backgroundColor,
  tagLabel,
  isLoading = false,
  compact = false,
  className = "",
}: AdvertisementBannerProps) {
  const wrapClass =
    "bg-gradient-to-br from-amber-50/40 to-orange-50/20 dark:from-amber-950/10 dark:to-orange-950/5";

  if (isLoading) {
    return (
      <Section className={`p-8 ${wrapClass} ${className}`}>
        <div className="w-full max-w-7xl mx-auto">
          <div className="h-72 bg-zinc-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
        </div>
      </Section>
    );
  }

  // ── Split layout: when a backgroundImage is provided ──
  if (backgroundImage) {
    return (
      <Section className={`p-8 ${wrapClass} ${className}`}>
        <div className="w-full max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-zinc-900 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 min-h-[clamp(300px,40vh,420px)]">
              {/* Left: image */}
              <div className="relative aspect-[4/3] md:aspect-auto order-last md:order-first min-h-0 min-h-[clamp(300px,40vh,420px)]">
                <MediaImage
                  src={backgroundImage}
                  alt={title}
                  size="banner"
                  priority
                />
                <div className="hidden md:block absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent to-zinc-900/60 pointer-events-none" />
              </div>

              {/* Right: content */}
              <div className="relative flex flex-col justify-center px-8 py-10 md:px-12 md:py-14">
                <div
                  className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none bg-[radial-gradient(circle,_white_1px,_transparent_1px)] bg-[length:12px_12px]"
                  aria-hidden
                />
                {tagLabel && (
                  <div className="inline-flex items-center gap-1.5 self-start bg-white/10 text-white/80 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-5 backdrop-blur-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    {tagLabel}
                  </div>
                )}
                <Heading
                  level={2}
                  variant="none"
                  className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight"
                >
                  {title}
                </Heading>
                {subtitle && (
                  <Text
                    variant="none"
                    className="text-white/75 text-base md:text-lg mb-8 leading-relaxed"
                  >
                    {subtitle}
                  </Text>
                )}
                {ctaLabel && onCtaClick && (
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={onCtaClick}
                    className="self-start bg-white text-zinc-900 hover:bg-zinc-100 font-semibold shadow-lg gap-2"
                  >
                    {ctaLabel}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Section>
    );
  }

  // ── Full-width gradient layout ──
  return (
    <Section className={`p-8 ${wrapClass} ${className}`}>
      <div className="w-full max-w-7xl mx-auto">
        <div
          className={[
            "relative overflow-hidden rounded-2xl flex items-center",
            compact
              ? "h-[clamp(112px,16vh,160px)]"
              : "min-h-[clamp(240px,34vh,360px)]",
          ].join(" ")}
          style={backgroundColor ? { backgroundColor } : undefined}
        >
          {/* Gradient background */}
          {!backgroundColor && (
            <div
              className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600"
              aria-hidden
            />
          )}

          {/* Decorative blobs */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-primary/20 blur-3xl animate-pulse" />
            <div className="absolute -bottom-16 right-0 w-80 h-80 rounded-full bg-cobalt/20 blur-3xl animate-pulse" />
          </div>

          {/* Content */}
          {compact ? (
            <div className="relative z-10 flex items-center justify-between w-full px-6 py-4 gap-4 flex-wrap">
              <div className="inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-white/80" />
                <Span className="text-white font-semibold text-sm">
                  {title}
                </Span>
              </div>
              {ctaLabel && onCtaClick && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onCtaClick}
                  className="bg-white text-indigo-700 hover:bg-zinc-50 font-semibold gap-1.5 flex-shrink-0"
                >
                  {ctaLabel}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 md:py-16 text-center">
              {tagLabel && (
                <div className="inline-flex items-center gap-1.5 bg-white/15 text-white/90 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5 backdrop-blur-sm shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  {tagLabel}
                </div>
              )}
              <Heading
                level={2}
                variant="none"
                className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 drop-shadow-lg leading-tight"
              >
                {title}
              </Heading>
              {subtitle && (
                <Text
                  variant="none"
                  className="text-white text-base md:text-xl mb-10 max-w-2xl mx-auto"
                >
                  {subtitle}
                </Text>
              )}
              {ctaLabel && onCtaClick && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={onCtaClick}
                  className="bg-white text-indigo-700 hover:bg-zinc-50 font-semibold shadow-lg gap-2"
                >
                  {ctaLabel}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
