/*
 * WHY: Authored six-part procedures for the admin/uncovered-admin-pages page.
 * WHAT: 14 case(s), keyed by full checklist id.
 *
 * Every page here was found by a sweep, not by a report: a built `page.tsx` with
 * zero cases naming it anywhere in the catalogue. A page nothing tests is
 * invisible to this whole mechanism, and four of them are observability surfaces —
 * the screens somebody reaches for precisely when something else is already wrong.
 *
 * These are deliberately one case each. A page nobody has looked at needs "does it
 * render, and does its main affordance work" before it needs depth; writing six
 * speculative cases against a screen nobody has opened is how a checklist grows
 * cases that measure nothing.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

const SIGN_IN_ADMIN = "Sign in as admin@letitrip.in / TempPass123!.";

export const authored: Record<string, AuthoredCase> = {
  "checklist-admin-uncovered-admin-pages-action-index-renders": {
    roles: ["admin"],
    startPage: "/admin/action-index",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/action-index with the browser console open.",
      "Read what the page lists.",
      "Pick one action and read its label, its kind and whether it carries a confirmation.",
      "Check a destructive action shows that it has a confirmation configured.",
      "Read the console for errors.",
    ],
    expectedBehaviour:
      "The page renders the registered CTA catalogue. Every action in the product is supposed to be declared there rather than written inline at its call site, so this page is the readable form of that rule — and a destructive action with no confirmation is exactly what it exists to surface.",
    expectedUiState:
      "A populated list of actions with labels and kinds, no error boundary, clean console. Any destructive action showing no confirmation is a finding, named.",
    expectedData: { consoleErrors: 0 },
    endResult: "Read-only.",
  },
  "checklist-admin-uncovered-admin-pages-admin-notifications-renders": {
    roles: ["admin"],
    startPage: "/admin/admin-notifications",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/admin-notifications.",
      "Read the rows listed and note their types.",
      "Open one row's detail.",
      "Read the full body and any linked record.",
      "Follow the link, if there is one, and read where it lands.",
    ],
    expectedBehaviour:
      "Notification rows can be opened and read in full. A list-only surface is a dead end — an admin can see that something happened and never what it said, which is the shape a whole sweep of dashboard lists was found in.",
    expectedUiState:
      "Rows render with their types, a row opens to show the full body, and any link lands on a real page. A list with no way to open a row is the finding.",
    endResult: "Read-only.",
  },
  "checklist-admin-uncovered-admin-pages-maintenance-analysis-renders": {
    roles: ["admin"],
    startPage: "/admin/maintenance/analysis",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/maintenance/analysis with the console open.",
      "Read whether the page renders content or an error boundary.",
      "Read the console and the network panel for failures.",
      "Reload once and read the same.",
    ],
    expectedBehaviour:
      "The page renders rather than throwing. Maintenance pages read external systems, and an unguarded read there is both a runtime error boundary and — because the build attempts to prerender pages under a session-reading layout — a way to fail the production build outright.",
    expectedUiState:
      "Content renders with no error boundary and a clean console. A failed request that leaves the page empty but silent is also a finding.",
    endResult: "Read-only.",
  },
  "checklist-admin-uncovered-admin-pages-maintenance-client-errors-renders": {
    roles: ["admin"],
    startPage: "/admin/maintenance/client-errors",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/maintenance/client-errors.",
      "Read whether rows are listed and in what order.",
      "Check the newest is first.",
      "Open one row and read its message, its reference code and its component trace.",
      "Note whether a reference code shown on an error screen could be searched for here.",
    ],
    expectedBehaviour:
      "Browser-reported errors land here with the reference code an error screen shows the user, which is the join key between what they quote and what was recorded. The registration that forwards them has been silently absent twice, and its failure mode is an empty list rather than an error — so an empty list is only correct if nothing has genuinely been reported.",
    expectedUiState:
      "Rows newest-first, each opening to a message and a reference code. Record whether the list is empty, since that is the exact symptom of a missing registration.",
    endResult: "Read-only.",
  },
  "checklist-admin-uncovered-admin-pages-maintenance-function-errors-renders": {
    roles: ["admin"],
    startPage: "/admin/maintenance/function-errors",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/maintenance/function-errors.",
      "Read what the page shows.",
      "Check an empty list reads as 'none recorded' rather than as a blank area.",
      "Read the console for errors.",
    ],
    expectedBehaviour:
      "This error source has no production producer today, so an empty list is the expected and correct state. What must not happen is a blank region indistinguishable from a page that failed to load — the difference between 'nothing to show' and 'nothing loaded' is the whole value of an observability screen.",
    expectedUiState:
      "Either rows, or an explicit empty state saying none are recorded. A bare blank area is the finding.",
    endResult: "Read-only.",
  },
  "checklist-admin-uncovered-admin-pages-maintenance-payment-rollbacks-renders": {
    roles: ["admin"],
    startPage: "/admin/maintenance/payment-rollbacks",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/maintenance/payment-rollbacks.",
      "Read the rows listed, or the empty state.",
      "Open one row.",
      "Read what it shows about the order and the rollback.",
      "Read the console for errors.",
    ],
    expectedBehaviour:
      "Rollback records can be opened and traced back to their order. A payment rollback is a money event, so a row that cannot be opened leaves an admin knowing an amount moved and not which order it belonged to.",
    expectedUiState:
      "Rows open to show the order and the reason, or an explicit empty state. A row that cannot be opened is the finding.",
    endResult: "Read-only.",
  },
  "checklist-admin-uncovered-admin-pages-payment-method-clusters-renders": {
    roles: ["admin"],
    startPage: "/admin/payment-methods/clusters",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/payment-methods/clusters.",
      "Read what a cluster represents on this page.",
      "Open one cluster.",
      "Read the accounts or methods grouped inside it.",
      "Check any payment identifier shown is masked.",
    ],
    expectedBehaviour:
      "Clusters open to show what they group, and every payment identifier is masked. A masking helper that only spreads its input instead of masking is invisible everywhere except to a human who recognises a real value — which is exactly how one shipped and sat.",
    expectedUiState:
      "A cluster opens and lists its members, with every account number or payment handle partially hidden. An unmasked identifier is the finding, and it is a leak rather than a display bug.",
    endResult: "Read-only.",
  },
  "checklist-admin-uncovered-admin-pages-settings-actions-renders": {
    roles: ["admin"],
    startPage: "/admin/settings/actions",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/settings/actions.",
      "Read what the page lets an admin change.",
      "Change one setting and save.",
      "Reload and read whether the change held.",
      "Restore the original value.",
    ],
    expectedBehaviour:
      "A change made here persists. A settings save that returns success without writing is the most dangerous failure a settings screen has — there is no stale display to notice and no error to read, and it has happened on this codebase before.",
    expectedUiState:
      "The changed value is still changed after the reload. A value that reverts is the finding, even though the save reported success.",
    endResult: "The original value is restored.",
  },
  "checklist-admin-uncovered-admin-pages-shipments-projections-renders": {
    roles: ["admin"],
    startPage: "/admin/shipments/projections",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/shipments/projections.",
      "Read the figures shown.",
      "Open /admin/shipments and note a real shipment's value.",
      "Check the projection reflects real shipment data rather than zeros.",
      "Check no figure looks inflated by a factor of a hundred.",
    ],
    expectedBehaviour:
      "Projections are computed from real shipment data. Money on this codebase is stored in whole rupees with decimals, and a fixture written in the older hundredth-unit scale inflated procurement projections a hundredfold — a figure that is obviously wrong only if somebody knows what it should be.",
    expectedUiState:
      "Figures that correspond to the shipments list, with no order-of-magnitude jump. All zeros against real shipments, or a hundredfold figure, are both findings.",
    endResult: "Read-only.",
  },
  "checklist-admin-uncovered-admin-pages-admin-stickers-renders": {
    roles: ["admin"],
    startPage: "/admin/stickers",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/stickers.",
      "Read the rows listed and count them.",
      "Apply a status filter and read the rows again.",
      "Clear it and apply a different filter.",
      "Check each filter returns a plausible, non-empty result where such rows exist.",
    ],
    expectedBehaviour:
      "The list and its filters return real sticker listings. A filter whose value does not exactly match a stored one returns zero rows forever with no error — the single most common silent defect in this product's listing surfaces, and it looks identical to an empty catalogue.",
    expectedUiState:
      "Rows on the default view, and each filter returning a subset rather than nothing. An always-empty filter is the finding, named.",
    endResult: "Read-only.",
  },
  "checklist-admin-uncovered-admin-pages-admin-deals-renders": {
    roles: ["admin"],
    startPage: "/admin/deals",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/deals.",
      "Read what the page lists.",
      "Open one row.",
      "Read what the detail shows.",
      "Read the console for errors.",
    ],
    expectedBehaviour:
      "Rows can be opened. A row offering only mutations, or no way in at all, is a dead end — an admin can act on a record they were never able to read.",
    expectedUiState:
      "Rows render and one opens to a readable detail. A list with no detail affordance is the finding.",
    endResult: "Read-only.",
  },
  "checklist-admin-uncovered-admin-pages-admin-featured-renders": {
    roles: ["admin"],
    startPage: "/admin/featured",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/featured and read what it lists.",
      "Toggle one record's featured state.",
      "Reload the page and read the same record's state.",
      "Open the public surface that shows featured content and check it followed.",
      "Restore the original state.",
    ],
    expectedBehaviour:
      "A featured toggle persists and the public surface follows it. A list endpoint that omits a field the edit form sends back is how a toggle silently resets — saving any other field on the record re-sends a wrong default for the one the list never returned.",
    expectedUiState:
      "The toggled state survives the reload and appears publicly. A state that reverts is the finding.",
    endResult: "The original featured state is restored.",
  },
  "checklist-admin-uncovered-admin-pages-admin-features-renders": {
    roles: ["admin"],
    startPage: "/admin/features",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/features and read the features listed.",
      "Create a feature named 'QA Feature Probe'.",
      "Save it and check it appears in the list.",
      "Reload and check it is still there.",
      "Delete it.",
    ],
    inputs: { name: "QA Feature Probe" },
    expectedBehaviour:
      "A product feature can be created, appears in the list and survives a reload. Reloading is the whole test — an in-memory row that never reached storage looks identical until then.",
    expectedUiState:
      "The new feature is listed before and after the reload, and is gone after the delete.",
    endResult: "The QA feature is deleted.",
  },
  "checklist-admin-uncovered-admin-pages-admin-guides-all-render": {
    roles: ["admin"],
    startPage: "/admin/guide",
    steps: [
      SIGN_IN_ADMIN,
      "Open the Admin section's Guide area and list every guide page linked from it.",
      "Open each one in turn.",
      "Record any that 404 or render empty.",
      "On two of them, check the screen they describe still exists and is named the same way.",
      "Record any guide describing a screen or a control that is no longer there.",
    ],
    expectedBehaviour:
      "Every guide page renders and describes something that still exists. A guide is documentation with no compiler behind it, so it rots silently — and a guide naming a deleted screen is worse than none, because it sends an employee looking for something that is gone.",
    expectedUiState:
      "Every guide loads with real content. A 404 is a finding; so is a guide describing a screen that no longer exists, recorded with which guide and which screen.",
    expectedData: { guidePagesNotFound: 0 },
    endResult: "Read-only.",
  },
};
