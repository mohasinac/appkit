"use client";

import { normalizeError } from "../../../errors/normalize";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Brand-neutral localStorage namespace, matching the `appkit:theme-mode` /
// `appkit:theme-id` convention. audit-ssr-in-appkit blocks hardcoded brand
// strings inside `_internal/`.
const HAND_STORAGE_KEY = "appkit:hand-mode";

export type HandMode = "left" | "right";

export interface HandModeContextValue {
  /** Which side CTA panels/drawers/sidebars dock to and where close buttons sit. */
  hand: HandMode;
  /** Persist a new hand-mode preference and re-render the flipped layout. */
  setHand: (next: HandMode) => void;
  /** Flip preference between right ↔ left. */
  toggleHand: () => void;
}

// Default (non-null) context value — unlike `ThemeContext` (which throws
// outside its provider because it's only ever consumed at the app-shell
// level), `useHandMode()` is called from base UI primitives (SideDrawer,
// Modal, Drawer, BackToTop, ...) that ship as part of the public design
// system and must degrade gracefully to the "right" default for any
// consumer that hasn't mounted `<HandModeProvider>`.
const DEFAULT_CONTEXT_VALUE: HandModeContextValue = {
  hand: "right",
  setHand: () => {},
  toggleHand: () => {},
};

const HandModeContext = createContext<HandModeContextValue>(DEFAULT_CONTEXT_VALUE);

function readHandPreference(): HandMode {
  if (typeof window === "undefined") return "right";
  try {
    const stored = window.localStorage.getItem(HAND_STORAGE_KEY);
    if (stored === "left" || stored === "right") return stored;
  } catch (_err) {
    void normalizeError(_err); /* localStorage unavailable in privacy/iframe context */
  }
  return "right";
}

/** Apply the hand-mode preference to `<html>` via a `data-hand` attribute.
 * Deliberately NOT `dir="rtl"/"ltr"` — that would trigger the browser's
 * bidi text-direction and native-control-mirroring behavior repo-wide, which
 * is not what this "reachability" preference means. `data-hand` is a plain
 * presentational attribute, same category as `data-theme`. */
function applyHand(hand: HandMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-hand", hand);
}

export interface HandModeProviderProps {
  /**
   * Seed value from the signed-in user's server-persisted preference
   * (`user.uiPreferences.handMode`), used only when no value is already
   * cached in localStorage on this device.
   */
  initialHand?: HandMode;
  children: ReactNode;
}

export function HandModeProvider({ initialHand, children }: HandModeProviderProps) {
  const [hand, setHandState] = useState<HandMode>(() => {
    if (typeof window === "undefined") return initialHand ?? "right";
    const stored = readHandPreference();
    // readHandPreference() falls back to "right" when nothing is cached —
    // in that case, prefer the server-seeded value over the hardcoded default.
    try {
      if (window.localStorage.getItem(HAND_STORAGE_KEY) === null) {
        return initialHand ?? stored;
      }
    } catch (_err) {
      // localStorage unavailable (private-browse) — fall through to the value
      // readHandPreference() already resolved; there is no preference to honour.
      void normalizeError(_err);
    }
    return stored;
  });

  useEffect(() => {
    applyHand(hand);
  }, [hand]);

  const setHand = useCallback((next: HandMode) => {
    setHandState(next);
    try {
      window.localStorage.setItem(HAND_STORAGE_KEY, next);
    } catch (_err) {
      void normalizeError(_err); /* localStorage unavailable; preference applies for this session */
    }
  }, []);

  const toggleHand = useCallback(() => {
    setHand(hand === "left" ? "right" : "left");
  }, [hand, setHand]);

  const value = useMemo<HandModeContextValue>(
    () => ({ hand, setHand, toggleHand }),
    [hand, setHand, toggleHand],
  );

  return <HandModeContext.Provider value={value}>{children}</HandModeContext.Provider>;
}

export function useHandMode(): HandModeContextValue {
  return useContext(HandModeContext);
}
