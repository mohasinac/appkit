"use client";

/**
 * The wheel itself — segments, a pointer, and the settle.
 *
 * ## What this replaced
 *
 * A CSS circle with one 🎁 emoji rotating 2160deg on a fixed 3.2s timer. No
 * segments, no pointer, and the prize list was loaded but used ONLY to decide
 * whether to disable the button — so a visitor could not see what they might
 * win. `prefers-reduced-motion` was ignored entirely, while every other
 * primitive in `Motion.tsx` wires it.
 *
 * ## 🛑 SEGMENTS ARE EQUAL-SIZED, AND THAT IS NOT A SHORTCUT
 *
 * `weight` IS the odds. `toClientSpinPrize` is an allow-list emitting
 * `{id, label, isActive}` only, and a tester case asserts
 * `weightsInPublicSource: 0` — the stored shape leaked every wheel's odds into
 * a client prop once already (Root Cause #70). Sizing a segment by its weight
 * would publish the same information geometrically instead of as a number.
 *
 * So the wheel shows WHAT you could win, never how likely it is. That is also
 * the honest framing: these are the prizes.
 *
 * @tag domain:events
 * @tag layer:component
 */

import React, { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Div } from "../../../ui";

export interface SpinWheelSegment {
  id: string;
  label: string;
}

export interface SpinWheelProps {
  segments: SpinWheelSegment[];
  /** Index of the winning segment once known, else null. */
  winningIndex: number | null;
  /** True from the click until the result is revealed. */
  spinning: boolean;
  /** Fired when the wheel has physically stopped. */
  onSettled?: () => void;
  size?: number;
}

/** Full turns before landing. Enough to read as a spin, short enough to wait. */
const TURNS = 4;
/** Degrees past the target before easing back — the "breath" at the end. */
const OVERSHOOT_DEG = 9;

/** Alternating fills. CSS variables, so a theme restyles the wheel with it. */
const SEGMENT_FILLS = [
  "var(--appkit-color-primary)",
  "var(--appkit-color-primary-700)",
  "var(--appkit-color-secondary)",
  "var(--appkit-color-accent)",
];

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** One pie slice from `startDeg` to `endDeg`, clockwise from 12 o'clock. */
function segmentPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const a = polar(cx, cy, r, startDeg);
  const b = polar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 ${largeArc} 1 ${b.x} ${b.y} Z`;
}

export function SpinWheel({
  segments,
  winningIndex,
  spinning,
  onSettled,
  size = 288,
}: SpinWheelProps) {
  const reduced = useReducedMotion();
  const n = Math.max(segments.length, 1);
  const sweep = 360 / n;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;

  /**
   * The rotation that puts the winning segment under the pointer.
   *
   * Segment i spans `[i*sweep, (i+1)*sweep)` clockwise from 12 o'clock, so its
   * centre sits at `(i + 0.5) * sweep`. Rotating the wheel by the NEGATIVE of
   * that brings the centre back to the top, where the pointer is. Whole turns
   * are added on top purely for the look.
   */
  const target = useMemo(() => {
    if (winningIndex === null) return 0;
    return TURNS * 360 - (winningIndex + 0.5) * sweep;
  }, [winningIndex, sweep]);

  /*
   * 🛑 THE ANIMATION IS DRIVEN BY THE RESULT, NOT BY A TIMER.
   *
   * The old flow started a 3.2s CSS animation on click, awaited the server,
   * then revealed the prize after ANOTHER blind 3.2s `setTimeout` — so the
   * real wait was `latency + 3200ms`, the emoji visibly stopped before the
   * prize card appeared, and the wheel never landed anywhere in particular
   * because it always finished at 0deg mod 360.
   *
   * Here `winningIndex` stays null until the server answers; the wheel idles,
   * then animates once to the segment it actually won.
   *
   * The keyframes are the "breath": overshoot a few degrees past the target,
   * hold, then ease back onto it. Explicit keyframes rather than a spring so
   * the overshoot is exact and cannot vary with the distance travelled.
   */
  const animate = winningIndex === null
    ? { rotate: spinning ? TURNS * 360 : 0 }
    : { rotate: [0, target + OVERSHOOT_DEG, target] };

  const transition = winningIndex === null
    ? { duration: spinning ? 2.4 : 0, ease: "linear" as const, repeat: spinning ? Infinity : 0 }
    : {
        duration: 2.6,
        // Most of the journey is the decelerating spin; the last 12% is the
        // settle back from the overshoot.
        times: [0, 0.88, 1],
        ease: ["easeOut", "easeInOut"] as const,
      };

  return (
    <Div className="relative mx-auto" style={{ width: size, height: size }}>
      {/*
        * The pointer. OUTSIDE the rotating group — it is the fixed reference
        * the wheel lands against, and a pointer that rotates with the wheel
        * would always point at the same segment.
        */}
      <Div
        className="absolute left-1/2 -translate-x-1/2 z-10"
        style={{ top: -2 }}
        aria-hidden="true"
      >
        <svg width="28" height="22" viewBox="0 0 28 22">
          <path
            d="M14 22 L2 0 L26 0 Z"
            fill="var(--appkit-color-text)"
            stroke="var(--appkit-color-surface)"
            strokeWidth="2"
          />
        </svg>
      </Div>

      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        // 🛑 Reduced motion skips the journey entirely and renders the wheel
        // already landed. The result is identical; only the travel is removed.
        animate={reduced ? { rotate: winningIndex === null ? 0 : target } : animate}
        transition={reduced ? { duration: 0 } : transition}
        onAnimationComplete={() => {
          if (winningIndex !== null) onSettled?.();
        }}
        style={{ transformOrigin: "50% 50%" }}
        role="img"
        aria-label={`Prize wheel with ${n} segment${n === 1 ? "" : "s"}: ${segments.map((s) => s.label).join(", ")}`}
      >
        {segments.map((seg, i) => {
          const start = i * sweep;
          const end = start + sweep;
          const mid = start + sweep / 2;
          const labelPos = polar(cx, cy, r * 0.64, mid);
          return (
            <g key={seg.id}>
              <path
                d={segmentPath(cx, cy, r, start, end)}
                fill={SEGMENT_FILLS[i % SEGMENT_FILLS.length]}
                stroke="var(--appkit-color-surface)"
                strokeWidth="2"
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                fill="var(--appkit-color-text-on-primary)"
                fontSize={n > 6 ? 9 : 11}
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${mid} ${labelPos.x} ${labelPos.y})`}
              >
                {/* Truncated so a long prize name cannot overrun its wedge. */}
                {seg.label.length > 18 ? `${seg.label.slice(0, 17)}…` : seg.label}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={16} fill="var(--appkit-color-surface)" stroke="var(--appkit-color-border)" strokeWidth="2" />
      </motion.svg>
    </Div>
  );
}
