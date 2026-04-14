"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Span } from "./Typography";

/**
 * StarRating — 0–5 star display/interactive rating.
 *
 * Standalone @mohasinac/ui primitive. No app-specific imports.
 * Use `readOnly` for display, omit it for interactive mode with hover preview.
 */

export interface StarRatingProps {
  value?: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  className?: string;
  /** Accessible label describing what is being rated */
  label?: string;
}

export function StarRating({
  value = 0,
  onChange,
  max = 5,
  size = "md",
  readOnly = false,
  className = "",
  label,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const displayed = hovered ?? value;

  return (
    <Span
      className={[
        "appkit-star-rating",
        `appkit-star-rating--${size}`,
        readOnly
          ? "appkit-star-rating--readonly"
          : "appkit-star-rating--interactive",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role={readOnly ? "img" : "group"}
      aria-label={label ?? `${value} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= displayed;
        const half = !filled && starValue - 0.5 <= displayed;

        return (
          <Span
            key={starValue}
            className="appkit-star-rating__star"
            onClick={() => !readOnly && onChange?.(starValue)}
            onMouseEnter={() => !readOnly && setHovered(starValue)}
            onMouseLeave={() => !readOnly && setHovered(null)}
            aria-hidden={!readOnly ? "true" : undefined}
          >
            <Star
              className={[
                "appkit-star-rating__icon",
                filled || half
                  ? "appkit-star-rating__icon--filled"
                  : "appkit-star-rating__icon--empty",
              ].join(" ")}
              aria-hidden="true"
            />
          </Span>
        );
      })}

      {!readOnly && (
        <Span className="sr-only">
          {value} out of {max}
        </Span>
      )}
    </Span>
  );
}
