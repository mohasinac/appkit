"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useMediaQuery } from "@mohasinac/react";
import { THEME_CONSTANTS } from "@mohasinac/tokens";
import { Button, Heading, Section, Span, Text } from "@mohasinac/ui";
import { MediaImage, MediaVideo } from "@mohasinac/feat-media";
import { useHeroCarousel } from "../hooks/useHeroCarousel.js";
import type { CarouselSlide, CarouselSlideCard } from "../types/index.js";

const { flex, position, homepage } = THEME_CONSTANTS;

export interface HeroCarouselProps {
  initialSlides?: CarouselSlide[];
  /**
   * Navigate to an internal path.
   * Pass `useRouter().push` from your locale-aware router (e.g. `@/i18n/navigation`).
   * Falls back to `window.location.href` assignment when omitted.
   */
  push?: (href: string) => void;
}

function navigate(href: string, push?: (href: string) => void) {
  if (push) {
    push(href);
  } else {
    window.location.href = href;
  }
}

export function HeroCarousel({ initialSlides, push }: HeroCarouselProps = {}) {
  const tLoading = useTranslations("loading");
  const tA11y = useTranslations("accessibility");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const slidesRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );

  const { data, isLoading } = useHeroCarousel({ initialData: initialSlides });

  const slides =
    data
      ?.filter((s) => s.active)
      ?.sort((a, b) => a.order - b.order)
      ?.slice(0, 5) || [];

  const goToSlide = useCallback((index: number) => {
    const el = slidesRef.current;
    if (!el) return;
    setCurrentSlide(index);
    isScrollingRef.current = true;
    el.scrollTo({ left: index * el.offsetWidth, behavior: "smooth" });
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 600);
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
    const interval = setInterval(goNext, 4000);
    return () => clearInterval(interval);
  }, [slides.length, isPaused, prefersReducedMotion, goNext]);

  if (isLoading) {
    return (
      <div
        className={`relative w-full ${homepage.heroMinH} ${THEME_CONSTANTS.themed.bgTertiary} animate-pulse`}
      >
        <div className={`${position.fill} ${flex.center}`}>
          <Text variant="secondary">{tLoading("default")}</Text>
        </div>
      </div>
    );
  }

  if (!slides || slides.length === 0) {
    return null;
  }

  const getBackgroundStyle = (card: CarouselSlideCard) => {
    const { type, value } = card.background;
    if (type === "transparent") return { background: "transparent" };
    if (type === "color") return { backgroundColor: value };
    if (type === "gradient") return { background: value };
    return {};
  };

  const getGridPosition = (card: CarouselSlideCard) => ({
    gridRow: String(card.gridRow),
    gridColumn: isMobile ? "1" : String(card.gridCol),
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") goNext();
    if (e.key === "ArrowLeft") goPrev();
    if (e.key === " ") {
      e.preventDefault();
      setIsPaused((p) => !p);
    }
  };

  return (
    <Section
      ref={sectionRef}
      className={`relative w-full ${homepage.heroMinH} overflow-hidden`}
      aria-roledescription="carousel"
      aria-label={tA11y("heroCarouselAriaLabel")}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      tabIndex={0}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {tA11y("heroCarouselSlideOf", {
          current: currentSlide + 1,
          total: slides.length,
        })}
      </div>

      {/* Snap Scroll Rail */}
      <div className={position.fill}>
        <div
          ref={slidesRef}
          onScroll={handleSlidesScroll}
          className="flex h-full overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ gap: 0 }}
        >
          {slides.map((slide, slideIndex) => (
            <div
              key={slide.id}
              className="snap-start flex-none w-full relative self-stretch bg-zinc-900"
            >
              {/* Background Media */}
              <div className={position.fill}>
                {slide.media.type === "image" ? (
                  <MediaImage
                    src={
                      isMobile && slide.mobileMedia
                        ? slide.mobileMedia.url
                        : slide.media.url
                    }
                    alt={slide.media.alt}
                    size="hero"
                    priority={slideIndex === 0}
                  />
                ) : (
                  <MediaVideo
                    src={
                      isMobile && slide.mobileMedia
                        ? slide.mobileMedia.url
                        : slide.media.url
                    }
                    thumbnailUrl={slide.media.thumbnail}
                    alt={slide.media.alt}
                    autoPlayMuted
                    loop
                    controls={false}
                  />
                )}
                <div className={`${position.fill} bg-black/10`} />
              </div>

              {/* Overlay mode — centred text + optional button */}
              {slide.overlay ? (
                <div
                  className={`${position.fill} ${flex.center} flex-col text-center px-6 md:px-16 lg:px-32`}
                >
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
                    <div className="stagger-4">
                      <Button
                        variant={slide.overlay.button.variant}
                        size="sm"
                        onClick={() => {
                          const btn = slide.overlay!.button!;
                          if (btn.openInNewTab) {
                            window.open(
                              btn.link,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          } else {
                            navigate(btn.link, push);
                          }
                        }}
                      >
                        {slide.overlay.button.text}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* Grid Overlay with Cards */
                <div
                  className={`${position.fill} grid gap-2 md:gap-4 p-4 md:p-8`}
                  style={{
                    gridTemplateRows: "repeat(2, 1fr)",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                    justifyItems: isMobile ? "center" : undefined,
                    alignItems: isMobile ? "center" : undefined,
                  }}
                >
                  {slide.cards.map((card) => (
                    <div
                      key={card.id}
                      className="relative rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105"
                      style={{
                        ...getGridPosition(card),
                        ...getBackgroundStyle(card),
                        width: card.sizing?.widthPct
                          ? `${isMobile ? Math.min(card.sizing.widthPct, 65) : card.sizing.widthPct}%`
                          : isMobile
                            ? "65%"
                            : "100%",
                        height: card.sizing?.heightPct
                          ? `${isMobile ? Math.min(card.sizing.heightPct, 55) : card.sizing.heightPct}%`
                          : isMobile
                            ? "55%"
                            : "100%",
                        justifySelf: "center",
                        alignSelf: "center",
                      }}
                    >
                      {card.background.type === "image" &&
                        card.background.value && (
                          <MediaImage
                            src={card.background.value}
                            alt=""
                            size="card"
                          />
                        )}
                      {!card.isButtonOnly && (
                        <div
                          className={`${position.fill} flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent ${
                            card.sizing?.padding === "none"
                              ? "p-0"
                              : card.sizing?.padding === "sm"
                                ? "p-1.5 md:p-3"
                                : card.sizing?.padding === "lg"
                                  ? "p-3 md:p-8"
                                  : "p-2 md:p-6"
                          }`}
                        >
                          {card.content?.subtitle && (
                            <Text className="hidden md:block text-xs md:text-sm !text-white/90 mb-0.5 md:mb-2 drop-shadow-sm">
                              {card.content.subtitle}
                            </Text>
                          )}
                          {card.content?.title && (
                            <Heading
                              level={2}
                              className="text-[11px] md:text-2xl lg:text-3xl font-bold !text-white mb-0.5 md:mb-3 line-clamp-1 md:line-clamp-2 drop-shadow-md"
                            >
                              {card.content.title}
                            </Heading>
                          )}
                          {card.content?.description && (
                            <Text className="text-[10px] md:text-sm lg:text-base !text-white/80 mb-1 md:mb-4 line-clamp-1 drop-shadow-sm">
                              {card.content.description}
                            </Text>
                          )}
                          {(card.buttons?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap gap-1 md:gap-2">
                              {(card.buttons ?? []).map((btn) => (
                                <Button
                                  key={btn.id}
                                  variant={btn.variant}
                                  size="sm"
                                  onClick={() => {
                                    if (btn.openInNewTab) {
                                      window.open(
                                        btn.link,
                                        "_blank",
                                        "noopener,noreferrer",
                                      );
                                    } else {
                                      navigate(btn.link, push);
                                    }
                                  }}
                                >
                                  {btn.text}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {card.isButtonOnly && card.buttons?.[0] && (
                        <Button
                          variant="ghost"
                          className={`${position.fill} ${flex.center} font-semibold text-white hover:bg-black/20 transition-colors rounded-none p-0`}
                          onClick={() => {
                            const btn = card.buttons![0]!;
                            if (btn.openInNewTab) {
                              window.open(
                                btn.link,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            } else {
                              navigate(btn.link, push);
                            }
                          }}
                        >
                          <Span className="text-lg md:text-2xl">
                            {card.buttons![0]!.text}
                          </Span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
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
              aria-label={tA11y("heroCarouselGoToSlide", { number: index + 1 })}
            >
              {index === currentSlide && (
                <Span
                  className="absolute inset-y-0 left-0 bg-black/20 rounded-full animate-[progress-fill_4s_linear_forwards]"
                  aria-hidden="true"
                />
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Bottom gradient bleed */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-slate-950 to-transparent pointer-events-none z-[5]"
        aria-hidden="true"
      />

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-4 z-20 flex gap-2">
          <Button
            variant="ghost"
            className={`p-0 ${THEME_CONSTANTS.carousel.arrow}`}
            onClick={goPrev}
            aria-label={tA11y("heroCarouselPrevSlide")}
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
          <Button
            variant="ghost"
            className={`p-0 ${THEME_CONSTANTS.carousel.arrow}`}
            onClick={goNext}
            aria-label={tA11y("heroCarouselNextSlide")}
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>
        </div>
      )}
    </Section>
  );
}
