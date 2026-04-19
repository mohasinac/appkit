import { Badge } from "./Badge";

/**
 * StatusBadge — semantic color map for order/payment/review/ticket status strings.
 *
 * Wraps @mohasinac/ui Badge with a pre-defined status → variant mapping.
 * No app-specific imports.
 */

export type BadgeOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "failed";

export type BadgePaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type BadgeReviewStatus = "pending" | "approved" | "rejected";

export type BadgeTicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type GenericStatus =
  | "active"
  | "inactive"
  | "pending"
  | "approved"
  | "rejected"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type StatusBadgeStatus =
  | BadgeOrderStatus
  | BadgePaymentStatus
  | BadgeReviewStatus
  | BadgeTicketStatus
  | GenericStatus;

export interface StatusBadgeProps {
  status: StatusBadgeStatus;
  label?: string;
  className?: string;
}

type BadgeVariantKey =
  | "active"
  | "inactive"
  | "pending"
  | "approved"
  | "rejected"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "default";

const STATUS_TO_VARIANT: Record<string, BadgeVariantKey> = {
  // Generic
  active: "active",
  inactive: "inactive",
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  // Order
  confirmed: "success",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  refunded: "warning",
  failed: "danger",
  // Payment
  paid: "success",
  partially_refunded: "warning",
  // Review (pending/approved/rejected already covered)
  // Ticket
  open: "warning",
  in_progress: "info",
  resolved: "success",
  closed: "inactive",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
  info: "Info",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  failed: "Failed",
  paid: "Paid",
  partially_refunded: "Partially Refunded",
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const badgeVariant = STATUS_TO_VARIANT[status] ?? "default";
  const displayLabel = label ?? STATUS_LABELS[status] ?? status;
  return (
    <Badge
      variant={badgeVariant}
      className={["appkit-status-badge", className].filter(Boolean).join(" ")}
    >
      {displayLabel}
    </Badge>
  );
}
