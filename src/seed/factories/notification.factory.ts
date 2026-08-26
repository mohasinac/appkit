// appkit/src/seed/factories/notification.factory.ts
let _seq = 1;

/*
 * Re-exported, never redeclared.
 *
 * This file's own 9-value copy was what `appkit/src/index.ts` published as
 * the public `NotificationType` — so every external consumer was typed
 * against a SEED FACTORY's guess, including its two invented values
 * `review_received` and `payout_completed`. A seed factory is the last place
 * a public type contract should come from.
 */
import type { NotificationType } from "../../features/admin/schemas/firestore";
export type { NotificationType };

export interface SeedNotificationDocument {
  id: string;
  userId: string;
  type: NotificationType | string;
  title: string;
  body?: string;
  read?: boolean;
  link?: string;
  createdAt: Date;
}

export function makeNotification(
  overrides: Partial<SeedNotificationDocument> = {},
): SeedNotificationDocument {
  const n = _seq++;
  return {
    id: overrides.id ?? `notification-${n}`,
    userId: overrides.userId ?? `user-${n}`,
    type: overrides.type ?? "system",
    title: overrides.title ?? `Notification ${n}`,
    read: overrides.read ?? false,
    createdAt: overrides.createdAt ?? new Date(),
    ...overrides,
  };
}

export function makeFullNotification(
  overrides: Partial<SeedNotificationDocument> = {},
): SeedNotificationDocument {
  return makeNotification({
    body: "Your order has been shipped and is on its way.",
    link: "/orders/order-1",
    ...overrides,
  });
}

export const NOTIFICATION_FIXTURES = {
  orderShipped: makeFullNotification({
    id: "notification-1",
    userId: "buyer-user-1",
    type: "order_shipped",
    title: "Your order has shipped!",
    body: "Order #1234 is on its way. Expected delivery: 2–3 days.",
    link: "/orders/order-1",
  }),
  bidWon: makeFullNotification({
    id: "notification-2",
    userId: "buyer-user-1",
    type: "bid_won",
    title: "You won the auction!",
    body: "Congratulations! You won the auction for Product 1.",
    link: "/auctions/auction-1",
  }),
};
