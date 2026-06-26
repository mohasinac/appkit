"use client"
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, Div, Heading, Row, Span, Stack } from "../../../ui";
import type { Banner } from "../types";

const FONT_BANGERS = "var(--font-bangers, Bangers, cursive)";

export interface HeroBannerProps {
  banners: Banner[];
  /** Milliseconds between automatic slide advances. Default: 5000. */
  autoplayMs?: number;
}

export function HeroBanner({ banners, autoplayMs = 5000 }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (idx: number) => {
      if (animating) return;
      setAnimating(true);
      setCurrent(idx);
      setTimeout(() => setAnimating(false), 600);
    },
    [animating],
  );

  const next = useCallback(() => {
    goTo((current + 1) % banners.length);
  }, [current, banners.length, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + banners.length) % banners.length);
  }, [current, banners.length, goTo]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(next, autoplayMs);
    return () => clearInterval(id);
  }, [next, banners.length, autoplayMs]);

  // Apply dynamic user-configured colors via CSS custom properties (avoids inline style={{ }})
  const banner = banners[current]!;
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--hero-bg", banner.backgroundColor ?? "var(--dark-section-deep)");
    el.style.setProperty("--hero-text", banner.textColor ?? "white");
  }, [banner.backgroundColor, banner.textColor]);

  if (banners.length === 0) return null;

  return (
    <Div
      ref={rootRef}
      className="relative overflow-hidden min-h-svh [background:var(--hero-bg,var(--dark-section-deep))]"
    >
      {/* Background images — cross-fade between slides */}
      {banners.map((b, i) => (
        <Div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-700 z-[1] ${i === current ? "opacity-100" : "opacity-0"}`}
        >
          {b.backgroundImage && (
            <Image
              src={b.backgroundImage}
              alt={b.title}
              fill
              className="object-cover object-center"
              priority={i === 0}
              sizes="100vw"
            />
          )}
        </Div>
      ))}

      {/* Cinematic gradient overlays */}
      <Div
        className="absolute inset-0 z-[2] [background:linear-gradient(110deg,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.45)_55%,rgba(0,0,0,0.18)_100%)]"
      />
      <Div
        className="absolute inset-0 z-[3] [background:linear-gradient(to_bottom,rgba(0,0,0,0.08)_0%,transparent_30%,rgba(0,0,0,0.55)_100%)]"
      />

      {/* Content */}
      <Stack justify="end"
        className="relative pb-[4rem] sm:px-[3rem] sm:pb-[6rem] lg:px-[5rem] min-h-svh z-[10] pt-[var(--header-height,4rem)]" padding="x-md"
      >
        {banner.subtitle && (
          <Div className="mb-3">
            <Span
              className="inline-block font-black uppercase tracking-[0.18em] bg-[var(--color-red)] text-white [font-family:var(--font-bangers,Bangers,cursive)] tracking-[0.16em]" padding="pill-md" size="xs"
            >
              {banner.subtitle}
            </Span>
          </Div>
        )}

        <Heading
          level={2}
          textShadow="soft-dark"
          className="mb-5 max-w-xl leading-none [font-family:var(--font-bangers,Bangers,cursive)] text-[clamp(3rem,9vw,6.5rem)] tracking-[0.04em] text-[var(--hero-text,white)]"
        >
          {banner.title}
        </Heading>

        {banner.ctaLabel && banner.ctaUrl && (
          <Row wrap gap="md">
            <Link
              href={banner.ctaUrl}
              className="inline-flex items-center gap-2 sm:gap-3 px-5 py-3 sm:px-8 sm:py-3.5 font-black uppercase transition-all hover:-translate-y-0.5 [font-family:var(--font-bangers,Bangers,cursive)] tracking-[0.1em] text-[clamp(0.85rem,2.5vw,1.1rem)] bg-[var(--color-yellow)] text-[var(--appkit-color-text)] [box-shadow:0_4px_24px_rgba(255,229,0,0.35)]"
            >
              {banner.ctaLabel}
              <Span
                aria-hidden="true"
                className="leading-none" smSize="xl" size="lg"
              >
                →
              </Span>
            </Link>
          </Row>
        )}
      </Stack>

      {/* Prev / Next arrows */}
      {banners.length > 1 && (
        <>
          <Button rounded="full"
            onClick={prev}
            aria-label="Previous slide"
            variant="ghost"
            size="sm"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 justify-[center] transition-all hover:scale-105 z-[15] w-10 h-10 bg-[rgba(255,255,255,0.12)] border border-white/20 text-white backdrop-blur-sm"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
          <Button rounded="full"
            onClick={next}
            aria-label="Next slide"
            variant="ghost"
            size="sm"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 justify-[center] transition-all hover:scale-105 z-[15] w-10 h-10 bg-[rgba(255,255,255,0.12)] border border-white/20 text-white backdrop-blur-sm"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>
        </>
      )}

      {/* Dot indicator + counter */}
      {banners.length > 1 && (
        <Row
          className="absolute bottom-8 right-6 sm:right-12 z-[15]" gap="3"
        >
          <Span
            className="font-black tabular-nums text-white/60 [font-family:var(--font-bangers,Bangers,cursive)] tracking-[0.1em]" size="xs"
          >
            {String(current + 1).padStart(2, "0")} /{" "}
            {String(banners.length).padStart(2, "0")}
          </Span>
          <Row gap="xs" className="">
            {banners.map((_, i) => (
              <Button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                variant="ghost"
                size="sm"
                className={`transition-all h-[3px] rounded-[2px] ${i === current ? "w-7 bg-[var(--color-yellow)]" : "w-2.5 bg-white/35"}`}
              />
            ))}
          </Row>
        </Row>
      )}

      {/* Scroll-down hint */}
      <Stack
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[15] opacity-50" align="center" gap="xs"
        aria-hidden="true"
      >
        <Div
          className="h-8 w-px [background:linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0.8))]"
        />
      </Stack>
    </Div>
  );
}
