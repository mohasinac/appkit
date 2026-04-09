"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, Div, Heading, Span } from "@mohasinac/ui";
import type { Banner } from "../types";

export interface HeroBannerProps {
  banners: Banner[];
  /** Milliseconds between automatic slide advances. Default: 5000. */
  autoplayMs?: number;
}

export function HeroBanner({ banners, autoplayMs = 5000 }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

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

  if (banners.length === 0) return null;

  const banner = banners[current]!;

  return (
    <Div
      className="relative overflow-hidden"
      style={{
        minHeight: "100svh",
        background: banner.backgroundColor ?? "var(--dark-section-deep)",
      }}
    >
      {/* Background images — cross-fade between slides */}
      {banners.map((b, i) => (
        <Div
          key={b.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0, zIndex: 1 }}
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
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(110deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.18) 100%)",
          zIndex: 2,
        }}
      />
      <Div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 30%, rgba(0,0,0,0.55) 100%)",
          zIndex: 3,
        }}
      />

      {/* Content */}
      <Div
        className="relative flex flex-col justify-end px-5 pb-16 sm:px-12 sm:pb-24 lg:px-20"
        style={{
          minHeight: "100svh",
          zIndex: 10,
          paddingTop: "var(--header-height, 4rem)",
        }}
      >
        {banner.subtitle && (
          <Div className="mb-3">
            <Span
              className="inline-block px-3 py-1 text-xs font-black uppercase tracking-[0.18em]"
              style={{
                background: "var(--color-red)",
                color: "#FFFFFF",
                fontFamily: "var(--font-bangers, Bangers, cursive)",
                letterSpacing: "0.16em",
              }}
            >
              {banner.subtitle}
            </Span>
          </Div>
        )}

        <Heading
          level={2}
          className="mb-5 max-w-xl leading-none"
          style={{
            fontFamily: "var(--font-bangers, Bangers, cursive)",
            fontSize: "clamp(3rem, 9vw, 6.5rem)",
            letterSpacing: "0.04em",
            color: banner.textColor ?? "#FFFFFF",
            textShadow: "0 4px 32px rgba(0,0,0,0.5)",
          }}
        >
          {banner.title}
        </Heading>

        {banner.ctaLabel && banner.ctaUrl && (
          <Div className="flex flex-wrap items-center gap-4">
            <Link
              href={banner.ctaUrl}
              className="inline-flex items-center gap-2 sm:gap-3 px-5 py-3 sm:px-8 sm:py-3.5 font-black uppercase transition-all hover:-translate-y-0.5"
              style={{
                fontFamily: "var(--font-bangers, Bangers, cursive)",
                letterSpacing: "0.1em",
                fontSize: "clamp(0.85rem, 2.5vw, 1.1rem)",
                background: "var(--color-yellow)",
                color: "#1A1A1A",
                boxShadow: "0 4px 24px rgba(255,229,0,0.35)",
              }}
            >
              {banner.ctaLabel}
              <Span
                aria-hidden="true"
                className="text-lg sm:text-xl leading-none"
              >
                →
              </Span>
            </Link>
          </Div>
        )}
      </Div>

      {/* Prev / Next arrows */}
      {banners.length > 1 && (
        <>
          <Button
            onClick={prev}
            aria-label="Previous slide"
            variant="ghost"
            size="sm"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all hover:scale-105"
            style={{
              zIndex: 15,
              width: 40,
              height: 40,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#ffffff",
              backdropFilter: "blur(6px)",
            }}
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
          <Button
            onClick={next}
            aria-label="Next slide"
            variant="ghost"
            size="sm"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all hover:scale-105"
            style={{
              zIndex: 15,
              width: 40,
              height: 40,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#ffffff",
              backdropFilter: "blur(6px)",
            }}
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
        <Div
          className="absolute bottom-8 right-6 sm:right-12 flex items-center gap-3"
          style={{ zIndex: 15 }}
        >
          <Span
            className="text-xs font-black tabular-nums"
            style={{
              color: "rgba(255,255,255,0.6)",
              fontFamily: "var(--font-bangers, Bangers, cursive)",
              letterSpacing: "0.1em",
            }}
          >
            {String(current + 1).padStart(2, "0")} /{" "}
            {String(banners.length).padStart(2, "0")}
          </Span>
          <Div className="flex gap-1.5">
            {banners.map((_, i) => (
              <Button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                variant="ghost"
                size="sm"
                className="transition-all"
                style={{
                  height: 3,
                  width: i === current ? 28 : 10,
                  borderRadius: 2,
                  background:
                    i === current
                      ? "var(--color-yellow)"
                      : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </Div>
        </Div>
      )}

      {/* Scroll-down hint */}
      <Div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        style={{ zIndex: 15, opacity: 0.5 }}
        aria-hidden="true"
      >
        <Div
          className="h-8 w-px"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.8))",
          }}
        />
      </Div>
    </Div>
  );
}
