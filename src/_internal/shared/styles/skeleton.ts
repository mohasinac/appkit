/**
 * Skeleton className tokens — extracted from `THEME_CONSTANTS.skeleton`
 * during Phase 8 of the Theme/Tokens/Variants refactor. Used by homepage /
 * carousel skeleton-state components. Two variants: pulse (animate-pulse) +
 * shimmer (animate-shimmer + gradient).
 */
export const SKELETON = {
  // Pulse (fade) variant
  base: "animate-pulse rounded bg-zinc-200 dark:bg-slate-700/60",
  text: "animate-pulse rounded bg-zinc-200 dark:bg-slate-700/60 h-4",
  heading: "animate-pulse rounded bg-zinc-200 dark:bg-slate-700/60 h-7",
  image: "animate-pulse rounded-xl bg-zinc-200 dark:bg-slate-700/60",
  card: "animate-pulse rounded-2xl bg-zinc-200 dark:bg-slate-700/60",
  // Shimmer (sweep) variant
  shimmer:
    "animate-shimmer bg-[length:400%_100%] rounded bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-slate-800 dark:via-slate-700/60 dark:to-slate-800",
  shimmerText:
    "animate-shimmer bg-[length:400%_100%] h-4 rounded bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-slate-800 dark:via-slate-700/60 dark:to-slate-800",
  shimmerCard:
    "animate-shimmer bg-[length:400%_100%] rounded-2xl bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-slate-800 dark:via-slate-700/60 dark:to-slate-800",
} as const;
