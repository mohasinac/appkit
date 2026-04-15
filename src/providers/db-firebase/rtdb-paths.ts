/**
 * Shared Realtime Database path constants for auth/payment/bulk event channels.
 */
export const RTDB_PATHS = {
  PRESENCE: "presence",
  CHAT: "chat",
  NOTIFICATIONS: "notifications",
  LIVE_UPDATES: "live_updates",
  AUTH_EVENTS: "auth_events",
  PAYMENT_EVENTS: "payment_events",
  BULK_EVENTS: "bulk_events",
} as const;
