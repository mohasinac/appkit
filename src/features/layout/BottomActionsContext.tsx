/**
 * BottomActionsContext
 *
 * Provides a context for registering page-level mobile action bars.
 * Features call `useBottomActions` to push actions; the `<BottomActions>`
 * layout component reads this context and renders the bar above BottomNavbar.
 *
 * Supports two modes:
 *  - Page mode: primary page actions (Add to Cart, Buy Now, Place Bid, etc.)
 *  - Bulk mode: activated when `bulk.selectedCount > 0` — shows selection
 *    count + custom bulk action buttons (Delete, Archive, Export, etc.)
 *
 * @example — product detail page
 * ```tsx
 * useBottomActions({
 *   actions: [
 *     { id: "wishlist", icon: <Heart className="w-4 h-4" />, label: t("wishlist"), variant: "ghost", grow: false, onClick: handleWishlist },
 *     { id: "cart",    label: t("addToCart"), variant: "outline", onClick: handleAddToCart },
 *     { id: "buy",     label: t("buyNow"),    variant: "primary", onClick: handleBuyNow },
 *   ],
 * });
 * ```
 *
 * @example — admin listing with bulk select
 * ```tsx
 * useBottomActions({
 *   bulk: {
 *     selectedCount: selectedIds.length,
 *     onClearSelection: () => setSelectedIds([]),
 *     actions: [
 *       { id: "delete", label: t("bulkDelete", { count: selectedIds.length }), variant: "danger", onClick: handleBulkDelete },
 *     ],
 *   },
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
  /**
   * When true (default) the button grows to fill remaining space.
   * Set to false for compact icon-only buttons.
   */
  grow?: boolean;
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

export interface BottomActionsState {
  /** Page-level primary actions. */
  actions: BottomAction[];
  /** Bulk-selection config. Bulk mode activates when selectedCount > 0. */
  bulk?: BottomBulkConfig;
  /**
   * Optional single-line info label rendered above the action row.
   * Useful for contextual data like "Current bid: ₹1,200" on auction pages.
   */
  infoLabel?: string;
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
  /** Clear all state (called on feature unmount). */
  clearAll: () => void;
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
      clearAll,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, setActions, setBulkConfig, setInfoLabel, clearAll],
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
