"use client"
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMediaQuery } from "../../../react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Button, Div, Heading, Row, Section, Span, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { MediaVideo } from "../../media/MediaVideo";
import { useHeroCarousel } from "../hooks/useHeroCarousel";
import type {
  CarouselBackground,
  CarouselSlide,
  CarouselSlideCard,
  CarouselHoverEffect,
} from "../types/index";

const { flex, position } = THEME_CONSTANTS;

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
    return <Div className={`${position.fill} bg-zinc-900`} />;
  }

  if (effectiveBg.type === "color") {
    const bg_color = effectiveBg.color ?? "var(--appkit-color-primary)";
    return <Div className={position.fill} style={{ backgroundColor: bg_color }} />;
  }

  if (effectiveBg.type === "gradient") {
    const from = effectiveBg.gradientFrom ?? "var(--appkit-color-primary)";
    const to = effectiveBg.gradientTo ?? "var(--appkit-color-secondary)";
    const angle = effectiveBg.gradientAngle ?? 135;
    return (
      <Div
        className={position.fill}
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
            className={position.fill}
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
          className={position.fill}
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
        className={position.fill}
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
        className={position.fill}
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
      className={`relative rounded-lg overflow-hidden shadow-lg transition-all duration-300 ${hoverClass}`}
      style={{
        gridRow: String(gridPos.gridRow),
        gridColumn: String(gridPos.gridColumn),
        minHeight: isMobile ? 100 : 140,
      }}
    >
      <CardBackground bg={card.background} />
      {!card.isButtonOnly && (
        <Div
          className={`${position.fill} flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 md:p-6 ${textAlignClass}`}
        >
          {card.content?.eyebrow && (
            <Text className="text-[10px] md:text-xs !text-white/70 mb-0.5 uppercase tracking-wider drop-shadow-sm">
              {card.content.eyebrow}
            </Text>
          )}
          {card.content?.subtitle && (
            <Text className="hidden md:block text-xs md:text-sm !text-white/90 mb-0.5 md:mb-2 drop-shadow-sm">
              {card.content.subtitle}
            </Text>
          )}
          {card.content?.title && (
            <Heading
              level={2}
              className={`text-[11px] md:text-2xl lg:text-3xl font-bold mb-0.5 md:mb-3 drop-shadow-md ${THEME_CONSTANTS.utilities.textClamp2}`}
              style={{ color: card.content.textColor ?? "#ffffff" }}
            >
              {card.content.title}
            </Heading>
          )}
          {card.content?.description && (
            <Text
              className={`text-[10px] md:text-sm !text-white/80 mb-1 md:mb-4 ${THEME_CONSTANTS.utilities.textClamp1} drop-shadow-sm`}
            >
              {card.content.description}
            </Text>
          )}
          {(card.buttons?.length ?? 0) > 0 && (
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
        </Div>
      )}
      {card.isButtonOnly && card.buttons?.[0] && (
        <Button
          variant="ghost"
          className={`${position.fill} ${flex.center} font-semibold text-white hover:bg-black/20 transition-colors rounded-none p-0`}
          onClick={makeButtonClickHandler(card.buttons[0].href, card.buttons[0].openInNewTab, push)}
        >
          <Span size="lg" className="md:text-2xl">{card.buttons[0].text}</Span>
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
      <Div className={`relative w-full ${heightClass} ${THEME_CONSTANTS.themed.bgTertiary} animate-pulse`}>
        <Div className={`${position.fill} ${flex.center}`}>
          <Text variant="secondary">Loading...</Text>
        </Div>
      </Div>
    );
  }

  if (!slides || slides.length === 0) {
    return (
      <Div className={`relative w-full min-h-[260px] md:min-h-[60vh] bg-gradient-to-br from-primary/10 to-secondary/10 ${flex.center} flex-col gap-4`}>
        <Heading level={2} className="text-2xl font-bold text-primary">Coming Soon</Heading>
        <Text variant="secondary" className="text-center max-w-md px-4">
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
      <Div className={position.fill}>
        <Div
          ref={slidesRef}
          onScroll={handleSlidesScroll}
          className="flex h-full overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ gap: 0 }}
        >
          {slides.map((slide, slideIndex) => {
            const slideHeightClass = getSlideHeightClass(slide.settings?.height);
            const hasCards = slide.cards && slide.cards.length > 0;
            return (
              <Div
                key={slide.id}
                className={`snap-start flex-none w-full relative self-stretch bg-zinc-900 ${slideHeightClass}`}
              >
                {/* Background */}
                <Div className={position.fill}>
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
                  <Div className={`${position.fill} ${flex.center} flex-col text-center px-6 md:px-16 lg:px-32`}>
                    {slide.overlay.subtitle && (
                      <Text className="stagger-1 text-xs md:text-sm !text-white/80 mb-1 md:mb-2 drop-shadow-sm uppercase tracking-widest">
                        {slide.overlay.subtitle}
                      </Text>
                    )}
                    {slide.overlay.title && (
                      <Heading
                        level={1}
                        className="stagger-2 font-display text-4xl md:text-6xl lg:text-8xl !text-white drop-shadow-2xl mb-2 md:mb-4"
                      >
                        {slide.overlay.title}
                      </Heading>
                    )}
                    {slide.overlay.description && (
                      <Text className="stagger-3 text-sm md:text-lg lg:text-xl !text-white/90 mb-4 md:mb-8 drop-shadow-sm max-w-2xl mx-auto">
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
                  <Div
                    className={`${position.fill} grid gap-2 md:gap-4 p-4 md:p-8`}
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
        <Div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, index) => (
            <Button
              key={index}
              variant="ghost"
              className={`relative overflow-hidden rounded-full transition-all duration-500 p-0 !min-h-0 ${
                index === currentSlide
                  ? THEME_CONSTANTS.carousel.dotActive
                  : `${THEME_CONSTANTS.carousel.dotInactive} hover:bg-white/75`
              }`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            >
              {index === currentSlide && (
                <Span
                  className="absolute inset-y-0 left-0 bg-black/20 rounded-full animate-[progress-fill_4s_linear_forwards]"
                  aria-hidden="true"
                />
              )}
            </Button>
          ))}
        </Div>
      )}

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <Div className="absolute bottom-4 right-4 z-20 flex gap-2">
          <Button
            variant="ghost"
            className={`p-0 ${THEME_CONSTANTS.carousel.arrow}`}
            onClick={goPrev}
            aria-label="Previous slide"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            className={`p-0 ${THEME_CONSTANTS.carousel.arrow}`}
            onClick={goNext}
            aria-label="Next slide"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </Div>
      )}
    </Section>
  );
}
