import React from "react";
import { Span } from "../../../ui";
import type { PreorderStatus } from "../types";
import { getPreorderStatus } from "../types";

const STATUS_LABELS: Record<PreorderStatus, string> = {
  available: "Pre-order now",
  shipping_soon: "Shipping soon",
  shipped: "Shipped",
};

const STATUS_COLORS: Record<PreorderStatus, string> = {
  available: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  shipping_soon: "bg-warning-surface text-warning",
  shipped: "bg-success-surface text-success",
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
