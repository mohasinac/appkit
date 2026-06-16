import { Span } from "../../../ui";
import type { EventStatus } from "../types";

const STATUS_MAP: Record<EventStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  active: { label: "Active", color: "bg-success-surface text-success" },
  paused: { label: "Paused", color: "bg-warning-surface text-warning" },
  ended: { label: "Ended", color: "bg-error-surface text-error" },
  cancelled: { label: "Cancelled", color: "bg-error-surface text-error" },
};

interface EventStatusBadgeProps {
  status: EventStatus;
  className?: string;
}

export function EventStatusBadge({
  status,
  className = "",
}: EventStatusBadgeProps) {
  const { label, color } = STATUS_MAP[status] ?? STATUS_MAP.draft;
  return (
    <Span
      className={`inline-flex items-center ${color} ${className}`} padding="pill-sm" rounded="full" size="xs" weight="medium"
    >
      {label}
    </Span>
  );
}
