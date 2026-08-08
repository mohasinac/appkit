import { Fragment, type ReactNode } from "react";
import { Row, Span, TextLink } from "../../../ui";

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
  emiAvailable: string;
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
  /** When set, the COD badge links here (e.g. the "How Checkout Works" policy page). */
  codHref?: string;
  emiAvailable?: boolean;
  /** When set, the EMI badge links here (e.g. the "How EMI Works" policy page). */
  emiHref?: string;
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
  href?: string;
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
  codHref,
  emiAvailable,
  emiHref,
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
      href: codHref,
    });
  }

  if (emiAvailable) {
    badges.push({
      key: "emi",
      icon: <Span size="xs">📅</Span>,
      label: labels.emiAvailable,
      colorClass: "text-indigo-700 dark:text-indigo-300",
      bgClass:
        "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800",
      href: emiHref,
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
      colorClass: "text-[var(--appkit-color-text-muted)]",
      bgClass:
        categoryBadgeClassName ??
        "bg-[var(--appkit-color-surface)] border-[var(--appkit-color-border)]",
    });
  }

  if (badges.length === 0) return null;

  const renderPill = (badge: FeatureBadge) => (
    <Span layout="inline-flex" gap="xs"
      className={`.5 border py-[0.375rem] ${badge.bgClass} ${badge.colorClass}`} rounded="lg" padding="x-sm" size="xs" weight="medium"
    >
      <Span aria-hidden="true">{badge.icon}</Span>
      {badge.label}
    </Span>
  );

  return (
    <Row wrap gap="sm">
      {badges.map((badge) =>
        badge.href ? (
          <TextLink key={badge.key} href={badge.href} className="no-underline">
            {renderPill(badge)}
          </TextLink>
        ) : (
          <Fragment key={badge.key}>{renderPill(badge)}</Fragment>
        ),
      )}
    </Row>
  );
}
