"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ICON_SIZE } from "../icons/icon-registry";

/**
 * CarouselNav — the one carousel position/navigation control.
 *
 * Presentational ONLY: it owns no scroll state and no timers. A hero passes its
 * slide index; a rail passes `Math.round(scrollLeft / clientWidth)`. See
 * CarouselNav.style.css for why three separate implementations was the defect
 * this replaces.
 *
 * ## 🛑 Not `<Progress>`
 *
 * `Progress` is `role="progressbar"` with `aria-valuenow` — a claim that
 * something is LOADING. An autoplay timer is decorative chrome; announcing it
 * as progress tells a screen-reader user the page is busy when it is not. The
 * fill here is `aria-hidden` and the segments carry the real semantics.
 *
 * @tag domain:ui
 * @tag layer:component
 * @tag pattern:presentational
 * @tag access:client
 * @tag sideEffects:none
 */

/** Over imagery, or on a themed page surface. See the CSS for the tone maps. */
export type CarouselNavTone = "on-media" | "on-surface";

/**
 * Above this many positions the segment rail becomes unhittable slivers and
 * overflows a phone, so the component switches to a meter plus a counter.
 */
export const CAROUSEL_RAIL_MAX = 8;

export interface CarouselNavProps {
  /** Total positions. Below 2 the component renders nothing. */
  count: number;
  /** Current zero-based position. */
  index: number;
  /** Jump to a position. Omit to render the rail as a non-interactive readout. */
  onSelect?: (index: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  tone?: CarouselNavTone;
  /**
   * Autoplay delay in ms, used ONLY to time the fill inside the active segment.
   * Omit or pass 0 when there is no autoplay — the active segment then renders
   * solid instead of animating. This must be the SAME value that drives the
   * caller's timer; a literal here is the 4s-vs-6000ms desync this replaces.
   */
  progressMs?: number;
  /** Freezes the fill. Pass the same flag that suspends the caller's timer. */
  paused?: boolean;
  /** Disables `prev` at the first position / `next` at the last. Ignored when `loop`. */
  atStart?: boolean;
  atEnd?: boolean;
  loop?: boolean;
  /** Names the control group. Required — "carousel" alone is not a name. */
  ariaLabel: string;
  className?: string;
}

export function CarouselNav({
  count,
  index,
  onSelect,
  onPrev,
  onNext,
  tone = "on-surface",
  progressMs = 0,
  paused = false,
  atStart = false,
  atEnd = false,
  loop = false,
  ariaLabel,
  className = "",
}: CarouselNavProps) {
  if (count < 2) return null;

  const current = Math.min(Math.max(index, 0), count - 1);
  const hasAutoplay = progressMs > 0;
  const useRail = count <= CAROUSEL_RAIL_MAX;

  const prevDisabled = !loop && atStart;
  const nextDisabled = !loop && atEnd;

  return (
    <div
      className={`appkit-carousel-nav ${className}`}
      data-tone={tone}
      data-paused={paused ? "true" : "false"}
      data-autoplay={hasAutoplay ? "true" : "false"}
      style={{ "--appkit-carousel-progress-duration": `${progressMs}ms` } as React.CSSProperties}
      role="group"
      aria-label={ariaLabel}
    >
      {onPrev && (
        <button
          type="button"
          className="appkit-carousel-nav__arrow"
          onClick={onPrev}
          disabled={prevDisabled}
          aria-label="Previous"
        >
          <ChevronLeft className={ICON_SIZE.lg} aria-hidden="true" />
        </button>
      )}

      {useRail ? (
        <div className="appkit-carousel-nav__rail">
          {Array.from({ length: count }, (_, i) => {
            const isCurrent = i === current;
            return (
              <button
                key={i}
                type="button"
                className="appkit-carousel-nav__seg"
                aria-current={isCurrent ? "true" : undefined}
                aria-label={`Go to ${i + 1} of ${count}`}
                onClick={onSelect ? () => onSelect(i) : undefined}
                disabled={!onSelect}
              >
                <span className="appkit-carousel-nav__bar">
                  {/*
                   * Keyed on the position AND the index so React remounts it on
                   * every advance. Without that the element persists across
                   * slide changes whenever an index is reused, and a CSS
                   * animation on a persistent node does not replay — which is
                   * why the old hero bar filled exactly once, ever.
                   */}
                  {isCurrent && hasAutoplay && (
                    <span
                      key={`fill-${current}`}
                      className="appkit-carousel-nav__fill"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="appkit-carousel-nav__meter" aria-hidden="true">
            <span
              className="appkit-carousel-nav__meter-thumb"
              style={{
                left: `${(current / count) * 100}%`,
                width: `${(1 / count) * 100}%`,
              }}
            />
          </div>
          <span className="appkit-carousel-nav__count">
            {current + 1} / {count}
          </span>
        </>
      )}

      {onNext && (
        <button
          type="button"
          className="appkit-carousel-nav__arrow"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label="Next"
        >
          <ChevronRight className={ICON_SIZE.lg} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
