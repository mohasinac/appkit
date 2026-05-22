import { Span } from "../../../ui";
import type { EventStatus } from "../types";

const STATUS_MAP: Record<EventStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  active: { label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  paused: { label: "Paused", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  ended: { label: "Ended", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color} ${className}`}
    >
      {label}
    </Span>
  );
}
