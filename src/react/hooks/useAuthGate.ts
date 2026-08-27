"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "../contexts/SessionContext";
import { useSiteSettings } from "../../core/hooks/useSiteSettings";
import { ACTION_META } from "../../features/products/constants/action-defs";
import type { ActionId } from "../../features/products/constants/action-defs";

const DEFAULT_MSG = "You need to be signed in to continue.";
const DISABLED_MSG = "This action is currently unavailable.";
const PERMISSION_MSG = "You don't have permission to perform this action.";

/**
 * Ceiling on how long a click may sit parked waiting for the session to resolve.
 *
 * `SessionContext` settles after Firebase persistence resolves AND one
 * `/api/user/profile` round-trip returns. If that never happens (offline, a
 * dead adapter) we fall back to the signed-out answer rather than eating the
 * click forever — a button that never responds is worse than a wrong modal.
 */
const AUTH_RESOLVE_TIMEOUT_MS = 8000;

type ParkedRequest = { actionId: ActionId; fn: () => void | Promise<void> };
type ActionConfigSettings = {
  actionConfig?: Record<string, { enabled: boolean }>;
};

export interface UseAuthGateReturn {
  requireAuth: (actionId: ActionId, fn: () => void | Promise<void>) => void;
  /**
   * True while the session is still resolving, or while a click is parked
   * waiting on it. Drive a spinner / disabled state from this — do NOT use it
   * to hide the control, or the user loses the affordance mid-page-load.
   */
  isAuthResolving: boolean;
  modalOpen: boolean;
  modalMessage: string;
  closeModal: () => void;
}

/**
 * The single auth/permission gate behind every CTA in the app.
 *
 * 🛑 `loading` is load-bearing and must never be dropped again.
 *
 * This hook used to read only `user` from the session. `SessionProvider` is
 * mounted with `initialUser={null}` (the root locale layout is static and must
 * stay that way), so on every hard load `user` is `null` and `loading` is
 * `true` until Firebase persistence + a profile fetch resolve. Reading `user`
 * alone made that window indistinguishable from "signed out": a signed-in user
 * clicking a wishlist heart in the first ~800ms got "You need to be signed in".
 *
 * A click that arrives during that window is PARKED and replayed once the
 * session settles — not dropped. Dropping it is indistinguishable from a dead
 * button, which is the failure mode this hook is supposed to prevent.
 */
export function useAuthGate(): UseAuthGateReturn {
  const { user, loading } = useAuth();
  const { data: settings } = useSiteSettings<ActionConfigSettings>();
  const [state, setState] = useState({ open: false, message: "" });
  const [parked, setParked] = useState(false);

  const parkedRef = useRef<ParkedRequest | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * The gate decision itself. Only ever called once the session has resolved,
   * and re-created whenever `user`/`settings` change — which is what keeps a
   * replayed click from being judged against a stale session.
   */
  const evaluate = useCallback(
    (actionId: ActionId, fn: () => void | Promise<void>) => {
      const meta = ACTION_META[actionId];
      const enabled =
        settings?.actionConfig?.[actionId]?.enabled ??
        meta?.defaultEnabled ??
        true;
      if (!enabled) {
        setState({ open: true, message: DISABLED_MSG });
        return;
      }
      if (meta?.requiresAuth && !user?.uid) {
        setState({ open: true, message: meta.authMessage ?? DEFAULT_MSG });
        return;
      }
      if (
        meta?.requiredPermission &&
        !user?.permissions?.includes(meta.requiredPermission)
      ) {
        setState({ open: true, message: PERMISSION_MSG });
        return;
      }
      void fn();
    },
    [user, settings],
  );

  const requireAuth = useCallback(
    (actionId: ActionId, fn: () => void | Promise<void>) => {
      if (loading) {
        // Park only {actionId, fn} — the caller's click closure is preserved
        // verbatim, while the gate's own view of the session is re-read at
        // drain time via `evaluate`.
        parkedRef.current = { actionId, fn };
        setParked(true);
        clearTimer();
        timerRef.current = setTimeout(() => {
          parkedRef.current = null;
          setParked(false);
          setState({
            open: true,
            message: ACTION_META[actionId]?.authMessage ?? DEFAULT_MSG,
          });
        }, AUTH_RESOLVE_TIMEOUT_MS);
        return;
      }
      evaluate(actionId, fn);
    },
    [loading, evaluate, clearTimer],
  );

  // Drain the parked click with a FRESH user/settings closure. The ref is
  // nulled before `evaluate` runs, so an extra effect pass is a no-op.
  useEffect(() => {
    if (loading) return;
    const request = parkedRef.current;
    if (!request) return;
    parkedRef.current = null;
    clearTimer();
    setParked(false);
    evaluate(request.actionId, request.fn);
  }, [loading, evaluate, clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const closeModal = useCallback(
    () => setState((s) => ({ ...s, open: false })),
    [],
  );

  return {
    requireAuth,
    isAuthResolving: loading || parked,
    modalOpen: state.open,
    modalMessage: state.message,
    closeModal,
  };
}
