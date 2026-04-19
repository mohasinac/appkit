"use client";

import type { IClientRealtimeProvider } from "../../../contracts/client-realtime";
import { logger } from "../../../core/Logger";
import {
  RealtimeEventType,
  RealtimeEventStatus,
  useRealtimeEvent,
  type RTDBEventPayload,
  type RealtimeEventMessages,
} from "../../../react";

export type { RealtimeEventStatus as AuthEventStatus };

export interface AuthEventData {
  isNewUser: boolean;
  uid: string;
  role: string;
}

export interface UseAuthEventReturn {
  status: RealtimeEventStatus;
  error: string | null;
  data: AuthEventData | null;
  subscribe: (eventId: string, customToken: string) => void;
  reset: () => void;
}

export interface UseAuthEventOptions {
  rtdbPath?: string;
  timeoutMs?: number;
  messages?: RealtimeEventMessages;
  realtimeProvider?: IClientRealtimeProvider;
}

const AUTH_EVENT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_RTDB_PATH = "auth_events";

function extractAuthData(raw: RTDBEventPayload): AuthEventData | null {
  if (
    typeof raw.uid !== "string" ||
    typeof raw.role !== "string" ||
    typeof raw.isNewUser !== "boolean"
  ) {
    return null;
  }
  return { isNewUser: raw.isNewUser, uid: raw.uid, role: raw.role };
}

export function useAuthEvent(
  options?: UseAuthEventOptions,
): UseAuthEventReturn {
  const { status, error, data, subscribe, reset } =
    useRealtimeEvent<AuthEventData>({
      type: RealtimeEventType.AUTH,
      rtdbPath: options?.rtdbPath ?? DEFAULT_RTDB_PATH,
      realtimeProvider: options?.realtimeProvider,
      timeoutMs: options?.timeoutMs ?? AUTH_EVENT_TIMEOUT_MS,
      onLogError: (message, err) => logger.error(message, err),
      extractData: extractAuthData,
      messages: {
        tokenFailure: "Failed to initialize sign-in. Please try again.",
        connectionLost: "Sign-in tracking connection was lost.",
        timedOut: "Sign-in timed out. Please try again.",
        failure: "Sign-in failed. Please try again.",
        ...(options?.messages ?? {}),
      },
    });

  return { status, error, data, subscribe, reset };
}
