"use client";

import { useOptionalSession } from "../contexts/SessionContext";

export interface CanSeePricesState {
  /** The viewer is signed in and may be shown money amounts. */
  canSeePrices: boolean;
  /**
   * The session has not resolved yet. Render a neutral placeholder while this
   * is true — NEVER the sign-in prompt. See the note below.
   */
  isAuthResolving: boolean;
}

/**
 * May the current viewer be shown money amounts on a public listing surface?
 *
 * Prices, current bids, deposits and per-entry amounts are hidden from
 * signed-out visitors so the catalogue cannot be read at scale without an
 * account. Signed-in users see everything exactly as before.
 *
 * ## Why there are THREE states, not two
 *
 * `SessionProvider` is mounted `initialUser={null}` because the root locale
 * layout must stay static (Root Cause #82), so `loading` starts `true` on every
 * hard load — for signed-in users too, until Firebase persistence resolves and
 * `/api/user/profile` returns. A naive `!user` test therefore renders
 * "Sign in to see price" at an already-signed-in user for several hundred
 * milliseconds on every page load.
 *
 * So: `isAuthResolving` means "don't know yet" and must render a neutral
 * placeholder. Only `canSeePrices === false && isAuthResolving === false` is a
 * confirmed guest.
 *
 * ## Why `useOptionalSession`
 *
 * This is library code that ADJUSTS for the viewer rather than requiring one.
 * `useSession()` throws without a provider, which would turn an optional
 * refinement into a breaking contract for every consumer (Root Cause #20). With
 * no provider we fail CLOSED — no session means no prices.
 */
export function useCanSeePrices(): CanSeePricesState {
  const session = useOptionalSession();

  // No provider: fail closed, and don't claim to be mid-resolution — there is
  // nothing in flight that will ever change the answer.
  if (!session) return { canSeePrices: false, isAuthResolving: false };

  return {
    canSeePrices: Boolean(session.user?.uid),
    isAuthResolving: session.loading,
  };
}
