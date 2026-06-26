import React from "react";
import { CARD_ASPECT_BANNER, GRID_COLS_2_MD } from "../../../_internal/shared/styles/grid";
import { Button, Div, Grid, Heading, Row, Scrim, Section, Span, Stack, Text } from "../../../ui";
import { DynamicBgDiv } from "../../../ui/components/DynamicBgDiv";
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
          <Div className={`relative ${__O.hidden} bg-neutral-900`} rounded="2xl" shadow="xl">
            <Grid className={`${GRID_COLS_2_MD} min-h-[clamp(300px,40vh,420px)]`}>
              {/* Left: image */}
              <Div className={`relative ${CARD_ASPECT_BANNER} order-last md:order-first min-h-0 min-h-[clamp(300px,40vh,420px)]`}>
                <MediaImage
                  src={backgroundImage}
                  alt={title}
                  size="banner"
                  priority
                />
                <Scrim direction="right-to-left" intensity="medium" className="hidden md:block absolute inset-y-0 right-0 w-24" />
              </Div>

              {/* Right: content */}
              <Stack justify="center" className="relative" paddingX="x-xl" padding="y-2xl">
                <Div
                  className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none bg-[radial-gradient(circle,_white_1px,_transparent_1px)] bg-[length:12px_12px]"
                  aria-hidden
                />
                {tagLabel && (
                  <Span layout="inline-flex" gap="xs" color="inverse" size="xs" weight="semibold" className="self-start bg-[rgba(255,255,255,0.1)] /80 tracking-widest mb-5 backdrop-blur-sm" rounded="full" padding="pill-md" transform="uppercase">
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
                  <Button gap="md"
                    variant="secondary"
                    size="lg"
                    onClick={onCtaClick}
                    className="self-start bg-[var(--appkit-color-surface)] text-[var(--appkit-color-text)] hover:bg-neutral-100 dark:bg-neutral-100 dark:text-[var(--appkit-color-text)] dark:hover:bg-neutral-200 font-[600]"
                    shadow="lg"
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
        <DynamicBgDiv
          color={backgroundColor}
          className={[
            "flex items-center relative overflow-hidden rounded-2xl",
            compact
              ? "h-[clamp(112px,16vh,160px)]"
              : "min-h-[clamp(240px,34vh,360px)]",
          ].join(" ")}
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
            <Div className="relative z-10 w-full max-w-4xl mx-auto md:py-[4rem] text-center" paddingY="y-3xl" paddingX="x-lg">
              {tagLabel && (
                <Span layout="inline-flex" gap="xs" color="inverse" size="xs" weight="semibold" className="bg-[rgba(255,255,255,0.15)] /90 tracking-widest mb-5 backdrop-blur-sm" shadow="sm" rounded="full" padding="pill-lg" transform="uppercase">
                  <Sparkles className="w-3.5 h-3.5" />
                  {tagLabel}
                </Span>
              )}
              <Heading color="inverse"
                level={2}
                variant="none"
                className="font-extrabold mb-4 leading-tight" mdSize="5xl" lgSize="6xl" size="3xl" shadow="lg"
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
        </DynamicBgDiv>
      </Div>
    </Section>
  );
}
