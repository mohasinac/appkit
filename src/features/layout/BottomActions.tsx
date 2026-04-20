/**
 * BottomActions Component
 *
 * A fixed-bottom mobile action bar rendered **above** BottomNavbar (bottom-14).
 * Reads from `BottomActionsContext` — features register their actions via the
 * `useBottomActions` hook; this component just renders whatever is registered.
 *
 * Two modes:
 *  - **Page mode** — shows registered page-level actions inline (Add to Cart,
 *    Buy Now, Place Bid, Proceed to Checkout, etc.) with an optional info label.
 *  - **Bulk mode** — activates when `bulk.selectedCount > 0`; shows:
 *      • Selection count pill on the left (tap to deselect all)
 *      • An upward-opening type-picker dropdown (middle, flex-1) — tap to
 *        choose WHICH action to run; the chosen label is always visible.
 *      • An "Apply" submit button on the right — executes the selected action,
 *        styled with the selected action's variant (danger = red, etc.).
 *
 * Layout rules:
 *  - Hidden on lg+ screens (`lg:hidden`) — desktop shows inline action panels.
 *  - The bar slides up with a 300 ms ease-out transition; `pointer-events-none`
 *    while off-screen.
 *
 * @component
 * @example
 * // Automatically rendered by LayoutClient — no manual usage required.
 * // Features use `useBottomActions` to register their actions.
 */

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, ChevronUp, ChevronDown, Check } from "lucide-react";
import { useBottomActionsContext } from "./BottomActionsContext";
import { useClickOutside } from "../../react";
import { Row, Span, Text, Button } from "../../ui";

// Token values inlined from @mohasinac/appkit/tokens
const BOTTOM_NAV_BG =
  "bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-zinc-200/80 dark:border-slate-800/80";
const Z_BOTTOM_ACTIONS = "z-40";
const BOTTOM_NAV_HEIGHT = "h-14";
const FLEX_CENTER = "flex items-center justify-center";

export default function BottomActions() {
  const tActions = useTranslations("actions");
  const tBottom = useTranslations("bottomActions");
  const { state, actionCallbacksRef, bulkCallbacksRef, bulkClearRef } =
    useBottomActionsContext();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setPickerOpen(false));

  const { actions, bulk, infoLabel } = state;

  const isBulkMode = !!(bulk && bulk.selectedCount > 0);
  const bulkActions = bulk?.actions ?? [];
  const pageActions = actions;
  const isVisible =
    (isBulkMode ? bulkActions.length > 0 || !!bulk : pageActions.length > 0) ||
    !!infoLabel;

  // Keep selectedActionId in sync with available bulk actions
  useEffect(() => {
    if (!isBulkMode) {
      setPickerOpen(false);
      setSelectedActionId(null);
      return;
    }
    setSelectedActionId((prev) => {
      const ids = bulkActions.map((a) => a.id);
      if (prev && ids.includes(prev)) return prev;
      return ids[0] ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBulkMode, bulkActions.map((a) => a.id).join(",")]);

  const selectedAction = bulkActions.find((a) => a.id === selectedActionId);

  const dispatchAction = (id: string) => actionCallbacksRef.current.get(id)?.();
  const dispatchBulkClear = () => {
    bulkClearRef.current?.();
    setPickerOpen(false);
  };
  const handleApply = () => {
    if (!selectedActionId) return;
    bulkCallbacksRef.current.get(selectedActionId)?.();
    setPickerOpen(false);
  };

  return (
    <div
      ref={containerRef}
      role="toolbar"
      aria-label={
        isBulkMode ? tBottom("bulkActionsLabel") : tBottom("pageActionsLabel")
      }
      aria-hidden={!isVisible}
      className={[
        "fixed bottom-14 left-0 right-0 lg:hidden",
        Z_BOTTOM_ACTIONS,
        BOTTOM_NAV_BG,
        "shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.30)]",
        "will-change-transform transition-transform duration-300 ease-out",
        isVisible ? "translate-y-0" : "translate-y-full pointer-events-none",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* -- Bulk action type-picker panel (opens upward) ---------------------- */}
      {isBulkMode && (
        <div
          role="listbox"
          aria-label={tBottom("bulkActionsLabel")}
          className={[
            "absolute bottom-full left-0 right-0 overflow-hidden",
            BOTTOM_NAV_BG,
            "border-t border-zinc-200/80 dark:border-slate-700/80",
            "shadow-[0_-8px_24px_rgba(0,0,0,0.10)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)]",
            "transition-[max-height,opacity] duration-200 ease-out",
            pickerOpen
              ? "max-h-64 opacity-100"
              : "max-h-0 opacity-0 pointer-events-none",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {bulkActions.map((action, i) => {
            const isSelected = action.id === selectedActionId;
            return (
              <Button
                key={action.id}
                role="option"
                aria-selected={isSelected}
                type="button"
                variant="ghost"
                disabled={action.disabled || action.loading}
                onClick={() => {
                  setSelectedActionId(action.id);
                  setPickerOpen(false);
                }}
                className={[
                  "w-full flex items-center gap-3 px-5 py-3.5 text-left text-sm font-medium transition-colors rounded-none",
                  i > 0
                    ? "border-t border-zinc-100/80 dark:border-slate-800/80"
                    : "",
                  isSelected ? "bg-zinc-50 dark:bg-slate-800/60" : "",
                  action.variant === "danger"
                    ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    : "text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-slate-800/60",
                  action.disabled || action.loading
                    ? "opacity-50 cursor-not-allowed"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {action.icon && (
                  <Span
                    className={`flex-shrink-0 w-5 h-5 ${FLEX_CENTER}`}
                    aria-hidden="true"
                  >
                    {action.icon}
                  </Span>
                )}
                <Span className="flex-1 truncate">{action.label}</Span>
                {isSelected && (
                  <Check
                    className="w-4 h-4 flex-shrink-0 text-primary-600 dark:text-primary-400"
                    aria-hidden="true"
                  />
                )}
              </Button>
            );
          })}
        </div>
      )}

      {/* -- Bulk mode: 3 px accent stripe at top ---------------------------- */}
      {isBulkMode && (
        <div className="h-[3px] w-full bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600 dark:from-secondary-600 dark:via-secondary-400 dark:to-secondary-600" />
      )}

      {/* -- Info label row (page mode only) --------------------------------- */}
      {infoLabel && !isBulkMode && (
        <div className="px-4 pt-2 pb-0 border-b border-zinc-100/80 dark:border-slate-800/80">
          <Text className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 leading-5 truncate">
            {infoLabel}
          </Text>
        </div>
      )}

      {/* -- Main action row -------------------------------------------------- */}
      <Row className={`gap-2 px-3 ${BOTTOM_NAV_HEIGHT}`}>
        {isBulkMode && bulk ? (
          <>
            {/* Selection count pill — tap to clear ----------------------- */}
            <Button
              type="button"
              variant="ghost"
              onClick={dispatchBulkClear}
              className="inline-flex items-center gap-1.5 flex-shrink-0 bg-primary-50 hover:bg-primary-100 active:bg-primary-200 dark:bg-primary-950/30 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full pl-2 pr-3 h-8 border border-primary-200/70 dark:border-primary-800/50 transition-colors min-h-0"
              aria-label={tActions("clearSelection")}
            >
              <X className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              <Span className="text-xs font-semibold tabular-nums whitespace-nowrap leading-none">
                {bulk.noun
                  ? `${bulk.selectedCount} ${bulk.noun}`
                  : tBottom("selectedCount", { count: bulk.selectedCount })}
              </Span>
            </Button>

            {/* Type picker trigger — flex-1 ------------------------------- */}
            {bulkActions.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPickerOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                className={[
                  "flex-1 min-w-0 h-10 flex items-center gap-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                  "bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 dark:bg-slate-800/60 dark:hover:bg-slate-700/60",
                  "border-zinc-200 dark:border-slate-700",
                  selectedAction?.variant === "danger"
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-800 dark:text-zinc-100",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {selectedAction?.icon && (
                  <Span
                    className={`flex-shrink-0 w-4 h-4 ${FLEX_CENTER}`}
                    aria-hidden="true"
                  >
                    {selectedAction.icon}
                  </Span>
                )}
                <Span className="flex-1 truncate text-left leading-none">
                  {selectedAction?.label ?? tBottom("bulkActionsLabel")}
                </Span>
                {pickerOpen ? (
                  <ChevronDown
                    className="w-4 h-4 flex-shrink-0 text-zinc-400"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronUp
                    className="w-4 h-4 flex-shrink-0 text-zinc-400"
                    aria-hidden="true"
                  />
                )}
              </Button>
            )}

            {/* Apply / submit button -------------------------------------- */}
            {bulkActions.length > 0 && (
              <Button
                type="button"
                variant={selectedAction?.variant ?? "primary"}
                size="sm"
                isLoading={selectedAction?.loading}
                disabled={
                  !selectedActionId ||
                  selectedAction?.disabled ||
                  selectedAction?.loading
                }
                onClick={handleApply}
                className="h-10 flex-shrink-0"
              >
                <Span className="leading-none">{tBottom("apply")}</Span>
              </Button>
            )}
          </>
        ) : (
          /* Page mode — action buttons inline ------------------------------ */
          pageActions.map((action) => {
            const isIconOnly = !action.label;
            const growClass =
              isIconOnly || action.grow === false
                ? "flex-shrink-0 w-11"
                : "flex-1 min-w-0";

            return (
              <Button
                key={action.id}
                type="button"
                variant={action.variant ?? "primary"}
                size="sm"
                isLoading={action.loading}
                disabled={action.disabled}
                onClick={() => dispatchAction(action.id)}
                className={[
                  "h-10 relative",
                  growClass,
                  isIconOnly ? "px-0 justify-center" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {action.icon && (
                  <Span
                    className={[
                      "flex-shrink-0",
                      action.label ? "mr-1.5" : "",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {action.icon}
                  </Span>
                )}
                {action.label && (
                  <Span className="truncate leading-none">{action.label}</Span>
                )}
                {action.badge !== undefined && (
                  <Span
                    className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full ${FLEX_CENTER} px-1 pointer-events-none select-none`}
                    aria-hidden="true"
                  >
                    {action.badge}
                  </Span>
                )}
              </Button>
            );
          })
        )}
      </Row>
    </div>
  );
}
