import { normalizeError } from "../errors/normalize";
import { getClientRealtimeProvider } from "./client-realtime";

/**
 * Shared, REFERENCE-COUNTED sign-in for the one client realtime app.
 *
 * WHY THIS EXISTS — two distinct bugs, one cause.
 *
 * 1. **Nobody signed in for messaging.** `useConversation` and
 *    `useConversations` subscribed to `chats/...` without ever calling
 *    `signInWithToken`, so `auth == null` and both RTDB rules evaluated false.
 *    Every buyer↔seller live update was permission-denied, and both hooks
 *    swallowed it (one into `setIsConnected(false)`, one into a literal
 *    `// ignore`), so the channel looked implemented and was inert. Only
 *    `useChat` and `useRealtimeEvent` ever authenticated.
 *
 * 2. **Signing out is a SHARED action.** `FirebaseClientRealtimeProvider` is
 *    registered once, as a singleton on the `"letitrip-realtime"` app. So
 *    `useRealtimeEvent.cleanup()` calling `provider.signOut()` when a bulk job
 *    finished tore the session out from under an admin chat that was still
 *    open — and, in reverse, `useChat`'s token (carrying `chatIds`) overwrote a
 *    bulk token (carrying `bulkJobId`), killing an in-flight job subscription.
 *    Whoever finished last broke whoever was still working.
 *
 * The fix for (2) is not "sign out more carefully" — it is that **no individual
 * consumer may decide to sign out at all**. Each acquires a lease and releases
 * it; the session ends only when the last lease is gone.
 *
 * Tokens differ per channel (different claims), so `acquire` takes a fetcher and
 * re-signs when the token it holds is for a different scope or has expired.
 */

/** Refresh a little early — a token that expires mid-subscription is a silent drop. */
const EXPIRY_SKEW_MS = 60_000;

interface Lease {
  scope: string;
}

let leases = 0;
let currentScope: string | null = null;
let expiresAt = 0;
let inFlight: Promise<void> | null = null;

export interface RealtimeToken {
  customToken: string;
  expiresAt: number;
}

/**
 * Ensure the shared realtime app is signed in for `scope`, and take a lease.
 *
 * @param scope    an identifier for the claim set (e.g. `"messages"`,
 *                 `"chat:<id>"`). Signing in again for the SAME scope while a
 *                 valid token is held is a no-op.
 * @param getToken fetches a fresh custom token. Called only when needed.
 * @returns a release function. **Always call it** — the session is only torn
 *          down when every lease is released.
 */
export async function acquireRealtimeSession(
  scope: string,
  getToken: () => Promise<RealtimeToken>,
): Promise<() => void> {
  const lease: Lease = { scope };
  leases++;

  const needsSignIn =
    currentScope !== lease.scope || Date.now() > expiresAt - EXPIRY_SKEW_MS;

  if (needsSignIn) {
    // Collapse concurrent acquires — several hooks mount in the same tick and
    // would otherwise each fetch a token and race to sign in.
    inFlight ??= (async () => {
      try {
        const token = await getToken();
        await getClientRealtimeProvider().signInWithToken(token.customToken);
        currentScope = lease.scope;
        expiresAt = token.expiresAt;
      } finally {
        inFlight = null;
      }
    })();
    await inFlight;
  }

  let released = false;
  return () => {
    if (released) return; // React StrictMode double-invokes cleanups
    released = true;
    leases = Math.max(0, leases - 1);
    if (leases > 0) return;

    currentScope = null;
    expiresAt = 0;
    getClientRealtimeProvider()
      .signOut()
      .catch((err: unknown) => {
        void normalizeError(err);
      });
  };
}

/** Test/diagnostic only. */
export function activeRealtimeLeases(): number {
  return leases;
}
