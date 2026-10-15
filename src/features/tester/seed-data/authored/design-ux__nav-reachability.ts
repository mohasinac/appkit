/*
 * WHY: Authored six-part procedures for the design-ux/nav-reachability page.
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
 * Written against two navigation defects measured in a real browser on
 * 2026-10-15, both of which made controls PERMANENTLY UNREACHABLE rather than
 * merely ugly.
 *
 * 🛑 "Unreachable" is the word that matters, and it is why every case here
 * names a window width and asks the tester to try to GET to something. A
 * clipped control still looks like a design decision in a screenshot; the only
 * way to tell the difference is to attempt to reach it and fail.
 *
 * 1. THE CENTRED SCROLLER. The main navbar strip was
 *    `flex overflow-x-auto justify-center`. When flex content overflows a
 *    centred container the overflow is split across BOTH ends, and the leading
 *    half cannot be scrolled to because `scrollLeft` clamps at 0. Measured at a
 *    1024px viewport: scrollWidth 1245 in a clientWidth of 990, scrollLeft 0,
 *    maxScroll 255 — "Home" at x=-238 and "Products" at x=-148, and scrolling
 *    fully left left them exactly where they were. Verified fixed in the same
 *    browser by applying `justify-content: safe center`: "Home" moved to x=17.
 *
 *    The left chevron could not rescue it, because `canScrollLeft` derives from
 *    `scrollLeft > 0` — the control built for this case was disabled by it.
 *
 * 2. THE CLIPPED HEADER ROW. At 320px the header action row ran from x=150 to
 *    x=384, i.e. 64px past the edge, and the app shell is `overflow-x-clip`, so
 *    the excess was not scrollable. "Open menu" was at x=340..384 — entirely
 *    off-screen.
 */

import type { AuthoredCase } from "./_types";

export const authored: Record<string, AuthoredCase> = {
  "checklist-design-ux-nav-reachability-main-nav-first-items-reachable": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Set the browser window to roughly 1024 pixels wide.",
      "Open /products and look at the horizontal navigation strip under the header.",
      "Read the FIRST item at the left edge of the strip.",
      "Scroll the strip to the right as far as it goes and read the LAST item.",
    ],
    expectedBehaviour:
      "The strip centres its items while they fit and falls back to starting at the left edge as soon as they would overflow, so nothing is ever pushed past the leading edge where scrolling cannot reach it.",
    expectedUiState:
      "'Home' is the first item visible at the left edge of the strip, followed by 'Products'. Scrolling right reaches 'About Us' at the far end. The prior symptom was the strip opening mid-list with 'Home' and 'Products' already cut off past the left edge and no way to bring them back.",
    endResult:
      "Nothing persists. Reloading at the same width shows 'Home' first again — the strip is not remembering a scroll position, it genuinely starts at the beginning.",
  },

  "checklist-design-ux-nav-reachability-main-nav-left-chevron-works": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "At roughly 1024 pixels wide, scroll the navigation strip to the right (drag it, or use the right chevron).",
      "Look at the left end of the strip for a left-pointing chevron.",
      "Click the left chevron.",
    ],
    expectedBehaviour:
      "The left chevron is shown when the strip has been scrolled away from its start. That condition could never be true while the centring pinned the scroll position at 0, so the control existed and never appeared.",
    expectedUiState:
      "After scrolling right, a left chevron is visible at the left end of the strip. Clicking it scrolls the strip back towards the start, and continuing to click eventually brings 'Home' into view and the chevron disappears again.",
    endResult:
      "The strip can be scrolled to either end and back as many times as wanted. No state is saved.",
  },

  "checklist-design-ux-nav-reachability-header-hamburger-reachable-at-320": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Set the browser window to 320 pixels wide, or choose an iPhone SE device profile.",
      "Look at the right-hand end of the top header row.",
      "Tap the hamburger (menu) control.",
    ],
    expectedBehaviour:
      "The header row must fit inside the viewport at the narrowest supported width. The app shell clips horizontal overflow rather than scrolling it, so anything past the edge is unreachable — not merely out of sight.",
    expectedUiState:
      "The hamburger is FULLY visible at the end of the header row, not half-cut and not missing, and tapping it opens the menu. The theme toggle immediately before it is also whole. The prior symptom was the hamburger sitting entirely beyond the right edge and the theme toggle sliced in half.",
    endResult:
      "The menu opens and closes normally. Nothing persists.",
  },

  "checklist-design-ux-nav-reachability-header-demotes-optional-controls": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "At 320 pixels wide, read every icon in the top header row.",
      "Widen the window past about 640 pixels.",
      "Read the header row again.",
      "At 320 pixels again, open the hamburger menu and look for the deals and tour entries.",
    ],
    expectedBehaviour:
      "Room for the hamburger is made by demoting the two most discretionary controls at the narrowest width, rather than by letting the most important one fall off the end. Neither is removed from the product — only from the header row at that width.",
    expectedUiState:
      "At 320px the 'Today's Deals' and product-tour icons are NOT in the header. Above ~640px both are back. At 320px their destinations are still reachable from the menu, so nothing has become unavailable.",
    endResult:
      "Purely responsive; no state is written. Resizing back and forth shows them disappear and reappear at the same point each time.",
  },

  "checklist-design-ux-nav-reachability-no-horizontal-page-scroll": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Set the browser window to 320 pixels wide.",
      "Visit each of: /, /products, any product detail page, /categories, /cart.",
      "On each page, try to drag the page sideways and look for a horizontal scrollbar at the bottom of the window.",
    ],
    expectedBehaviour:
      "No layout should be wider than the viewport at the narrowest supported width. A sideways-scrolling page is the clearest single symptom of a broken responsive layout.",
    expectedUiState:
      "On all five pages the content does not move horizontally and no horizontal scrollbar appears. Report the page and the element if any one of them scrolls — this case is per-page, so a single failure is still a finding even if the other four pass.",
    endResult:
      "Nothing persists. This is a pure layout check at one width.",
  },

  "checklist-design-ux-nav-reachability-lightbox-thumbnails-reachable": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open a product that has several images — the Beyblade X UX-03 WizardRod and the video-demo fixtures all carry multiple.",
      "Click the main product image to open the lightbox.",
      "Look at the thumbnail strip below the enlarged image.",
      "Scroll the strip to both ends.",
    ],
    expectedBehaviour:
      "The thumbnail strip is a horizontal scroller and had the same centring defect as the navbar, so with enough images its first thumbnails were off the leading edge with no scroll position that could reach them.",
    expectedUiState:
      "The strip begins at the FIRST image, and every thumbnail can be reached by scrolling. No thumbnail is stranded past the left edge. Clicking any thumbnail switches the enlarged image to it.",
    endResult:
      "Closing the lightbox returns to the product page with no change. Reopening starts the strip at the first image again.",
  },
};
