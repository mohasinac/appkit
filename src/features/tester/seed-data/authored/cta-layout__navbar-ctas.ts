/*
 * WHY: Authored six-part procedures for the cta-layout/navbar-ctas checklist page.
 * WHAT: 8 case(s), keyed by full checklist id.
 *
 * The header is mounted once in a persistent shell and does NOT re-mount on
 * client-side navigation. Everything below follows from that: a badge cannot
 * correct itself by re-mounting, a signed-in state cannot appear by reloading,
 * and an active-section marker has to be derived from the current path rather
 * than set once on first render.
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
  "checklist-cta-layout-navbar-ctas-header-ctas-all-navigate": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open the homepage signed out.",
      "List every clickable control in the header, including the logo and any icon-only ones.",
      "Click each in turn, noting where it lands and returning each time.",
      "Record any that does nothing.",
      "Record any that 404s.",
      "Check the logo returns to the homepage.",
    ],
    expectedBehaviour:
      "Every header control goes somewhere real. An inert control is the harder half to notice — it looks like a slow page rather than a broken link, so the visitor waits and then clicks it again.",
    expectedUiState:
      "Every control navigates to a real page and the logo returns home. Any control that does nothing, or 404s, is a finding named by its label or icon.",
    expectedData: { deadHeaderControls: 0 },
    endResult: "Read-only.",
  },
  "checklist-cta-layout-navbar-ctas-header-cart-badge-live": {
    roles: ["buyer"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with an empty cart.",
      "Read the header's cart control and its badge.",
      "Add a product from /products and read the badge without reloading.",
      "Add a second and read it again.",
      "Navigate to two other pages and read the badge on each.",
      "Open /cart, remove an item, and read the badge.",
    ],
    expectedBehaviour:
      "The badge reads the same cart the pages read, so it tracks every change with no reload. The header never re-mounts across navigation, so a badge holding its own count cannot correct itself — it keeps a stale number for the rest of the session.",
    expectedUiState:
      "The badge follows every add and removal immediately and stays correct across navigation. A count that lags or freezes is the finding.",
    endResult: "Empty the cart afterwards.",
  },
  "checklist-cta-layout-navbar-ctas-header-signed-out-vs-in": {
    roles: ["guest", "buyer"],
    startPage: "/",
    steps: [
      "Open the homepage signed out and read the header's account area.",
      "Check a sign-in affordance is offered.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! from that control.",
      "Read the header immediately after signing in, WITHOUT reloading.",
      "Check it now shows an account menu.",
      "Sign out and read the header again without reloading.",
    ],
    expectedBehaviour:
      "The header switches with the session and without a reload. The session resolves asynchronously on a hard load, so the header may briefly not know who the visitor is — but once it does, the change has to reach the persistent header rather than waiting for the next full page load.",
    expectedUiState:
      "Signed out shows sign-in; signed in shows an account menu; each switch happens without a reload. A header still offering sign-in after a successful sign-in is the finding.",
    endResult: "Signed out.",
  },
  "checklist-cta-layout-navbar-ctas-account-menu-links-resolve": {
    roles: ["buyer", "seller", "admin"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and open the account menu.",
      "Click every item in it, noting where each lands and returning each time.",
      "Record any 404 or unauthorised page.",
      "Repeat signed in as tyson@beybladearena.in / TempPass123!.",
      "Repeat signed in as admin@letitrip.in / TempPass123!.",
    ],
    expectedBehaviour:
      "Every account-menu item lands on a page that role can actually open. A menu entry pointing at a route with no page behind it is a dead link, and one pointing at a page the role cannot access bounces them to an unauthorised screen from their own menu.",
    expectedUiState:
      "Every item resolves for its role. A 404 or an unauthorised redirect is a finding, named with the role and the item.",
    expectedData: { deadMenuLinks: 0 },
    endResult: "Read-only.",
  },
  "checklist-cta-layout-navbar-ctas-role-specific-nav-entries": {
    roles: ["buyer", "seller", "admin"],
    startPage: "/",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and write down every navigation entry offered.",
      "Check no store or admin entry is among them.",
      "Sign in as tyson@beybladearena.in / TempPass123! and write down the entries.",
      "Check a store entry is present and no admin entry is.",
      "Sign in as admin@letitrip.in / TempPass123! and check an admin entry is present.",
      "Compare the three lists.",
    ],
    expectedBehaviour:
      "Navigation reflects the role. A role check written inline against a role string rather than through the shared predicate drifts from every other check in the product — and the visible symptom is a buyer offered a dashboard that will refuse them.",
    expectedUiState:
      "The buyer sees neither store nor admin entries, the seller sees store and not admin, the admin sees admin. Any entry offered to a role that cannot use it is the finding.",
    endResult: "Read-only.",
  },
  "checklist-cta-layout-navbar-ctas-mobile-nav-opens-and-closes": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Resize the browser to 390 pixels wide and open the homepage.",
      "Open the mobile navigation.",
      "Check it covers the page and its items are readable.",
      "Close it with its own control and check it closes.",
      "Open it again and follow a link.",
      "Check the navigation closed itself on the new page rather than staying over it.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "The mobile navigation closes on its own control AND after a link is followed. It lives in a shell that does not re-mount on navigation, so nothing closes it automatically — a menu left open sits over the page the visitor just asked for.",
    expectedUiState:
      "It opens, closes on its control, and is closed on the destination page after a link. A menu still covering the new page is the finding.",
    endResult: "Restore the window width.",
  },
  "checklist-cta-layout-navbar-ctas-nav-active-state-correct": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open the homepage and read which navigation entry is marked as current.",
      "Navigate to /products and read which is marked.",
      "Navigate to a product detail page and read which is marked.",
      "Navigate to /events and read which is marked.",
      "Use the browser's back button twice and read the marker each time.",
    ],
    expectedBehaviour:
      "The marker is derived from the current path, so it follows client-side navigation and the back button. Set once on first render, it would freeze on whichever section the visitor happened to land on first and stay there for the whole session.",
    expectedUiState:
      "The correct entry is marked on every page including the detail page, and it follows the back button. A marker stuck on one section is the finding.",
    endResult: "Read-only.",
  },
  "checklist-cta-layout-navbar-ctas-announcement-bar-message-renders": {
    roles: ["admin", "guest"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and open Site Settings.",
      "Find the announcement bar section and set its message to 'QA announcement probe — checklist case.'",
      "Save.",
      "Open the public homepage as a signed-out visitor.",
      "Read whether the announcement appears and whether the text matches.",
      "Return to Site Settings, clear the announcement, and check it leaves the homepage.",
    ],
    inputs: { message: "QA announcement probe — checklist case." },
    expectedBehaviour:
      "An announcement an admin saves appears. The editor once wrote the copy under a key no renderer has ever read, so every announcement saved successfully and none of them appeared — a save that reports success while writing to a field with no reader is invisible from both ends.",
    expectedUiState:
      "The exact text appears in the announcement bar on the public homepage, and clearing it removes the bar. A successful save with nothing on the homepage is the finding.",
    endResult: "The announcement is cleared.",
  },
};
