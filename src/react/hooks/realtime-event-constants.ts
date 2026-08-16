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
