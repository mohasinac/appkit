import React from "react";
import type { PreOrderStatus } from "../types";

const STATUS_MAP: Record<PreOrderStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  ready: { label: "Ready", color: "bg-green-100 text-green-700" },
  fulfilled: { label: "Fulfilled", color: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-600" },
};

interface PreOrderBadgeProps {
  status: PreOrderStatus;
  className?: string;
}

export function PreOrderBadge({ status, className = "" }: PreOrderBadgeProps) {
  const { label, color } = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color} ${className}`}
    >
      {label}
    </span>
  );
}

interface PreOrderTagProps {
  label?: string;
  estimatedDate?: string;
  className?: string;
}

/** Small inline tag shown on a product that is available for pre-order */
export function PreOrderTag({
  label = "Pre-order",
  estimatedDate,
  className = "",
}: PreOrderTagProps) {
  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">
        {label}
      </span>
      {estimatedDate && (
        <span className="mt-0.5 text-[10px] text-gray-400">
          Ships {estimatedDate}
        </span>
      )}
    </div>
  );
}
