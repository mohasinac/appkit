"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getClientRealtimeProvider,
  type IClientRealtimeProvider,
  type Unsubscribe,
} from "../../contracts/client-realtime";

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
  [key: string]: unknown;
}

export interface RealtimeEventMessages {
  tokenFailure?: string;
  connectionLost?: string;
  timedOut?: string;
  failure?: string;
}

export interface UseRealtimeEventConfig<TData = undefined> {
  type: RealtimeEventType;
  rtdbPath: string;
  /** Optional provider override. Falls back to the globally registered provider. */
  realtimeProvider?: IClientRealtimeProvider;
  timeoutMs?: number;
  extractData?: (raw: RTDBEventPayload) => TData | null;
  messages?: RealtimeEventMessages;
  onLogError?: (message: string, error: unknown) => void;
}

export interface UseRealtimeEventReturn<TData = undefined> {
  status: RealtimeEventStatus;
  error: string | null;
  data: TData | null;
  subscribe: (eventId: string, customToken: string) => void;
  reset: () => void;
}

const DEFAULT_TIMEOUT_MS = 3 * 60 * 1000;
const DEFAULT_MESSAGES: Required<RealtimeEventMessages> = {
  tokenFailure: "Failed to initialize realtime tracking.",
  connectionLost: "Realtime connection lost.",
  timedOut: "Operation timed out.",
  failure: "Operation failed.",
};

export function useRealtimeEvent<TData = undefined>(
  config: UseRealtimeEventConfig<TData>,
): UseRealtimeEventReturn<TData> {
  const configRef = useRef(config);

  const [status, setStatus] = useState<RealtimeEventStatus>(
    RealtimeEventStatus.IDLE,
  );
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const provider =
      configRef.current.realtimeProvider ?? getClientRealtimeProvider();
    provider.signOut().catch(() => {
      // no-op
    });
  }, []);

  const subscribe = useCallback(
    (eventId: string, customToken: string) => {
      const {
        type,
        rtdbPath,
        realtimeProvider,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        extractData,
        messages,
        onLogError,
      } = configRef.current;

      const provider = realtimeProvider ?? getClientRealtimeProvider();

      const msg = {
        ...DEFAULT_MESSAGES,
        ...(messages ?? {}),
      };

      cleanup();
      eventIdRef.current = eventId;
      setStatus(RealtimeEventStatus.SUBSCRIBING);
      setError(null);
      setData(null);

      (async () => {
        try {
          await provider.signInWithToken(customToken);
        } catch (authErr) {
          onLogError?.(
            `useRealtimeEvent[${type}]: custom token sign-in failed`,
            authErr,
          );
          setError(msg.tokenFailure);
          setStatus(RealtimeEventStatus.FAILED);
          cleanup();
          return;
        }

        if (eventIdRef.current !== eventId) {
          cleanup();
          return;
        }

        setStatus(RealtimeEventStatus.PENDING);

        unsubscribeRef.current = provider.subscribe(
          `${rtdbPath}/${eventId}`,
          (snapshot) => {
            if (!snapshot.exists()) return;
            const raw = snapshot.val() as RTDBEventPayload | null;
            if (!raw) return;

            if (raw.status === RTDBPayloadStatus.SUCCESS) {
              cleanup();
              if (extractData) setData(extractData(raw));
              setStatus(RealtimeEventStatus.SUCCESS);
            } else if (
              raw.status === RTDBPayloadStatus.FAILED ||
              raw.status === RTDBPayloadStatus.ERROR
            ) {
              cleanup();
              setError(raw.error ?? msg.failure);
              setStatus(RealtimeEventStatus.FAILED);
            }
          },
          (rtdbErr) => {
            onLogError?.(
              `useRealtimeEvent[${type}]: RTDB subscription error`,
              rtdbErr,
            );
            cleanup();
            setError(msg.connectionLost);
            setStatus(RealtimeEventStatus.FAILED);
          },
        );

        timeoutRef.current = setTimeout(() => {
          cleanup();
          setStatus(RealtimeEventStatus.TIMEOUT);
          setError(msg.timedOut);
        }, timeoutMs);
      })();
    },
    [cleanup],
  );

  const reset = useCallback(() => {
    cleanup();
    eventIdRef.current = null;
    setStatus(RealtimeEventStatus.IDLE);
    setError(null);
    setData(null);
  }, [cleanup]);

  useEffect(
    () => () => {
      cleanup();
    },
    [cleanup],
  );

  return { status, error, data, subscribe, reset };
}
