"use client";

/**
 * BottomActionsContext
 *
 * Provides a context for registering page-level mobile action bars.
 * Features call `useBottomActions` to push actions; the `<BottomActions>`
 * layout component reads this context and renders the bar above BottomNavbar.
 *
 * Supports two modes:
 *  - Page mode: primary page actions (Add to Cart, Buy Now, Place Bid, etc.)
 *  - Bulk mode: activated when sieveFilter("bulk.selectedCount", SIEVE_OP.GT, "0") — shows selection
 *    count + custom bulk action buttons (Delete, Archive, Export, etc.)
 *
 * @example — product detail page
 * ```tsx
 * useBottomActions({
 * actions: [
 * { id: "wishlist", icon: <Heart className="w-4 h-4" />, label: t("wishlist"), variant: "ghost", onClick: handleWishlist },
 * { id: "cart", label: t("addToCart"), variant: "outline", onClick: handleAddToCart },
 * { id: "buy", label: t("buyNow"), variant: "primary", onClick: handleBuyNow },
 * ],
 * });
 * ```
 *
 * @example — admin listing with bulk select
 * ```tsx
 * useBottomActions({
 * bulk: {
 * selectedCount: selectedIds.length,
 * onClearSelection: () => setSelectedIds([]),
 * actions: [
 * { id: "delete", label: t("bulkDelete", { count: selectedIds.length }), variant: "danger", onClick: handleBulkDelete },
 * ],
 * },
 * });
 * ```
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ButtonProps } from "../../ui";

// --- Types --------------------------------------------------------------------

export interface BottomAction {
  /** Stable unique key (used as React key). */
  id: string;
  /** Button label — use `useTranslations()` output. */
  label?: string;
  /** Optional leading icon (e.g., `<Heart className="w-4 h-4" />`). */
  icon?: React.ReactNode;
  /** Button variant — defaults to "primary". */
  variant?: ButtonProps["variant"];
  /** Small count/badge overlay rendered in the top-right corner of the button. */
  badge?: string | number;
  /** Called when the user taps the action. */
  onClick: () => void;
  /** Whether the button is disabled. */
  disabled?: boolean;
  /** Show spinner inside the button. */
  loading?: boolean;
  /*
   * 🛑 There is deliberately no `grow` here.
   *
   * It used to mean "size me to my content" (false) or "take the leftover"
   * (true). Under ActionRow's content-proportional sizing BOTH are the
   * default: every action starts at its own label's width and shares only what
   * is left over. The one residual meaning — "refuse a share of the leftover" —
   * is a ROW-level decision (`<ActionRow align="end">`), not a per-action one.
   * Letting a single action opt out while its neighbours did not is exactly how
   * `Back` came to render as a 44px stub reading "Ba" beside a full-width
   * "Continue to payment". Removing the field is what stops it recurring.
   */
}

export interface BottomBulkConfig {
  /** Number of currently selected items. Bar activates when > 0. */
  selectedCount: number;
  /** Optional noun shown next to count, e.g. "products". Defaults to "selected". */
  noun?: string;
  /** Called when the user taps the ✕ pill to deselect all. */
  onClearSelection: () => void;
  /** Bulk action buttons, rendered right of the selection pill. */
  actions: BottomAction[];
}

/**
 * Whether the bar is allowed to show on desktop (>= lg), where it has always been
 * `lg:hidden`.
 *
 * - `"hidden"` (default) — mobile/tablet only, the historical behaviour.
 * - `"after-scroll"` — appears once the user has scrolled past the top of the page,
 *   so a detail page's primary CTA comes back after the hero scrolls away.
 * - `"always"` — pinned on desktop from first paint.
 */
export type BottomActionsDesktopMode = "hidden" | "after-scroll" | "always";

export interface BottomActionsState {
  /** Page-level primary actions. */
  actions: BottomAction[];
  /** Desktop visibility policy. Defaults to "hidden" — opt in per page. */
  desktop?: BottomActionsDesktopMode;
  /** Bulk-selection config. Bulk mode activates when selectedCount > 0. */
  bulk?: BottomBulkConfig;
  /**
   * Optional single-line info label rendered above the action row.
   * Useful for contextual data like "Current bid: ₹1,200" on auction pages.
   */
  infoLabel?: string;
  /**
   * Optional single-line label rendered as its own row ABOVE `infoLabel`
   * (i.e. topmost of the three stacked rows: secondaryLabel, infoLabel,
   * action row). Purely additive — no existing caller sets this, so every
   * bar that doesn't pass it renders identically to before. Introduced for
   * the auction detail page's live countdown ("Ends in 2d 5h").
   */
  secondaryLabel?: string;
  /**
   * Optional expandable content revealed ABOVE the bar when the buyer taps the
   * `infoLabel` row, which becomes a disclosure toggle while this is set.
   *
   * Exists so a summarised figure in `infoLabel` ("Total: ₹777.00") can be
   * opened up into the detail behind it without navigating away — the mobile
   * counterpart of a "Show details" expander in a desktop sidebar. Ignored in
   * bulk mode, which owns the same space for its action picker.
   */
  infoPanel?: React.ReactNode;
  /**
   * A COUNTER, not a boolean — bump it to force `infoPanel` open once.
   *
   * `BottomActions` owns `infoOpen` in local state so the user can collapse
   * the panel at will. A boolean `forceOpen` would fight that: it stays true,
   * so every subsequent render re-opens what they just closed. A counter
   * expresses the real intent — "this is a NEW event, show it" — and fires
   * exactly once per increment.
   *
   * Used by a form's failed submit: the error list should appear without a
   * tap, and stay dismissible afterwards.
   */
  infoOpenSignal?: number;
}

// --- Context ------------------------------------------------------------------

interface BottomActionsContextValue {
  state: BottomActionsState;
  /** Replace the page-level actions. Pass empty array to clear. */
  setActions: (actions: BottomAction[]) => void;
  /**
   * Store current onClick handlers for actions without triggering a re-render.
   * The component dispatches clicks via this ref to avoid stale closures.
   */
  actionCallbacksRef: React.MutableRefObject<Map<string, () => void>>;
  /** Set or clear the bulk config. */
  setBulkConfig: (config: BottomBulkConfig | undefined) => void;
  /** Ref mirror for bulk callbacks. */
  bulkCallbacksRef: React.MutableRefObject<Map<string, () => void>>;
  /** Set or clear the bulk clear handler. */
  bulkClearRef: React.MutableRefObject<(() => void) | undefined>;
  /** Set or clear the contextual info label. */
  setInfoLabel: (label: string | undefined) => void;
  /** Set or clear the secondary label (rendered above infoLabel). */
  setSecondaryLabel: (label: string | undefined) => void;
  /** Set or clear the expandable panel revealed above the bar. */
  setInfoPanel: (panel: React.ReactNode | undefined) => void;
  /** Set the force-open counter. See BottomActionsState.infoOpenSignal. */
  setInfoOpenSignal: (signal: number | undefined) => void;
  /** Set the desktop visibility policy. */
  setDesktopMode: (mode: BottomActionsDesktopMode | undefined) => void;
  /** Clear all state (called on feature unmount). */
  clearAll: () => void;

  /*
   * ── Claim stack ────────────────────────────────────────────────────────
   *
   * There is ONE bar per route, and until now the last component to mount
   * simply overwrote whatever the previous one had published — then blanked
   * the bar entirely on its own unmount. `DataListingView` claims it on ~70
   * admin screens, so a form opened in a drawer OVER a listing wiped the
   * listing's bulk bar and left nothing behind when it closed.
   *
   * A stack fixes both halves: only the TOP claimant may publish, and
   * releasing restores the one underneath rather than clearing. Consumers do
   * not manage this — `useBottomActions` claims on mount and releases on
   * unmount, and re-publishes automatically when it regains the top.
   */
  claim: (id: string) => void;
  release: (id: string) => void;
  /** The id currently allowed to publish. `useBottomActions` gates on this. */
  topClaimId: string | null;
}

const EMPTY: BottomActionsState = { actions: [] };

const BottomActionsContext = createContext<BottomActionsContextValue | null>(
  null,
);

// --- Provider -----------------------------------------------------------------

export function BottomActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<BottomActionsState>(EMPTY);


  // Callback refs — updated on every setActions call, so the component always
  // dispatches the latest onClick regardless of when the state last diffed.
  const actionCallbacksRef = useRef<Map<string, () => void>>(new Map());
  const bulkCallbacksRef = useRef<Map<string, () => void>>(new Map());
  const bulkClearRef = useRef<(() => void) | undefined>(undefined);

  // Stack of claimant ids, oldest first. The last entry owns the bar.
  const claimsRef = useRef<string[]>([]);
  const [topClaimId, setTopClaimId] = useState<string | null>(null);

  const claim = useCallback((id: string) => {
    if (claimsRef.current.includes(id)) return;
    claimsRef.current = [...claimsRef.current, id];
    setTopClaimId(id);
  }, []);

  const release = useCallback((id: string) => {
    const next = claimsRef.current.filter((c) => c !== id);
    if (next.length === claimsRef.current.length) return;
    claimsRef.current = next;
    const newTop = next.length > 0 ? next[next.length - 1] : null;
    setTopClaimId(newTop);
    // Only blank the bar when nobody is left. Otherwise the newly-top
    // consumer republishes on the very next effect pass, so clearing here
    // would be a visible flicker of an empty bar.
    if (newTop === null) {
      actionCallbacksRef.current = new Map();
      bulkCallbacksRef.current = new Map();
      bulkClearRef.current = undefined;
      setState(EMPTY);
    }
  }, []);

  const setActions = useCallback((actions: BottomAction[]) => {
    // Update callback map (always latest)
    actionCallbacksRef.current = new Map(actions.map((a) => [a.id, a.onClick]));
    // Update display state (strip onClick to avoid referential churn on stable data)
    setState((prev) => ({
      ...prev,
      actions: actions.map(({ onClick: _onClick, ...rest }) => ({
        ...rest,
        onClick: _onClick, // kept for type compat, actual dispatch uses ref
      })),
    }));
  }, []);

  const setBulkConfig = useCallback((config: BottomBulkConfig | undefined) => {
    if (config) {
      bulkCallbacksRef.current = new Map(
        config.actions.map((a) => [a.id, a.onClick]),
      );
      bulkClearRef.current = config.onClearSelection;
    } else {
      bulkCallbacksRef.current = new Map();
      bulkClearRef.current = undefined;
    }
    setState((prev) => ({
      ...prev,
      bulk: config
        ? {
            ...config,
            actions: config.actions.map(({ onClick: _onClick, ...rest }) => ({
              ...rest,
              onClick: _onClick,
            })),
          }
        : undefined,
    }));
  }, []);

  const setInfoLabel = useCallback((infoLabel: string | undefined) => {
    setState((prev) => ({ ...prev, infoLabel }));
  }, []);

  const setSecondaryLabel = useCallback((secondaryLabel: string | undefined) => {
    setState((prev) => ({ ...prev, secondaryLabel }));
  }, []);

  const setInfoPanel = useCallback((infoPanel: React.ReactNode | undefined) => {
    setState((prev) => ({ ...prev, infoPanel }));
  }, []);

  const setInfoOpenSignal = useCallback((infoOpenSignal: number | undefined) => {
    setState((prev) => (prev.infoOpenSignal === infoOpenSignal ? prev : { ...prev, infoOpenSignal }));
  }, []);

  const setDesktopMode = useCallback(
    (desktop: BottomActionsDesktopMode | undefined) => {
      setState((prev) => (prev.desktop === desktop ? prev : { ...prev, desktop }));
    },
    [],
  );

  const clearAll = useCallback(() => {
    actionCallbacksRef.current = new Map();
    bulkCallbacksRef.current = new Map();
    bulkClearRef.current = undefined;
    setState(EMPTY);
  }, []);

  const value = useMemo(
    () => ({
      state,
      setActions,
      actionCallbacksRef,
      setBulkConfig,
      bulkCallbacksRef,
      bulkClearRef,
      setInfoLabel,
      setSecondaryLabel,
      setInfoPanel,
      setInfoOpenSignal,
      setDesktopMode,
      clearAll,
      claim,
      release,
      topClaimId,
    }),

    [
      state,
      setActions,
      setBulkConfig,
      setInfoLabel,
      setSecondaryLabel,
      setInfoPanel,
      setInfoOpenSignal,
      setDesktopMode,
      clearAll,
      claim,
      release,
      topClaimId,
    ],
  );

  return (
    <BottomActionsContext.Provider value={value}>
      {children}
    </BottomActionsContext.Provider>
  );
}

// --- Hook ---------------------------------------------------------------------

export function useBottomActionsContext(): BottomActionsContextValue {
  const ctx = useContext(BottomActionsContext);
  if (!ctx) {
    throw new Error(
      "useBottomActionsContext must be used within <BottomActionsProvider>",
    );
  }
  return ctx;
}
