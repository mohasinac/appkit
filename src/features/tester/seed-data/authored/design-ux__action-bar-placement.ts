/*
 * WHY: Authored six-part procedures for the design-ux/action-bar-placement page.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

/*
 * Written against the 2026-10-15 layout change, which moved the page action bar
 * from the bottom edge to under the header at `lg` and up.
 *
 * 🛑 EVERY CASE NAMES A WINDOW WIDTH, because the component is ONE component
 * with two layouts and the interesting failures are at the seam. A case that
 * says only "check the action bar looks right" passes in whichever layout the
 * tester's window happened to be in, and the regression this set exists to
 * catch — fixing one breakpoint and breaking the other — is invisible to it.
 *
 * The mechanism, since several cases reference it: `BottomChrome` is a measured
 * tier that publishes its own height. Below `lg` it publishes
 * `--bottom-chrome-height` (BackToTop floats above it, the footer reserves it);
 * at `lg` it publishes `--top-chrome-height` instead and `<Main>` reserves that
 * as padding. Exactly one is ever non-zero — if both were live, every desktop
 * page would carry a bar-sized gap at the end as well as the top.
 */

import type { AuthoredCase } from "./_types";

export const authored: Record<string, AuthoredCase> = {
  "checklist-design-ux-action-bar-placement-back-to-top-dismiss-visible": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products and scroll down more than about 400 pixels.",
      "Look at the floating controls in the bottom corner of the window.",
      "Click the smaller of the two controls.",
      "Navigate to /auctions and scroll past 400 pixels again.",
    ],
    expectedBehaviour:
      "The dismiss control is an icon button sized as a true square, so its glyph has room to render. Dismissal is in-memory and resets on route change, so it never hides the control for the rest of the session.",
    expectedUiState:
      "TWO round controls are visible: a larger one showing an upward chevron, and a smaller one showing a clearly visible ✕. The prior symptom was the smaller control rendering as an EMPTY outlined pill — present and clickable, with no ✕ inside it, because its content box computed to zero width. After clicking the ✕, both controls disappear.",
    endResult:
      "On /auctions both controls are back after scrolling. Nothing is persisted — a reload also brings them back.",
  },

  "checklist-design-ux-action-bar-placement-action-bar-top-on-desktop": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Maximise the browser window so it is wider than about 1024 pixels.",
      "Open any product detail page from /products.",
      "Look immediately below the site header.",
      "Scroll the page down and watch the bar.",
    ],
    expectedBehaviour:
      "At `lg` and up the chrome tier is pinned under the header rather than to the bottom edge, and its shadow is cast downward onto the page.",
    expectedUiState:
      "The full-width action bar sits directly beneath the header with no gap, and stays there while the page scrolls. Its drop shadow falls DOWNWARD. It must NOT be at the bottom of the window — that was the prior behaviour at every width.",
    endResult:
      "Nothing persists; this is layout only. The bar stays under the header for the whole visit at this width.",
  },

  "checklist-design-ux-action-bar-placement-action-bar-bottom-on-mobile": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "On the same product detail page, narrow the browser window to phone width (under about 1024 pixels), or switch to device emulation.",
      "Look at the bottom of the window.",
      "Slowly widen the window back past the 1024-pixel line, then narrow it again.",
    ],
    expectedBehaviour:
      "One component serves both layouts, switching on a media query, so the bar must move between the two positions rather than being duplicated or dropped.",
    expectedUiState:
      "At phone width the action bar is at the BOTTOM, stacked immediately above the bottom navigation bar, with its shadow falling UPWARD. While resizing across the breakpoint the bar moves cleanly from one end to the other — it is never visible in BOTH places at once, and never disappears entirely at any width.",
    endResult:
      "No state is written. The bar's position always matches the current window width, including after a reload at either width.",
  },

  "checklist-design-ux-action-bar-placement-action-bar-no-content-overlap": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "At desktop width, open a product detail page that shows an action bar.",
      "Read the very first line of page content under the header.",
      "Now open a page with no action bar at all, such as /about.",
      "Look at the space immediately under the header.",
    ],
    expectedBehaviour:
      "The bar is fixed, so it is out of flow and would cover content unless space is reserved. `<Main>` reserves exactly the published tier height, which is zero when no bar exists — so the reservation appears and disappears with the bar rather than being a constant allowance.",
    expectedUiState:
      "With a bar present, the first heading and first row of content are fully visible and not clipped behind it. On /about, with no bar, there is NO empty band under the header — the content starts where it always did.",
    endResult:
      "Nothing persists. Navigating between a page with a bar and one without must not leave a residual gap on the page that has none.",
  },

  "checklist-design-ux-action-bar-placement-action-bar-panels-open-into-screen": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and open /admin/products at desktop width.",
      "Tick the checkboxes on two rows to enter bulk mode.",
      "Open the bulk action-type picker on the bar.",
      "Narrow the window to phone width and open the same picker again.",
    ],
    expectedBehaviour:
      "The panel is positioned against the bar, so its open direction must follow whichever screen edge the bar is attached to. Opening away from the screen would put the panel partly or wholly out of view.",
    expectedUiState:
      "At desktop width the picker expands DOWNWARD over the page content, below the bar. At phone width it expands UPWARD from the bar. In both cases the whole panel is on screen and scrollable, and no part of it is cut off by the window edge.",
    endResult:
      "Closing the picker leaves the bulk selection intact. Clearing the selection removes the bar and the panel together.",
  },

  "checklist-design-ux-action-bar-placement-back-to-top-clears-the-bar": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "At phone width, open a product detail page with an action bar and scroll past 400 pixels.",
      "Look at the vertical gap between the back-to-top control and the action bar.",
      "Slowly widen the window past the desktop breakpoint, watching the control.",
    ],
    expectedBehaviour:
      "The back-to-top offset is expressed against the measured tier rather than against any individual bar, so it tracks the bar's height automatically — and when the tier moves to the top on desktop, the bottom measurement collapses to zero and the control settles lower.",
    expectedUiState:
      "At phone width the control floats clear ABOVE the action bar, which itself sits above the bottom navigation — none of the three overlap. As the window widens past the breakpoint the control moves DOWN into the space the bar vacated. At no point during the resize do the control and any bar overlap.",
    endResult:
      "Position is derived from layout alone and nothing is stored; reloading at either width reproduces the same spacing.",
  },
};
