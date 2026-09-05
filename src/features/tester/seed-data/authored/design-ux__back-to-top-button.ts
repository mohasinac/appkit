/*
 * WHY: Authored six-part procedures for the design-ux/back-to-top-button page.
 * WHAT: 5 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * The bottom edge is three declared tiers with exactly three variables and three
 * writers: the keyboard inset, the mobile tab bar, and one container measuring
 * everything between. This control consumes all three — which is why "does it
 * clear the CTA bar" is a case rather than a detail.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

export const authored: Record<string, AuthoredCase> = {
  "checklist-design-ux-back-to-top-button-appears-and-clickable-on-long-page": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window at a desktop width of 1280 pixels.",
      "Look for the back-to-top control before scrolling.",
      "Scroll down past 400 pixels.",
      "Look for the control again and read what it shows.",
      "Click it.",
    ],
    inputs: { viewportWidth: 1280, revealScrollPx: 400 },
    expectedBehaviour:
      "The control is hidden at the top of the page, where it would do nothing, and appears once there is somewhere to return to. It must be genuinely clickable rather than sitting behind another fixed element.",
    expectedUiState:
      "Nothing is shown before scrolling. After 400 pixels the control appears and responds to a click. A control that appears but does not respond means something transparent is on top of it.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-design-ux-back-to-top-button-above-sticky-buy-bar": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-original-dranzer-s",
    steps: [
      "Open /products/product-beyblade-original-dranzer-s in a private window at 1280 pixels wide.",
      "Scroll down past 400 pixels so both the sticky buy bar and the back-to-top control are showing.",
      "Look at where the back-to-top control sits relative to the buy bar.",
      "Try to click both the back-to-top control and each button in the buy bar.",
      "Resize to 390 pixels wide and repeat.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "Neither element learns the other's height — both read from the one measured container, so the control clears the bar automatically and a bar added later is covered with no edit. The desktop reveal threshold for the buy bar is the SAME 400 pixels, so the two appear on the same scroll tick and the overlap is guaranteed rather than occasional.",
    expectedUiState:
      "The back-to-top control sits fully above the buy bar with a visible gap, at both widths. It does not overlap any buy-bar button, and every button in the bar is clickable.",
    endResult: "Read-only; nothing persists. Restore the window width afterwards.",
  },
  "checklist-design-ux-back-to-top-button-scrolls-to-top": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window and scroll to the bottom of the grid.",
      "Click the back-to-top control.",
      "Watch the page as it moves.",
      "Read what is at the top of the viewport when it stops.",
      "Read the address bar.",
    ],
    expectedBehaviour:
      "The control scrolls the window to the top of the current page. It is not a navigation — the URL, the filters and the page of results are all unchanged.",
    expectedUiState:
      "The page ends at the top with the header and toolbar visible. The URL is unchanged, the same filters are still applied, and the same page of results is still loaded — a jump back to page one would be a navigation wearing a scroll control's clothes.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-design-ux-back-to-top-button-dismiss-returns-on-navigation": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window and scroll past 400 pixels so the control appears.",
      "Click its close or dismiss control.",
      "Scroll up and down again and check whether it returns.",
      "Navigate to /auctions WITHOUT reloading — click a link rather than typing the URL.",
      "Scroll past 400 pixels and look for the control.",
    ],
    expectedBehaviour:
      "Dismissal lasts for the current page and is reset on the next navigation. This control lives in a shell that does NOT remount when the route changes, so a dismissal stored in browser storage reads as permanent: one click hid it until the tab was closed, with no way to bring it back.",
    expectedUiState:
      "After dismissing, the control stays hidden on /products however much the page is scrolled. After navigating to /auctions it returns on scroll. A control still hidden after navigation is the failure.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-design-ux-back-to-top-button-not-covering-toast-or-modal-actions": {
    roles: ["buyer"],
    startPage: "/products/product-tester-standard-1",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /products/product-tester-standard-1 and scroll past 400 pixels so the control appears.",
      "Click 'Add to Cart' and watch for a toast.",
      "Look at whether the control overlaps the toast or any control inside it.",
      "Open any modal on the page and look at its footer buttons.",
      "Try to click each footer button.",
    ],
    expectedBehaviour:
      "The control yields to transient and modal UI. A toast carries actions and a modal footer carries the decision — a floating control on top of either takes a click the user meant for something else.",
    expectedUiState:
      "The toast is fully visible and its controls are clickable. The modal's footer buttons are unobstructed and every one responds. The back-to-top control either sits clear of both or is hidden while they are open.",
    endResult:
      "Remove the item from the cart afterwards so later cases start from an empty cart.",
  },
};
