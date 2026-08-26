"use client";
import { createContext, useContext } from "react";

/**
 * "Am I rendering inside a Modal or a SideDrawer?"
 *
 * WHY: route-level chrome must not attach itself to content that is floating
 * above the route. The concrete case is `useFormBottomActions` — a form on a
 * page publishes its Save/Cancel row and its error sheet into the fixed
 * `BottomChrome` tier, which is correct there and wrong inside an overlay:
 * the overlay already owns a footer, and a bar pinned to the viewport bottom
 * would sit *behind* the backdrop, below the very dialog it belongs to.
 *
 * Detection has to come from the overlay itself. There is no way to infer it
 * from the DOM at render time (both portal elsewhere), and asking every form
 * to declare where it is being rendered is the kind of convention that is one
 * forgetful call site away from a bar appearing under a backdrop.
 *
 * Mounted by `Modal` and `SideDrawer`. Default `false`, so a component outside
 * any overlay — the overwhelmingly common case — needs no provider at all.
 */
export const OverlayContext = createContext(false);

/** True when the calling component is rendered inside a Modal or SideDrawer. */
export function useIsInsideOverlay(): boolean {
  return useContext(OverlayContext);
}
