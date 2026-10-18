"use client";
/*
 * WHY: Deciding "does this row fit" by COUNTING items is wrong in both
 *      directions, and this codebase shipped that mistake for a long time:
 *      `TabsList` collapsed past five tabs, so four long labels still
 *      overflowed a phone and eight short ones collapsed a desktop that had
 *      room to spare. Width is the only input that answers the question.
 *
 *      The hard part is that collapsing DESTROYS the evidence. Once the row is
 *      replaced by a trigger there is no row left to measure, so a naive
 *      implementation can never expand again on a wider viewport — it is a
 *      one-way door. This caches the row's natural width while it is still
 *      rendered, which is what makes the decision reversible.
 *
 * WHAT: Measures whether a row's content is wider than its container, and
 *       stays correct across resizes in BOTH directions. Consumed by
 *       <OverflowRow> and <TabsList>.
 *
 * EXPORTS: useRowCollapse
 *
 * @tag domain:ui
 * @tag layer:ui
 * @tag pattern:hook
 * @tag access:client
 * @tag consumers:OverflowRow,TabsList
 * @tag sideEffects:dom-measurement
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Sub-pixel tolerance — scrollWidth/clientWidth differ by <1px at some zoom levels. */
const EPSILON = 1;

/**
 * Extra room required to EXPAND again, in px.
 *
 * 🛑 Deliberately not symmetric with the collapse threshold, and must not be
 * made so. Collapsing removes the row, so the only width left to compare
 * against is the cached natural width — which makes the two states adjacent:
 * at exactly the boundary the row collapses, the shell reflows a few px wider
 * without the row's own padding, the cached width now "fits", it expands, the
 * padding returns, it overflows, it collapses… forever.
 *
 * Requiring a clear margin to come back makes the rule provably stable. This
 * is the same hysteresis `tabs-overflow.ts` needs for its in-flow arrows, for
 * the same underlying reason.
 */
const EXPAND_SLACK_PX = 48;

export interface UseRowCollapseOptions {
  /** Skip measurement entirely and pin the result. */
  disabled?: boolean;
  /** Start collapsed. The server never measures, so this must match the SSR markup. */
  initial?: boolean;
}

/**
 * True when `rowRef`'s content is wider than `shellRef`'s box.
 *
 * `signature` must change whenever the row's content changes (item ids,
 * labels, counts). A new item set has a different natural width, so the
 * cached one becomes a lie and has to be discarded — without this a row that
 * grew from 3 items to 30 would stay expanded against a stale measurement.
 */
export function useRowCollapse(
  shellRef: React.RefObject<HTMLElement | null>,
  rowRef: React.RefObject<HTMLElement | null>,
  signature: string,
  { disabled = false, initial = false }: UseRowCollapseOptions = {},
): boolean {
  // Starts at `initial` and can only change inside an effect, so the server
  // HTML and the first client render always agree.
  const [collapsed, setCollapsed] = useState(initial);

  const naturalWidthRef = useRef<number | null>(null);
  const lastSignatureRef = useRef(signature);
  if (lastSignatureRef.current !== signature) {
    lastSignatureRef.current = signature;
    naturalWidthRef.current = null;
  }

  const measure = useCallback(() => {
    if (disabled) return;
    const shell = shellRef.current;
    if (!shell) return;
    const available = shell.clientWidth;
    // A zero-width container means "not laid out yet" (display:none, a closed
    // drawer). Measuring it would collapse every row on the page.
    if (available <= 0) return;

    const row = rowRef.current;
    if (row) {
      const natural = row.scrollWidth;
      naturalWidthRef.current = natural;
      if (natural > available + EPSILON) setCollapsed(true);
      return;
    }

    // Collapsed: the row is gone. The cached width is the only evidence of
    // what expanding would cost.
    const natural = naturalWidthRef.current;
    if (natural == null) return;
    if (available >= natural + EXPAND_SLACK_PX) setCollapsed(false);
  }, [disabled, shellRef, rowRef]);

  /*
   * Content width — a count appearing, a locale swapping every label.
   * Dependency-free so it runs after every render: none of those is
   * expressible as a dep, and a ResizeObserver on the shell fires for its own
   * box, never for its content. Safe because `measure` only calls setState on
   * an actual change, so there is no render loop. Two layout READS per render,
   * no writes, so no forced reflow.
   */
  useLayoutEffect(() => {
    measure();
  });

  // Container width: viewport resize, sidebar collapse, drawer open.
  useEffect(() => {
    const shell = shellRef.current;
    // jsdom does not implement ResizeObserver; guard so the hook is safe in
    // any non-DOM runtime.
    if (!shell || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(shell);
    return () => observer.disconnect();
  }, [shellRef, measure]);

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

  return disabled ? initial : collapsed;
}
