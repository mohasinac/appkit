"use client"
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMediaQuery } from "../../../react";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Row, Stack } from "../../../ui/components/Layout";
import { Scrim } from "../../../ui/components/Scrim";
import { Section } from "../../../ui/components/Semantic";
import { MediaImage } from "../../media/MediaImage";
import { MediaVideo } from "../../media/MediaVideo";
import { useHeroCarousel } from "../hooks/useHeroCarousel";
import { POSITION_FILL, FLEX_CENTER, HERO_PLACEHOLDER_BG } from "../constants/hero-carousel-styles";
/* The one carousel position/navigation control. The dot and arrow class
   strings this file used to import are deleted — see CarouselNav.style.css. */
import { CarouselNav } from "../../../ui/components/CarouselNav";
import type {
  CarouselBackground,
  CarouselSlide,
  CarouselSlideCard,
  CarouselSlideHeight,
  CarouselHoverEffect,
} from "../types/index";
import { OwnerQuickActions } from "../../admin/components/OwnerQuickActions";
import { ROUTES } from "../../../next/routing/route-map";


export interface HeroCarouselProps {
  initialSlides?: CarouselSlide[];
  /**
   * Navigate to an internal path.
   * Pass `useRouter().push` from your locale-aware router (e.g. `@/i18n/navigation`).
   * Falls back to `window.location.href` assignment when omitted.
   */
  push?: (href: string) => void;
  /**
   * Everything below comes from `CarouselSectionConfig`, which the section
   * renderer used to drop entirely — it rendered `<HeroCarousel initialSlides />`
   * and nothing else, so every one of these admin controls was inert.
   */
  /** Fallback slide height when a slide carries no `settings.height`. */
  height?: CarouselSlideHeight;
  /** Fallback autoplay delay when a slide carries no `settings.autoplayDelayMs`. */
  defaultAutoplayDelayMs?: number;
  /** Pause autoplay while the pointer is over the carousel. Defaults to `true`. */
  pauseOnHover?: boolean;
  /** Render the slide-position dots. Defaults to `true`. */
  showDots?: boolean;
  /** Render the prev/next arrows. Defaults to `true`. */
  showArrows?: boolean;
  /**
   * Accessible name for the carousel region. Deliberately NOT rendered as a
   * visible heading — the config field is a label for the admin list, and
   * printing it above the slides would add hero chrome nobody asked for.
   */
  title?: string;
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
  /*
   * 🛑 Both halves are gated on `isMobile`. `effectiveBg.mobileUrl` was read
   * UNCONDITIONALLY, so any slide carrying a mobile crop served that
   * phone-sized image to desktop too — a narrow picture stretched across a
   * 1920px hero, and the desktop asset never loaded at all. The legacy half
   * was already gated correctly, which is what made the asymmetry easy to miss.
   */
  const mobileUrl = isMobile
    ? (effectiveBg?.mobileUrl ?? mobileLegacy?.url)
    : undefined;
  const src = mobileUrl ?? effectiveBg?.url ?? "";

  if (!effectiveBg) {
    return <Div className={`${POSITION_FILL} bg-neutral-900`} />;
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
      {/*
        Slide 0 is the LCP candidate and fetches at high priority; slides 1..4
        are eagerly discoverable but off-screen, so they explicitly drop to
        "low". Without the hint all five full-bleed banners race each other at
        the browser's default priority and delay the only one the visitor can
        actually see.
      */}
      {/*
        🛑 `cover`, against MediaImage's `contain` default. This is a
        full-bleed backdrop with a dim overlay and fixed-inverse headline on
        top of it — letterboxing it would put that copy on bare surface with
        the dim layer darkening nothing, which is unreadable rather than
        merely different. Filling the box is the contract.
      */}
      <MediaImage
        src={src}
        alt=""
        size="hero"
        objectFit="cover"
        fill
        priority={priority}
        fetchPriority={priority ? "high" : "low"}
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
    // `cover` for the same reason as the slide backdrop above — this sits
    // behind the card's eyebrow/title/description, not beside them.
    return <MediaImage src={bg.url} alt="" size="card" objectFit="cover" fill />;
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
  /*
   * 🛑 On mobile the card takes NO explicit grid placement at all — the parent
   * is a one-column auto-flow grid, so source order is the layout.
   *
   * The old branch mapped `mobileZone` to a `gridColumn`, which against a
   * single declared column created an implicit column 2 and stacked every
   * card into one cell. `mobileZone` was also typed `2 | 5` only, so it could
   * not express a six-card slide even in principle. Zones are a desktop
   * concept; a phone has one column and nothing to place into.
   */
  const gridPos = isMobile ? null : resolveZoneToGrid(card.zone);

  const hoverClass = getHoverClass(card.hover?.effect);
  const textAlign = card.content?.textAlign ?? "left";
  // audit-content-alignment-ok: admin-configurable per-card textAlign field, defaults to "left" — not a hardcoded center
  const textAlignClass = textAlign === "center" ? "text-center" : textAlign === "right" ? "text-right" : "text-left";

  return (
    <Div
      className={`relative overflow-hidden transition-all duration-300 ${hoverClass}`} rounded="lg" shadow="lg"
      style={{
        ...(gridPos
          ? { gridRow: String(gridPos.gridRow), gridColumn: String(gridPos.gridColumn) }
          : {}),
        minHeight: isMobile ? 100 : 140,
      }}
    >
      <CardBackground bg={card.background} />
      {!card.isButtonOnly && (
        <>
          <Scrim direction="bottom-up" intensity="strong" className={POSITION_FILL} />
          <Stack justify="end"
            className={`${POSITION_FILL} md:p-[1.5rem] ${textAlignClass}`} padding="xs"
          >
          {card.content?.eyebrow && (
            <Text color="inverse" shadow="sm" className="text-[10px] opacity-70 mb-0.5 tracking-wider" mdSize="xs" transform="uppercase">
              {card.content.eyebrow}
            </Text>
          )}
          {card.content?.subtitle && (
            <Text color="inverse" shadow="sm" className="hidden md:block opacity-90 mb-0.5 md:mb-2" mdSize="sm" size="xs">
              {card.content.subtitle}
            </Text>
          )}
          {card.content?.title && (
            // level={3}: a card sits INSIDE a slide, so it is subordinate to
            // that slide's own h2 overlay title rather than a sibling of it.
            <Heading
              level={3}
              className={`text-[11px] mb-0.5 md:mb-3`} truncate={2} weight="bold" shadow="md" mdSize="2xl" lgSize="3xl"
              style={{ color: card.content.textColor ?? "white" }}
            >
              {card.content.title}
            </Heading>
          )}
          {card.content?.description && (
            <Text color="inverse" shadow="sm"
              className={`text-[10px] md:text-[0.875rem] opacity-80 mb-1 md:mb-4`} truncate
            >
              {card.content.description}
            </Text>
          )}
          {(card.buttons?.length ?? 0) > 0 && (
            <Row wrap gap="xs" className="md:gap-[var(--appkit-space-2)]">
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
        <Button
          variant="ghost"
          rounded="none"
          className={`${POSITION_FILL} ${FLEX_CENTER} font-[600] text-white hover:bg-[rgba(0,0,0,0.2)] transition-colors p-[0]`}
          onClick={makeButtonClickHandler(card.buttons[0].href, card.buttons[0].openInNewTab, push)}
        >
          <Span size="lg" mdSize="2xl">{card.buttons[0].text}</Span>
        </Button>
      )}
    </Div>
  );
}

export function HeroCarousel({
  initialSlides,
  push,
  height,
  defaultAutoplayDelayMs,
  pauseOnHover = true,
  showDots = true,
  showArrows = true,
  title,
}: HeroCarouselProps = {}) {
  /* `useHandMode()` was read only to pick which bottom corner the arrow pair
     sat in. The nav is centred and symmetrical now, so there is no corner to
     choose and no reason for this surface to know about handedness. */
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
  // Per-slide setting wins, then the section-level config, then the built-in.
  const autoplayDelay =
    currentSlideData?.settings?.autoplayDelayMs ?? defaultAutoplayDelayMs ?? 4000;
  const heightClass = getSlideHeightClass(currentSlideData?.settings?.height ?? height);

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
        <Div layout="flex" align="center" justify="center" className={`${POSITION_FILL} p-[var(--appkit-space-4)]`}>
          <Text variant="secondary">Loading...</Text>
        </Div>
      </Div>
    );
  }

  if (!slides || slides.length === 0) {
    return (
      <Div gap="4" layout="flex-col" align="start" justify="center" className="relative w-full min-h-[260px] md:min-h-[60vh] bg-[image:var(--appkit-gradient-section-cool)] px-[var(--appkit-space-6)]">
        <Heading level={2} className="text-primary" size="2xl" weight="bold" align="start">Coming Soon</Heading>
        <Text variant="secondary" className="max-w-md" align="start">
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
      aria-label={title?.trim() || "Hero carousel"}
      onKeyDown={handleKeyDown}
      // Hover-pause is configurable; focus-pause is NOT. WCAG 2.2.2 requires a
      // mechanism to pause moving content, and keyboard users have no hover.
      onMouseEnter={pauseOnHover ? () => setIsPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setIsPaused(false) : undefined}
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
              <Div
                key={slide.id}
                className={`snap-start flex-none w-full relative self-stretch bg-neutral-900 ${slideHeightClass}`}
              >
                {/*
                  Admin edit/delete for THIS slide, at `bottom-2 left-2` — the
                  one hero corner nothing else claims (top-left is the badge
                  stack, top-right the wishlist heart, bottom-right the type
                  pill).

                  🛑 Declared AFTER the background on purpose. The background is
                  `absolute inset-0`, so a later absolute sibling with a z-index
                  paints above it; placed before, the artwork would cover the
                  controls. `scrim` placement is what makes them readable on
                  photography.
                */}
                <Div className="absolute bottom-2 left-2 z-10">
                  <OwnerQuickActions
                    resource="CAROUSEL"
                    placement="card"
                    /* Sits on the slide photograph — without this it renders
                     * the light `surface-elevated` chip, a pale rounded box
                     * floating on the artwork. `onMedia` selects the dark
                     * translucent backdrop that variant exists for. */
                    onMedia
                    recordLabel={slide.title ?? `Slide ${slideIndex + 1}`}
                    editHref={String(ROUTES.ADMIN.CAROUSEL_EDIT(slide.id))}
                  />
                </Div>
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

                {/*
                  * Overlay text (no cards, or overlay present).
                  *
                  * 🛑 `enabled !== false`, not a bare truthiness test. The seed
                  * and `push-editorial-content.mjs` both write
                  * `overlay: { enabled: true, … }`, so an admin setting it
                  * false expected the overlay to disappear and it rendered
                  * anyway. Absent still means shown — most stored overlays
                  * predate the flag.
                  */}
                {slide.overlay && slide.overlay.enabled !== false && (
                  <Div layout="flex-col" align="start" justify="center" className={`${POSITION_FILL} text-left md:px-[4rem] lg:px-[8rem]`} padding="x-lg">
                    {slide.overlay.subtitle && (
                      <Text color="inverse" shadow="sm" className="stagger-1 opacity-80 mb-1 md:mb-2 tracking-widest" mdSize="sm" size="xs" transform="uppercase">
                        {slide.overlay.subtitle}
                      </Text>
                    )}
                    {slide.overlay.title && (
                      // level={2}, NOT 1. The welcome section above this
                      // carousel owns the page's single <h1>; a carousel that
                      // emits one <h1> per slide gives the document as many
                      // h1s as it has slides. `size` is independent of `level`,
                      // so this changes the outline and not one pixel.
                      <Heading color="inverse"
                        level={2}
                        /*
                         * 🛑 `max-w-[16ch]` is load-bearing, not taste. The box
                         * is `absolute inset-0`, so with no cap the title runs
                         * the full slide width minus padding and an 8xl
                         * headline wraps into a wall. A character-based cap
                         * tracks the font size instead of guessing at pixels.
                         *
                         * `text-balance` evens the lines so a two-line title
                         * does not leave one word stranded on line two.
                         *
                         * (A stray bare `!` token sat in this className and
                         * generated nothing — removed.)
                         */
                        className="stagger-2 font-display mb-2 md:mb-4 break-words text-balance max-w-[16ch] md:max-w-[18ch] lg:max-w-[20ch]" size="4xl" shadow="2xl" mdSize="6xl" lgSize="8xl"
                      >
                        {slide.overlay.title}
                      </Heading>
                    )}
                    {slide.overlay.description && (
                      <Text color="inverse" shadow="sm" className="stagger-3 opacity-90 mb-4 md:mb-8 max-w-2xl" mdSize="lg" lgSize="xl" size="sm">
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

                {/*
                  * Cards grid — the full 2x3 zone layout on desktop.
                  *
                  * 🛑 MOBILE IS DOCUMENT-ORDER FLOW, NOT ZONES. The previous
                  * shape declared ONE column (`1fr`) while every card still
                  * resolved an explicit `gridColumn` from its zone/mobileZone —
                  * and all three seeded hero cards use `mobileZone: 2`, i.e.
                  * column 2. A single explicit column plus an explicit
                  * placement in column 2 creates an IMPLICIT second column and
                  * puts every card in the same cell, stacked on top of each
                  * other. On a phone the hero rendered as one unreadable pile.
                  *
                  * Letting the grid auto-flow in source order is also what
                  * makes a six-card slide usable on a phone: six rows, read
                  * top to bottom. `gridTemplateRows` must go to `auto` with
                  * it — a fixed `repeat(2, 1fr)` would squeeze six cards into
                  * two rows' worth of height.
                  */}
                {hasCards && (
                  <Div
                    className={`${POSITION_FILL} grid gap-[var(--appkit-space-2)] md:gap-[var(--appkit-space-4)] md:p-[var(--appkit-space-8)] overflow-y-auto`} padding="md"
                    style={{
                      gridTemplateRows: isMobile ? "auto" : "repeat(2, 1fr)",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                      gridAutoFlow: "row",
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

      {/*
        One control for position, navigation AND autoplay progress.

        Replaces two separate absolutely-positioned blocks: pill dots at
        `bottom-4 left-1/2` and BOTH arrows clustered at `bottom-4 right-4`, on
        the same baseline, so with five slides they shared a visual row anyway.
        Three defects went with them:

         - the progress bar was `animate-[progress-fill_4s_...]`, a literal that
           could not track `autoplayDelay` (seeded at 6000ms, so it finished two
           seconds early, every slide);
         - it was rendered `{index === currentSlide && …}` and so stayed mounted
           whenever an index was reused — a CSS animation on a persistent node
           does not replay, so it filled once and then sat full;
         - `isPaused` stopped the interval but never the animation, so on hover
           the bar kept filling while the slide was held.

        `CarouselNav` is keyed on the slide index and reads the real delay, so
        none of the three is expressible.
      */}
      {(showDots || showArrows) && slides.length > 1 && (
        <Row justify="center" className="absolute bottom-4 inset-x-0 z-20 px-[var(--appkit-space-4)]">
          <CarouselNav
            count={slides.length}
            index={currentSlide}
            onSelect={showDots ? goToSlide : undefined}
            onPrev={showArrows ? goPrev : undefined}
            onNext={showArrows ? goNext : undefined}
            tone="on-media"
            progressMs={prefersReducedMotion ? 0 : autoplayDelay}
            paused={isPaused}
            loop
            ariaLabel="Featured promotions"
          />
        </Row>
      )}
    </Section>
  );
}
