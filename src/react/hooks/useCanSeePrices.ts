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
/**
 * 🛑 THE switch. `false` = prices are public; `true` restores the sign-in gate
 * described above, with no other edit anywhere.
 *
 * Turned off 2026-10-20: a catalogue that will not show a price to a visitor
 * who has not signed in loses the visitor, not the scraper — the price is in
 * the RSC payload and in `GET /api/products` either way (the "accepted
 * residue" in CLAUDE.md), so the gate only ever cost real buyers.
 *
 * Every call site, wrapper and three-state branch below is left INTACT rather
 * than ripped out, because that is what makes this one boolean a real switch
 * instead of a rewrite. Two things outside this file move with it, and must
 * move back if it is ever flipped:
 *   · `gatedPriceWebPageJsonLd()` — dropped from the product and collector drop
 *     pages. `isAccessibleForFree: false` over a price anyone can read is a
 *     false declaration to a crawler, which is the exact mismatch the node was
 *     added to prevent, pointed the other way.
 *   · `audit-guest-price-leak` R3 — the rule that REQUIRES that pairing.
 */
const GUEST_PRICE_GATE_ENABLED = false;

export function useCanSeePrices(): CanSeePricesState {
  // Called unconditionally: hook order cannot depend on a build-time flag.
  const session = useOptionalSession();

  // Gate off — everyone sees prices, and nothing is "resolving", so no surface
  // is left holding a neutral placeholder waiting for a session it never needs.
  if (!GUEST_PRICE_GATE_ENABLED) return { canSeePrices: true, isAuthResolving: false };

  // No provider: fail closed, and don't claim to be mid-resolution — there is
  // nothing in flight that will ever change the answer.
  if (!session) return { canSeePrices: false, isAuthResolving: false };

  return {
    canSeePrices: Boolean(session.user?.uid),
    isAuthResolving: session.loading,
  };
}
