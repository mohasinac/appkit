"use client";

/**
 * SideActionDock — the floating action dock that replaced the bottom bar.
 *
 * Reads the SAME `BottomActionsContext` the bar read, so all ~30 publishers
 * (`useBottomActions`, `useFormBottomActions`, every `DataListingView` bulk
 * bar) are untouched: only the presentation changed.
 *
 * ── 🛑 DESKTOP ONLY. The phone gets `BottomActions`. ───────────────────────
 *
 * This used to render at every width, and on a phone that was the wrong trade
 * twice over: a floating puck sits in the middle of the content on the screen
 * with the least of it, and it replaced a bar that was already in the thumb
 * zone and already stacked correctly above the tab bar. A phone has a thumb
 * zone and a bottom edge that means something; a 1440px window has neither,
 * which is the entire argument for each half.
 *
 * The two are mutually exclusive by construction — `useIsDesktop` decides, and
 * both halves read the SAME `BottomActionsContext`, so all ~30 publishers are
 * untouched and nothing can register with only one of them.
 *
 * ── Three rules this encodes ───────────────────────────────────────────────
 *
 * 1. **It docks OPPOSITE the sidebar, at the vertical MIDDLE.** `SidebarLayout`
 *    docks to the hand-mode side (`hand === "left" ? left-0 : right-0`), so the
 *    dock takes the other edge — left, in the default right-hand configuration
 *    — and the two can never overlap, including while the sidebar is open,
 *    which is exactly when a CTA hidden underneath it would be unreachable.
 *    Vertically it is centred rather than bottom-anchored: at the bottom of a
 *    desktop window it reads as a browser download bar and sits as far from
 *    the content as the viewport allows. Centred, it is beside the content,
 *    and it needs no bottom-tier clearance at all — there is no tab bar at
 *    this width and the pagination bar is at the other end of the screen.
 *
 * 2. **It reveals only after the inline CTA has been seen and passed** — see
 *    `useCtaReveal`. A page with no CTA anchor shows it at once, which is what
 *    every bulk-action screen needs.
 *
 * 3. **Bulk mode ignores the reveal gate.** A selection is a state the user
 *    just entered deliberately; making them scroll to act on it would be a
 *    puzzle, not an affordance.
 *
 * 🛑 It is NOT part of the `BottomChrome` tier any more and must not be put
 * back into it. The tier exists so bars can stack without overlapping and
 * publish one height; a dock that floats beside the content reserves no height
 * and belongs to no tier. Rendering it inside `BottomChrome` would re-add its
 * height to `--bottom-chrome-height` and push the footer down by a phantom bar.
 */

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { useBottomActionsContext } from "./BottomActionsContext";
import type { BottomAction } from "./BottomActionsContext";
import { useClickOutside } from "../../react";
import { useHandMode } from "../../_internal/client/hand-mode";
import { useCtaReveal } from "./useCtaReveal";
import { useIsDesktop } from "./useIsDesktop";
import { ActionRow } from "../../ui/components/ActionRow";
import { Div } from "../../ui/components/Div";
import { ICON_SIZE } from "../../ui/icons/icon-registry";
import { IconButton } from "../../ui/components/IconButton";
import { Row, Stack } from "../../ui/components/Layout";
import { Span, Text } from "../../ui/components/Typography";
import { Button } from "../../ui/components/Button";

const PANEL_SURFACE =
  "bg-[color-mix(in_srgb,var(--appkit-color-bg)_94%,transparent)] backdrop-blur-md border border-[var(--appkit-color-border)]";
const FLEX_CENTER = "flex items-center justify-center";
const CLS_COUNT_BADGE = "bg-error-solid text-error-on-solid";

/**
 * How many actions fit on one line before the row splits in two.
 *
 * 🛑 ROW COUNT is a function of `pageActions.length` and NOTHING else — never
 * of validation state, and never of measured width. In this app LABELS ARE
 * STATE ("Add to Cart" → "Adding…", "Buy Now" → "Out of Stock"), so a layout
 * that re-flowed on width would shift the controls under the user's thumb at
 * the exact moment they committed to a tap.
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
         * Width is ActionRow's job, not this component's — every action is
         * sized from its own label by `.appkit-action-row__group > *`.
         *
         * 🛑 Never add `flex-1`, `flex-shrink-0`, `basis-*`, `w-*`, `h-*`,
         * `truncate` or `leading-none` below. Both tailwind configs set
         * `important: true`, so any of them beats ActionRow's CSS and silently
         * reverts this to the squeezed behaviour with no visible error — a
         * 44px stub reading "Ba" beside a full-width "Continue to payment".
         */
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
              "relative",
              isIconOnly ? "appkit-action-row__icon-only justify-center" : "",
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
            {action.label && <Span>{action.label}</Span>}
            {action.badge !== undefined && (
              <Span
                className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] ${CLS_COUNT_BADGE} text-[10px] ${FLEX_CENTER} px-[var(--appkit-space-1)] pointer-events-none select-none`}
                rounded="full"
                weight="bold"
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
 * Lays a page's actions out across one or two lines. The LAST action is the
 * primary — `useFormBottomActions` appends submit last and the checkout bars
 * build `[back, primary]`, so this holds for every producer.
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
    return (
      <ActionRow>
        <ActionButtons actions={pageActions} dispatchAction={dispatchAction} />
      </ActionRow>
    );
  }

  const secondaries = pageActions.slice(0, -1);
  const primary = pageActions[pageActions.length - 1]!;

  return (
    <Div className="flex w-full flex-col gap-[var(--appkit-space-2)]">
      <ActionRow>
        <ActionButtons actions={secondaries} dispatchAction={dispatchAction} />
      </ActionRow>
      <ActionRow>
        <ActionButtons actions={[primary]} dispatchAction={dispatchAction} />
      </ActionRow>
    </Div>
  );
}

/** The bulk-mode action list — one tap picks AND runs. */
function BulkActionList({
  bulkActions,
  selectedActionId,
  onSelect,
}: {
  bulkActions: BottomAction[];
  selectedActionId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Div role="listbox" aria-label="Bulk actions" className="w-full">
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
              "w-full flex items-center gap-[var(--appkit-space-3)] px-[var(--appkit-space-3)] py-[var(--appkit-space-2-5)] text-left text-[length:var(--appkit-text-sm)] font-medium transition-colors rounded-md",
              i > 0 ? "border-t border-[var(--appkit-color-border-subtle)]" : "",
              isSelected ? "bg-[var(--appkit-color-surface-input)]" : "",
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
              <Check className="w-4 h-4 flex-shrink-0 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            )}
          </Button>
        );
      })}
    </Div>
  );
}

export default function SideActionDock() {
  const { state, actionCallbacksRef, bulkCallbacksRef, bulkClearRef } =
    useBottomActionsContext();
  const { hand } = useHandMode();
  const isDesktop = useIsDesktop();

  const [expanded, setExpanded] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const infoPanelId = useId();

  useClickOutside(containerRef, () => {
    setExpanded(false);
    setInfoOpen(false);
  });

  const { actions, bulk, infoLabel, secondaryLabel, infoPanel, infoOpenSignal, ctaAnchorId } =
    state;

  const isBulkMode = !!(bulk && bulk.selectedCount > 0);
  const hasInfoPanel = infoPanel != null && !isBulkMode;
  const bulkActions = bulk?.actions ?? [];
  const pageActions = actions;

  const hasContent =
    (isBulkMode ? bulkActions.length > 0 || !!bulk : pageActions.length > 0) ||
    !!infoLabel ||
    !!secondaryLabel;

  // Rule 3 — a selection is its own reveal.
  const {
    revealed: ctaRevealed,
    hasAnchor,
    scrollToAnchor,
  } = useCtaReveal(hasContent && !isBulkMode, ctaAnchorId);
  const revealed = ctaRevealed || isBulkMode;
  const isVisible = isDesktop && hasContent && revealed;

  /*
   * ── Rule 4 — a page with a REAL Buy button gets a way BACK to it ─────────
   *
   * On a detail page the dock was a second copy of the CTA you had just
   * scrolled past, which is the one thing rule 2 says a floating control must
   * not be: `useCtaReveal` already means "you have met the Buy button and left
   * it", so re-offering the purchase mid-screen answers a question the user
   * did not ask. Taking them back to the real control answers the one they
   * did — and it keeps the purchase decision on the page's own CTA, beside
   * the price, the variant and the stock state that qualify it.
   *
   * 🛑 Gated on `hasAnchor`, NOT on a route or a listing type. A bulk screen
   * marks no anchor, so it keeps the centred dock carrying its actions — which
   * is correct, because there was never an inline control there to return to.
   * `ctaAnchorProps` has exactly one caller today (`ProductDetailPageView`),
   * so this branch is opt-in by construction and ~70 admin bulk bars cannot
   * reach it.
   *
   * It sits in the bottom-right cluster above `BackToTop` and shares that
   * control's bottom-tier `calc()` verbatim, so the two stack rather than
   * overlap — and rule 1's objection (a bottom-anchored bar reads as a browser
   * download bar) does not apply to a single round puck in the corner that is
   * already where the scroll affordance lives.
   *
   * 🛑 The RETURN for this branch is deliberately deferred to just above the
   * main one. An early return here would sit above this component's remaining
   * `useEffect`s, so the hook order would differ between a detail page and a
   * bulk screen — React's "rendered fewer hooks than expected" crash, and the
   * kind that only shows up on the page nobody opened during review.
   */
  const isBackToCta = isDesktop && hasAnchor && !isBulkMode;

  // Rule 1 — opposite the sidebar, which docks to the hand-mode side.
  const dockSideClass = hand === "left" ? "right-0" : "left-0";
  const panelAlignClass = hand === "left" ? "items-end" : "items-start";

  // Collapse when the dock goes away, or the next page inherits an open panel.
  useEffect(() => {
    if (!isVisible) {
      setExpanded(false);
      setInfoOpen(false);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!hasInfoPanel) setInfoOpen(false);
  }, [hasInfoPanel]);

  /*
   * Force-open on a bumped signal — a failed form submit, today. Depends on
   * the counter alone, so a re-render with the same value never re-opens what
   * the user has since collapsed. The dock must EXPAND as well: a failed save
   * whose error sheet opens inside a collapsed dock is a message nobody sees.
   */
  const lastSignalRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (infoOpenSignal == null) return;
    if (lastSignalRef.current === infoOpenSignal) return;
    lastSignalRef.current = infoOpenSignal;
    setExpanded(true);
    setInfoOpen(true);
  }, [infoOpenSignal]);

  useEffect(() => {
    if (!isBulkMode) {
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

  const dispatchAction = (id: string) => {
    actionCallbacksRef.current.get(id)?.();
    setExpanded(false);
  };
  const dispatchBulkClear = () => {
    bulkClearRef.current?.();
    setExpanded(false);
  };
  const handleApply = () => {
    if (!selectedActionId) return;
    bulkCallbacksRef.current.get(selectedActionId)?.();
    setExpanded(false);
  };

  if (!isVisible) return null;

  /*
   * The resting affordance. In bulk mode it counts the selection, which is the
   * one number a user in that state is tracking; otherwise it carries the
   * PRIMARY action's icon, so the dock looks like what it does rather than like
   * a generic "more" button.
   */
  const primaryAction = pageActions[pageActions.length - 1];
  const fabBadge = isBulkMode ? bulk?.selectedCount : undefined;
  const fabLabel = isBulkMode
    ? `${bulk?.selectedCount ?? 0} selected — bulk actions`
    : (primaryAction?.label ?? infoLabel ?? "Page actions");

  // Rule 4's deferred return — below every hook, for the reason given above.
  if (isBackToCta) {
    if (!ctaRevealed) return null;
    return (
      <Div
        className={[
          "fixed pointer-events-auto z-[var(--appkit-z-back-to-top)]",
          hand === "left" ? "left-4" : "right-4",
          /*
           * `BackToTop`'s own expression verbatim — including its `4rem`
           * default for `--bottom-nav-height`, not the `0px` the dock's other
           * branch would imply — plus 3.5rem to clear that control's touch
           * box and its gap. Copying the expression rather than inventing one
           * is what keeps the two stacked when the tier changes height.
           */
          "bottom-[calc(var(--keyboard-inset-height,0px)+var(--bottom-nav-height,4rem)+var(--bottom-chrome-height,0px)+var(--appkit-space-4)+3.5rem)]",
          "transition-[bottom] duration-300 ease-out",
        ].join(" ")}
        data-section="back-to-cta"
      >
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={scrollToAnchor}
          aria-label={`Back to ${primaryAction?.label ?? "the buy button"}`}
        >
          <ChevronUp aria-hidden="true" size={ICON_SIZE.sm} />
          {`Back to ${primaryAction?.label ?? "buy"}`}
        </Button>
      </Div>
    );
  }

  return (
    <Div
      ref={containerRef}
      role="toolbar"
      aria-label={isBulkMode ? "Bulk actions" : "Page actions"}
      className={[
        "fixed z-[var(--appkit-z-overlay)] pointer-events-auto flex flex-col",
        panelAlignClass,
        dockSideClass,
        /*
         * Vertically centred — see rule 1. This is a desktop-only control, so
         * it deliberately reads NONE of the three bottom-tier variables: there
         * is no tab bar at this width, the keyboard inset is a phone concern,
         * and the pagination bar is at the opposite end of the viewport. An
         * unused `calc()` over variables that are 0 here is just a claim about
         * a relationship that no longer exists.
         *
         * `max-h` + `justify-center` so a tall expanded panel grows about the
         * midpoint and is clipped by the viewport rather than running off both
         * ends of it; the panel scrolls internally.
         */
        "top-1/2 -translate-y-1/2 max-h-[90vh] justify-center",
        "px-[var(--appkit-space-3)] gap-[var(--appkit-space-2)]",
      ].join(" ")}
      data-section="side-action-dock"
    >
      {expanded && (
        <Div
          surface="elevated"
          rounded="xl"
          shadow="lg"
          padding="sm"
          className={`${PANEL_SURFACE} w-[min(20rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto`}
        >
          <Stack gap="sm">
            <Row align="center" justify="between" gap="sm">
              <Text size="xs" weight="semibold" color="muted" className="truncate">
                {isBulkMode
                  ? bulk?.noun
                    ? `${bulk.selectedCount} ${bulk.noun}`
                    : `${bulk?.selectedCount ?? 0} selected`
                  : (secondaryLabel ?? infoLabel ?? "Actions")}
              </Text>
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Close actions"
                onClick={() => setExpanded(false)}
                icon={<X className="w-4 h-4" aria-hidden="true" />}
              />
            </Row>

            {/* Both labels can be live at once (a cart shows a total AND a
                per-seller note), so the one not used as the title above still
                renders here rather than being silently dropped. */}
            {!isBulkMode && secondaryLabel && infoLabel && (
              <Text size="xs" color="muted" className="leading-5">
                {infoLabel}
              </Text>
            )}

            {hasInfoPanel && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setInfoOpen((o) => !o)}
                  aria-expanded={infoOpen}
                  aria-controls={infoPanelId}
                  className="w-full flex items-center justify-between gap-[var(--appkit-space-2)] rounded-md px-[var(--appkit-space-2)] py-[var(--appkit-space-1)] min-h-0"
                >
                  <Text as="span" size="xs" color="muted">
                    {infoOpen ? "Hide details" : "Details"}
                  </Text>
                  {infoOpen ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                  )}
                </Button>
                {/* In the flow, not absolutely positioned: the dock is already
                    a floating panel that scrolls internally, so a sheet that
                    opened "upward" out of it would leave the screen on a short
                    viewport. */}
                {infoOpen && (
                  <Div id={infoPanelId} className="max-h-[40vh]" overflow="y-auto">
                    {infoPanel}
                  </Div>
                )}
              </>
            )}

            {isBulkMode && bulk ? (
              <Stack gap="sm">
                <BulkActionList
                  bulkActions={bulkActions}
                  selectedActionId={selectedActionId}
                  onSelect={setSelectedActionId}
                />
                <ActionRow>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={dispatchBulkClear}
                  >
                    <X className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" aria-hidden="true" />
                    <Span>Clear</Span>
                  </Button>
                  <Button
                    type="button"
                    variant={selectedAction?.variant ?? "primary"}
                    size="sm"
                    isLoading={selectedAction?.loading}
                    disabled={
                      !selectedActionId || selectedAction?.disabled || selectedAction?.loading
                    }
                    onClick={handleApply}
                  >
                    <Span>Apply</Span>
                  </Button>
                </ActionRow>
              </Stack>
            ) : (
              <PageActionsRow pageActions={pageActions} dispatchAction={dispatchAction} />
            )}
          </Stack>
        </Div>
      )}

      {/* The resting button. `aria-expanded` is real — this is the only control
          that opens the panel, unlike the navbar dropdown where hover also
          opens it and the attribute would have to lie. */}
      <Button
        type="button"
        variant={isBulkMode ? "primary" : (primaryAction?.variant ?? "primary")}
        rounded="full"
        aria-expanded={expanded}
        aria-label={fabLabel}
        onClick={() => setExpanded((o) => !o)}
        className="relative shadow-lg h-14 min-h-0 px-[var(--appkit-space-5)]"
      >
        {primaryAction?.icon && !isBulkMode && (
          <Span className="flex-shrink-0 mr-1.5" aria-hidden="true">
            {primaryAction.icon}
          </Span>
        )}
        <Span className="truncate max-w-[9rem]">
          {isBulkMode ? "Bulk actions" : (primaryAction?.label ?? "Actions")}
        </Span>
        {fabBadge !== undefined && fabBadge > 0 && (
          <Span
            className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] ${CLS_COUNT_BADGE} text-[10px] ${FLEX_CENTER} px-[var(--appkit-space-1)] pointer-events-none select-none`}
            rounded="full"
            weight="bold"
            aria-hidden="true"
          >
            {fabBadge}
          </Span>
        )}
      </Button>
    </Div>
  );
}
