import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Button, Div, Grid, Heading, Row, Scrim, Section, Span, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { ArrowRight, Sparkles } from "lucide-react";

const __P = {
  p8: "p-8",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_GRADIENT_BG = "absolute inset-0 bg-[image:var(--appkit-gradient-promotion)]";
const CLS_CTA_BTN_SM = "bg-white dark:bg-zinc-100 text-indigo-700 hover:bg-zinc-50 dark:hover:bg-zinc-200 font-semibold gap-1.5 flex-shrink-0";
const CLS_CTA_BTN_LG = "bg-white dark:bg-zinc-100 text-indigo-700 hover:bg-zinc-50 dark:hover:bg-zinc-200 font-semibold shadow-lg gap-2";

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
  const wrapClass = "bg-[image:var(--appkit-gradient-section-warm)]";

  if (isLoading) {
    return (
      <Section className={`${__P.p8} ${wrapClass} ${className}`}>
        <Div className={CLS_CONTAINER}>
          <Div className="h-72 animate-pulse" surface="subtle" rounded="2xl" />
        </Div>
      </Section>
    );
  }

  // -- Split layout: when a backgroundImage is provided --
  if (backgroundImage) {
    return (
      <Section className={`${__P.p8} ${wrapClass} ${className}`}>
        <Div className={CLS_CONTAINER}>
          <Div className={`relative ${__O.hidden} bg-zinc-900`} rounded="2xl" shadow="xl">
            <Grid className={`${THEME_CONSTANTS.grid.cols2Md} min-h-[clamp(300px,40vh,420px)]`}>
              {/* Left: image */}
              <Div className={`relative ${THEME_CONSTANTS.card.aspectBanner} order-last md:order-first min-h-0 min-h-[clamp(300px,40vh,420px)]`}>
                <MediaImage
                  src={backgroundImage}
                  alt={title}
                  size="banner"
                  priority
                />
                <Scrim direction="right-to-left" intensity="medium" className="hidden md:block absolute inset-y-0 right-0 w-24" />
              </Div>

              {/* Right: content */}
              <Stack justify="center" className="relative px-8 md:px-12 md:py-14" padding="y-2xl">
                <Div
                  className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none bg-[radial-gradient(circle,_white_1px,_transparent_1px)] bg-[length:12px_12px]"
                  aria-hidden
                />
                {tagLabel && (
                  <Span layout="inline-flex" gap="xs" color="inverse" size="xs" weight="semibold" className=".5 self-start bg-white/10 /80 tracking-widest mb-5 backdrop-blur-sm" rounded="full" padding="pill-md" transform="uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    {tagLabel}
                  </Span>
                )}
                <Heading color="inverse" 
                  level={2}
                  variant="none"
                  className="font-extrabold mb-4 leading-tight" mdSize="4xl" lgSize="5xl" size="3xl"
                >
                  {title}
                </Heading>
                {subtitle && (
                  <Text color="inverse" 
                    variant="none"
                    className="/75 mb-8 leading-relaxed" mdSize="lg" size="base"
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
    <Section className={`${__P.p8} ${wrapClass} ${className}`}>
      <Div className={CLS_CONTAINER}>
        <Row
          align="center"
          className={[
            "relative overflow-hidden rounded-2xl",
            compact
              ? "h-[clamp(112px,16vh,160px)]"
              : "min-h-[clamp(240px,34vh,360px)]",
          ].join(" ")}
          // audit-inline-style-ok: optional inline color
          style={backgroundColor ? { backgroundColor } : undefined}
        >
          {/* Gradient background */}
          {!backgroundColor && (
            <Div
              className={CLS_GRADIENT_BG}
              aria-hidden
            />
          )}

          {/* Decorative blobs */}
          <Div className={`absolute inset-0 ${__O.hidden}`} aria-hidden>
            <Div className="absolute -top-16 -left-16 w-64 h-64 bg-primary/20 blur-3xl animate-pulse" rounded="full" />
            <Div className="absolute -bottom-16 right-0 w-80 h-80 bg-cobalt/20 blur-3xl animate-pulse" rounded="full" />
          </Div>

          {/* Content */}
          {compact ? (
            <Row
              justify="between"
              className="relative z-10 w-full" gap="md" padding="inlineLg"
            >
              <Span layout="inline-flex" gap="md" >
                <Sparkles className="w-4 h-4 text-white/80" />
                <Span color="inverse" size="sm" weight="semibold">
                  {title}
                </Span>
              </Span>
              {ctaLabel && onCtaClick && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onCtaClick}
                  className={CLS_CTA_BTN_SM}
                >
                  {ctaLabel}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </Row>
          ) : (
            <Div className="relative z-10 w-full max-w-4xl mx-auto px-6 md:py-16 text-center" padding="y-3xl">
              {tagLabel && (
                <Span layout="inline-flex" gap="xs" color="inverse" size="xs" weight="semibold" className=".5 bg-white/15 /90 tracking-widest mb-5 backdrop-blur-sm shadow-sm" rounded="full" padding="pill-lg" transform="uppercase">
                  <Sparkles className="w-3.5 h-3.5" />
                  {tagLabel}
                </Span>
              )}
              <Heading color="inverse" 
                level={2}
                variant="none"
                className="lg:text-6xl font-extrabold mb-4 drop-shadow-lg leading-tight" mdSize="5xl" size="3xl"
              >
                {title}
              </Heading>
              {subtitle && (
                <Text color="inverse" 
                  variant="none"
                  className="mb-10 max-w-2xl mx-auto" mdSize="xl" size="base"
                >
                  {subtitle}
                </Text>
              )}
              {ctaLabel && onCtaClick && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={onCtaClick}
                  className={CLS_CTA_BTN_LG}
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
