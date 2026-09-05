/*
 * WHY: Authored six-part procedures for the selling/store-uncovered-pages page.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * Six seller routes the sweep found with no case naming them anywhere. One case
 * each: does the page render, and does its main affordance work. A page nobody
 * has opened does not need depth before it has that.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

const SIGN_IN_SELLER = "Sign in as tyson@beybladearena.in / TempPass123!.";

export const authored: Record<string, AuthoredCase> = {
  "checklist-selling-store-uncovered-pages-store-stickers-renders": {
    roles: ["seller"],
    startPage: "/store/stickers",
    steps: [
      SIGN_IN_SELLER,
      "Open /store/stickers.",
      "Read the listings shown and check each is a sticker listing.",
      "Check no listing of another type appears.",
      "Create a sticker listing from this page titled 'QA Store Sticker Probe' priced at 99.",
      "Check it appears in the list, then delete it.",
    ],
    inputs: { title: "QA Store Sticker Probe", price: 99 },
    expectedBehaviour:
      "The page lists this seller's sticker listings only and can create one. A type-scoped page whose query dropped its own type filter returns the seller's whole catalogue — which reads as a working page until somebody notices a Beyblade on the stickers screen.",
    expectedUiState:
      "Only sticker listings are shown, and the new one appears after creation. Any other type present is the finding.",
    endResult: "The probe listing is deleted.",
  },
  "checklist-selling-store-uncovered-pages-store-support-renders": {
    roles: ["seller"],
    startPage: "/store/support",
    steps: [
      SIGN_IN_SELLER,
      "Open /store/support.",
      "Read the tickets listed, or the empty state.",
      "Open a new ticket with the subject 'QA seller support probe' and a body naming this checklist case.",
      "Submit it and check it appears in the list.",
      "Open it and reply once.",
      "Reload and check both the ticket and the reply are still there.",
    ],
    inputs: { subject: "QA seller support probe" },
    expectedBehaviour:
      "A seller can open and continue a ticket from their own dashboard rather than being sent to the buyer-side surface. The reply is the half more likely to fail silently — a reply appended optimistically and never written looks identical until the reload.",
    expectedUiState:
      "The ticket and its reply are both present after the reload.",
    endResult: "One QA support ticket exists; close it if the interface allows.",
  },
  "checklist-selling-store-uncovered-pages-store-analytics-cards-renders": {
    roles: ["seller"],
    startPage: "/store/analytics/cards",
    steps: [
      SIGN_IN_SELLER,
      "Open /store/analytics/cards with the console open.",
      "Read every figure shown.",
      "Open /store/orders and count this store's orders.",
      "Compare the analytics figures against what the orders list shows.",
      "Check no figure is an order of magnitude out.",
      "Read the console for errors.",
    ],
    expectedBehaviour:
      "The figures come from this store's real orders. Money is stored in whole rupees with decimals, so a figure computed against the older hundredth-unit scale reads a hundred times too large — plausible-looking on a screen nobody has a baseline for.",
    expectedUiState:
      "Figures that reconcile with the orders list, a clean console, and no hundredfold jump. All zeros against real orders is equally a finding.",
    endResult: "Read-only.",
  },
  "checklist-selling-store-uncovered-pages-store-preorders-renders": {
    roles: ["seller"],
    startPage: "/store/pre-orders",
    steps: [
      SIGN_IN_SELLER,
      "Open /store/pre-orders.",
      "Read the listings shown and check each is a pre-order.",
      "Read each one's production status and delivery date in the list.",
      "Create a pre-order from this page titled 'QA Store Preorder Probe' with a full price of 999 and a deposit of 200.",
      "Check it appears in the list, then delete it.",
    ],
    inputs: { title: "QA Store Preorder Probe", fullPrice: 999, deposit: 200 },
    expectedBehaviour:
      "The page lists this seller's pre-orders with the fields that make them pre-orders, and can create one. Production status and delivery date belong in the list rather than only in the editor — they are what the seller is managing.",
    expectedUiState:
      "Only pre-orders are shown, each with its production status and delivery date, and the new one appears after creation.",
    endResult: "The probe listing is deleted.",
  },
  "checklist-selling-store-uncovered-pages-store-guides-all-render": {
    roles: ["seller"],
    startPage: "/store/guide",
    steps: [
      SIGN_IN_SELLER,
      "Open the seller Guide area and list every guide page linked from it.",
      "Open each one in turn.",
      "Record any that 404 or render empty.",
      "On two of them, check the screen they describe still exists and is named the same way.",
      "Record any guide describing a control that is no longer there.",
    ],
    expectedBehaviour:
      "Every seller guide renders and describes something that still exists. A guide has no compiler behind it, so it rots silently — and a seller following instructions for a screen that was renamed concludes the site is broken rather than the documentation.",
    expectedUiState:
      "Every guide loads with real content. A 404 is a finding; so is a guide naming a screen or control that no longer exists, recorded with which guide.",
    expectedData: { guidePagesNotFound: 0 },
    endResult: "Read-only.",
  },
  "checklist-selling-store-uncovered-pages-store-listing-templates-new-renders": {
    roles: ["seller"],
    startPage: "/store/listing-templates/new",
    steps: [
      SIGN_IN_SELLER,
      "Open /store/listing-templates/new directly by URL.",
      "Check the form is already open rather than the page being blank.",
      "Create a template named 'QA Template Probe' with a description and a default condition.",
      "Save it and check the browser lands on the template list with it present.",
      "Start creating a listing and check the template is offered and applies its defaults.",
      "Delete the template afterwards.",
    ],
    inputs: { name: "QA Template Probe" },
    expectedBehaviour:
      "The editor page opens with its form showing, and a saved template is usable where templates are meant to be used. A template that saves and is never offered during listing creation is a feature with no consumer — which is the state a superseded template feature sat in for a long time.",
    expectedUiState:
      "The form is open on arrival, the saved template is in the list, and it appears and applies when creating a listing. A template that saves and is never offered is the finding.",
    endResult: "The probe template is deleted.",
  },
};
