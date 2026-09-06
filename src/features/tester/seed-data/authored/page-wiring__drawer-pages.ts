/*
 * WHY: Authored six-part procedures for the page-wiring/drawer-pages page.
 * WHAT: 2 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
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
  "checklist-page-wiring-drawer-pages-page-drawer-opens-already-open": {
    roles: ["admin"],
    startPage: "/admin/team/new",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/team/new directly in the address bar.",
      "Read what is on screen without clicking anything.",
      "Close the panel and read the address bar.",
      "Open /admin/navigation/new directly and read what is on screen.",
      "Close it and read the address bar.",
      "Open /admin/tester-checklist/new directly and read what is on screen.",
      "Close it and read the address bar.",
    ],
    expectedBehaviour:
      "An editor that exists as both a drawer and a page opens with its panel ALREADY open when reached by URL. Closing it returns to the list the editor belongs to, so the page is a real destination rather than a dead end.",
    expectedUiState:
      "Each of the three URLs renders its form immediately — an invite form, a nav-item form, a checklist-case form — with no blank page and nothing to click first. Closing lands on /admin/team, /admin/navigation and /admin/tester-checklist respectively, not on a 404 and not on the dashboard.",
    endResult:
      "Nothing is created — close each panel rather than saving. A blank page behind a closed drawer is the failure this catches.",
  },
  "checklist-page-wiring-drawer-pages-page-drawer-deep-link-survives-reload": {
    roles: ["admin"],
    startPage: "/admin/team",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/team and open the editor for employee-blog@letitrip.in.",
      "Copy the URL from the address bar.",
      "Reload the page.",
      "Read whether the panel is open and which record it holds.",
      "Open the copied URL in a new tab and read the same two things.",
    ],
    inputs: { record: "employee-blog@letitrip.in" },
    expectedBehaviour:
      "The record's identity is in the URL, so a reload and a fresh tab both restore the same open editor. This is the entire reason these pages exist alongside the drawers — a drawer alone cannot be bookmarked, shared with a colleague, or reopened after a crash.",
    expectedUiState:
      "After the reload the panel is still open on employee-blog@letitrip.in with its fields populated. The new tab shows the same. A panel that closes on reload, or reopens empty, both fail.",
    endResult:
      "Read-only; close without saving. Nothing persists.",
  },
  "checklist-page-wiring-drawer-pages-every-new-editor-route-opens": {
    roles: ["admin", "seller"],
    startPage: "/admin/categories/new",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open each of these by URL in turn: /admin/categories/new, /admin/brands/new, /admin/bundles/new, /admin/faqs/new, /admin/ads/new, /admin/shipments/new, /admin/addresses/new, /admin/grouped-listings/new, /admin/sublisting-categories/new, /admin/carousel/new, /admin/carousels/new.",
      "On each, note whether the form is already open or the page is blank.",
      "Close or cancel each and note where the browser lands.",
      "Sign in as tyson@beybladearena.in / TempPass123! and repeat for /store/addresses/new, /store/sublisting-categories/new, /store/stickers/new, /store/pre-orders/new and /store/listing-templates/new.",
      "Record every route that arrives blank and every cancel that lands nowhere.",
    ],
    expectedBehaviour:
      "Every editor-as-a-page route opens with its form showing and cancels back to its own list. Three of these were already covered by name; the other thirteen are the same route shape and were never named anywhere, so a blank one is a working URL with nothing on it and no error to report.",
    expectedUiState:
      "All sixteen arrive with the form open and cancel back to the matching list. Each blank arrival is a finding, and so is each cancel that lands on a dead route â both named by route.",
    expectedData: { blankEditorRoutes: 0 },
    endResult: "Nothing is saved.",
  },
};
