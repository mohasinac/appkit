"use client";

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
 *  - **Bulk mode** — activates when sieveFilter("bulk.selectedCount", SIEVE_OP.GT, "0"); shows:
 *      • Selection count pill on the left (tap to deselect all)
 *      • An upward-opening type-picker dropdown (middle, flex-1) — tap to
 *        choose WHICH action to run; the chosen label is always visible.
 *      • An "Apply" submit button on the right — executes the selected action,
 *        styled with the selected action's variant (danger = red, etc.).
 *
 * Layout rules:
 *  - Hidden on lg+ screens by default — desktop shows inline action panels. A page can
 *    opt in by passing `desktop: "after-scroll" | "always"` to `useBottomActions`;
 *"after-scroll" brings the bar back once the primary CTA has scrolled out of view.
 *  - The bar slides up with a 300 ms ease-out transition; `pointer-events-none`
 *    while off-screen.
 *
 * @component
 * @example
 * // Automatically rendered by LayoutClient — no manual usage required.
 * // Features use `useBottomActions` to register their actions.
 */

import { useState, useRef, useEffect, useId } from "react";
import { X, ChevronUp, ChevronDown, Check } from "lucide-react";
import { useBottomActionsContext } from "./BottomActionsContext";
import type { BottomAction } from "./BottomActionsContext";
import { useClickOutside } from "../../react";
import { Div, Row, Span, Text, Button } from "../../ui";

// Token values inlined from @mohasinac/appkit/tokens
const BOTTOM_NAV_BG =
  "bg-[color-mix(in_srgb,var(--appkit-color-bg)_90%,transparent)] backdrop-blur-md border-t border-[var(--appkit-color-border)]";
const BOTTOM_NAV_HEIGHT = "h-14";
const FLEX_CENTER = "flex items-center justify-center";
const CLS_COUNT_BADGE = "bg-error-solid text-error-on-solid";
/** How far the user must scroll before the desktop bar reveals itself. */
const DESKTOP_REVEAL_SCROLL_PX = 400;

// ─── Sub-components ───────────────────────────────────────────────────────────

function BulkPickerPanel({
  bulkActions,
  selectedActionId,
  pickerOpen,
  onSelect,
}: {
  bulkActions: BottomAction[];
  selectedActionId: string | null;
  pickerOpen: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Div
      role="listbox"
      aria-label="Bulk actions"
      className={[
        "absolute bottom-full left-0 right-0 overflow-hidden",
        BOTTOM_NAV_BG,
        "border-t border-zinc-200/80 border-[var(--appkit-color-border)]/80",
        "shadow-[0_-8px_24px_rgba(0,0,0,0.10)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)]",
        "transition-[max-height,opacity] duration-200 ease-out",
        pickerOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0 pointer-events-none",
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
            onClick={() => onSelect(action.id)}
            className={[
              "w-full flex items-center gap-[var(--appkit-space-3)] px-[var(--appkit-space-5)] py-[var(--appkit-space-3-5)] text-left text-[length:var(--appkit-text-sm)] font-medium transition-colors rounded-none",
              i > 0 ? "border-t border-zinc-100/80 border-[var(--appkit-color-border-subtle)]" : "",
              isSelected ? " bg-[var(--appkit-color-surface-input)]" : "",
              action.variant === "danger"
                ? "text-error hover:bg-error-surface"
                : "text-[var(--appkit-color-text)] hover:bg-surface-hover",
              action.disabled || action.loading ? "opacity-50 cursor-not-allowed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {action.icon && (
              <Span className={`flex-shrink-0 w-5 h-5 ${FLEX_CENTER}`} aria-hidden="true">
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
    </Div>
  );
}

/**
 * Expandable detail that opens UPWARD from the bar.
 *
 * Same recipe as BulkPickerPanel above — absolutely positioned at `bottom-full`
 * so it grows into the space above the bar rather than pushing the page, and
 * animated on max-height/opacity so it can't be tabbed into while closed.
 * Scrolls internally, since a many-store cart's breakdown can outgrow the
 * screen.
 */
function InfoPanel({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <Div
      id={id}
      className={[
        "absolute bottom-full left-0 right-0 overflow-hidden",
        BOTTOM_NAV_BG,
        "border-t border-zinc-200/80 border-[var(--appkit-color-border)]/80",
        "shadow-[0_-8px_24px_rgba(0,0,0,0.10)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)]",
        "transition-[max-height,opacity] duration-200 ease-out",
        open ? "max-h-[60vh] opacity-100" : "max-h-0 opacity-0 pointer-events-none",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!open}
    >
      <Div className="max-h-[60vh]" overflow="y-auto" padding="md">
        {children}
      </Div>
    </Div>
  );
}

/**
 * How many actions fit on one line before the row splits in two.
 *
 * 🛑 Row count is a function of `pageActions.length` and NOTHING else — never
 * of validation state. `BottomChrome`'s ResizeObserver faithfully republishes
 * `--bottom-chrome-height` on any height change, and every consumer
 * (BackToTop, the pagination bar, the footer's clearance) reflows with it. A
 * bar that grew a row when an error appeared would shift the whole page while
 * the user was typing. The error count lives in `infoLabel`, which sits in the
 * absolutely-positioned panel and is excluded from the published height by
 * construction.
 */
const SINGLE_ROW_MAX_ACTIONS = 2;

function ActionButtons({
  actions,
  dispatchAction,
}: {
  actions: BottomAction[];
  dispatchAction: (id: string) => void;
}) {
  return (
    <>
      {actions.map((action) => {
        const isIconOnly = !action.label;
        /*
         * `grow: false` and "icon-only" used to share one branch whose output
         * was a fixed 44px square — so a LABELLED action asking not to grow got
         * 44px and truncated. That is the reported "Cancel is cut off while
         * Save takes 80% of the width": useFormBottomActions set grow:false on
         * Cancel, and a two-button bar rendered 44px + everything else.
         *
         * They are different intents. Icon-only is a square tap target;
         * grow:false means "size me to my content" and must keep its padding.
         */
        const growClass = isIconOnly
          ? "flex-shrink-0 w-11"
          : action.grow === false
            ? "flex-shrink-0 basis-auto px-[var(--appkit-space-3)]"
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
              isIconOnly ? "px-[var(--appkit-space-0)] justify-center" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {action.icon && (
              <Span
                className={["flex-shrink-0", action.label ? "mr-1.5" : ""].join(" ")}
                aria-hidden="true"
              >
                {action.icon}
              </Span>
            )}
            {action.label && <Span className="truncate leading-none">{action.label}</Span>}
            {action.badge !== undefined && (
              <Span
                className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] ${CLS_COUNT_BADGE} text-[10px] ${FLEX_CENTER} px-[var(--appkit-space-1)] pointer-events-none select-none`} rounded="full" weight="bold"
                aria-hidden="true"
              >
                {action.badge}
              </Span>
            )}
          </Button>
        );
      })}
    </>
  );
}

/**
 * Lays a form's or a page's actions out across one or two lines.
 *
 * | n    | layout                                                          |
 * |------|-----------------------------------------------------------------|
 * | 1    | one row, full-width primary                                     |
 * | 2    | one row, 50/50                                                  |
 * | 3+   | two rows — secondaries above, primary full-width below           |
 *
 * The LAST action is treated as the primary. That holds for every producer:
 * `useFormBottomActions` appends submit last, and the checkout/cart bars build
 * `[back, primary]`. Putting it on its own line keeps the thumb target the same
 * size no matter how many secondary actions a screen has, which is the whole
 * reason a 5-action form (3 forms + soft-ban + hard-ban on the admin user
 * editor) was unrepresentable before.
 *
 * Secondaries WRAP rather than overflowing into a menu. Wrapping keeps the
 * height a pure function of the action count — the invariant above — whereas a
 * popover would add a second interaction to reach an action that is already
 * only one line away. No current caller exceeds five.
 */
function PageActionsRow({
  pageActions,
  dispatchAction,
}: {
  pageActions: BottomAction[];
  dispatchAction: (id: string) => void;
}) {
  if (pageActions.length === 0) return null;

  if (pageActions.length <= SINGLE_ROW_MAX_ACTIONS) {
    return <ActionButtons actions={pageActions} dispatchAction={dispatchAction} />;
  }

  const secondaries = pageActions.slice(0, -1);
  const primary = pageActions[pageActions.length - 1]!;

  return (
    <Div className="flex w-full flex-col gap-[var(--appkit-space-2)]">
      <Div className="flex w-full flex-wrap gap-[var(--appkit-space-2)]">
        <ActionButtons actions={secondaries} dispatchAction={dispatchAction} />
      </Div>
      <Div className="flex w-full">
        {/* Forced to grow regardless of what the producer asked for: on its own
            line there is nothing to share the width with. */}
        <ActionButtons
          actions={[{ ...primary, grow: true }]}
          dispatchAction={dispatchAction}
        />
      </Div>
    </Div>
  );
}

export default function BottomActions() {
  const { state, actionCallbacksRef, bulkCallbacksRef, bulkClearRef } =
    useBottomActionsContext();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const infoPanelId = useId();

  useClickOutside(containerRef, () => {
    setPickerOpen(false);
    setInfoOpen(false);
  });

  const { actions, bulk, infoLabel, secondaryLabel, infoPanel, infoOpenSignal, desktop } = state;

  // Desktop reveal-on-scroll. Kept as a plain passive listener to match BackToTop —
  // there is no shared scroll-position hook in the codebase and one consumer doesn't
  // justify inventing one. Only armed when a page actually opts into "after-scroll".
  const [scrolledPastFold, setScrolledPastFold] = useState(false);
  const wantsScrollGate = desktop === "after-scroll";

  useEffect(() => {
    if (!wantsScrollGate) {
      setScrolledPastFold(false);
      return;
    }
    const onScroll = () =>
      setScrolledPastFold(window.scrollY > DESKTOP_REVEAL_SCROLL_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [wantsScrollGate]);

  const showOnDesktop =
    desktop === "always" || (wantsScrollGate && scrolledPastFold);

  const isBulkMode = !!(bulk && bulk.selectedCount > 0);
  const hasInfoPanel = infoPanel != null && !isBulkMode;
  const bulkActions = bulk?.actions ?? [];
  const pageActions = actions;
  const isVisible =
    (isBulkMode ? bulkActions.length > 0 || !!bulk : pageActions.length > 0) ||
    !!infoLabel ||
    !!secondaryLabel;

  // A panel left open after its content is withdrawn (bulk mode taking over, or
  // the page clearing it) would sit there as an empty sheet.
  useEffect(() => {
    if (!hasInfoPanel) setInfoOpen(false);
  }, [hasInfoPanel]);

  /*
   * Force-open on a bumped signal — a failed form submit, today. Depends on
   * the counter alone, so a re-render with the same value never re-opens what
   * the user has since collapsed. `hasInfoPanel` is read but deliberately NOT
   * a dependency: publishing the panel and bumping the signal are two separate
   * setState calls, so re-running on `hasInfoPanel` would open the panel again
   * one render after the user closed it.
   */
  const lastSignalRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (infoOpenSignal == null) return;
    if (lastSignalRef.current === infoOpenSignal) return;
    lastSignalRef.current = infoOpenSignal;
    setInfoOpen(true);
  }, [infoOpenSignal]);

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
    <Div
      ref={containerRef}
      role="toolbar"
      aria-label={
        isBulkMode ? "Bulk actions" : "Page actions"
      }
      aria-hidden={!isVisible}
      className={[
        // Position, z-index and the offset above the nav all belong to
        // <BottomChrome>, the tier container this renders inside. `relative` is
        // kept because the two panels below are `absolute bottom-full` against it.
        "relative pointer-events-auto",
        // Desktop opt-in stays per-bar. `lg:hidden` is display:none, so a bar the
        // page hasn't opted into contributes nothing to the tier's height.
        showOnDesktop ? "" : "lg:hidden",
      ]
        .filter(Boolean)
        .join(" ")}
     data-section="bottomactions-div-401">
      {/* -- Bulk action type-picker panel (opens upward) ---------------------- */}
      {isBulkMode && (
        <BulkPickerPanel
          bulkActions={bulkActions}
          selectedActionId={selectedActionId}
          pickerOpen={pickerOpen}
          onSelect={(id) => { setSelectedActionId(id); setPickerOpen(false); }}
        />
      )}

      {/* -- Expandable detail panel (page mode only — bulk owns this space) -- */}
      {hasInfoPanel && !isBulkMode && (
        <InfoPanel id={infoPanelId} open={infoOpen}>
          {infoPanel}
        </InfoPanel>
      )}

      {/* -- The bar itself, collapsing rather than translating on hide -------
          <BottomChrome> measures this subtree to publish --bottom-chrome-height.
          The old `translate-y-full` moved the bar out of sight but left its
          layout height behind, which would reserve ~3.5rem of the tier on every
          page that has no CTA at all. `grid-template-rows: 1fr → 0fr` animates
          the box to a true zero height, so the published height is honest at
          every frame and BackToTop glides down in step instead of snapping. */}
      <Div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${isVisible ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <Div overflow="hidden" className="min-h-0">
          {/* Background, border and shadow sit INSIDE the clipper on purpose: on
              the collapsing box itself they would still paint a 1px hairline and
              a shadow smudge across the screen at zero height. */}
          <Div
            className={[
              BOTTOM_NAV_BG,
              "shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.30)]",
              isVisible ? "" : "pointer-events-none",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/* -- Bulk mode: 3 px accent stripe at top ---------------------------- */}
            {isBulkMode && (
              <Div className="h-[3px] w-full bg-[image:var(--appkit-gradient-brand-tri)]" />
            )}

            {/* -- Secondary label row (page mode only) — stacked ABOVE infoLabel -- */}
            {secondaryLabel && !isBulkMode && (
              <Div border="subtle" className="pt-[var(--appkit-space-2)] pb-[var(--appkit-space-0)] border-b /80" padding="x-md">
                <Text className="leading-5 truncate" color="muted" size="xs" weight="semibold">
                  {secondaryLabel}
                </Text>
              </Div>
            )}

            {/* -- Info label row (page mode only) --------------------------------- */}
            {infoLabel && !isBulkMode && !hasInfoPanel && (
              <Div border="subtle" className="pt-[var(--appkit-space-2)] pb-[var(--appkit-space-0)] border-b /80" padding="x-md">
                <Text className="leading-5 truncate" color="muted" size="xs" weight="semibold">
                  {infoLabel}
                </Text>
              </Div>
            )}

            {/* -- Info label as a disclosure toggle (when a panel is registered) --- */}
            {infoLabel && !isBulkMode && hasInfoPanel && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setInfoOpen((o) => !o)}
                aria-expanded={infoOpen}
                aria-controls={infoPanelId}
                className="w-full flex items-center justify-between gap-[var(--appkit-space-2)] rounded-none border-b border-[var(--appkit-color-border)]/80 px-[var(--appkit-space-4)] pt-[var(--appkit-space-2)] pb-[var(--appkit-space-1)] min-h-0"
              >
                <Text className="leading-5 truncate" color="muted" size="xs" weight="semibold">
                  {infoLabel}
                </Text>
                <Span className="flex-shrink-0 flex items-center gap-[var(--appkit-space-1)]">
                  <Text as="span" size="xs" color="muted">
                    {infoOpen ? "Hide" : "Details"}
                  </Text>
                  {infoOpen ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                  )}
                </Span>
              </Button>
            )}

            {/* -- Main action row -------------------------------------------------- */}
            {/* `min-h`, not `h`: a 3+-action form lays out on two lines and the
                container has to grow with it. For one line the result is
                identical to the old fixed h-14 (h-10 buttons, centred). */}
            <Row className={`min-${BOTTOM_NAV_HEIGHT} py-[var(--appkit-space-2)]`} gap="sm" padding="x-sm">
              {isBulkMode && bulk ? (
                <>
                  {/* Selection count pill — tap to clear ----------------------- */}
                  <Button rounded="full" gap="xs" 
                    type="button"
                    variant="ghost"
                    onClick={dispatchBulkClear}
                    className="inline- flex-shrink-0 bg-primary-50 hover:bg-primary-surface active:bg-primary-200 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 pl-2 pr-3 h-8 border border-primary-200/70 dark:border-primary-800/50 transition-colors min-h-0"
                    aria-label="Clear selection"
                  >
                    <X className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <Span size="xs" weight="semibold" className="tabular-nums whitespace-nowrap leading-none">
                      {bulk.noun
                        ? `${bulk.selectedCount} ${bulk.noun}`
                        : `${bulk.selectedCount} selected`}
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
                        "flex-1 min-w-0 h-10 flex items-center gap-[var(--appkit-space-2)] px-[var(--appkit-space-3)] rounded-lg border text-[length:var(--appkit-text-sm)] font-medium transition-colors",
                        " hover:bg-[var(--appkit-color-surface)] active:bg-zinc-200 bg-[var(--appkit-color-surface-input)] dark:hover:bg-slate-700/60",
                        "border-[var(--appkit-color-border)]",
                        selectedAction?.variant === "danger"
                          ? "text-error"
                          : "text-[var(--appkit-color-text)]",
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
                      <Span className="flex-1 truncate leading-none" align="start">
                        {selectedAction?.label ?? "Bulk actions"}
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
                      <Span className="leading-none">Apply</Span>
                    </Button>
                  )}
                </>
              ) : (
                /* Page mode — action buttons inline ------------------------------ */
                <PageActionsRow pageActions={pageActions} dispatchAction={dispatchAction} />
              )}
            </Row>
          </Div>
        </Div>
      </Div>
    </Div>
  );
}
