"use client";

import React from "react";
import { Div, Span, Text } from "../../../ui";
import { StarRating } from "../../../ui";

// ─── ReviewSummary ────────────────────────────────────────────────────────────

export interface ReviewSummaryProps {
  averageRating: number;
  totalReviews: number;
  /** Map of star value (1–5) → count. Example: { 5: 40, 4: 20, 3: 10, 2: 5, 1: 2 } */
  distribution: Record<number, number>;
  className?: string;
}

/**
 * ReviewSummary — aggregate rating block with breakdown bars.
 *
 * Shows:
 *  - Large average score + star display
 *  - "N reviews" count
 *  - Per-star percentage bars (5★ ... 1★)
 */
export function ReviewSummary({
  averageRating,
  totalReviews,
  distribution,
  className = "",
}: ReviewSummaryProps) {
  const stars = [5, 4, 3, 2, 1];

  return (
    <Div
      className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8 ${className}`}
    >
      {/* Score block */}
      <Div className="flex flex-col items-center gap-1 sm:items-start">
        <Span className="text-5xl font-bold leading-none text-neutral-900 dark:text-white">
          {averageRating.toFixed(1)}
        </Span>
        <StarRating value={averageRating} size="md" readOnly />
        <Text className="text-sm text-neutral-500 dark:text-zinc-400">
          {totalReviews.toLocaleString()} review
          {totalReviews !== 1 ? "s" : ""}
        </Text>
      </Div>

      {/* Breakdown bars */}
      <Div className="flex flex-1 flex-col gap-2">
        {stars.map((star) => {
          const count = distribution[star] ?? 0;
          const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
          return (
            <Div key={star} className="flex items-center gap-2">
              <Span className="w-4 text-right text-xs font-medium text-neutral-600 dark:text-zinc-400 tabular-nums">
                {star}
              </Span>
              <Span className="text-yellow-400 text-xs">★</Span>
              <Div
                className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-zinc-800 overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${star} star: ${pct}%`}
              >
                <Div
                  className="h-full rounded-full bg-yellow-400 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </Div>
              <Span className="w-8 text-right text-xs text-neutral-400 dark:text-zinc-500 tabular-nums">
                {pct}%
              </Span>
            </Div>
          );
        })}
      </Div>
    </Div>
  );
}
