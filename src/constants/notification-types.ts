/**
 * Notification Type Registry — DERIVED, not restated.
 *
 * ## What this file used to be, and why it mattered
 *
 * A hand-written 9-value list that called itself "canonical" while
 * `NotificationDocument.type` held 27. Two of its nine —`review_posted` and
 * `payout_processed` — were not real values at all, so those chips matched
 * zero rows forever. Its two consumers were not cosmetic:
 *
 *  · `AdminNotificationsView`'s filter chips, so an admin could not filter
 *    **18 of the 27 real types** and was offered two that never appear.
 *  · `AdminSiteSettingsView`'s per-channel allow-list, so an admin literally
 *    **could not allow-list `offer_received` or `payment_review`** for email
 *    or WhatsApp — the toggle did not exist.
 *
 * Everything here now derives from `NOTIFICATION_TYPE_VALUES`, so a new
 * notification type is one edit and cannot be missing from either surface.
 *
 * ## Why the import points where it does
 *
 * `features/admin/schemas/firestore.ts` imports nothing from `constants/`,
 * so this direction is acyclic. That is NOT true of `field-names.ts`, which
 * is a deliberate leaf that `features/products/types` imports — which is why
 * that file keeps its duplicated values and relies on an audit instead.
 */

import { NOTIFICATION_TYPE_VALUES } from "../features/admin/schemas/firestore";
import type { NotificationType } from "../features/admin/schemas/firestore";

export { NOTIFICATION_TYPE_VALUES };
export type { NotificationType };

/** Alias kept for the two existing importers. */
export const NOTIFICATION_TYPES = NOTIFICATION_TYPE_VALUES;

/**
 * `order_shipped` → `Order shipped`.
 *
 * Derived rather than hand-labelled: a hand-written label map is the same
 * drift risk one layer down, and every one of these values is already a
 * readable snake_case phrase.
 */
export function notificationTypeLabel(type: NotificationType | string): string {
  return String(type).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/**
 * Shape used by filter-chip rows (id + display label), with the usual "All"
 * option prepended.
 */
export const NOTIFICATION_TYPE_TABS: ReadonlyArray<{
  id: string;
  label: string;
}> = [
  { id: "All", label: "All" },
  ...NOTIFICATION_TYPE_VALUES.map((id) => ({ id, label: notificationTypeLabel(id) })),
];
