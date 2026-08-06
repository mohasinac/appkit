/**
 * Skeleton className tokens — extracted from `THEME_CONSTANTS.skeleton`
 * during Phase 8 of the Theme/Tokens/Variants refactor. Used by homepage /
 * carousel skeleton-state components. Two variants: pulse (animate-pulse) +
 * shimmer (animate-shimmer + gradient).
 */
export const SKELETON = {
  // Pulse (fade) variant — bg adapts to active theme
  base: "animate-pulse rounded bg-[var(--appkit-color-border-subtle)]",
  text: "animate-pulse rounded bg-[var(--appkit-color-border-subtle)] h-4",
  heading: "animate-pulse rounded bg-[var(--appkit-color-border-subtle)] h-7",
  image: "animate-pulse rounded-xl bg-[var(--appkit-color-border-subtle)]",
  card: "animate-pulse rounded-2xl bg-[var(--appkit-color-border-subtle)]",
  // Shimmer (sweep) variant — gradient from border-subtle → bg → border-subtle
  shimmer:
    "animate-shimmer bg-[length:400%_100%] rounded bg-gradient-to-r from-[var(--appkit-color-border-subtle)] via-[var(--appkit-color-bg)] to-[var(--appkit-color-border-subtle)]",
  shimmerText:
    "animate-shimmer bg-[length:400%_100%] h-4 rounded bg-gradient-to-r from-[var(--appkit-color-border-subtle)] via-[var(--appkit-color-bg)] to-[var(--appkit-color-border-subtle)]",
  shimmerCard:
    "animate-shimmer bg-[length:400%_100%] rounded-2xl bg-gradient-to-r from-[var(--appkit-color-border-subtle)] via-[var(--appkit-color-bg)] to-[var(--appkit-color-border-subtle)]",
} as const;
