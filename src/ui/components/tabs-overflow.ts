"use client";
/*
 * WHY: A tab strip that overflows its container needs a visible affordance,
 *      and a thin scrollbar is not one on a touch device or a trackpad. The
 *      arrows this hook drives are in-flow flex siblings of the tablist, which
 *      is what makes the hysteresis below mandatory rather than a nicety.
 *
 * WHAT: Measures whether the tab list overflows, whether it is scrolled to
 *       either end, and exposes a paging scroll. Consumed only by
 *       <TabBarShell>.
 *
 * EXPORTS: useTabsOverflow, TabsOverflowState
 *
 * @tag domain:ui
 * @tag layer:ui
 * @tag pattern:hook
 * @tag access:client
 * @tag consumers:TabBarShell
 * @tag sideEffects:dom-measurement
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface TabsOverflowState {
  /** True only once the client has mounted AND the strip actually overflows. */
  hasArrows: boolean;
  atStart: boolean;
  atEnd: boolean;
}

export interface TabsOverflowApi extends TabsOverflowState {
  scrollByPage: (direction: 1 | -1) => void;
}

/**
 * Slack used by the hysteresis rule below, in px. Matches
 * 2 x --appkit-tabs-arrow-size (2rem) — the width the two in-flow arrows
 * reclaim from the list when they unmount.
 */
const ARROW_SLACK_PX = 64;

/** Sub-pixel tolerance: scrollWidth/clientWidth can differ by <1px at some zooms. */
const EPSILON = 1;

const INITIAL: TabsOverflowState = { hasArrows: false, atStart: true, atEnd: true };

function sameState(a: TabsOverflowState, b: TabsOverflowState): boolean {
  return a.hasArrows === b.hasArrows && a.atStart === b.atStart && a.atEnd === b.atEnd;
}

/**
 * Drives the scroll-arrow affordances on a horizontally scrollable tab list.
 *
 * `activeKey` identifies the currently-selected tab. It exists solely to key
 * the scroll-into-view effect, so the strip repositions when the selection
 * changes and stays put while the user scrolls.
 */
export function useTabsOverflow(
  listRef: React.RefObject<HTMLElement | null>,
  activeKey: string,
): TabsOverflowApi {
  // Starts false and can only become true inside an effect, so the server HTML
  // never contains arrows and always matches the first client render.
  const [state, setState] = useState<TabsOverflowState>(INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;

  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;

    const overflow = el.scrollWidth - el.clientWidth;
    const previous = stateRef.current.hasArrows;

    /*
     * 🛑 HYSTERESIS — do not collapse this to a single threshold.
     *
     * The arrows are IN-FLOW, so mounting them shrinks the list's clientWidth
     * by ~ARROW_SLACK_PX, which INCREASES the measured overflow. With one
     * threshold a strip 10px wider than its container oscillates forever:
     *   hidden -> overflow 10 -> show -> overflow 74 -> still overflowing
     *   -> ... -> hide -> overflow -54 -> hide -> widen -> overflow 10 -> show
     *
     * Once the arrows are up they may only come down if the content would
     * STILL fit after reclaiming their width, which by construction leaves
     * overflow <= 0 afterwards. That makes the rule provably stable.
     */
    const hasArrows = previous ? overflow > ARROW_SLACK_PX : overflow > EPSILON;

    const max = el.scrollWidth - el.clientWidth;
    // Math.abs: scrollLeft is negative (or inverted) in RTL depending on engine.
    const position = Math.abs(el.scrollLeft);
    const next: TabsOverflowState = {
      hasArrows,
      atStart: position <= EPSILON,
      atEnd: max <= EPSILON || position >= max - EPSILON,
    };

    setState((current) => (sameState(current, next) ? current : next));
  }, [listRef]);

  /*
   * Content width — a badge appearing, a locale swapping every label, a tab
   * being added. Deliberately dependency-FREE so it runs after every render:
   * none of those changes is expressible as a dep, and a ResizeObserver on a
   * scroll container fires only for its own box, never for its content. The
   * `sameState` guard in `measure` is what makes this safe — it only calls
   * setState when a value actually changed, so there is no render loop. The
   * cost is two layout READS per render (no writes, so no forced reflow).
   */
  useLayoutEffect(() => {
    measure();
  });

  // Container width: viewport resize, sidebar collapse, drawer open.
  useEffect(() => {
    const el = listRef.current;
    // jsdom does not implement ResizeObserver; appkit/tests/setup.ts stubs it,
    // but guard anyway so the hook is safe in any non-DOM runtime.
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, [listRef, measure]);

  // atStart / atEnd. Passive: this listener never calls preventDefault.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [listRef, measure]);

  // A web-font swap changes every label's width after first paint; without
  // this the initial measurement is taken against the fallback font.
  useEffect(() => {
    let cancelled = false;
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    fonts?.ready?.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [measure]);

  /*
   * Keep the selected tab reachable when it starts off-screen in the strip.
   * Keyed on `activeKey` and NOT run every render — an unconditional scroll
   * would yank the strip back while the user is mid-scroll, fighting their
   * own input.
   *
   * 🛑 This writes the STRIP's own `scrollLeft`. It must never call
   * `scrollIntoView`, which by definition walks every scrollable ancestor and
   * therefore can move the PAGE. `block: "nearest"` is not a sufficient guard:
   * "nearest" only declines to scroll when the element is ALREADY in the
   * viewport, so on mount a tab bar below the fold still drags the whole
   * document down to meet it. That is exactly what happened on the homepage —
   * the FAQ tab strip sits ~11,000px down, and every cold load of `/` landed
   * the visitor at the WhatsApp section instead of the hero.
   */
  const didMountRef = useRef(false);
  useEffect(() => {
    const el = listRef.current;
    const active = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    // Mount is not a tab CHANGE. The initial active tab is wherever the strip
    // already renders it, so there is nothing to bring into view — and doing
    // it anyway is what made this a page-scroll bug rather than a strip one.
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!el || !active) return;
    // Nothing to do when the strip does not overflow; `scrollLeft` would be a
    // no-op anyway, but skipping avoids a pointless layout read.
    if (el.scrollWidth <= el.clientWidth + EPSILON) return;
    const target = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
    el.scrollLeft = Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth));
  }, [listRef, activeKey]);

  const scrollByPage = useCallback(
    (direction: 1 | -1) => {
      const el = listRef.current;
      // Smoothness comes from `scroll-behavior: smooth` in Tabs.style.css,
      // which already has a prefers-reduced-motion override — no JS branch.
      // `?.` because jsdom implements neither scrollBy nor scrollIntoView.
      el?.scrollBy?.({ left: direction * el.clientWidth * 0.8 });
    },
    [listRef],
  );

  return { ...state, scrollByPage };
}
