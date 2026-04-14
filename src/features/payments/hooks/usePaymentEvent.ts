"use client";

import type { FirebaseApp } from "firebase/app";
import type { Database } from "firebase/database";
import { logger } from "../../../core";
import {
  RealtimeEventType,
  RealtimeEventStatus,
  useRealtimeEvent,
  type RTDBEventPayload,
  type RealtimeEventMessages,
} from "../../../react";
import { getFirebaseRealtimeClient } from "../../../react/hooks/firebaseRealtimeClient";

export type { RealtimeEventStatus as PaymentEventStatus };

export interface UsePaymentEventReturn {
  status: RealtimeEventStatus;
  error: string | null;
  orderIds: string[] | null;
  subscribe: (eventId: string, customToken: string) => void;
  reset: () => void;
}

export interface UsePaymentEventOptions {
  rtdbPath?: string;
  timeoutMs?: number;
  messages?: RealtimeEventMessages;
  realtimeApp?: FirebaseApp;
  realtimeDb?: Database;
  firebaseAppName?: string;
}

const PAYMENT_EVENT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_RTDB_PATH = "payment_events";

function extractOrderIds(raw: RTDBEventPayload): string[] | null {
  return (raw.orderIds as string[] | undefined) ?? null;
}

export function usePaymentEvent(
  options?: UsePaymentEventOptions,
): UsePaymentEventReturn {
  const defaultClient = getFirebaseRealtimeClient(
    options?.firebaseAppName ?? "appkit-payment-realtime",
  );

  const {
    status,
    error,
    data: orderIds,
    subscribe,
    reset,
  } = useRealtimeEvent<string[]>({
    type: RealtimeEventType.PAYMENT,
    rtdbPath: options?.rtdbPath ?? DEFAULT_RTDB_PATH,
    realtimeApp: options?.realtimeApp ?? defaultClient.realtimeApp,
    realtimeDb: options?.realtimeDb ?? defaultClient.realtimeDb,
    timeoutMs: options?.timeoutMs ?? PAYMENT_EVENT_TIMEOUT_MS,
    onLogError: (message, err) => logger.error(message, err),
    extractData: extractOrderIds,
    messages: {
      tokenFailure: "Failed to initialize payment tracking.",
      connectionLost: "Payment tracking connection was lost.",
      timedOut: "Payment tracking timed out.",
      failure: "Payment was not completed.",
      ...(options?.messages ?? {}),
    },
  });

  return { status, error, orderIds, subscribe, reset };
}
