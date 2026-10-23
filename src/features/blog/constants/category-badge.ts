/**
 * The per-category chip palette, shared by every blog surface.
 *
 * ## Why this moved out of `BlogFeaturedCard`
 *
 * There were two palettes and only one of them had colours. `BlogFeaturedCard`
 * carried this real five-way map — and that component is mounted ONLY on the
 * homepage rail. `BlogCard`, which is what `/blog` and every related-posts
 * grid actually render, painted all five categories one flat
 * `bg-primary/10 text-primary`.
 *
 * So the index — the page where telling a guide from a release note is worth
 * something, because you are scanning twenty of them — was the one surface
 * with no category colour at all.
 *
 * 🛑 `Record<BlogPostCategory, string>`, so a sixth category is a compile
 * error rather than a card that silently falls back to grey.
 *
 * @tag domain:blog
 * @tag layer:constants
 */

import type { BlogPostCategory } from "../types";

export const BLOG_CATEGORY_BADGE: Record<BlogPostCategory, string> = {
  news: "bg-info-surface text-info",
  tips: "bg-success-surface text-success",
  guides: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  updates: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  community: "bg-warning-surface text-warning",
};

/**
 * Neutral fallback for a value that is not a known category.
 *
 * 🛑 Both halves are theme-relative tokens that invert together. Never pair a
 * `-surface` tint with a literal `text-white`: `-surface` is a near-white tint
 * in light themes and a dark tint in dark ones, so fixed-white ink is
 * invisible in exactly one of them (Root Cause #67).
 */
export const BLOG_CATEGORY_BADGE_FALLBACK =
  "bg-[var(--appkit-color-bg)] text-[var(--appkit-color-text-muted)]";

export function blogCategoryBadge(category: string | undefined): string {
  return (
    BLOG_CATEGORY_BADGE[category as BlogPostCategory] ?? BLOG_CATEGORY_BADGE_FALLBACK
  );
}
