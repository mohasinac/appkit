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
import {
  isFeatureIconPath,
  type ProductFeatureDocument,
} from "../schemas/product-features";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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

function FeatureIcon({
  icon,
  className,
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
  const Cmp = ICON_MAP[icon] ?? Tag;
  return <Cmp className={className} />;
}

export interface FeatureBadgeProps {
  featureId: string;
  features: ProductFeatureDocument[];
}

export function FeatureBadge({ featureId, features }: FeatureBadgeProps) {
  const f = features.find((x) => x.id === featureId);
  if (!f) return null;
  const colorStyle = f.iconColor
    ? { color: `var(${f.iconColor})`, borderColor: `var(${f.iconColor})` }
    : undefined;
  return (
    <span
      title={f.description ?? undefined}
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium border-zinc-200 dark:border-zinc-700"
      style={colorStyle}
    >
      <FeatureIcon icon={f.icon} className="h-3 w-3" />
      {f.label}
    </span>
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

  const visible =
    maxVisible > 0 ? resolved.slice(0, maxVisible) : resolved;
  const hidden = maxVisible > 0 ? Math.max(0, resolved.length - maxVisible) : 0;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {visible.map((f) => (
        <FeatureBadge key={f.id} featureId={f.id} features={features} />
      ))}
      {hidden > 0 && (
        <span className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
          +{hidden} more
        </span>
      )}
    </div>
  );
}
