"use client";
import React, { useCallback, useEffect, useRef } from "react";

/**
 * How long a press has to last before it counts as "hold to open" rather than
 * "tap to follow the link". 400ms is the usual long-press threshold — short
 * enough not to feel like a stall, long enough that an ordinary tap never
 * trips it.
 */
export const HOLD_TO_OPEN_MS = 400;

/**
 * useHoldToOpen — press-and-hold a navigation link to open its sub-menu
 * instead of following it.
 *
 * The shared half of the same affordance on two surfaces: the desktop navbar's
 * dropdown and the mobile bottom nav's sheet. Both wrap a REAL link whose tap
 * must still navigate, and both need the `click` that a long press still fires
 * to be swallowed — otherwise the menu opens and the browser immediately
 * navigates away from it, which reads as the gesture doing nothing.
 *
 * 🛑 `held` is a ref, not state. The click handler reads it in the same tick
 * the timer wrote it, and a state update would not have landed yet — the link
 * would follow through on every hold.
 *
 * @param onHold   called once the press passes the threshold (open the menu)
 * @param enabled  false for a link with no children — then every handler is a
 *                 no-op and the link behaves exactly as it did before
 */
export function useHoldToOpen(onHold: () => void, enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);
  const onHoldRef = useRef(onHold);

  // Keep the callback current without re-creating the handlers (and therefore
  // without restarting a press in progress on every parent re-render).
  useEffect(() => {
    onHoldRef.current = onHold;
  }, [onHold]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Clear a pending timer if the item unmounts mid-press — the nav re-renders
  // its item list whenever the listing-type flags or the session resolve.
  useEffect(() => cancel, [cancel]);

  const start = useCallback(() => {
    heldRef.current = false;
    cancel();
    timerRef.current = setTimeout(() => {
      heldRef.current = true;
      onHoldRef.current();
    }, HOLD_TO_OPEN_MS);
  }, [cancel]);

  /**
   * Spread onto the element that wraps (or is) the link. `onClickCapture` is
   * deliberate rather than `onClick`: on the bottom nav the handlers sit on a
   * wrapper around `<NavItem>`, and by the time a bubbled click arrives the
   * anchor's own default is already queued — capture runs before the anchor
   * sees it, so one set of handlers works whether it is spread onto the link
   * itself or onto a container.
   */
  const handlers = enabled
    ? {
        onPointerDown: start,
        onPointerUp: cancel,
        onPointerLeave: cancel,
        onPointerCancel: cancel,
        onClickCapture: (e: React.MouseEvent) => {
          if (!heldRef.current) return;
          e.preventDefault();
          e.stopPropagation();
          heldRef.current = false;
        },
        // A long press on touch otherwise raises the OS link callout over the
        // menu the same gesture just opened.
        onContextMenu: (e: React.MouseEvent) => {
          if (heldRef.current) e.preventDefault();
        },
      }
    : {};

  return handlers;
}
