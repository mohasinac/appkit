/*
 * WHY: Authored six-part procedures for the buying/user-dashboard-navigation page.
 * WHAT: 9 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE /user SUBTREE IS DIFFERENT FROM /admin AND /store. Its layout reads no
 * session server-side — the guard is a client component — so these routes are
 * PRERENDERED to a signed-out shell and the session hydrates in the browser. That
 * shell is the same bytes for every visitor, which is what makes it safe, and it
 * is also why the signed-out case watches for a flash rather than expecting an
 * immediate server redirect.
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
  "checklist-buying-user-dashboard-navigation-sidebar-all-links-work": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user and expand every group in the sidebar.",
      "Click each link in turn, reading where it lands and going back each time.",
      "Write down any link that 404s, renders an empty shell, or lands somewhere unrelated.",
      "Count the links against the pages that exist under /user.",
      "Read whether a Testing group is present for this non-tester account.",
    ],
    expectedBehaviour:
      "Every sidebar link opens a real page with content. The inverse — a built page with no sidebar entry — is the same defect from the other side, and it is not mechanically blocked: around seventeen pages across the portals were once reachable only by typing their exact URL. The Testing group is injected at runtime for tester accounts and must be absent entirely for others rather than rendering as an empty heading.",
    expectedUiState:
      "Every link resolves to a page with content, not a 404 and not chrome with an empty body. No Testing group appears for this account. Note any page you know exists that has no link — that half has to be spotted by eye.",
    expectedData: { brokenLinks: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-user-dashboard-navigation-sidebar-active-highlight": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user and note which sidebar entry is highlighted.",
      "Navigate to /user/orders and read which entry is highlighted.",
      "Open a specific order's detail and read the highlight again.",
      "Navigate to /user/addresses and read it again.",
      "Press the browser back button and read the highlight.",
    ],
    expectedBehaviour:
      "The highlight is derived from the current path, so it follows nested routes where the sidebar has no entry of its own — an order detail still highlights Orders — and it follows a back navigation, which a highlight set from the click cannot.",
    expectedUiState:
      "Exactly one entry is highlighted at a time and it matches the current section, including on the order detail. After the back navigation it matches wherever the browser landed.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-user-dashboard-navigation-sidebar-mobile-collapse": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Resize the browser window to 390 pixels wide and open /user.",
      "Read how the sidebar is presented.",
      "Open it, read its entries, and navigate somewhere.",
      "Check whether it closed on navigation.",
      "Count the fixed bars at the bottom of the screen.",
      "Try to scroll the page sideways.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "On a phone the sidebar collapses behind a control and closes after navigating. The dashboard renders its own bottom tab bar and the public one is suppressed on these routes, so exactly one is mounted — two would be two bars on the same pixels with a height nobody owns, and everything above them would be positioned against the wrong one.",
    expectedUiState:
      "The sidebar is collapsed by default, opens on demand and closes after navigation. Exactly one bottom bar is present, carrying dashboard destinations rather than the public ones. The page does not scroll sideways.",
    expectedData: { bottomNavCount: 1 },
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-buying-user-dashboard-navigation-deep-link-direct-load": {
    roles: ["buyer"],
    startPage: "/user/orders",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/orders, apply a filter and a sort, and copy the URL.",
      "Open a new tab and paste that URL.",
      "Read whether the same filter and sort are applied on first paint.",
      "Open a specific order's detail, copy that URL, and open it in a new tab.",
      "Read whether it opens on the same order.",
      "Reload that tab and read it again.",
    ],
    expectedBehaviour:
      "Listing state lives in the URL, so a filtered view is shareable and reproduces on first paint. These routes are prerendered and hydrate their session client-side, so a deep link renders its shell immediately and fills in — what must not happen is the filters arriving and then being replaced by the defaults.",
    expectedUiState:
      "The pasted listing URL shows the same rows, filter and sort as the tab it came from. The order URL opens that order and survives a reload. A filtered link that lands on the unfiltered default is the failure.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-buying-user-dashboard-navigation-become-seller-crossnav": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as karthik.new@gmail.com / TempPass123!, a buyer with no store.",
      "Open /user and find the route into selling.",
      "Click it and read where it lands.",
      "Go back and open /sell directly, reading where that lands.",
      "Sign out and sign in as tyson@beybladearena.in / TempPass123!, who has a store.",
      "Open /user and read what the same area of the sidebar offers now.",
      "Follow it and read where it lands.",
    ],
    expectedBehaviour:
      "The cross-navigation resolves by whether the account already has a store: a buyer is routed into the become-seller flow, an existing seller into their store dashboard. Offering a seller the become-seller flow, or a buyer a dashboard they cannot use, are the two ways this reads wrong.",
    expectedUiState:
      "The buyer's link opens the become-seller flow with real content. The seller's opens /store. Neither lands on a 404 and neither offers the wrong destination for its account.",
    endResult: "Read-only; apply for nothing.",
  },
  "checklist-buying-user-dashboard-navigation-browser-back-forward": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user, then /user/orders, then apply a filter, then open an order's detail.",
      "Press the browser back button once and read where it lands.",
      "Press back again and read where it lands, including whether the filter is still applied.",
      "Press back once more.",
      "Press forward three times, reading each landing.",
    ],
    expectedBehaviour:
      "Each state change that alters the URL is one history entry, so back walks them in reverse one press at a time. A filter change that writes the URL twice — once for the filter and once to reset the page number — produces two entries for one action, and back appears not to work.",
    expectedUiState:
      "Back and forward move one step per press, and the filtered listing returns with its filter applied. Two presses needed to undo a single filter change is the double-navigation failure.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-buying-user-dashboard-navigation-logged-out-redirect": {
    roles: ["guest"],
    startPage: "/user",
    steps: [
      "Open a private window with no session.",
      "Open /user and watch the page for 5 seconds.",
      "Open /user/orders and watch for 5 seconds.",
      "Open /user/addresses and watch for 5 seconds.",
      "Read each for any name, email, order or address at any point.",
      "Open the browser's View Source on one of them and search for an email address and for a uid.",
      "Read where each navigation ends up.",
    ],
    expectedBehaviour:
      "These routes are prerendered to a signed-out shell and the session hydrates client-side, so the served HTML is identical for every visitor and cannot contain anyone's data. The redirect therefore happens after hydration — a brief flash of chrome is expected and is the tradeoff being evaluated, while a spinner that never resolves is not.",
    expectedUiState:
      "Each URL shows chrome and a loading state, then lands on the sign-in page. No name, email, order or address appears at any point, and none is present in the page source. Nothing is still spinning after 5 seconds. Record whether the flash feels acceptable.",
    expectedData: { userDataInSource: 0 },
    endResult:
      "All three end signed out. Any trace of a real account fails the case outright, separately from the flash question.",
  },
  "checklist-buying-user-dashboard-navigation-breadcrumbs-accurate": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user and read any breadcrumb trail shown.",
      "Navigate to /user/orders and read the trail.",
      "Open a specific order's detail and read the trail.",
      "Click each breadcrumb ancestor in turn and check it lands where it says.",
      "Check the current page is shown as the last crumb and is not itself a link.",
    ],
    expectedBehaviour:
      "The trail reflects the real route hierarchy and every ancestor is a working link. The last crumb is the current page and is not clickable — a self-link reads as a working link and goes nowhere new, the same defect the policy pages' related-links list had.",
    expectedUiState:
      "The trail deepens as the route deepens, every ancestor navigates correctly, and the final crumb is plain text rather than a link.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-buying-user-dashboard-navigation-sidebar-logout-button": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user and find the log-out control in the sidebar.",
      "Click it and read where the browser lands.",
      "Open /user again and read what happens.",
      "Press the browser back button and read what is shown.",
      "Open /user/orders directly and read what happens.",
    ],
    expectedBehaviour:
      "Log out clears both the server session cookie and the client auth session. Clearing only one leaves the browser able to re-mint a session on the next request, which is why the second navigation rather than the redirect is the real check — and a dashboard restored from the back-forward cache after log-out is a real exposure on a shared machine.",
    expectedUiState:
      "The browser leaves the dashboard. Opening /user or /user/orders afterwards redirects to sign-in rather than rendering, even briefly with real data. The back button does not restore the dashboard from cache.",
    endResult: "The session is ended.",
  },
};
