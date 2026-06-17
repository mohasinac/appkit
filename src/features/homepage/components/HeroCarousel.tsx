"use client"
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMediaQuery } from "../../../react";
import { Button, Div, Heading, Row, Scrim, Section, Span, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { MediaVideo } from "../../media/MediaVideo";
import { useHeroCarousel } from "../hooks/useHeroCarousel";
import { HERO_CAROUSEL_ARROW, HERO_CAROUSEL_DOT_ACTIVE, HERO_CAROUSEL_DOT_INACTIVE, POSITION_FILL, FLEX_CENTER, HERO_PLACEHOLDER_BG } from "../constants/hero-carousel-styles";
import type {
  CarouselBackground,
  CarouselSlide,
  CarouselSlideCard,
  CarouselHoverEffect,
} from "../types/index";


export interface HeroCarouselProps {
  initialSlides?: CarouselSlide[];
  /**
   * Navigate to an internal path.
   * Pass `useRouter().push` from your locale-aware router (e.g. `@/i18n/navigation`).
   * Falls back to `window.location.href` assignment when omitted.
   */
  push?: (href: string) => void;
}

function makeButtonClickHandler(
  href: string,
  openInNewTab: boolean | undefined,
  push?: (href: string) => void,
): () => void {
  return () => {
    if (openInNewTab) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      navigate(href, push);
    }
  };
}

function navigate(href: string, push?: (href: string) => void) {
  if (push) {
    push(href);
  } else {
    window.location.href = href;
  }
}

function resolveZoneToGrid(zone: 1 | 2 | 3 | 4 | 5 | 6): { gridRow: number; gridColumn: number } {
  const row = zone <= 3 ? 1 : 2;
  const col = zone <= 3 ? zone : zone - 3;
  return { gridRow: row, gridColumn: col };
}

function getHoverClass(effect?: CarouselHoverEffect): string {
  if (!effect || effect === "none") return "";
  if (effect === "scale") return "hover:scale-105";
  if (effect === "glow") return "hover:shadow-[0_0_24px_6px_rgba(255,255,255,0.25)]";
  if (effect === "color") return "hover:brightness-110";
  return "";
}

function getSlideHeightClass(height?: "viewport" | "tall" | "medium"): string {
  // BN-1 (fixed bottom nav) = h-16 = 4rem, shown only below lg — must be subtracted on mobile.
  // --header-height is the measured sticky header height set by AppLayoutShell.
  if (height === "viewport") {
    return [
      // mobile: full dvh minus header minus BN-1
      "min-h-[calc(100dvh-var(--header-height,3.5rem)-4rem)]",
      // desktop: full dvh minus header only (no BN-1)
      "lg:min-h-[calc(100dvh-var(--header-height,3.5rem))]",
    ].join(" ");
  }
  if (height === "tall") {
    return [
      "min-h-[calc(72dvh-var(--header-height,3.5rem)-4rem)]",
      "lg:min-h-[clamp(480px,76dvh,840px)]",
    ].join(" ");
  }
  // medium (default) — comfortable hero without forcing full-screen
  return [
    "min-h-[calc(52dvh-var(--header-height,3.5rem)-4rem)]",
    "lg:min-h-[clamp(420px,65dvh,680px)]",
  ].join(" ");
}

/** Renders the slide background — image, video, solid colour, or gradient. */
function SlideBackground({
  bg,
  legacy,
  mobileLegacy,
  isMobile,
  priority,
}: {
  bg?: CarouselBackground;
  legacy?: CarouselSlide["media"];
  mobileLegacy?: CarouselSlide["mobileMedia"];
  isMobile: boolean;
  priority?: boolean;
}) {
  const effectiveBg = bg ?? (legacy ? { type: legacy.type, url: legacy.url } as CarouselBackground : undefined);
  const mobileUrl = effectiveBg?.mobileUrl ?? (isMobile && mobileLegacy ? mobileLegacy.url : undefined);
  const src = mobileUrl ?? effectiveBg?.url ?? "";

  if (!effectiveBg) {
    // audit-variant-ok: slide placeholder — bg-zinc-900 over POSITION_FILL; brand placeholder when no slide image
    return <Div className={`${POSITION_FILL} bg-zinc-900`} />;
  }

  if (effectiveBg.type === "color") {
    const bg_color = effectiveBg.color ?? "var(--appkit-color-primary)";
    return <Div className={POSITION_FILL} style={{ backgroundColor: bg_color }} />;
  }

  if (effectiveBg.type === "gradient") {
    const from = effectiveBg.gradientFrom ?? "var(--appkit-color-primary)";
    const to = effectiveBg.gradientTo ?? "var(--appkit-color-secondary)";
    const angle = effectiveBg.gradientAngle ?? 135;
    return (
      <Div
        className={POSITION_FILL}
        style={{ background: `linear-gradient(${angle}deg, ${from}, ${to})` }}
      />
    );
  }

  if (effectiveBg.type === "video") {
    return (
      <>
        <MediaVideo
          src={src}
          thumbnailUrl={effectiveBg.thumbnail ?? legacy?.thumbnail}
          alt=""
          autoPlayMuted
          loop
          controls={false}
        />
        {effectiveBg.dimOverlay?.enabled && (
          <Div
            className={POSITION_FILL}
            style={{ backgroundColor: `rgba(0,0,0,${(effectiveBg.dimOverlay.opacity ?? 0) / 100})` }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <MediaImage src={src} alt="" size="hero" priority={priority} />
      {effectiveBg.dimOverlay?.enabled && (
        <Div
          className={POSITION_FILL}
          style={{ backgroundColor: `rgba(0,0,0,${(effectiveBg.dimOverlay.opacity ?? 0) / 100})` }}
        />
      )}
    </>
  );
}

/** Renders the background of a card (image, video, color, gradient). */
function CardBackground({ bg }: { bg: CarouselBackground }) {
  if (bg.type === "color") {
    return (
      <Div
        className={POSITION_FILL}
        style={{ backgroundColor: bg.color ?? "var(--appkit-color-surface)" }}
      />
    );
  }
  if (bg.type === "gradient") {
    const from = bg.gradientFrom ?? "var(--appkit-color-primary)";
    const to = bg.gradientTo ?? "var(--appkit-color-secondary)";
    const angle = bg.gradientAngle ?? 135;
    return (
      <Div
        className={POSITION_FILL}
        style={{ background: `linear-gradient(${angle}deg, ${from}, ${to})` }}
      />
    );
  }
  if (bg.type === "image" && bg.url) {
    return <MediaImage src={bg.url} alt="" size="card" />;
  }
  return null;
}

function CarouselCardRenderer({
  card,
  isMobile,
  push,
}: {
  card: CarouselSlideCard;
  isMobile: boolean;
  push?: (href: string) => void;
}) {
  const mobileZone = card.mobileZone;
  const gridPos = isMobile && mobileZone
    ? { gridRow: mobileZone <= 3 ? 1 : 2, gridColumn: mobileZone <= 3 ? mobileZone : mobileZone - 3 }
    : resolveZoneToGrid(card.zone);

  const hoverClass = getHoverClass(card.hover?.effect);
  const textAlign = card.content?.textAlign ?? "left";
  const textAlignClass = textAlign === "center" ? "text-center" : textAlign === "right" ? "text-right" : "text-left";

  return (
    <Div
      className={`relative overflow-hidden transition-all duration-300 ${hoverClass}`} rounded="lg" shadow="lg"
      style={{
        gridRow: String(gridPos.gridRow),
        gridColumn: String(gridPos.gridColumn),
        minHeight: isMobile ? 100 : 140,
      }}
    >
      <CardBackground bg={card.background} />
      {!card.isButtonOnly && (
        <>
          <Scrim direction="bottom-up" intensity="strong" className={POSITION_FILL} />
          {/* audit-variant-ok: card content stack — POSITION_FILL + md:p-6 responsive bump + dynamic text-align class */}
          <Stack justify="end"
            className={`${POSITION_FILL} md:p-6 ${textAlignClass}`} padding="xs"
          >
          {card.content?.eyebrow && (
            <Text color="inverse" shadow="sm" className="text-[10px] !/70 mb-0.5 tracking-wider" mdSize="xs" transform="uppercase">
              {card.content.eyebrow}
            </Text>
          )}
          {card.content?.subtitle && (
            <Text color="inverse" shadow="sm" className="hidden md:block !/90 mb-0.5 md:mb-2" mdSize="sm" size="xs">
              {card.content.subtitle}
            </Text>
          )}
          {card.content?.title && (
            // audit-variant-ok: card title — arbitrary text-[11px] base + md:text-2xl lg:text-3xl ladder + drop-shadow-md
            <Heading
              level={2}
              className={`text-[11px] md:text-2xl lg:text-3xl mb-0.5 md:mb-3 drop-shadow-md`} truncate={2} weight="bold"
              style={{ color: card.content.textColor ?? "#ffffff" }}
            >
              {card.content.title}
            </Heading>
          )}
          {card.content?.description && (
            // audit-variant-ok: card description — arbitrary text-[10px] base + md:text-sm responsive bump
            <Text color="inverse" shadow="sm"
              className={`text-[10px] md:text-sm !/80 mb-1 md:mb-4`} truncate
            >
              {card.content.description}
            </Text>
          )}
          {(card.buttons?.length ?? 0) > 0 && (
            // audit-variant-ok: button row — md:gap-2 responsive gap bump (Row.gap is single-axis)
            <Row wrap gap="xs" className="md:gap-2">
              {(card.buttons ?? []).map((btn, i) => {
                const variant = btn.variant === "link" || btn.variant === "ghost"
                  ? "ghost"
                  : btn.variant as "primary" | "secondary" | "outline";
                return (
                  <Button
                    key={btn.id ?? i}
                    variant={variant}
                    size="sm"
                    onClick={makeButtonClickHandler(btn.href, btn.openInNewTab, push)}
                  >
                    {btn.text}
                  </Button>
                );
              })}
            </Row>
          )}
        </Stack>
        </>
      )}
      {card.isButtonOnly && card.buttons?.[0] && (
        // audit-variant-ok: button-only card overlay — POSITION_FILL + FLEX_CENTER + hover black/20 overlay
        <Button
          variant="ghost"
          className={`${POSITION_FILL} ${FLEX_CENTER} font-semibold text-white hover:bg-black/20 transition-colors rounded-none p-0`}
          onClick={makeButtonClickHandler(card.buttons[0].href, card.buttons[0].openInNewTab, push)}
        >
          <Span size="lg" mdSize="2xl">{card.buttons[0].text}</Span>
        </Button>
      )}
    </Div>
  );
}

export function HeroCarousel({ initialSlides, push }: HeroCarouselProps = {}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const slidesRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const { data, isLoading } = useHeroCarousel({ initialData: initialSlides });

  const slides =
    data
      ?.filter((s) => s.active)
      ?.sort((a, b) => a.order - b.order)
      ?.slice(0, 5) || [];

  const currentSlideData = slides[currentSlide];
  const autoplayDelay = currentSlideData?.settings?.autoplayDelayMs ?? 4000;
  const heightClass = getSlideHeightClass(currentSlideData?.settings?.height);

  const goToSlide = useCallback((index: number) => {
    const el = slidesRef.current;
    if (!el) return;
    setCurrentSlide(index);
    isScrollingRef.current = true;
    el.scrollTo({ left: index * el.offsetWidth, behavior: "smooth" });
    setTimeout(() => { isScrollingRef.current = false; }, 600);
  }, []);

  const goNext = useCallback(
    () => goToSlide((currentSlide + 1) % slides.length),
    [currentSlide, slides.length, goToSlide],
  );

  const goPrev = useCallback(
    () => goToSlide((currentSlide - 1 + slides.length) % slides.length),
    [currentSlide, slides.length, goToSlide],
  );

  const handleSlidesScroll = useCallback(() => {
    if (isScrollingRef.current) return;
    const el = slidesRef.current;
    if (!el || el.offsetWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    if (idx >= 0 && idx < slides.length) setCurrentSlide(idx);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || isPaused || prefersReducedMotion) return;
    const interval = setInterval(goNext, autoplayDelay);
    return () => clearInterval(interval);
  }, [slides.length, isPaused, prefersReducedMotion, goNext, autoplayDelay]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") goNext();
    if (e.key === "ArrowLeft") goPrev();
    if (e.key === " ") { e.preventDefault(); setIsPaused((p) => !p); }
  };

  if (isLoading) {
    return (
      <Div className={`relative w-full ${heightClass} ${HERO_PLACEHOLDER_BG} animate-pulse`}>
        <Div className={`${POSITION_FILL} ${FLEX_CENTER}`}>
          <Text variant="secondary">Loading...</Text>
        </Div>
      </Div>
    );
  }

  if (!slides || slides.length === 0) {
    return (
      // audit-variant-ok: empty-state hero — min-h responsive + gradient bg + FLEX_CENTER + flex-col
      <Div gap="4" className={`relative w-full min-h-[260px] md:min-h-[60vh] bg-[image:var(--appkit-gradient-section-cool)] ${FLEX_CENTER} flex-col`}>
        <Heading level={2} className="text-primary" size="2xl" weight="bold">Coming Soon</Heading>
        {/* audit-variant-ok: empty-state description — px-4 inline horizontal nudge */}
        <Text variant="secondary" className="max-w-md px-4" align="center">
          Amazing deals are on their way. Stay tuned!
        </Text>
      </Div>
    );
  }

  return (
    <Section
      ref={sectionRef}
      className={`relative w-full ${heightClass} overflow-hidden`}
      aria-roledescription="carousel"
      aria-label="Hero carousel"
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      tabIndex={0}
    >
      <Div aria-live="polite" aria-atomic="true" className="sr-only">
        {`Slide ${currentSlide + 1} of ${slides.length}`}
      </Div>

      {/* Snap Scroll Rail */}
      <Div className={POSITION_FILL}>
        <Div layout="flex" 
          ref={slidesRef}
          onScroll={handleSlidesScroll}
          className="h-full overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ gap: 0 }}
        >
          {slides.map((slide, slideIndex) => {
            const slideHeightClass = getSlideHeightClass(slide.settings?.height);
            const hasCards = slide.cards && slide.cards.length > 0;
            return (
              // audit-variant-ok: slide container — bg-zinc-900 brand placeholder + snap/flex layout
              <Div
                key={slide.id}
                className={`snap-start flex-none w-full relative self-stretch bg-zinc-900 ${slideHeightClass}`}
              >
                {/* Background */}
                <Div className={POSITION_FILL}>
                  <SlideBackground
                    bg={slide.background}
                    legacy={slide.media}
                    mobileLegacy={slide.mobileMedia}
                    isMobile={isMobile}
                    priority={slideIndex === 0}
                  />
                </Div>

                {/* Overlay text (no cards, or overlay present) */}
                {slide.overlay && (
                  // audit-variant-ok: overlay container — POSITION_FILL + FLEX_CENTER + responsive px-lg/16/32 ladder
                  <Div className={`${POSITION_FILL} ${FLEX_CENTER} flex-col text-center md:px-16 lg:px-32`} padding="x-lg">
                    {slide.overlay.subtitle && (
                      <Text color="inverse" shadow="sm" className="stagger-1 !/80 mb-1 md:mb-2 tracking-widest" mdSize="sm" size="xs" transform="uppercase">
                        {slide.overlay.subtitle}
                      </Text>
                    )}
                    {slide.overlay.title && (
                      // audit-variant-ok: hero title — responsive md:text-6xl lg:text-8xl + drop-shadow-2xl over Heading size="4xl" base
                      <Heading color="inverse"
                        level={1}
                        className="stagger-2 font-display md:text-6xl lg:text-8xl ! drop-shadow-2xl mb-2 md:mb-4" size="4xl"
                      >
                        {slide.overlay.title}
                      </Heading>
                    )}
                    {slide.overlay.description && (
                      <Text color="inverse" shadow="sm" className="stagger-3 !/90 mb-4 md:mb-8 max-w-2xl mx-auto" mdSize="lg" lgSize="xl" size="sm">
                        {slide.overlay.description}
                      </Text>
                    )}
                    {slide.overlay.button && (
                      <Div className="stagger-4">
                        <Button
                          variant={slide.overlay.button.variant}
                          size="sm"
                          onClick={makeButtonClickHandler(
                            slide.overlay.button.link,
                            slide.overlay.button.openInNewTab,
                            push,
                          )}
                        >
                          {slide.overlay.button.text}
                        </Button>
                      </Div>
                    )}
                  </Div>
                )}

                {/* Cards grid */}
                {hasCards && (
                  // audit-variant-ok: cards grid — POSITION_FILL + base padding=md + responsive gap-2 md:gap-4 + md:p-8
                  <Div
                    className={`${POSITION_FILL} grid gap-2 md:gap-4 md:p-8`} padding="md"
                    style={{
                      gridTemplateRows: "repeat(2, 1fr)",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                      alignContent: "center",
                      alignItems: "stretch",
                    }}
                  >
                    {slide.cards.slice(0, 6).map((card) => (
                      <CarouselCardRenderer
                        key={card.id}
                        card={card}
                        isMobile={isMobile}
                        push={push}
                      />
                    ))}
                  </Div>
                )}
              </Div>
            );
          })}
        </Div>
      </Div>

      {/* Navigation Dots */}
      {slides.length > 1 && (
        <Row gap="sm" className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          {slides.map((_, index) => (
            <Button
              key={index}
              variant="ghost"
              className={`relative overflow-hidden rounded-full transition-all duration-500 p-0 !min-h-0 ${
 index === currentSlide
 ? HERO_CAROUSEL_DOT_ACTIVE
 : `${HERO_CAROUSEL_DOT_INACTIVE} hover:bg-white/75`
 }`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            >
              {index === currentSlide && (
                // audit-variant-ok: progress-fill bar — absolute positioned bg-black/20 progress animation
                <Span
                  className="absolute inset-y-0 left-0 bg-black/20 animate-[progress-fill_4s_linear_forwards]" rounded="full"
                  aria-hidden="true"
                />
              )}
            </Button>
          ))}
        </Row>
      )}

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <Row gap="sm" className="absolute bottom-4 right-4 z-20">
          {/* audit-variant-ok: previous-slide arrow — HERO_CAROUSEL_ARROW shared style + p-0 to clear button padding */}
          <Button
            variant="ghost"
            className={`p-0 ${HERO_CAROUSEL_ARROW}`}
            onClick={goPrev}
            aria-label="Previous slide"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          {/* audit-variant-ok: next-slide arrow — HERO_CAROUSEL_ARROW shared style + p-0 to clear button padding */}
          <Button
            variant="ghost"
            className={`p-0 ${HERO_CAROUSEL_ARROW}`}
            onClick={goNext}
            aria-label="Next slide"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </Row>
      )}
    </Section>
  );
}
