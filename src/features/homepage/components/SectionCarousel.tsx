import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import {
  Button,
  Div,
  Heading,
  HorizontalScroller,
  Section,
  Span,
  Text,
  TextLink,
  type PerViewConfig,
} from "../../../ui";
import { MediaImage } from "../../media/MediaImage";

// --- Props -------------------------------------------------------------------

export interface SectionCarouselProps<T = unknown> {
  /** Section heading */
  title: string;

  /** Optional subtitle below the heading */
  description?: string;

  /**
   * Heading visual variant.
   * - `"default"` — standard themed text
   * - `"gradient"` — primary→cobalt gradient clip text
   * - `"editorial"` — pill + font-display H2 + ornament
   */
  headingVariant?: "default" | "gradient" | "editorial";

  /**
   * Pill label shown above the heading when `headingVariant="editorial"`.
   * Required for editorial variant; ignored otherwise.
   */
  pillLabel?: string;

  /**
   * URL of an image to use as the section background.
   * A dark semi-transparent overlay is applied so text remains readable.
   */
  backgroundImage?: string;

  /** Route for the "View More" button. Omit to hide the button. */
  viewMoreHref?: string;

  /**
   * Label for the "View More" button.
   * Defaults to "View all →" when omitted.
   */
  viewMoreLabel?: string;

  /** Items to render in the carousel. */
  items: T[];

  /** Renders a single item. Receives (item, index). */
  renderItem: (item: T, index: number) => React.ReactNode;

  /** Responsive items-per-view breakpoint config. Default: { base: 1, sm: 2, md: 3 } */
  perView?: PerViewConfig;

  /** Gap between cards in px. Default: 16 */
  gap?: number;

  /** Enable circular auto-scroll. Default: false */
  autoScroll?: boolean;

  /** Interval between auto-scroll steps in ms. Default: 3500 */
  autoScrollInterval?: number;

  /** Key extractor for the HorizontalScroller. */
  keyExtractor?: (item: T, index: number) => string;

  /**
   * Number of rows (for 2-row grid mode).
   * Auto-scroll is disabled in grid mode.
   * Default: 1
   */
  rows?: number;

  /** Additional classes on the outer `<Section>`. */
  className?: string;

  /** Show a loading skeleton instead of items. */
  isLoading?: boolean;

  /** Number of skeleton cards to show. Default: 4 */
  skeletonCount?: number;

  /**
   * Whether the heading and description text should be light-coloured.
   * Defaults to `true` when `backgroundImage` is provided, `false` otherwise.
   */
  lightText?: boolean;

  /**
   * When `true`, adds a negative right margin to the scroller wrapper so the
   * last visible item peeks at the edge.
   * Default: false
   */
  showPeek?: boolean;

  /**
   * Minimum item width in px.
   * Default: 220
   */
  minItemWidth?: number;
}

// --- Skeleton ----------------------------------------------------------------

function CarouselSkeleton({ count }: { count: number }) {
  const { skeleton } = THEME_CONSTANTS;
  return (
    <Div className="flex gap-4 overflow-hidden px-4">
      {Array.from({ length: count }).map((_, i) => (
        <Div
          key={i}
          className="flex-none min-w-[clamp(150px,18vw,260px)] max-w-[clamp(240px,36vw,380px)] h-[clamp(180px,26vh,260px)] space-y-2"
        >
          <Div className={`aspect-square rounded-xl ${skeleton.image}`} />
          <Div className={`${skeleton.text} w-3/4`} />
          <Div className={`${skeleton.text} w-1/2`} />
        </Div>
      ))}
    </Div>
  );
}

// --- Component ---------------------------------------------------------------

export function SectionCarousel<T = unknown>({
  title,
  description,
  headingVariant = "editorial",
  pillLabel,
  backgroundImage,
  viewMoreHref,
  viewMoreLabel = "View all →",
  items,
  renderItem,
  perView = THEME_CONSTANTS.carousel.perView.standard,
  gap = 16,
  autoScroll = false,
  autoScrollInterval = 3500,
  keyExtractor,
  rows = 1,
  className = "",
  isLoading = false,
  skeletonCount = 4,
  lightText,
  showPeek = false,
  minItemWidth = 220,
}: SectionCarouselProps<T>) {
  if (!isLoading && items.length === 0) return null;

  const hasBg = Boolean(backgroundImage);
  const useLightText = lightText ?? hasBg;

  const { themed, flex } = THEME_CONSTANTS;

  const headingClass = useLightText
    ? "text-white"
    : headingVariant === "gradient"
      ? "bg-gradient-to-r from-primary to-cobalt bg-clip-text text-transparent"
      : themed.textPrimary;

  const descVariant = useLightText ? "text-white/80" : themed.textSecondary;

  const pillClass =
    "inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-5 py-1.5 text-xs font-medium tracking-[0.2em] uppercase text-primary-700 dark:text-primary-400 backdrop-blur-sm";

  return (
    <Section
      className={[
        "relative overflow-hidden w-full",
        hasBg ? "" : themed.bgSecondary,
        // Vertical padding: 5rem on desktop, 3rem on mobile to leave room for adjacent sections.
        // Horizontal: 1rem mobile → 2rem desktop; handled via inner max-w container.
        "py-10 px-4 md:py-12 md:px-8",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Background image + overlay */}
      {hasBg && backgroundImage && (
        <>
          <Div className="absolute inset-0 overflow-hidden">
            <MediaImage src={backgroundImage} alt="" size="hero" />
          </Div>
          <Div className="absolute inset-0 bg-black/55" />
        </>
      )}

      {/* Content — sits above the background */}
      <Div className="relative z-10 w-full max-w-7xl mx-auto">
        {/* Header */}
        <Div className="text-center mb-6">
          {/* Editorial pill */}
          {headingVariant === "editorial" && pillLabel && (
            <Div className="mb-4">
              <Span className={pillClass}>
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

          {/* Heading */}
          <Heading
            level={2}
            variant="none"
            className={[
              "text-3xl md:text-4xl font-bold mb-2",
              headingVariant === "editorial" ? "font-display text-4xl" : "",
              headingClass,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {title}
          </Heading>

          {/* Editorial ornament */}
          {headingVariant === "editorial" && (
            <Div
              className={`${flex.center} gap-2 mt-1 text-zinc-400 dark:text-zinc-400 text-xs select-none`}
              aria-hidden="true"
            >
              <Span className="h-px w-6 bg-current" />
              <Span className="text-xs">✶</Span>
              <Span className="h-px w-6 bg-current" />
            </Div>
          )}

          {description && (
            <Text className={`text-base ${descVariant} mt-2`}>
              {description}
            </Text>
          )}
        </Div>

        {/* Carousel or skeleton */}
        {isLoading ? (
          <CarouselSkeleton count={skeletonCount} />
        ) : (
          <HorizontalScroller
            items={items}
            renderItem={renderItem}
            perView={perView}
            gap={gap}
            autoScroll={autoScroll}
            autoScrollInterval={autoScrollInterval}
            loop={rows === 1}
            keyExtractor={keyExtractor}
            rows={rows}
            minItemWidth={minItemWidth}
            showArrows
            snapToItems
            showFadeEdges
            showScrollbar={false}
            pauseOnHover
          />
        )}

        {/* View More button */}
        {viewMoreHref && !isLoading && (
          <Div className="mt-6 flex justify-center">
            <TextLink
              href={viewMoreHref}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors ${
                useLightText
                  ? "border-white/40 text-white hover:bg-white/10"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              {viewMoreLabel}
            </TextLink>
          </Div>
        )}
      </Div>
    </Section>
  );
}
