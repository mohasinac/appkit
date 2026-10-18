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
  /**
   * Tester-only. A one-line ping per email decision so the harness can poll
   * instead of reading a real mailbox — see `send-recorder.ts` for why, and for
   * the gate that keeps real users' mail out of it. Pruned by
   * `cleanupRtdbEvents` alongside the other three.
   */
  EMAIL_EVENTS: "email_events",
  /**
   * D9 — new-message ping per conversation. RTDB-ping-plus-REST: the actual
   * message content never crosses this channel, only "something changed,
   * refetch" — `firestore.rules` forbids client Firestore access entirely, so
   * this plus the bounded REST route is the only option, not a cost choice.
   * Pruned by `cleanupRtdbEvents`'s sixth block.
   */
  CHAT_EVENTS: "chat_events",
  /**
   * Per-run progress for the sticker kiss-cut tracer — stage, pct, parts and
   * shards done. The DURABLE record is `stickerTraceRuns.events[]`; this is
   * only the live bar, which is why losing it is survivable and why the run
   * document is what a failure is diagnosed from weeks later.
   *
   * 🛑 Pruned at SIXTY minutes, not fifteen. A `max`-tier fan-out across sixty
   * parts can outlast a fifteen-minute window, and a channel pruned mid-run
   * reads to the client as "it died" — the same false negative `EMAIL_EVENTS`
   * carries a longer window to avoid.
   */
  STICKER_TRACE: "sticker_trace",
} as const;
