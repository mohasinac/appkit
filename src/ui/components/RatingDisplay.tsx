"use client";

import { Span } from "./Typography";
import { classNames } from "../style.helper";

const sizeClass: Record<"sm" | "md" | "lg", string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export interface RatingDisplayProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

export function RatingDisplay({
  rating,
  maxRating = 5,
  size = "sm",
  showValue = false,
  className,
}: RatingDisplayProps) {
  const starSize = sizeClass[size];

  return (
    <div className={classNames("flex items-center gap-1", className)}>
      <div className="flex">
        {Array.from({ length: maxRating }, (_, i) => i + 1).map((star) => (
          <svg
            key={star}
            className={classNames(
              starSize,
              star <= rating
                ? "text-amber-400 dark:text-secondary-500"
                : "text-zinc-300 dark:text-zinc-700",
            )}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      {showValue && (
        <Span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {rating.toFixed(1)}
        </Span>
      )}
    </div>
  );
}
