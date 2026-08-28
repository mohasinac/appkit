"use client"
import { normalizeError } from "../../errors/normalize";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getClientRealtimeProvider,
  type IClientRealtimeProvider,
  type Unsubscribe,
} from "../../contracts/client-realtime";
import { acquireExternalRealtimeLease } from "../../contracts/realtime-session";
import {
  RealtimeEventType,
  RealtimeEventStatus,
  RTDBPayloadStatus,
  type RTDBEventPayload,
  type RealtimeEventMessages,
} from "./realtime-event-constants";

// Re-exported for existing client import paths — the canonical definitions
// now live in realtime-event-constants.ts (a plain, non-"use client" module)
// so server code can import them without hitting the client-reference
// substitution Next.js applies to "use client" module exports. See that
// file's comment for the full story.
export {
  RealtimeEventType,
  RealtimeEventStatus,
  RTDBPayloadStatus,
  type RTDBEventPayload,
  type RealtimeEventMessages,
};

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
  // Re-sync every render — callers commonly pass a fresh config object
  // (new extractData/messages/onLogError) each render, and subscribe()/
  // cleanup() only ever read configRef.current, so without this the very
  // first render's config would be captured forever.
  useEffect(() => {
    configRef.current = config;
  });

  const [status, setStatus] = useState<RealtimeEventStatus>(
    RealtimeEventStatus.IDLE,
  );
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventIdRef = useRef<string | null>(null);
  /** Lease on the shared realtime session — see cleanup() for why. */
  const releaseSessionRef = useRef<(() => void) | null>(null);

  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // 🛑 Deliberately NO provider.signOut() here.
    //
    // `FirebaseClientRealtimeProvider` is a SINGLETON on the shared
    // "letitrip-realtime" app, so signing out is a global act. When a bulk job
    // finished, this line tore the session out from under any admin chat or
    // conversation subscription that was still open — and in reverse, those
    // channels' tokens overwrote an in-flight bulk token. Whoever finished
    // last broke whoever was still working.
    //
    // Sessions are reference-counted now (contracts/realtime-session.ts); the
    // release returned by `acquireRealtimeSession` is the only thing that may
    // end one, and only once the last consumer has let go.
    releaseSessionRef.current?.();
    releaseSessionRef.current = null;
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
          // Hold a lease for as long as this subscription lives. This hook owns
          // its own sign-in (the token carries a job-scoped `bulkJobId` claim),
          // but it must still participate in the ref-count so its cleanup
          // cannot end a session another channel is relying on.
          releaseSessionRef.current = acquireExternalRealtimeLease();
        } catch (authErr) {
          void normalizeError(authErr);
          onLogError?.(
            `useRealtimeEvent[${type}]: custom token sign-in failed`,
            authErr,
          );
          // A newer subscribe() call for a different eventId may have already
          // superseded this one (and possibly already fully subscribed) while
          // this sign-in was still in flight. Do NOT call cleanup() here —
          // cleanup() tears down whatever is *currently* registered in the
          // shared refs, which by now may be the newer call's live
          // subscription, not anything this stale call ever set up itself.
          if (eventIdRef.current !== eventId) {
            return;
          }
          setError(msg.tokenFailure);
          setStatus(RealtimeEventStatus.FAILED);
          cleanup();
          return;
        }

        if (eventIdRef.current !== eventId) {
          // Same reasoning as the catch branch above — don't tear down a
          // newer call's already-live subscription via the shared refs.
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
