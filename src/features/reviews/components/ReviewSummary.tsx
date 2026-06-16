import React from "react";
import { Div, Row, Span, Stack, Text } from "../../../ui";
import { StarRating } from "../../../ui";

const CLS_STAR = "text-warning";
const CLS_BAR = "h-full rounded-full bg-warning-surface transition-all duration-300";

// --- ReviewSummary ------------------------------------------------------------

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
    <Stack
      className={`sm:flex-row sm:items-center sm:gap-8 ${className}`} gap="md"
    >
      {/* Score block */}
      <Stack className="sm:items-start" align="center" gap="xs">
        <Span color="inverse" weight="bold" className="leading-none text-neutral-900 dark:" size="5xl">
          {averageRating.toFixed(1)}
        </Span>
        <StarRating value={averageRating} size="md" readOnly />
        <Text size="sm" className="text-neutral-500">
          {totalReviews.toLocaleString()} review
          {totalReviews !== 1 ? "s" : ""}
        </Text>
      </Stack>

      {/* Breakdown bars */}
      <Stack className="flex-1" gap="sm">
        {stars.map((star) => {
          const count = distribution[star] ?? 0;
          const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
          return (
            <Row key={star} align="center" gap="sm">
              <Span size="xs" weight="medium" className="w-4 text-neutral-600 tabular-nums" align="end">
                {star}
              </Span>
              <Span size="xs" className={CLS_STAR}>★</Span>
              <Div
                className="flex-1 h-2 bg-neutral-100 overflow-hidden" rounded="full"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${star} star: ${pct}%`}
              >
                <Div
                  className={CLS_BAR}
                  // audit-inline-style-ok: computed percentage
                  style={{ width: `${pct}%` }}
                />
              </Div>
              <Span size="xs" className="w-8 tabular-nums" color="faint" align="end">
                {pct}%
              </Span>
            </Row>
          );
        })}
      </Stack>
    </Stack>
  );
}
