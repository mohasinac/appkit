/**
 * Notification Type Registry — W1-33
 *
 * Canonical list of notification type IDs. Shared across:
 *  - AdminNotificationsView filter chips
 *  - NotificationPreferencesPanel (per-type toggles)
 *  - sendNotification() dispatch (type-based channel routing)
 *
 * Add new types here. Don't redefine the list inline in components.
 */

export const NOTIFICATION_TYPES = [
  "order_placed",
  "order_shipped",
  "order_delivered",
  "order_cancelled",
  "bid_placed",
  "bid_outbid",
  "bid_won",
  "review_posted",
  "payout_processed",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Shape used by filter-chip rows (id + display label).
 * Prepended with an "All" option for the typical filter-chip pattern.
 */
export const NOTIFICATION_TYPE_TABS: ReadonlyArray<{
  id: string;
  label: string;
}> = [
  { id: "All", label: "All" },
  { id: "order_placed", label: "Order placed" },
  { id: "order_shipped", label: "Order shipped" },
  { id: "order_delivered", label: "Order delivered" },
  { id: "order_cancelled", label: "Order cancelled" },
  { id: "bid_placed", label: "Bid placed" },
  { id: "bid_outbid", label: "Bid outbid" },
  { id: "bid_won", label: "Bid won" },
  { id: "review_posted", label: "Review posted" },
  { id: "payout_processed", label: "Payout processed" },
];
