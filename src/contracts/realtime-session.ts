import { normalizeError } from "../errors/normalize";
import {
  getClientRealtimeProvider,
  type IClientRealtimeProvider,
} from "./client-realtime";

/**
 * PER-SCOPE, reference-counted sign-in for the client realtime channels.
 *
 * Each claim scope gets its own Firebase app (via `provider.forScope`), because
 * Firebase Auth state is per-app and two channels legitimately need two
 * different claim sets at the same time.
 *
 * WHY THIS EXISTS — two distinct bugs, one cause.
 *
 * 🛑 Both examples below are HISTORICAL: buyer↔seller messaging was deleted
 * 2026-08-31, so `useConversation` / `useConversations` / `useChat` and the
 * `chats/*` and `chat/*` RTDB paths no longer exist — don't go looking for
 * them. The mechanism is not historical. `auth_events`, `payment_events` and
 * `bulk_events` are all still live, still concurrent, and still each need their
 * own claim scope, which is the whole reason this file is here.
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
 * (2) needed BOTH halves, and only one was done at first:
 *   - sign-OUT: no consumer may decide to sign out. Each takes a lease; the
 *     session ends only when the last lease for that scope is gone.
 *   - sign-IN: ref-counting cannot help here, because nothing is being shared
 *     by agreement — a bulk job and a message thread need different claims
 *     simultaneously. The answer is separate apps, not coordination.
 *
 * 🛑 Subscribe through `lease.provider`, never `getClientRealtimeProvider()`.
 * The global one is the root app; the lease's is the app your scope actually
 * authenticated on.
 */

/** Refresh a little early — a token that expires mid-subscription is a silent drop. */
const EXPIRY_SKEW_MS = 60_000;

interface ScopeState {
  leases: number;
  expiresAt: number;
  inFlight: Promise<void> | null;
  provider: IClientRealtimeProvider;
}

/**
 * One entry per claim scope, each on its OWN Firebase app.
 *
 * 🛑 This used to be three module-level singletons — `currentScope`,
 * `expiresAt`, `leases` — describing ONE shared app. That shape could not
 * express the real situation: two channels legitimately need two different
 * claim sets at the same time, and Firebase Auth state is per-app, so every
 * sign-in replaced the previous one's claims. Ref-counting only stopped a
 * finishing channel from signing the others OUT; it could not stop a starting
 * channel from signing itself IN over them.
 */
const scopes = new Map<string, ScopeState>();

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
export interface RealtimeLease {
  /**
   * Subscribe through THIS provider, not the global one — it is bound to the
   * app this scope signed in on. Using the global provider would read from an
   * app with someone else's claims.
   */
  provider: IClientRealtimeProvider;
  release: () => void;
}

export async function acquireRealtimeSession(
  scope: string,
  getToken: () => Promise<RealtimeToken>,
): Promise<RealtimeLease> {
  const root = getClientRealtimeProvider();
  let state = scopes.get(scope);
  if (!state) {
    // `forScope` is optional on the contract: a provider that cannot isolate
    // falls back to the shared app, which is the old behaviour rather than a
    // crash.
    state = {
      leases: 0,
      expiresAt: 0,
      inFlight: null,
      provider: root.forScope?.(scope) ?? root,
    };
    scopes.set(scope, state);
  }
  state.leases++;

  if (Date.now() > state.expiresAt - EXPIRY_SKEW_MS) {
    // Collapse concurrent acquires for the SAME scope — several hooks mount in
    // one tick and would otherwise each fetch a token and race to sign in.
    state.inFlight ??= (async () => {
      try {
        const token = await getToken();
        await state!.provider.signInWithToken(token.customToken);
        state!.expiresAt = token.expiresAt;
      } finally {
        state!.inFlight = null;
      }
    })();
    await state.inFlight;
  }

  let released = false;
  return {
    provider: state.provider,
    release: () => {
      if (released) return; // React StrictMode double-invokes cleanups
      released = true;
      const cur = scopes.get(scope);
      if (!cur) return;
      cur.leases = Math.max(0, cur.leases - 1);
      if (cur.leases > 0) return;

      // Last holder of THIS scope. Signing out touches only this scope's app,
      // so it cannot disturb any other channel.
      cur.expiresAt = 0;
      scopes.delete(scope);
      cur.provider.signOut().catch((err: unknown) => {
        void normalizeError(err);
      });
    },
  };
}

/** Test/diagnostic only — total leases across every scope. */
export function activeRealtimeLeases(): number {
  let total = 0;
  for (const s of scopes.values()) total += s.leases;
  return total;
}
