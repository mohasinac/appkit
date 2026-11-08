import React from "react";
import { DetailViewShell } from "./DetailViewShell";
import type { DetailViewShellProps } from "./DetailViewShell";
import { Div } from "./Div";

/**
 * The one shell every listing detail page uses.
 *
 * Replaces `ProductDetailView`, `CollectorDropDetailView` and
 * `PreOrderDetailView` — three files, 202 lines, ~22 render-prop slots each.
 *
 * ## 🛑 They were NOT duplicates, and the distinction matters
 *
 * A 2026-11-08 note called those three "near-identical duplicates, nobody knows
 * why there are two" of their `*DetailPageView` counterparts. That was wrong:
 * each was a SHELL and its counterpart was the PAGE that filled its slots. The
 * error came from comparing filenames instead of reading files, and it nearly
 * caused the shells to be deleted as redundant.
 *
 * What they actually were is three parameterisations of ONE layout:
 *
 * | | Product | CollectorDrop | PreOrder |
 * |---|---|---|---|
 * | layout | `grid-3` | `grid-3` | `grid-2` |
 * | third slot | `renderActions`, sticky | `renderBidForm`, desktop-only | — |
 * | afterMain | sublisting + group | mobile bid + sublisting | sublisting |
 * | belowFold | tabs + bundle + related | tabs + bidHistory + related | tabs + related |
 *
 * Every difference above is a VALUE. So they are one component with props,
 * which is the same argument the listing-type collapse makes one level up.
 *
 * ## Why slots are arrays rather than named props
 *
 * `renderBundleSection`, `renderBidHistory` and `renderGroupSection` were three
 * names for "another thing below the tabs". Naming each one forced a new prop —
 * and a new shell — every time a listing type wanted a different section. An
 * ordered array takes any number of sections and needs no new prop, so adding a
 * section to a type is a config change rather than an edit here.
 *
 * Falsy entries are dropped, so a caller can pass a conditional straight in
 * without assembling the array itself.
 */
export interface ListingDetailShellProps
  extends Omit<DetailViewShellProps, "mainSlots" | "belowFold" | "layout" | "afterMain"> {
  /** `grid-3` gives gallery | info | aside. `grid-2` drops the aside column. */
  layout?: "grid-2" | "grid-3";
  renderGallery?: (isLoading: boolean) => React.ReactNode;
  renderInfo?: (isLoading: boolean) => React.ReactNode;
  /**
   * The third column — a buy bar, an action rail, a bid form. Ignored when
   * `layout` is `grid-2`.
   */
  renderAside?: () => React.ReactNode;
  /**
   * Hide the aside below `lg`. Used where the same control is rendered again
   * in `afterMain` for mobile (the collector-drop bid form does this), so the
   * two would otherwise both show on a phone.
   */
  asideDesktopOnly?: boolean;
  /** Sections between the main grid and the below-fold stack, in order. */
  afterMain?: Array<React.ReactNode | false | null | undefined>;
  /** Sections below the fold, in order — tabs, history, related, anything. */
  belowFold?: Array<React.ReactNode | false | null | undefined>;

  /*
   * ── Named slots, and why they exist beside the arrays ──────────────────
   *
   * The arrays above are the real API: they take any number of sections and
   * need no new prop when a listing type wants a different one.
   *
   * These four are SUGAR for the positions every listing page happens to
   * have, and they exist because the alternative was worse. Without them,
   * every call site has to assemble `belowFold={[tabs, related]}` by hand,
   * which reads less clearly at the call site and — during the migration from
   * three shells — meant rewriting JSX by regex across six large pages. One
   * mangled render prop there is a blank section on a live PDP.
   *
   * 🛑 The line to hold: a FIFTH named slot is not allowed. If a type needs
   * another section it goes in the array. Naming each new section is exactly
   * how the three shells grew twenty-two props between them.
   *
   * Ordering when both are supplied: named slots first, then the array.
   */
  renderSublistingSection?: () => React.ReactNode;
  renderGroupSection?: () => React.ReactNode;
  renderTabs?: () => React.ReactNode;
  renderRelated?: () => React.ReactNode;
  /** Sticky aside on desktop. Only meaningful with `grid-3`. */
  stickyActionRail?: boolean;
  stickyRailOffset?: string;
}

/** Drop falsy slots so callers can pass conditionals directly. */
function present(nodes: Array<React.ReactNode | false | null | undefined> = []) {
  return nodes.filter(Boolean) as React.ReactNode[];
}

export function ListingDetailShell({
  layout = "grid-3",
  renderGallery,
  renderInfo,
  renderAside,
  asideDesktopOnly = false,
  afterMain,
  belowFold,
  renderSublistingSection,
  renderGroupSection,
  renderTabs,
  renderRelated,
  isLoading = false,
  stickyActionRail = true,
  stickyRailOffset = "top-[var(--header-height,0px)]",
  ...rest
}: ListingDetailShellProps) {
  const asideNode = layout === "grid-3" ? renderAside?.() : undefined;

  const mainSlots: React.ReactNode[] = [
    renderGallery?.(isLoading),
    renderInfo?.(isLoading),
  ];
  if (layout === "grid-3") {
    mainSlots.push(
      asideDesktopOnly ? (
        <Div key="aside" className="hidden lg:block">
          {asideNode}
        </Div>
      ) : (
        asideNode
      ),
    );
  }

  const after = present([
    renderSublistingSection?.(),
    renderGroupSection?.(),
    ...(afterMain ?? []),
  ]);
  const below = present([renderTabs?.(), ...(belowFold ?? []), renderRelated?.()]);

  return (
    <DetailViewShell
      portal="public"
      {...rest}
      layout={layout}
      isLoading={isLoading}
      stickyActionRail={layout === "grid-3" ? stickyActionRail : false}
      stickyRailOffset={stickyRailOffset}
      mainSlots={mainSlots}
      /*
       * `undefined`, not an empty fragment, when there is nothing — the shell
       * renders a wrapper for a truthy `afterMain`, and an empty fragment
       * would leave an empty bordered band on every page that has no
       * sublisting or group section.
       */
      afterMain={after.length ? <React.Fragment>{after}</React.Fragment> : undefined}
      belowFold={below}
    />
  );
}
