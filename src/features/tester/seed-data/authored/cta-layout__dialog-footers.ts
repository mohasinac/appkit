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
    startPage: "/admin/products",
    steps: [
      "Resize the browser window to 1280 pixels wide.",
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products.",
      "Open the row action menu on the first product and choose a destructive action such as Delete.",
      "Read the dialog's footer buttons and where they sit horizontally.",
      "Dismiss the dialog with Cancel rather than confirming.",
    ],
    inputs: { viewportWidth: 1280 },
    expectedBehaviour:
      "A dialog footer packs its buttons to the right at content width. A destructive dialog also has to HAVE a confirmation to open at all — every danger-kind action carries its confirmation copy in the action registry, and one without it executes immediately with no warning.",
    expectedUiState:
      "Cancel and the destructive button are each about as wide as their own label and sit together at the right edge of the dialog. They do not stretch edge to edge like banners. The dialog names what is about to be deleted rather than asking a generic 'Are you sure?'.",
    endResult:
      "Cancel closes the dialog and nothing is deleted. The product is still in the list after a reload — dismissing must not be a silent confirm.",
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
    inputs: { viewportWidth: 320 },
    expectedBehaviour:
      "Where a dialog footer stays compact, a drawer footer prefers legibility: if two buttons cannot both read at the available width they stack one per line rather than shrinking below their labels.",
    expectedUiState:
      "'Reset all' and 'Apply' are both fully readable. If they cannot fit side by side at 320px they are stacked, one per line. Neither is crushed below its label and neither is truncated.",
    endResult:
      "Layout-only; closing the drawer without applying changes nothing. Restore the window width afterwards.",
  },
};
