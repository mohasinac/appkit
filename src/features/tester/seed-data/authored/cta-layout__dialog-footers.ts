/*
 * WHY: Authored six-part procedures for the cta-layout/dialog-footers page.
 * WHAT: 2 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * These two pull in OPPOSITE directions on purpose — a dialog footer stays
 * compact while a mobile bar stretches — and that is exactly why they are one
 * page. A single rule applied to both is what makes one of them wrong.
 *
 * 🛑 /admin/products HAS NO DELETE ROW ACTION (corrected 2026-09-29). Its row
 * menu is Approve, Reject and Quick edit; nothing there opens a destructive
 * dialog, so the first case could not start. It now uses the bundle editor's
 * delete, which is a real ConfirmDeleteModal and names the record in its title.
 *
 * ConfirmDeleteModal's defaults are title 'Delete Item?', confirm 'Delete',
 * cancel 'Cancel'; the bundle editor overrides the title to 'Delete this
 * bundle?'. A dialog still reading the generic default IS the finding — a
 * confirmation that does not say what it will destroy is barely a confirmation.
 *
 * The drawer footer's labels are exact and come from FilterDrawer itself:
 * 'Reset all' (ghost) and 'Apply' (primary), which becomes 'Apply (N)' while
 * changes are pending. A tester seeing the count variant is looking at correct
 * behaviour, not a drifted label.
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
  "checklist-cta-layout-dialog-footers-modal-footer-stays-compact-on-desktop": {
    roles: ["admin"],
    startPage: "/admin/bundles",
    steps: [
      "Resize the browser window to 1280 pixels wide.",
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/bundles and open any bundle for editing.",
      "Click its delete control to open the confirmation dialog. Do NOT confirm.",
      "Read the dialog's title: it should name the record, not read 'Delete Item?'.",
      "Read the two footer buttons, 'Cancel' and 'Delete', and where they sit horizontally.",
      "Dismiss with Cancel.",
    ],
    inputs: {
      viewportWidth: 1280,
      dialogTitle: "Delete this bundle?",
      genericDefault: "Delete Item?",
    },
    expectedBehaviour:
      "A dialog footer packs its buttons to the right at content width. A destructive dialog also has to HAVE a confirmation to open at all — every danger-kind action carries its confirmation copy in the action registry, and one without it executes immediately with no warning.",
    expectedUiState:
      "'Cancel' and 'Delete' are each about as wide as their own label and sit together at the right edge of the dialog. They do not stretch edge to edge like banners. The title names the bundle rather than reading the component default 'Delete Item?' — a confirmation that does not say what it will destroy is barely a confirmation.",
    endResult:
      "Cancel closes the dialog and nothing is deleted. The bundle is still in /admin/bundles after a reload — dismissing must not be a silent confirm.",
  },
  "checklist-cta-layout-dialog-footers-filter-drawer-footer-stacks-when-narrow": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Resize the browser window to 320 pixels wide.",
      "Open /products.",
      "Click 'Filters' to open the drawer.",
      "Scroll to the drawer's footer.",
      "Read both buttons and note whether they sit side by side or one per line.",
    ],
    inputs: {
      viewportWidth: 320,
      resetLabel: "Reset all",
      applyLabel: "Apply",
    },
    expectedBehaviour:
      "Where a dialog footer stays compact, a drawer footer prefers legibility: if two buttons cannot both read at the available width they stack one per line rather than shrinking below their labels.",
    expectedUiState:
      "'Reset all' and 'Apply' are both fully readable. If they cannot fit side by side at 320px they are stacked, one per line. Neither is crushed below its label and neither is truncated. The primary reads 'Apply (N)' once a facet has been changed but not yet applied, which is correct rather than a drifted label.",
    endResult:
      "Layout-only; closing the drawer without applying changes nothing. Restore the window width afterwards.",
  },
};
