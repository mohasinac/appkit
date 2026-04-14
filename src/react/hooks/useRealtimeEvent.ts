"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ref,
  onValue,
  type Database,
  type DatabaseReference,
} from "firebase/database";
import { getAuth, signInWithCustomToken, signOut } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";

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

export interface RTDBEventPayload {
  status: "pending" | "success" | "failed" | "error";
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
  realtimeApp: FirebaseApp;
  realtimeDb: Database;
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

  const dbRefRef = useRef<DatabaseReference | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    dbRefRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    signOut(getAuth(configRef.current.realtimeApp)).catch(() => {
      // no-op
    });
  }, []);

  const subscribe = useCallback(
    (eventId: string, customToken: string) => {
      const {
        type,
        rtdbPath,
        realtimeApp,
        realtimeDb,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        extractData,
        messages,
        onLogError,
      } = configRef.current;

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
          await signInWithCustomToken(getAuth(realtimeApp), customToken);
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

        const dbRef = ref(realtimeDb, `${rtdbPath}/${eventId}`);
        dbRefRef.current = dbRef;

        unsubscribeRef.current = onValue(
          dbRef,
          (snapshot) => {
            if (!snapshot.exists()) return;
            const raw = snapshot.val() as RTDBEventPayload | null;
            if (!raw) return;

            if (raw.status === "success") {
              cleanup();
              if (extractData) setData(extractData(raw));
              setStatus(RealtimeEventStatus.SUCCESS);
            } else if (raw.status === "failed" || raw.status === "error") {
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
