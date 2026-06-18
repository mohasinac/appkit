"use client";

import React from "react";
import {
  BadgeCheck,
  CalendarCheck,
  Megaphone,
  Package,
  PackageCheck,
  RefreshCcw,
  Sparkles,
  Star,
  Tag,
  Trophy,
  Truck,
} from "lucide-react";
import { Row, Span } from "../../../ui";
import {
  isFeatureIconPath,
  type ProductFeatureDocument,
} from "../schemas/product-features";

/**
 * Stable map of icon-set keys → React components.
 *
 * Adding a new platform feature with a new icon key requires:
 *   1. add the key + lucide component here
 *   2. reference the key as `icon: "<key>"` in the seed/admin form
 *
 * `Tag` is the fallback for unrecognised keys (instead of rendering nothing).
 */
export const FEATURE_ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  truck: Truck,
  "badge-check": BadgeCheck,
  "refresh-ccw": RefreshCcw,
  sparkles: Sparkles,
  package: Package,
  star: Star,
  megaphone: Megaphone,
  trophy: Trophy,
  "package-check": PackageCheck,
  "calendar-check": CalendarCheck,
  tag: Tag,
};

const ICON_SIZE_CLASS = "h-3 w-3";
const BADGE_BASE_CLASS =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[var(--appkit-font-size-2xs,11px)] font-medium border-zinc-200 dark:border-zinc-700";
const MORE_BADGE_CLASS =
  "inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[var(--appkit-font-size-2xs,11px)] font-medium text-zinc-600 dark:text-zinc-300";

function FeatureIcon({
  icon,
  className = ICON_SIZE_CLASS,
}: {
  icon: string;
  className?: string;
}) {
  if (isFeatureIconPath(icon)) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d={icon} />
      </svg>
    );
  }
  const Cmp = FEATURE_ICON_MAP[icon] ?? FEATURE_ICON_MAP.tag;
  return <Cmp className={className} />;
}

function colorStyleFor(iconColor: string | undefined): React.CSSProperties | undefined {
  if (!iconColor) return undefined;
  const ref = `var(${iconColor})`;
  return { color: ref, borderColor: ref };
}

export interface FeatureBadgeProps {
  featureId: string;
  features: ProductFeatureDocument[];
}

export function FeatureBadge({ featureId, features }: FeatureBadgeProps) {
  const f = features.find((x) => x.id === featureId);
  if (!f) return null;
  return (
    <Span
      title={f.description ?? undefined}
      className={BADGE_BASE_CLASS}
      style={colorStyleFor(f.iconColor)}
    >
      <FeatureIcon icon={f.icon} />
      {f.label}
    </Span>
  );
}

export interface FeatureBadgeListProps {
  /** Feature IDs referenced by the product. */
  productFeatureIds?: string[];
  features: ProductFeatureDocument[];
  /** Cap the visible count and render a "+N more" pill. 0 = no cap. */
  maxVisible?: number;
  className?: string;
}

export function FeatureBadgeList({
  productFeatureIds,
  features,
  maxVisible = 0,
  className,
}: FeatureBadgeListProps) {
  if (!productFeatureIds || productFeatureIds.length === 0) return null;
  if (!features || features.length === 0) return null;

  const resolved = productFeatureIds
    .map((id) => features.find((f) => f.id === id))
    .filter((f): f is ProductFeatureDocument => Boolean(f));
  if (resolved.length === 0) return null;

  const visible = maxVisible > 0 ? resolved.slice(0, maxVisible) : resolved;
  const hidden = maxVisible > 0 ? Math.max(0, resolved.length - maxVisible) : 0;

  return (
    <Row wrap gap="xs" className={className}>
      {visible.map((f) => (
        <FeatureBadge key={f.id} featureId={f.id} features={features} />
      ))}
      {hidden > 0 && (
        <Span className={MORE_BADGE_CLASS} aria-label={`${hidden} more features`}>
          +{hidden} more
        </Span>
      )}
    </Row>
  );
}
