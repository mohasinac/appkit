import Link from "next/link";
import React from "react";
import { BaseListingCard, Div, Heading, Span, Text } from "../../../ui";
import type { PreorderItem, PreorderStatus } from "../types";
import { getPreorderStatus } from "../types";
import { formatCurrency } from "../../../utils/number.formatter";
import { getDefaultLocale } from "../../../core/baseline-resolver";
import { useLongPress } from "../../../react/hooks/useLongPress";

const STATUS_LABELS: Record<PreorderStatus, string> = {
  available: "Pre-order now",
  shipping_soon: "Shipping soon",
  shipped: "Shipped",
};

const STATUS_COLORS: Record<PreorderStatus, string> = {
  available: "bg-indigo-100 text-indigo-800",
  shipping_soon: "bg-amber-100 text-amber-800",
  shipped: "bg-green-100 text-green-800",
};

interface PreorderBadgeProps {
  shipDate?: string;
  className?: string;
}

export function PreorderBadge({ shipDate, className }: PreorderBadgeProps) {
  const status = getPreorderStatus(shipDate);
  return (
    <Span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]} ${className ?? ""}`}
    >
      {STATUS_LABELS[status]}
    </Span>
  );
}

interface PreorderCardProps {
  item: PreorderItem;
  href: string;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export function PreorderCard({ item, href, selectable = false, isSelected = false, onSelect }: PreorderCardProps) {
  const longPress = useLongPress(() => onSelect?.(item.id, !isSelected));
  return (
    <Div
      className={`group relative block overflow-hidden rounded-xl border bg-white dark:bg-slate-900 transition-shadow hover:shadow-md ${isSelected ? "border-primary outline outline-2 outline-primary" : "border-gray-200 dark:border-slate-700"}`}
      onMouseDown={onSelect && !isSelected ? longPress.onMouseDown : undefined}
      onMouseUp={onSelect && !isSelected ? longPress.onMouseUp : undefined}
      onMouseLeave={onSelect && !isSelected ? longPress.onMouseLeave : undefined}
      onTouchStart={onSelect && !isSelected ? longPress.onTouchStart : undefined}
      onTouchEnd={onSelect && !isSelected ? longPress.onTouchEnd : undefined}
    >
      {onSelect && (
        <BaseListingCard.Checkbox
          selected={isSelected}
          onSelect={(e) => { e.preventDefault(); onSelect(item.id, !isSelected); }}
          label={isSelected ? "Deselect pre-order" : "Select pre-order"}
          position="top-2 left-2"
          className={selectable || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}
        />
      )}
      <Link
        href={href}
        className="block"
      >
      {item.images[0] ? (
        <Div
          role="img"
          aria-label={item.name}
          className="aspect-square w-full bg-center bg-cover transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: `url(${item.images[0]})` }}
        />
      ) : (
        <Div className="aspect-square w-full bg-gray-100" />
      )}
      <Div className="p-4">
        <PreorderBadge shipDate={item.preorderShipDate} />
        <Heading
          level={3}
          className="mt-2 font-semibold text-gray-900 dark:text-zinc-100 text-base"
        >
          {item.name}
        </Heading>
        <Text className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{item.brand}</Text>
        <Div className="mt-3 flex items-baseline gap-2">
          <Span className="text-lg font-bold text-gray-900 dark:text-zinc-100">
            {formatCurrency(item.salePrice)}
          </Span>
          {item.regularPrice > item.salePrice && (
            <Span className="text-sm text-gray-400 dark:text-zinc-500 line-through">
              {formatCurrency(item.regularPrice)}
            </Span>
          )}
        </Div>
        {item.preorderShipDate && (
          <Text className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
            Ships:{" "}
            {new Date(item.preorderShipDate).toLocaleDateString(
              getDefaultLocale(),
              {
                month: "short",
                year: "numeric",
              },
            )}
          </Text>
        )}
      </Div>
      </Link>
    </Div>
  );
}
