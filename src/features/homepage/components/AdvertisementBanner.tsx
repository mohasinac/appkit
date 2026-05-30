import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Button, Div, Grid, Heading, Row, Section, Span, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { ArrowRight, Sparkles } from "lucide-react";

// --- Types -------------------------------------------------------------------

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

// --- Constants ---------------------------------------------------------------

const CLS_CONTAINER = "w-full max-w-7xl mx-auto";

// --- Component ---------------------------------------------------------------

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
        <Div className={CLS_CONTAINER}>
          <Div className="h-72 bg-zinc-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
        </Div>
      </Section>
    );
  }

  // -- Split layout: when a backgroundImage is provided --
  if (backgroundImage) {
    return (
      <Section className={`p-8 ${wrapClass} ${className}`}>
        <Div className={CLS_CONTAINER}>
          <Div className="relative overflow-hidden rounded-2xl bg-zinc-900 shadow-xl">
            <Grid className={`${THEME_CONSTANTS.grid.cols2Md} min-h-[clamp(300px,40vh,420px)]`}>
              {/* Left: image */}
              <Div className={`relative ${THEME_CONSTANTS.card.aspectBanner} order-last md:order-first min-h-0 min-h-[clamp(300px,40vh,420px)]`}>
                <MediaImage
                  src={backgroundImage}
                  alt={title}
                  size="banner"
                  priority
                />
                <Div className="hidden md:block absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent to-zinc-900/60 pointer-events-none" />
              </Div>

              {/* Right: content */}
              <Stack className="relative justify-center px-8 py-10 md:px-12 md:py-14">
                <Div
                  className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none bg-[radial-gradient(circle,_white_1px,_transparent_1px)] bg-[length:12px_12px]"
                  aria-hidden
                />
                {tagLabel && (
                  <Span size="xs" weight="semibold" className="inline-flex items-center gap-1.5 self-start bg-white/10 text-white/80 uppercase tracking-widest px-3 py-1 rounded-full mb-5 backdrop-blur-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    {tagLabel}
                  </Span>
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
                    className="self-start bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold shadow-lg gap-2"
                  >
                    {ctaLabel}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </Stack>
            </Grid>
          </Div>
        </Div>
      </Section>
    );
  }

  // -- Full-width gradient layout --
  return (
    <Section className={`p-8 ${wrapClass} ${className}`}>
      <Div className={CLS_CONTAINER}>
        <Row
          align="center"
          className={[
            "relative overflow-hidden rounded-2xl",
            compact
              ? "h-[clamp(112px,16vh,160px)]"
              : "min-h-[clamp(240px,34vh,360px)]",
          ].join(" ")}
          style={backgroundColor ? { backgroundColor } : undefined}
        >
          {/* Gradient background */}
          {!backgroundColor && (
            <Div
              className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600"
              aria-hidden
            />
          )}

          {/* Decorative blobs */}
          <Div className="absolute inset-0 overflow-hidden" aria-hidden>
            <Div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-primary/20 blur-3xl animate-pulse" />
            <Div className="absolute -bottom-16 right-0 w-80 h-80 rounded-full bg-cobalt/20 blur-3xl animate-pulse" />
          </Div>

          {/* Content */}
          {compact ? (
            <Row
              justify="between"
              className="relative z-10 w-full px-6 py-4 gap-4 flex-wrap"
            >
              <Span className="inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-white/80" />
                <Span size="sm" weight="semibold" className="text-white">
                  {title}
                </Span>
              </Span>
              {ctaLabel && onCtaClick && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onCtaClick}
                  className="bg-white dark:bg-zinc-100 text-indigo-700 hover:bg-zinc-50 dark:hover:bg-zinc-200 font-semibold gap-1.5 flex-shrink-0"
                >
                  {ctaLabel}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </Row>
          ) : (
            <Div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 md:py-16 text-center">
              {tagLabel && (
                <Span size="xs" weight="semibold" className="inline-flex items-center gap-1.5 bg-white/15 text-white/90 uppercase tracking-widest px-4 py-1.5 rounded-full mb-5 backdrop-blur-sm shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  {tagLabel}
                </Span>
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
                  className="bg-white dark:bg-zinc-100 text-indigo-700 hover:bg-zinc-50 dark:hover:bg-zinc-200 font-semibold shadow-lg gap-2"
                >
                  {ctaLabel}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </Div>
          )}
        </Row>
      </Div>
    </Section>
  );
}
