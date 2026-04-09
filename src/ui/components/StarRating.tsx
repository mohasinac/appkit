"use client";

import React, { useState } from "react";
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

const SIZE_PX = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" } as const;

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
      className={`inline-flex items-center gap-0.5 ${className}`}
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
            className={readOnly ? undefined : "cursor-pointer"}
            onClick={() => !readOnly && onChange?.(starValue)}
            onMouseEnter={() => !readOnly && setHovered(starValue)}
            onMouseLeave={() => !readOnly && setHovered(null)}
            aria-hidden={!readOnly ? "true" : undefined}
          >
            <Star
              className={[
                SIZE_PX[size],
                "transition-colors duration-100",
                filled || half
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-zinc-300 dark:text-slate-600",
                !readOnly && !filled
                  ? "hover:fill-amber-300 hover:text-amber-300"
                  : "",
              ].join(" ")}
              aria-hidden="true"
            />
          </Span>
        );
      })}

      {/* Screen-reader-only value for interactive mode */}
      {!readOnly && (
        <Span className="sr-only">
          {value} out of {max}
        </Span>
      )}
    </Span>
  );
}
