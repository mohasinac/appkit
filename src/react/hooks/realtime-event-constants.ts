import type { JsonValue } from "../../schemas/types";

/**
 * Plain constants + types shared between client hooks (useRealtimeEvent) and
 * server-side RTDB writers (e.g. src/app/api/auth/event/init/route.ts).
 *
 * Deliberately NOT in a "use client" file. useRealtimeEvent.ts is "use
 * client" (it uses React hooks), and Next.js's server bundler replaces every
 * export of a "use client" module with an opaque client-reference when a
 * server module imports it directly — including plain, non-React constants
 * like RTDBPayloadStatus. A server route importing RTDBPayloadStatus.PENDING
 * from the old location got `undefined` at runtime, which Firebase RTDB's
 * `.set()` rejects outright ("value argument contains undefined in property
 * ...status"), silently breaking every RTDB-backed realtime event (Google
 * OAuth popup flow, payment event bridge, chat) in production. Confirmed via
 * live Vercel logs 2026-08-17.
 */

export const RealtimeEventType = {
  AUTH: "auth",
  PAYMENT: "payment",
  CHAT: "chat",
  BID: "bid",
  BULK: "bulk",
  /*
   * The sticker kiss-cut tracer's per-run progress channel. Added rather than
   * reusing BULK: the type selects this event's message strings and its
   * claim/path conventions, and a trace reports a STAGE out of eleven where a
   * bulk job reports a count — borrowing BULK's vocabulary would make the
   * progress row say the wrong thing about every failure.
   */
  STICKER_TRACE: "sticker-trace",
} as const;

export type RealtimeEventType =
  (typeof RealtimeEventType)[keyof typeof RealtimeEventType];

export const RealtimeEventStatus = {
  IDLE: "idle",
  SUBSCRIBING: "subscribing",
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  TIMEOUT: "timeout",
} as const;

export type RealtimeEventStatus =
  (typeof RealtimeEventStatus)[keyof typeof RealtimeEventStatus];

export const RTDBPayloadStatus = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  ERROR: "error",
} as const;

export interface RTDBEventPayload {
  status: (typeof RTDBPayloadStatus)[keyof typeof RTDBPayloadStatus];
  error?: string;
  [key: string]: JsonValue | undefined;
}

export interface RealtimeEventMessages {
  tokenFailure?: string;
  connectionLost?: string;
  timedOut?: string;
  failure?: string;
}
