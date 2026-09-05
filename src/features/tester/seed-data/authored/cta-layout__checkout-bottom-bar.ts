/*
 * WHY: Authored six-part procedures for the cta-layout/checkout-bottom-bar page.
 * WHAT: 2 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * Both cases are layout checks with an explicit BEFORE in their own description,
 * so the procedure names the pixel symptom rather than asking whether the bar
 * "looks right". 320px is the narrowest viewport worth supporting and is where
 * every squeeze shows up first.
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
  "checklist-cta-layout-checkout-bottom-bar-back-not-squeezed": {
    roles: ["buyer"],
    startPage: "/checkout",
    steps: [
      "Resize the browser window to 320 pixels wide.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /products/product-tester-standard-1 and click 'Add to Cart'.",
      "Open /checkout, select the first saved address, and continue to the Extras step.",
      "Read the two buttons in the bottom action bar and compare their widths.",
    ],
    inputs: { viewportWidth: 320 },
    expectedBehaviour:
      "Each button is sized by its own label rather than by a fixed share of the row, so the shorter label takes less space and the longer one takes more. A fixed split gives a two-letter button the same width as an eight-word one.",
    expectedUiState:
      "'Back' reads in full — not clipped to 'Ba' inside a roughly 44px box. 'Continue to payment' also reads in full and is visibly the wider of the two. Neither shows an ellipsis or a cut-off word.",
    endResult:
      "Layout-only; nothing persists. Restore the window width afterwards so later cases are not run at 320px by accident.",
  },
  "checklist-cta-layout-checkout-bottom-bar-no-truncation-anywhere": {
    roles: ["buyer"],
    startPage: "/checkout",
    steps: [
      "Resize the browser window to 320 pixels wide.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /products/product-tester-standard-1 and click 'Add to Cart'.",
      "Open /checkout and continue through to the payment step.",
      "Read the primary button's label in full.",
      "Select each payment method in turn and read the primary label after each.",
    ],
    inputs: { viewportWidth: 320 },
    expectedBehaviour:
      "A label too long for one line makes its button taller rather than truncating. Height is cheap in a bottom bar; a clipped verb is not, because the buyer cannot tell what the button will do.",
    expectedUiState:
      "'Pay Online (Razorpay)' is shown complete, wrapping onto two lines if it needs to. An ellipsis anywhere in the bar is a failure, on any payment method.",
    endResult:
      "Layout-only; nothing persists. Restore the window width afterwards.",
  },
};
