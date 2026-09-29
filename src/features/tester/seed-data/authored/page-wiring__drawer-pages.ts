/*
 * WHY: Authored six-part procedures for the page-wiring/drawer-pages page.
 * WHAT: 3 case(s), keyed by full checklist id.
 *
 * 🛑 "EDITOR AS A PAGE" IS TWO DIFFERENT SHAPES, and the cases assumed one
 * (corrected 2026-09-29). Checked route by route:
 *
 *   drawer-as-page   /admin/team/new, /admin/navigation/new — the editor hard-
 *                    renders <SideDrawer> with no headless mode, so the page
 *                    mounts it permanently open and wires onClose to navigate
 *                    back to the list. Here "close the panel" is literal.
 *   full page        /admin/tester-checklist/new (StackedViewShell +
 *                    SectionForm), /admin/carousels/new (a Section/Container
 *                    with a back Link), /store/stickers/new (a product shell).
 *                    There is no panel and nothing to close; the way back is a
 *                    Cancel button or a link.
 *
 * Both are correct. What matters for every case here is the same two things —
 * the form is usable on arrival, and there is a way back to its list — so the
 * steps now ask for that rather than for a drawer that two thirds of these
 * routes do not have. A tester hunting a panel on /store/stickers/new would
 * otherwise report a defect that is really a second, equally valid shape.
 *
 * All 19 routes named in step prose below were verified to exist on
 * 2026-09-29. Worth repeating rather than trusting: the hrefs audit validates
 * href and startPage only, so a route named inside a step is checked by nobody.
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
      "Read what is on screen without clicking anything — this one is a drawer mounted permanently open.",
      "Close the panel and read the address bar.",
      "Open /admin/navigation/new directly, read what is on screen, close it, and read the address bar. This is the same drawer-as-page shape.",
      "Open /admin/tester-checklist/new directly and read what is on screen. This one is a FULL PAGE, not a drawer, so look for a Cancel or back control rather than a panel to close.",
      "Use that control and read the address bar.",
    ],
    inputs: {
      drawerAsPage: "/admin/team/new, /admin/navigation/new",
      fullPage: "/admin/tester-checklist/new",
    },
    expectedBehaviour:
      "An editor reached by URL is usable the moment it loads, and offers a way back to the list it belongs to — so the page is a real destination rather than a dead end. Whether that is a drawer mounted open or an ordinary page is an implementation choice and both are correct; what fails is arriving at a blank page, or having no way back.",
    expectedUiState:
      "All three URLs render their form immediately, with no blank page and nothing to click first. Leaving each one lands on /admin/team, /admin/navigation and /admin/tester-checklist respectively, not on a 404 and not on the dashboard. 🛑 Only the first two have a panel to close; the third is a full page and its absence of a drawer is not a finding.",
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
      "On each, note whether the form is usable on arrival or the page is blank.",
      "Leave each one — a drawer close, a Cancel button or a back link, whichever it offers — and note where the browser lands.",
      "Sign in as tyson@beybladearena.in / TempPass123! and repeat for /store/addresses/new, /store/sublisting-categories/new, /store/stickers/new, /store/pre-orders/new and /store/listing-templates/new.",
      "Record every route that arrives blank and every cancel that lands nowhere.",
    ],
    expectedBehaviour:
      "Every editor-as-a-page route arrives with its form usable and offers a way back to its own list. These sixteen are distinct from the three named in the first case on this page, and none of them is named anywhere else in the catalogue, so a blank one is a working URL with nothing on it and no error to report.",
    expectedUiState:
      "All sixteen arrive with a usable form and get back to the matching list. Each blank arrival is a finding, and so is each exit that lands on a dead route, both named by route. 🛑 These are NOT all drawers: /admin/carousels/new is a plain page with a back link and /store/stickers/new is a product shell, so record how each one offers its way back rather than expecting a panel.",
    expectedData: { blankEditorRoutes: 0, routesChecked: 16 },
    endResult:
      "Nothing is saved. Every one of these routes was verified to exist on 2026-09-29, so a 404 here means one was deleted since, which is itself the finding.",
  },
};
