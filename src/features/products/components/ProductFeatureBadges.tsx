"use client";

import { type ReactNode } from "react";

interface ProductFeatureBadgeLabels {
  featured: string;
  fasterDelivery: string;
  ratedSeller: string;
  condition: string;
  conditionNew: string;
  conditionUsed: string;
  conditionBroken: string;
  conditionRefurbished: string;
  returnable: string;
  freeShipping: string;
  codAvailable: string;
  wishlistCount: (count: number) => string;
  categoryProductCount: (count: string, category: string) => string;
}

interface ProductFeatureBadgesProps {
  featured?: boolean;
  fasterDelivery?: boolean;
  ratedSeller?: boolean;
  condition?: string;
  returnable?: boolean;
  freeShipping?: boolean;
  wishlistCount?: number;
  categoryProductCount?: number;
  categoryName?: string;
  codAvailable?: boolean;
  labels: ProductFeatureBadgeLabels;
  formatCount?: (value: number) => string;
  categoryBadgeClassName?: string;
}

interface FeatureBadge {
  key: string;
  icon: ReactNode;
  label: string;
  colorClass: string;
  bgClass: string;
}

export function ProductFeatureBadges({
  featured,
  fasterDelivery,
  ratedSeller,
  condition,
  returnable,
  freeShipping,
  wishlistCount,
  categoryProductCount,
  categoryName,
  codAvailable,
  labels,
  formatCount,
  categoryBadgeClassName,
}: ProductFeatureBadgesProps) {
  const badges: FeatureBadge[] = [];

  if (featured) {
    badges.push({
      key: "featured",
      icon: <span className="text-xs">★</span>,
      label: labels.featured,
      colorClass: "text-amber-700 dark:text-amber-300",
      bgClass:
        "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800",
    });
  }

  if (fasterDelivery) {
    badges.push({
      key: "fasterDelivery",
      icon: <span className="text-xs">⚡</span>,
      label: labels.fasterDelivery,
      colorClass: "text-orange-700 dark:text-orange-300",
      bgClass:
        "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800",
    });
  }

  if (ratedSeller) {
    badges.push({
      key: "ratedSeller",
      icon: <span className="text-xs">✓</span>,
      label: labels.ratedSeller,
      colorClass: "text-primary",
      bgClass: "bg-primary/5 dark:bg-primary/10 border-primary/20",
    });
  }

  if (condition) {
    const conditionLabel =
      condition === "new"
        ? labels.conditionNew
        : condition === "used"
          ? labels.conditionUsed
          : condition === "broken"
            ? labels.conditionBroken
            : condition === "refurbished"
              ? labels.conditionRefurbished
              : labels.conditionNew;

    badges.push({
      key: "condition",
      icon: <span className="text-xs">▣</span>,
      label: `${labels.condition}: ${conditionLabel}`,
      colorClass: "text-primary",
      bgClass:
        "bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30",
    });
  }

  if (returnable && condition === "new") {
    badges.push({
      key: "returnable",
      icon: <span className="text-xs">↺</span>,
      label: labels.returnable,
      colorClass: "text-teal-700 dark:text-teal-300",
      bgClass:
        "bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800",
    });
  }

  if (freeShipping) {
    badges.push({
      key: "freeShipping",
      icon: <span className="text-xs">🚚</span>,
      label: labels.freeShipping,
      colorClass: "text-emerald-700 dark:text-emerald-300",
      bgClass:
        "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800",
    });
  }

  if (codAvailable) {
    badges.push({
      key: "cod",
      icon: <span className="text-xs">₹</span>,
      label: labels.codAvailable,
      colorClass: "text-purple-700 dark:text-purple-300",
      bgClass:
        "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800",
    });
  }

  if (wishlistCount && wishlistCount > 0) {
    badges.push({
      key: "wishlist",
      icon: <span className="text-xs">♥</span>,
      label: labels.wishlistCount(wishlistCount),
      colorClass: "text-pink-700 dark:text-pink-300",
      bgClass:
        "bg-pink-50 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800",
    });
  }

  if (categoryProductCount && categoryProductCount > 0 && categoryName) {
    const formattedCount = formatCount
      ? formatCount(categoryProductCount)
      : String(categoryProductCount);

    badges.push({
      key: "categoryCount",
      icon: <span className="text-xs">▦</span>,
      label: labels.categoryProductCount(formattedCount, categoryName),
      colorClass: "text-zinc-700 dark:text-zinc-300",
      bgClass:
        categoryBadgeClassName ??
        "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700",
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge.key}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${badge.bgClass} ${badge.colorClass}`}
        >
          <span aria-hidden="true">{badge.icon}</span>
          {badge.label}
        </span>
      ))}
    </div>
  );
}
