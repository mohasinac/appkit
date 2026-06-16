import { type ReactNode } from "react";
import { Row, Span } from "../../../ui";

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
      icon: <Span size="xs">★</Span>,
      label: labels.featured,
      colorClass: "text-warning dark:text-warning",
      bgClass:
        "bg-warning-surface dark:bg-warning-surface border-warning dark:border-warning",
    });
  }

  if (fasterDelivery) {
    badges.push({
      key: "fasterDelivery",
      icon: <Span size="xs">⚡</Span>,
      label: labels.fasterDelivery,
      colorClass: "text-warning dark:text-warning",
      bgClass:
        "bg-warning-surface dark:bg-warning-surface border-warning dark:border-warning",
    });
  }

  if (ratedSeller) {
    badges.push({
      key: "ratedSeller",
      icon: <Span size="xs">✓</Span>,
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
      icon: <Span size="xs">▣</Span>,
      label: `${labels.condition}: ${conditionLabel}`,
      colorClass: "text-primary",
      bgClass:
        "bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30",
    });
  }

  if (returnable && condition === "new") {
    badges.push({
      key: "returnable",
      icon: <Span size="xs">↺</Span>,
      label: labels.returnable,
      colorClass: "text-success dark:text-success",
      bgClass:
        "bg-success-surface dark:bg-success-surface border-success dark:border-success",
    });
  }

  if (freeShipping) {
    badges.push({
      key: "freeShipping",
      icon: <Span size="xs">🚚</Span>,
      label: labels.freeShipping,
      colorClass: "text-success dark:text-success",
      bgClass:
        "bg-success-surface dark:bg-success-surface border-success dark:border-success",
    });
  }

  if (codAvailable) {
    badges.push({
      key: "cod",
      icon: <Span size="xs">₹</Span>,
      label: labels.codAvailable,
      colorClass: "text-purple-700 dark:text-purple-300",
      bgClass:
        "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800",
    });
  }

  if (wishlistCount && wishlistCount > 0) {
    badges.push({
      key: "wishlist",
      icon: <Span size="xs">♥</Span>,
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
      icon: <Span size="xs">▦</Span>,
      label: labels.categoryProductCount(formattedCount, categoryName),
      colorClass: "text-zinc-700 dark:text-zinc-300",
      bgClass:
        categoryBadgeClassName ??
        "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700",
    });
  }

  if (badges.length === 0) return null;

  return (
    <Row wrap gap="sm">
      {badges.map((badge) => (
        <Span layout="inline-flex" gap="xs" 
          key={badge.key}
          className={`.5 border py-1.5 ${badge.bgClass} ${badge.colorClass}`} rounded="lg" padding="x-sm" size="xs" weight="medium"
        >
          <Span aria-hidden="true">{badge.icon}</Span>
          {badge.label}
        </Span>
      ))}
    </Row>
  );
}
