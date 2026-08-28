/**
 * Shared Realtime Database path constants for the auth/payment/bulk event channels.
 *
 * 🛑 Only paths that are actually referenced through this constant belong here.
 * Five keys were removed on 2026-08-29 — `PRESENCE`, `CHAT`, `NOTIFICATIONS`,
 * `LIVE_UPDATES`, `SEED_EVENTS` — every one with **zero consumers**, because
 * each live call site hardcodes its path string instead. A constant nobody uses
 * is not a source of truth; it is a second place for the value to be wrong, and
 * three of those five named RTDB nodes that no longer exist at all.
 *
 * If you add a key, migrate the call sites to it in the same change.
 *
 * This module has NO imports on purpose — that is what lets `browser-stub.ts`
 * re-export it rather than keep the byte-for-byte duplicate it used to carry.
 * The stub is the `browser` resolution target, so that duplicate meant client
 * code and server code were reading two independently-maintained copies.
 */
export const RTDB_PATHS = {
  AUTH_EVENTS: "auth_events",
  PAYMENT_EVENTS: "payment_events",
  BULK_EVENTS: "bulk_events",
} as const;
