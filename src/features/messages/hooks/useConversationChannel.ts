"use client"
import { normalizeError } from "../../../errors/normalize";
import { useCallback, useEffect, useRef, useState } from "react";
import { getClientRealtimeProvider, type Unsubscribe } from "../../../contracts/client-realtime";
import { acquireRealtimeSession } from "../../../contracts/realtime-session";

/**
 * D9 — subscribe to `chat_events/{conversationId}` and fire `onPing` on every
 * change. NOT `useRealtimeEvent`: that hook is shaped around a single
 * terminal status (success/failed/timeout) for a one-shot job, while a chat
 * channel is a CONTINUOUS ping — every new message writes to the same node,
 * and there is no "done" state for an open thread.
 *
 * RTDB-ping-plus-REST: this channel carries no message content, only "a
 * message arrived, refetch" — `firestore.rules` forbids a client Firestore
 * listener entirely (`allow read, write: if false` on every document), so
 * this plus the bounded cursor-paginated REST route is the only option.
 *
 * 🛑 Subscribes through the LEASED provider (`acquireRealtimeSession`), never
 * the global one. The old feature's two bugs were both here: it never signed
 * in at all (so every rule evaluated false and the channel was silently
 * inert), and a shared sign-out tore one consumer's session out from under
 * another's. Both are structurally impossible via the lease.
 */
export function useConversationChannel(
  conversationId: string | null,
  getToken: (conversationId: string) => Promise<{ customToken: string; expiresAt: number }>,
  onPing: () => void,
): { error: string | null } {
  const onPingRef = useRef(onPing);
  useEffect(() => {
    onPingRef.current = onPing;
  });

  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);

  const cleanup = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    releaseRef.current?.();
    releaseRef.current = null;
  }, []);

  useEffect(() => {
    if (!conversationId) {
      cleanup();
      return;
    }

    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const token = await getToken(conversationId);
        const lease = await acquireRealtimeSession(`chat:${conversationId}`, () =>
          Promise.resolve(token),
        );
        if (cancelled) {
          lease.release();
          return;
        }
        releaseRef.current = lease.release;

        const provider = lease.provider ?? getClientRealtimeProvider();
        unsubscribeRef.current = provider.subscribe(
          `chat_events/${conversationId}`,
          (snapshot) => {
            if (!snapshot.exists()) return;
            onPingRef.current();
          },
          (err) => {
            // 🛑 Surfaced, never swallowed — the old feature's `// ignore` on
            // this exact error is why it looked implemented and was inert.
            setError("Live updates are unavailable for this conversation.");
            void normalizeError(err);
          },
        );
      } catch (err) {
        if (!cancelled) {
          setError("Could not connect to live updates.");
          void normalizeError(err);
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [conversationId, getToken, cleanup]);

  return { error };
}
