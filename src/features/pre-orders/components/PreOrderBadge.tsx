import type { PreOrderStatus } from "../types";
import { Div, Span } from "../../../ui";

const CLS_NEW_BADGE = "rounded-full bg-indigo-600 px-2.5 py-0.5 text-white";

const STATUS_MAP: Record<PreOrderStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-warning-surface text-warning" },
  confirmed: { label: "Confirmed", color: "bg-info-surface text-info" },
  ready: { label: "Ready", color: "bg-success-surface text-success" },
  fulfilled: { label: "Fulfilled", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  cancelled: { label: "Cancelled", color: "bg-error-surface text-error" },
};

interface PreOrderBadgeProps {
  status: PreOrderStatus;
  className?: string;
}

export function PreOrderBadge({ status, className = "" }: PreOrderBadgeProps) {
  const { label, color } = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return (
    <Span
      className={`inline-flex items-center px-2.5 py-0.5 ${color} ${className}`} rounded="full" size="xs" weight="medium"
    >
      {label}
    </Span>
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
    <Div className={`inline-flex flex-col ${className}`}>
      <Span size="xs" weight="bold" className={CLS_NEW_BADGE}>
        {label}
      </Span>
      {estimatedDate && (
        <Span className="mt-0.5 text-[10px] text-gray-400">
          Ships {estimatedDate}
        </Span>
      )}
    </Div>
  );
}
