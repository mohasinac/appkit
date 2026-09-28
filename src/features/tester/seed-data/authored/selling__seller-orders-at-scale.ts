/*
 * WHY: Authored six-part procedures for selling/seller-orders-at-scale.
 * WHAT: 3 cases, keyed by full checklist id.
 *
 * 🛑 SCALE IS THE WHOLE POINT OF THIS PAGE. The seller order list queried
 * `productId in [...]` with the seller's entire product list, against Firestore's
 * 30-value cap on `in`. So it was a permanent 500 for the only real seller
 * (65 products) and perfectly fine for both small stores — which is exactly why
 * it survived: every existing case exercised a store below the cap.
 *
 * On the dashboard the same throw was caught by `.catch(() => ({items: []}))`
 * and rendered as zero orders and ₹0 revenue with no error anywhere, so the
 * second case asserts a NUMBER rather than that a page loaded.
 *
 * Always run these against Beyblade Arena. A store with fewer than 30 listings
 * passes them all while broken.
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
  "checklist-selling-seller-orders-at-scale-orders-list-loads-for-large-store": {
    roles: ["seller"],
    startPage: "/store/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! — this store has more than 30 listings, which is the condition under test.",
      "Open /store/products and read the total listing count shown by the pager.",
      "Open /store/orders.",
      "Wait for the list to finish loading.",
      "Open the browser network panel and read the status of the /api/store/orders request.",
    ],
    expectedBehaviour:
      "The list is scoped by the store, not by a list of its product ids. Firestore rejects an `in` clause of more than 30 values, so a per-product query breaks at exactly the 31st listing and cannot be reproduced on a small store.",
    expectedUiState:
      "Order rows are listed, or a genuine empty state. Not an error boundary and not a perpetual skeleton.",
    expectedData: { ordersApiStatus: 200 },
    endResult: "Reloading shows the same list.",
  },

  "checklist-selling-seller-orders-at-scale-dashboard-revenue-not-zero": {
    roles: ["seller"],
    startPage: "/store",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/orders and count how many orders are listed.",
      /*
       * 🛑 ZERO IS ONE FAILURE HERE; TOO HIGH IS THE OTHER, AND ONLY ZERO WAS
       * BEING CHECKED.
       *
       * The route documents two real bugs it fixed, and this case only caught
       * the first: an unbounded `in` query that threw for any store past its
       * 30th listing and was swallowed into ₹0 (Root Cause #59's shape). The
       * second was the opposite direction — `o.status !== "CANCELLED"` against
       * a lowercase OrderStatusValues, so the exclusion never excluded anything
       * and headline revenue counted cancelled and refunded orders.
       *
       * A "> ₹0" assertion passes cheerfully against that. The cancelled and
       * refunded totals are what tell the two apart, so the steps below read
       * them.
       */
      "Filter /store/orders to Cancelled and note the total of any one cancelled order.",
      "Open /store.",
      "Read the total-orders figure and the revenue figure on the dashboard.",
    ],
    expectedBehaviour:
      "The dashboard's headline numbers come from the same query as the order list, so they must agree with it. A failed query here is swallowed into an empty array, which renders as a confident zero rather than as an error. Revenue additionally EXCLUDES cancelled and refunded orders — money that was never kept is not revenue — so a figure that silently includes them is wrong in the opposite direction and looks healthier than the truth.",
    expectedUiState:
      "The order count matches what /store/orders listed, and revenue is greater than ₹0 for a store with delivered orders. Revenue is also strictly LESS than the sum of every order's total, because this store has cancelled and refunded orders that must not be counted — a revenue figure equal to the all-orders sum is the exclusion silently not applying.",
    expectedData: { revenueIsZero: false, cancelledOrdersCountedAsRevenue: false },
    endResult: "The same figures survive a reload.",
  },

  "checklist-selling-seller-orders-at-scale-orders-only-this-store": {
    roles: ["seller"],
    startPage: "/store/orders",
    steps: [
      "Sign in as tyson@beybladearena.in / TempPass123! and open /store/orders.",
      "Open any order and read which product it is for.",
      "In a second tab open that product's public page and read which store it belongs to.",
      "Repeat for two more orders, choosing rows from different pages of the list.",
    ],
    expectedBehaviour:
      "Scoping by store must not widen what a seller can see. A cart splits into one order per store, so every row here belongs to this store and no other seller's order is reachable.",
    expectedUiState:
      "Every product checked belongs to Beyblade Arena.",
    expectedData: { foreignOrdersFound: 0 },
    endResult: "Nothing is changed; this case only reads.",
  },
};
