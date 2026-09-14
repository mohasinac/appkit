/*
 * WHY: Authored six-part procedures for admin/admin-detail-round-trips.
 * WHAT: 7 cases, keyed by full checklist id.
 *
 * 🛑 THERE ARE 33 `[id]` DIRECTORIES UNDER `admin/` AND ALMOST ALL SAT AT ZERO.
 *
 * Every case here is a ROUND TRIP: open, change ONE field, save, RELOAD, then
 * check the fields you did NOT touch. That shape is what catches an editor
 * seeded from the wrong object — a form that opens blank and then saves its own
 * emptiness passes any case that merely asks whether the page loads. It is
 * exactly how the 2026-09-14 data-loss bug survived (Root Cause #98), and it is
 * also Root Cause #38's shape, where saving one field silently stripped tester
 * flags and un-verified a store because the list row never carried them.
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
  "checklist-admin-admin-detail-round-trips-coupon-edit-round-trip": {
    roles: ["admin"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/coupons and find the coupon with code ARENA25.",
      "Open its Edit action and write down its discount value, its usage limits and its validity dates.",
      "Change ONLY the description — append the word roundtrip.",
      "Press Save.",
      "Reload the page and open the same coupon again.",
      "Read the discount value, the usage limits and the validity dates.",
    ],
    inputs: { couponCode: "ARENA25", descriptionSuffix: "roundtrip" },
    expectedBehaviour:
      "Editing one field writes that field and leaves the rest as they were. A handler that merges a partial validity or restrictions object wholesale wipes whatever the caller did not resend — and a handler that never calls the repository at all returns a 200 that echoes the submission back, which is indistinguishable from a save.",
    expectedUiState:
      "The description carries the appended word. The discount value, both usage limits and both validity dates are exactly as written down.",
    expectedData: { unrelatedFieldsChanged: 0 },
    endResult:
      "All of it survives a second reload — the change was stored, not just rendered.",
  },

  "checklist-admin-admin-detail-round-trips-faq-edit-preserves-answer-shape": {
    roles: ["admin"],
    startPage: "/admin/faqs",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/faqs and pick the FAQ whose slug is coupons-and-discounts.",
      "Open its Edit action and read how the answer renders in the editor.",
      "Append the sentence: Edited during a round-trip check.",
      "Press Save.",
      "Reload and reopen the same FAQ.",
      "Open the public /faqs page and find the same question.",
    ],
    inputs: { faqSlug: "coupons-and-discounts", appended: "Edited during a round-trip check." },
    expectedBehaviour:
      "The answer is a structured value, not a bare string. A create path that wraps it and an update path that writes it flat produce a document every reader expects to be an object and finds is a string — which renders as nothing, or as raw markup, on the public page.",
    expectedUiState:
      "The editor still shows formatted rich text after the reload, and the public FAQ renders the answer as prose rather than as visible markup or an empty block.",
    expectedData: { answerRendersAsRichText: true },
    endResult: "The appended sentence is present on both the admin editor and the public page.",
  },

  "checklist-admin-admin-detail-round-trips-category-edit-keeps-hierarchy": {
    roles: ["admin"],
    startPage: "/admin/categories",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /categories/x-starters as a visitor in a second tab and write down its product count.",
      "In the first tab open /admin/categories and find X Starters.",
      "Write down its parent and how many children it has.",
      "Open its Edit action, change ONLY its description, and press Save.",
      "Reload the admin list and reopen it.",
      "Reload the public category page in the second tab.",
    ],
    inputs: { categorySlug: "x-starters" },
    expectedBehaviour:
      "A rename or a description edit touches that field alone. The hierarchy fields — parent, children, ancestors, tier — are derived and must never be rewritten from form state, and the product count is derived from a trigger rather than typed.",
    expectedUiState:
      "The parent and the child count are unchanged, and the public page shows the same product count as before.",
    expectedData: { hierarchyChanged: false, countChanged: false },
    endResult: "Everything except the description is identical after a reload.",
  },

  "checklist-admin-admin-detail-round-trips-user-edit-keeps-tester-flags": {
    roles: ["admin"],
    startPage: "/admin/users",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/users and find the account claude-tester@letitrip.in.",
      "Open its Edit action and write down whether the tester flags are on.",
      "Change ONLY its bio — append the word roundtrip.",
      "Press Save.",
      "Reload the list and reopen the same account.",
      "Read the tester flags again.",
    ],
    inputs: { account: "claude-tester@letitrip.in", bioSuffix: "roundtrip" },
    expectedBehaviour:
      "An editor seeded from a LIST row can only send back what that row carried. If the list serializer omits a field the update schema accepts, the editor state defaults to false and the save rewrites it — so editing any other field silently strips it. That is why the check is on a field the form did not touch.",
    expectedUiState:
      "Both tester flags are still on after the reload, and the bio carries the appended word.",
    expectedData: { testerFlagsPreserved: true },
    endResult:
      "The flags survive a second reload. If this fails, restore them before moving on — the bot needs them to run at all.",
  },

  "checklist-admin-admin-detail-round-trips-store-edit-keeps-verified": {
    roles: ["admin"],
    startPage: "/admin/stores",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/stores and find Beyblade Arena.",
      "Note whether it is marked Verified and whether it is Featured.",
      "Open its Edit action and change ONLY the admin notes — append the word roundtrip.",
      "Press Save.",
      "Reload the list.",
      "Read the Verified and Featured markers again.",
    ],
    inputs: { store: "store-beyblade-arena", notesSuffix: "roundtrip" },
    expectedBehaviour:
      "Same failure mode as the tester flags, with a worse consequence: un-verifying a store is visible to shoppers. A store's capabilities can be reset to a two-item default by the same mechanism, which is invisible until a seller reports that a feature disappeared.",
    expectedUiState:
      "Verified and Featured are unchanged, and the admin notes carry the appended word.",
    expectedData: { verifiedPreserved: true, featuredPreserved: true },
    endResult: "Both markers are still correct after a reload.",
  },

  "checklist-admin-admin-detail-round-trips-order-view-matches-drawer": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and open the row drawer for order-1-20260721-11joon.",
      "Write down the item titles, the shipping address, the payment method and the status.",
      "Close the drawer and use that row's Open full page action.",
      "Read the same four things on the full page.",
    ],
    inputs: { orderId: "order-1-20260721-11joon" },
    expectedBehaviour:
      "The drawer and the full page are two renderings of one record, so they must agree. Where they differ, one of them is reading a field the other is not — and the full page is the bookmarkable one an admin will send to somebody else.",
    expectedUiState:
      "Item titles, address, payment method and status are identical in both, and the full page is at a real bookmarkable URL rather than a modal over the list.",
    expectedData: { drawerAndPageAgree: true },
    endResult: "Nothing is changed; this case only reads.",
  },

  "checklist-admin-admin-detail-round-trips-admin-detail-missing-id-404s": {
    roles: ["admin"],
    startPage: "/admin/coupons",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Navigate to /admin/coupons/zzzznope-not-a-coupon-42/edit — a deliberately invented id, not a fixture.",
      "Read what the page shows.",
      "Navigate to /admin/orders/zzzznope-not-an-order-42/view.",
      "Read that page too.",
    ],
    inputs: { couponId: "zzzznope-not-a-coupon-42", orderId: "zzzznope-not-an-order-42" },
    expectedBehaviour:
      "An id that resolves to nothing must 404. An empty editor here is the tell that the page never checked what it received — and an empty editor with a Save button is how a record gets created or overwritten from a typo.",
    expectedUiState:
      "Both show a not-found page. Neither shows an editable form, and neither shows a Save button.",
    expectedData: { showsEditForm: false },
    endResult: "Nothing is created and nothing is saved.",
  },
};
