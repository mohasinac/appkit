/*
 * WHY: Authored six-part procedures for the selling/store-dashboard-navigation page.
 * WHAT: 9 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE STORE SUBTREE IS PER-REQUEST BECAUSE ITS LAYOUT READS THE SESSION, and
 * that single read is what makes every route beneath it dynamic — there is no
 * route-segment config anywhere in the tree, and adding one would be declaring a
 * rendering contract to silence a build error. The redirect case below exercises
 * exactly that layout read.
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
  "checklist-selling-store-dashboard-navigation-store-sidebar-all-links-work": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store and expand every group in the sidebar.",
      "Click each link in turn, reading where it lands and going back each time.",
      "Write down any link that 404s, renders an empty shell, or lands somewhere unrelated.",
      "Count the links against the number of pages that exist under /store.",
    ],
    expectedBehaviour:
      "Every sidebar link opens a real page with content. The inverse — a built page with no sidebar entry — is the same defect from the other side and is why the count matters: around seventeen store pages were once reachable only by typing their exact URL.",
    expectedUiState:
      "Every link resolves to a page that renders content, not a 404 and not chrome with an empty body. Note any page you know exists that has no link — that half is not enforced and has to be spotted by eye.",
    expectedData: { brokenLinks: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-selling-store-dashboard-navigation-store-sidebar-active-highlight": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store and note which sidebar entry is highlighted.",
      "Navigate to /store/products and read which entry is highlighted.",
      "Navigate to a nested page beneath it — a product's editor — and read the highlight again.",
      "Navigate to /store/orders and read it again.",
      "Use the browser's back button and read the highlight.",
    ],
    expectedBehaviour:
      "The highlight follows the current path, including on nested routes where the sidebar has no entry of its own — a product editor should still highlight Products. It must also follow a back navigation, since the highlight is derived from the path rather than from the click.",
    expectedUiState:
      "Exactly one entry is highlighted at a time and it matches the current section, including on the nested editor. After the back navigation the highlight matches wherever the browser landed.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-selling-store-dashboard-navigation-store-sidebar-mobile-collapse": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Resize the browser window to 390 pixels wide and open /store.",
      "Read how the sidebar is presented.",
      "Open it, read its entries, and navigate somewhere.",
      "Check whether it closed on navigation.",
      "Count the fixed bars at the bottom of the screen.",
      "Try to scroll the page sideways.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "On a phone the sidebar collapses behind a control and closes after navigating. The dashboard renders its own bottom tab bar and the public one is suppressed on these routes, so exactly one is mounted — two would be two bars on the same pixels with a height nobody owns.",
    expectedUiState:
      "The sidebar is collapsed by default, opens on demand, and closes after a navigation. Exactly one bottom bar is present, carrying dashboard destinations. The page does not scroll sideways.",
    expectedData: { bottomNavCount: 1 },
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-selling-store-dashboard-navigation-store-deep-link-direct-load": {
    roles: ["seller"],
    startPage: "/store/products",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open a product's editor from /store/products and copy the URL.",
      "Open a new tab and paste that URL directly.",
      "Read whether the editor opens populated on the same record.",
      "Reload that tab and read it again.",
      "Copy a filtered listing URL — with a search term and a sort applied — and open it in a new tab.",
      "Read whether the filters and sort are applied on first paint.",
    ],
    expectedBehaviour:
      "Every dashboard URL is a real destination: an editor deep link opens on its record, and a filtered listing URL reproduces its filters on first paint. Listing state lives in the URL for this reason, so the server's render and the toolbar controls agree.",
    expectedUiState:
      "The pasted editor URL opens populated and survives a reload. The filtered listing URL shows the same rows, filters and sort as the tab it was copied from, on first paint rather than after a re-sort.",
    endResult: "Read-only; close the editors without saving.",
  },
  "checklist-selling-store-dashboard-navigation-store-user-crossnav": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store and find the cross-dashboard navigation to the buyer portal.",
      "Click through to /user and read where it lands.",
      "From /user, find the way back to /store and click it.",
      "Check the sidebar changed with the portal each time.",
      "Open the public store page from within the dashboard and confirm it opens the public view rather than the editor.",
    ],
    expectedBehaviour:
      "A seller is also a buyer, so both portals are reachable from each other and each renders its own navigation. The public-store link is a distinct destination from the store settings editor — conflating them is a live defect on the buyer side, where a 'My Profile' entry leads to the edit page rather than the public profile.",
    expectedUiState:
      "Each cross-link lands in the other portal with that portal's own sidebar. The public store link opens the public store page, not the settings editor.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-selling-store-dashboard-navigation-store-browser-back-forward": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store, then /store/products, then apply a filter, then open a product editor.",
      "Press the browser back button once and read where it lands.",
      "Press back again and read where it lands, including whether the filter is still applied.",
      "Press back once more.",
      "Press forward three times, reading each landing.",
    ],
    expectedBehaviour:
      "Every state change that alters the URL is one history entry, so back walks them in reverse. A filter change that writes the URL twice — once for the filter and once to reset the page number — produces two entries for one action and makes back appear not to work.",
    expectedUiState:
      "Back and forward walk the sequence one step per press, and the filtered listing comes back with its filter applied. Two presses needed to undo a single filter change is the double-navigation failure.",
    endResult: "Read-only; close any editor without saving.",
  },
  "checklist-selling-store-dashboard-navigation-store-logged-out-redirect": {
    roles: ["guest"],
    startPage: "/store",
    steps: [
      "Open a private window with no session.",
      "Open /store and watch the page for 5 seconds.",
      "Open /store/products and watch for 5 seconds.",
      "Open /store/payouts and watch for 5 seconds.",
      "Read each for any store name, order, payout figure or seller detail at any point.",
      "Read where each ends up.",
    ],
    expectedBehaviour:
      "The store layout reads the session server-side, which both makes the whole subtree per-request and gates it. A signed-out request is redirected before any store data is rendered — no flash of a real store's figures.",
    expectedUiState:
      "All three end on the sign-in page. At no point does a store name, an order, a payout amount or a seller's detail appear. A spinner still turning after 5 seconds is a separate failure from a leak, and both should be reported.",
    expectedData: { storeDataShownToGuest: 0 },
    endResult:
      "Read-only. Any trace of real store data is a leak and fails the case outright.",
  },
  "checklist-selling-store-dashboard-navigation-store-nav-listing-type-groups": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store and find the listing-type entries in the sidebar.",
      "Write down every listing type offered.",
      "Compare that list against the nine types the catalogue supports.",
      "Open each and check it lists that type's listings rather than everything.",
      "Write down any type that is missing or whose page shows the wrong listings.",
    ],
    expectedBehaviour:
      "Every listing type has a way in. Adding a type to the union and the plugin registry is not enough — omit it from the repository's filter-alias map and the alias returns an empty value that is then dropped, so the page runs with NO type filter and shows the seller everything.",
    expectedUiState:
      "All nine types are offered and each page shows only its own type. A page showing the full catalogue under a type heading is the dropped-filter failure; a missing type is the other half of the same bug.",
    expectedData: { listingTypeEntries: 9 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-selling-store-dashboard-navigation-store-sidebar-logout-button": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store and find the log-out control in the sidebar.",
      "Click it and read where the browser lands.",
      "Open /store again.",
      "Read what happens.",
      "Press the browser back button and read what is shown.",
    ],
    expectedBehaviour:
      "Log out clears both halves of the session — the server cookie and the client auth session. Clearing only one leaves the browser able to re-mint a session on the next request, which is why the second navigation, not the redirect, is the real check.",
    expectedUiState:
      "The browser leaves the dashboard on log-out. Opening /store afterwards redirects to sign-in rather than rendering the dashboard, even briefly with real data. The back button does not restore it from cache.",
    endResult:
      "The session is ended. A dashboard visible via the back button after log-out is a real exposure on a shared machine.",
  },
};
