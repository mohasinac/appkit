/*
 * WHY: Authored six-part procedures for the design-ux/dashboard-layout page.
 * WHAT: 9 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * The three portal shells are deliberate near-duplicates — different domain
 * semantics over one structural shell — so the three collapsible cases are the
 * same check run three times rather than one case with a loop. That is the point:
 * a shared shell is only shared if all three actually behave alike.
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
  "checklist-design-ux-dashboard-layout-collapsible-admin": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin and read the sidebar's group headings.",
      "Collapse one expanded group and read what remains.",
      "Expand a collapsed group and read its contents.",
      "Navigate to another admin page using the sidebar.",
      "Read whether the collapsed group is still collapsed.",
      "Reload the page and read it again.",
    ],
    expectedBehaviour:
      "Groups collapse and expand, and the state survives navigation within the portal. Whether it survives a full reload is the second question — a preference held only in memory resets on refresh, which for a sidebar the user has arranged is a small but repeated annoyance.",
    expectedUiState:
      "Collapsing hides that group's entries and leaves its heading. The state holds across sidebar navigation. Record in the comment whether it also survives the reload.",
    endResult:
      "Re-expand anything collapsed, so later cases that count sidebar entries are not reading a collapsed sidebar.",
  },
  "checklist-design-ux-dashboard-layout-collapsible-store": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store and read the sidebar's group headings.",
      "Collapse one expanded group and read what remains.",
      "Expand a collapsed group and read its contents.",
      "Navigate to another store page using the sidebar and read the state.",
      "Reload the page and read it again.",
    ],
    expectedBehaviour:
      "The store sidebar behaves the same way as the admin one, because both wrap one structural shell. A difference between them means the behaviour lives in the wrapper rather than the shell.",
    expectedUiState:
      "Collapse and expand work, and the state survives sidebar navigation — the same as /admin. Any divergence from the admin sidebar's behaviour is the finding.",
    endResult: "Re-expand anything collapsed.",
  },
  "checklist-design-ux-dashboard-layout-collapsible-user": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user and read the sidebar's group headings.",
      "Collapse one expanded group and read what remains.",
      "Expand a collapsed group and read its contents.",
      "Navigate to another user page using the sidebar and read the state.",
      "Reload the page and read it again.",
    ],
    expectedBehaviour:
      "The user sidebar behaves like the other two. This portal's layout reads no session server-side, so its shell is prerendered and hydrated client-side — a difference in collapse behaviour here would point at that difference rather than at the shell.",
    expectedUiState:
      "Collapse and expand work and survive sidebar navigation, matching /admin and /store. Any divergence is the finding.",
    endResult: "Re-expand anything collapsed.",
  },
  "checklist-design-ux-dashboard-layout-mobile-table-cards": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products at a desktop width of 1280 pixels and read how rows are presented.",
      "Resize the window to 390 pixels wide.",
      "Read how the same rows are presented now.",
      "Try to scroll the page sideways.",
      "Open a row's action menu and read its entries.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "A table becomes cards on a phone rather than a sideways-scrolling table, because columns off the right edge are columns nobody reads. Every row action stays reachable in the card form.",
    expectedUiState:
      "At 1280 the rows are a table. At 390 they are cards, each carrying the row's key fields. The page does not scroll sideways. The row action menu opens and is fully on screen.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-dashboard-layout-view-mode-persist": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and read which view mode is active.",
      "Switch to the other view mode.",
      "Read the URL.",
      "Reload the page and read the view mode before touching anything.",
      "Navigate to /admin/orders and back to /admin/products, then read the view mode.",
    ],
    expectedBehaviour:
      "View mode lives in the URL alongside the other listing state, so the server's first paint and the control agree and the choice is shareable. It is one of the few keys that does NOT reset the page number when it changes — switching how rows are drawn is not a new query.",
    expectedUiState:
      "The URL carries the view mode. After the reload the chosen mode is active on first paint, not the default that then switches. Changing it does not send the list back to page one.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-design-ux-dashboard-layout-list-view-default": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders with no query parameters and read which view mode is active.",
      "Open /admin/products the same way and read its default.",
      "Open /admin/users the same way and read its default.",
      "Compare the three.",
    ],
    expectedBehaviour:
      "Listing pages open in the same default view. Three admin listings opening in three different modes means each is choosing its own default rather than taking the shared one.",
    expectedUiState:
      "All three open in the same view mode with no parameter in the URL. A page that differs is the finding, named specifically.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-design-ux-dashboard-layout-row-table-click-consistency": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders in table view and click a row anywhere except on a control.",
      "Read what opens.",
      "Go back, switch to card view, and click a card the same way.",
      "Read what opens and compare with the table result.",
      "Repeat both on /admin/products.",
    ],
    expectedBehaviour:
      "A row and its card open the same thing, because both derive their click target from the same row href. A card that only offers a menu while its table row opens a drawer means the two renderers have diverged.",
    expectedUiState:
      "Clicking a row and clicking its card open the same record in the same way, on both listings. A card that is inert while its row is clickable is the failure.",
    endResult: "Read-only; close whatever opens without saving.",
  },
  "checklist-design-ux-dashboard-layout-list-card-row-actions": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products in table view and open a row's action menu.",
      "Write down every action it offers.",
      "Switch to card view and open the same record's action menu.",
      "Write down every action it offers and compare the two lists.",
      "Check whether either list offers a way to VIEW the record, not only to mutate it.",
    ],
    expectedBehaviour:
      "Both renderers offer the same actions from the same preset. A menu of pure mutations is a dead end: it lets an admin act on a record they were never able to read, which is why a detail affordance has to be among them.",
    expectedUiState:
      "The two menus offer the same actions. At least one is a view or edit action rather than all being mutations. Destructive entries are visually marked as such.",
    endResult: "Read-only; close the menus without choosing anything.",
  },
  "checklist-design-ux-dashboard-layout-listing-toolbar-consistency": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and write down every control in its toolbar, left to right.",
      "Open /admin/orders and write down the same.",
      "Open /admin/users and write down the same.",
      "Compare the three orderings.",
      "Look for any toolbar with an empty gap where a control would sit.",
    ],
    expectedBehaviour:
      "Every listing draws its toolbar from one shared scaffold, so search, filters, sort and view mode appear in the same order everywhere. A listing whose controls are in a different order is one that has been hand-wired.",
    expectedUiState:
      "All three toolbars present the same controls in the same order. None shows an empty gap where a removed control used to be — a collapsed control must collapse its layout too.",
    endResult: "Read-only; nothing persists.",
  },
};
