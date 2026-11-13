"use client";

/**
 * DashboardChrome — the browser-style chrome that replaces the dashboard's
 * DESKTOP drawer. Two thin rows: an omnibox, then a tab strip.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * Owner, 2026-11-12: *"Dashboards look like a browser: tab strip, omnibox
 * (navigate AND search, one field), thin toolbar, overflow menu. Chrome caps
 * at ~2 thin rows."* And 2026-11-13, on finding the sidebar still on
 * `/user/profile`: *"the dashboards specifically said to be widget based like
 * the admin"* → **"Build it now — R1 does not ship until dashboards are
 * widget-based."**
 *
 * 🛑 **THERE WAS NOTHING TO COPY.** The brief said "like the admin", and admin
 * turned out to render the SAME `DashboardLayoutClient` and the SAME 18rem
 * `hidden lg:flex fixed` sliding panel as the user dashboard. The tab strip
 * and omnibox existed only as two rows of SEED DATA (`chrome.tabStrip`,
 * `chrome.omnibox` in `widget-templates-seed-data.ts`) that no renderer maps,
 * plus one line of prose. So this is built once, for every variant, rather
 * than ported from a surface that already had it.
 *
 * ⚠ That seed pair is a trap worth naming: a validated-but-unrendered key
 * reads exactly like a shipped feature. `ui/widgets/types.ts` states the rule
 * it violates — *"Regions are declared in CODE and can never be created by
 * config. A hole has to exist in JSX before config can fill it."* This file is
 * that hole.
 *
 * ── What it is NOT ────────────────────────────────────────────────────────
 *
 * 🛑 It does not remove the MOBILE drawer, and it must never be made to. The
 * recorded ruling keeps the mobile drawer and removes only the desktop one, so
 * `DashboardLayoutClient` still registers its open/close/toggle handlers
 * through `useDashboardNav` — which is what `TitleBar` gates the hamburger on.
 * Deleting the desktop panel without preserving that registration kills the
 * hamburger too, and then a phone has no navigation at all.
 */

import { useMemo, useState } from "react";
import { OverflowRow } from "../../ui/components/OverflowRow";
import type { OverflowRowItem } from "../../ui/components/OverflowRow";
import { Div } from "../../ui/components/Div";
import { Row } from "../../ui/components/Layout";
import { Text } from "../../ui/components/Typography";
import { TextLink } from "../../ui/components/TextLink";
import { rankNavSearchResults } from "../shell/searchNavItems";

/** One navigable destination, flattened out of a nav group. */
export interface DashboardChromeItem {
  id: string;
  label: string;
  href: string;
  groupTitle: string;
  /** Ranked above equal-scoring peers by `rankNavSearchResults`. */
  priority?: number;
}

export interface DashboardChromeProps {
  /** Top-level sections — the tab strip. */
  sections: readonly OverflowRowItem[];
  /** Every destination, for the omnibox. */
  items: readonly DashboardChromeItem[];
  /** The active section id, for `aria-selected` on the strip. */
  activeSectionId?: string;
  /** Accessible name — "Admin navigation", "Account navigation", … */
  ariaLabel: string;
  omniboxPlaceholder?: string;
  /** Rendered at the end of the omnibox row — the thin toolbar's action slot. */
  actions?: React.ReactNode;
}

const MAX_OMNIBOX_RESULTS = 8;

/**
 * 🛑 DESKTOP ONLY, and the gate is `hidden lg:block` on the wrapper rather
 * than a `useIsDesktop()` branch.
 *
 * A JS media query would make this chrome absent from the server render and
 * appear on hydration, which on a dashboard is a visible nav pop on every
 * load. A CSS gate ships both and lets the breakpoint choose — and it is the
 * same reason `SidebarLayout.mobileOnly` is a class rather than a branch, as
 * `AnnouncementBar` already documents.
 */
export function DashboardChrome({
  sections,
  items,
  activeSectionId,
  ariaLabel,
  omniboxPlaceholder = "Go to… or search",
  actions,
}: DashboardChromeProps) {
  const [query, setQuery] = useState("");

  /*
   * The NAVIGATE half of the omnibox, reusing the ranking the command palette
   * already uses — same data, same order, so the two cannot disagree about
   * what "best match" means. The SEARCH half (content, not nav) is deliberately
   * not faked here: an omnibox that silently returns only nav results while
   * implying it searches everything is the kind of half-promise this project
   * keeps paying for. It is additive once a content index exists.
   */
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return rankNavSearchResults(
      items.map((i) => ({ ...i, groupTitle: i.groupTitle })),
      query,
    ).slice(0, MAX_OMNIBOX_RESULTS);
  }, [items, query]);

  return (
    <Div
      className="hidden lg:block sticky top-[var(--header-height,3.5rem)] z-[var(--appkit-z-sticky,30)] border-b border-[var(--appkit-color-border-subtle)] bg-[var(--appkit-color-bg)]"
      data-section="dashboard-chrome"
    >
      {/* Row 1 — the omnibox, plus the toolbar's action slot. */}
      <Row align="center" gap="sm" className="px-[var(--appkit-space-4)] py-[var(--appkit-space-2)]">
        <Div className="relative flex-1 max-w-[32rem]">
          <input
            type="search"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="dashboard-omnibox-results"
            aria-label={`${ariaLabel} — go to a page or search`}
            placeholder={omniboxPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-8 rounded-full border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-[var(--appkit-space-3)] text-[length:var(--appkit-text-sm)] text-[var(--appkit-color-text)] placeholder:text-[var(--appkit-color-text-muted)]"
          />
          {results.length > 0 && (
            <Div
              id="dashboard-omnibox-results"
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-[var(--appkit-z-overlay)] max-h-[60vh] overflow-y-auto rounded-lg border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] shadow-xl p-[var(--appkit-space-1)]"
            >
              {results.map((r) => (
                <TextLink
                  key={r.id}
                  href={r.href}
                  role="option"
                  className="flex items-baseline gap-[var(--appkit-space-2)] rounded-md px-[var(--appkit-space-2)] py-[var(--appkit-space-1)] hover:bg-[var(--appkit-color-surface-subtle)]"
                  onClick={() => setQuery("")}
                >
                  <Text as="span" size="sm">{r.label}</Text>
                  <Text as="span" size="xs" color="muted">{r.groupTitle}</Text>
                </TextLink>
              ))}
            </Div>
          )}
        </Div>
        {actions ? <Div className="ml-auto flex items-center gap-[var(--appkit-space-2)]">{actions}</Div> : null}
      </Row>

      {/*
       * Row 2 — the tab strip. `OverflowRow` is the one piece of this that
       * already existed and is proven: it renders pills while they fit and
       * becomes a searchable, keyboard-navigable dropdown when they do not,
       * which is exactly a tab strip with an overflow menu. It had simply
       * never been mounted in a dashboard.
       *
       * `variant="nav"`, not `"tabs"` — these navigate away rather than
       * swapping a panel in place, and the component's own doc makes that the
       * deciding question.
       */}
      {sections.length > 0 && (
        <Div className="px-[var(--appkit-space-4)] pb-[var(--appkit-space-1)]">
          <OverflowRow
            items={sections}
            ariaLabel={ariaLabel}
            variant="nav"
            {...(activeSectionId ? { activeId: activeSectionId } : {})}
            placeholder="Sections"
          />
        </Div>
      )}
    </Div>
  );
}

export default DashboardChrome;
