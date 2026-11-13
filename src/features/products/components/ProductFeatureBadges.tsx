import { Fragment, type ReactNode } from "react";
import { Row } from "../../../ui/components/Layout";
import { Span } from "../../../ui/components/Typography";
import { TextLink } from "../../../ui/components/TextLink";
import { Icon } from "../../../ui/components/Icon";

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
  finalSale: string;
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
  /**
   * Absent means final sale, so callers must resolve this through
   * `isFinalSale()` rather than passing `product.finalSale` straight in.
   * Mutually exclusive with `returnable` in practice, but both are accepted
   * independently so a caller cannot accidentally render neither.
   */
  finalSale?: boolean;
  freeShipping?: boolean;
  wishlistCount?: number;
  categoryProductCount?: number;
  categoryName?: string;
  codAvailable?: boolean;
  /** When set, the COD badge links here (e.g. the "How Checkout Works" policy page). */
  codHref?: string;
  /**
   * Where the "Final Sale" badge points — the disclosure that EXPLAINS it.
   *
   * Owner, 2026-11-13: *"move the disclaimers such that the tags auto explain
   * themselves with proper focus and scroll to read."* A badge that states a
   * refund consequence and cannot be asked "why?" is a warning with nowhere
   * to go, and it matters most now that the explanation is COLLAPSED.
   *
   * Omitted → the badge stays plain text, exactly as before.
   */
  finalSaleHref?: string;
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
  finalSale,
  freeShipping,
  wishlistCount,
  categoryProductCount,
  categoryName,
  codAvailable,
  codHref,
  finalSaleHref,
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

  /*
   * Final sale is the platform DEFAULT, so unlike every other badge here this
   * one is the common case rather than the exception — it is rendered on
   * warning tokens, not error, because it is a term of the sale and not a
   * fault. `-surface` + matching ink per Root Cause #67: never `text-white`,
   * which is invisible against the light-theme tint.
   */
  if (finalSale) {
    badges.push({
      key: "finalSale",
      icon: <Span size="xs">⊘</Span>,
      label: labels.finalSale,
      href: finalSaleHref,
      colorClass: "text-warning dark:text-warning",
      bgClass:
        "bg-warning-surface dark:bg-warning-surface border-warning dark:border-warning",
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
      // Generic accent token (2A/Phase 11), not a status color — COD/EMI/
      // wishlist exist purely to differentiate from each other, same
      // convention the success/warning/error/info badges above use.
      colorClass: "text-accent-c dark:text-accent-c",
      bgClass: "bg-accent-c-surface dark:bg-accent-c-surface border-accent-c dark:border-accent-c",
      href: codHref,
    });
  }


  if (wishlistCount && wishlistCount > 0) {
    badges.push({
      key: "wishlist",
      icon: <Icon name="wishlist" size="xs" filled />,
      label: labels.wishlistCount(wishlistCount),
      colorClass: "text-accent-b dark:text-accent-b",
      bgClass: "bg-accent-b-surface dark:bg-accent-b-surface border-accent-b dark:border-accent-b",
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
      className={`border py-[0.375rem] ${badge.bgClass} ${badge.colorClass}`} rounded="lg" padding="x-sm" size="xs" weight="medium"
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
