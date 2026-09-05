/*
 * WHY: Authored six-part procedures for the admin/bulk-actions page.
 * WHAT: 10 case(s), keyed by full checklist id.
 *
 * A bulk action multiplies both the work and the mistake. Two failure shapes recur
 * and both read as success: an action whose handler does nothing but clear the
 * selection, and a destructive action with no confirmation, which executes
 * immediately on a selection the admin may have built by accident.
 *
 * The bar itself belongs to a measured bottom tier shared with every other fixed
 * bar, and it must hide by COLLAPSING rather than by sliding away — a bar that
 * keeps its layout height while invisible over-reports the tier on every page that
 * has no bar, pushing floating controls up the screen site-wide.
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
  "checklist-admin-bulk-actions-select-all-count-matches-page": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/products and count the rows on the page.",
      "Use 'Select all'.",
      "Read the count reported on the bulk bar.",
      "Compare it against the number of visible rows.",
      "Page forward and read whether the selection or its count followed.",
    ],
    expectedBehaviour:
      "Select-all covers the rows on screen and says how many. A count larger than what is visible means it is selecting rows the admin cannot see — and the next destructive action then affects them.",
    expectedUiState:
      "The reported count equals the visible row count. A larger number is the finding, with both figures.",
    endResult: "Clear the selection.",
  },
  "checklist-admin-bulk-actions-bulk-bar-appears-on-selection": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/products with nothing selected and note where the page's content ends at the bottom.",
      "Select one row and read whether a bulk bar appears.",
      "Deselect it and read whether the bar goes.",
      "With the bar gone, check no empty strip, hairline or shadow is left where it was.",
      "Scroll to the very bottom with nothing selected and check no reserved gap remains.",
    ],
    expectedBehaviour:
      "The bar appears on the first selection and collapses to zero height on the last deselection. Hiding it by sliding it out of view leaves its height behind, so the shared bottom tier over-reports on every page with no bar — and the tier's background and border must sit INSIDE the collapsing box, or they paint a hairline across the screen at zero height.",
    expectedUiState:
      "The bar appears and disappears with the selection, leaving no strip, hairline, shadow or reserved gap behind.",
    endResult: "Nothing is selected.",
  },
  "checklist-admin-bulk-actions-bulk-destructive-confirms": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/products and select three rows.",
      "Trigger the destructive bulk action offered.",
      "Read the dialog WITHOUT confirming.",
      "Check it names the action and how many rows it will affect.",
      "Cancel it and check all three rows are untouched.",
      "Repeat on /admin/users and /admin/orders.",
    ],
    expectedBehaviour:
      "Every destructive bulk action confirms first, naming the count. An action defined inline at its call site rather than in the shared registry has no confirmation configured at all, and so runs immediately and irreversibly — on the largest selection the admin has ever made, since bulk is where selections are largest.",
    expectedUiState:
      "A confirmation naming the action and the row count appears on all three surfaces, and cancelling changes nothing. A destructive action that runs on click is the finding.",
    endResult: "Nothing is deleted.",
  },
  "checklist-admin-bulk-actions-bulk-action-reports-result": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/products and select three rows.",
      "Run a non-destructive bulk action on them, such as a status or flag change.",
      "Read the message shown when it completes.",
      "Check it states how many rows succeeded and how many failed.",
      "Check the affected rows show the change without a manual reload.",
    ],
    expectedBehaviour:
      "The result names the counts. A bare 'Done' after an action over N rows tells the admin nothing about whether it was N — and a partial success reported as an unqualified success is how rows silently stay unchanged.",
    expectedUiState:
      "A message naming the succeeded and failed counts, and the rows updated in place. A bare success message is the finding.",
    endResult: "Restore whatever the action changed.",
  },
  "checklist-admin-bulk-actions-bulk-partial-failure-named": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/products and build a selection mixing rows the action can apply to with rows it cannot — an archived row alongside published ones, for example.",
      "Run the action.",
      "Read the result message.",
      "Check the rows that failed are named rather than only counted.",
      "Check the rows that succeeded did in fact change.",
    ],
    expectedBehaviour:
      "Failures are named. 'Two rows failed' out of a selection of twenty leaves the admin re-checking twenty rows by hand to find which two — and the usual next step is to run the action again on everything, which is worse.",
    expectedUiState:
      "The failed rows are identified by title or id, with a reason. A bare failure count is the finding.",
    endResult: "Restore whatever succeeded.",
  },
  "checklist-admin-bulk-actions-bulk-selection-clears-after-run": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/products and select two rows.",
      "Run a bulk action and let it complete.",
      "Read whether the rows are still selected.",
      "Read whether the bulk bar is still shown.",
      "Read whether the list reflects the change without a reload.",
      "Reload and check the change held.",
    ],
    expectedBehaviour:
      "The selection clears when the action completes and the list reflects the result. A selection left in place invites the admin to run a second action on rows that have already been acted on, and on a destructive action that is unrecoverable.",
    expectedUiState:
      "No rows selected, no bulk bar, the list updated in place, and the change still there after a reload.",
    endResult: "Restore whatever the action changed.",
  },
  "checklist-admin-bulk-actions-bulk-selection-survives-filter-change": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/products and select three rows.",
      "Change a filter so that at least one selected row is no longer shown.",
      "Read the bulk bar's count.",
      "Read whether the selection was cleared or kept.",
      "If it was kept, run a harmless action and check which rows it affected.",
    ],
    expectedBehaviour:
      "Either the selection clears visibly, or it stays and the count keeps saying honestly how many rows it covers. What must not happen is an action running against rows the admin can no longer see — the confirmation names a count they cannot reconcile with the screen.",
    expectedUiState:
      "The count matches what the bar claims, and any action affects exactly those rows. A silent carry-over of hidden rows into a destructive action is the finding.",
    endResult: "Clear the selection.",
  },
  "checklist-admin-bulk-actions-bulk-actions-from-registry": {
    roles: ["admin", "seller"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/products, select a row, and write down every bulk action offered with its exact label.",
      "Sign in as tyson@beybladearena.in / TempPass123!.",
      "Open /store/products, select a row, and write down the same.",
      "Compare the labels of any action that appears in both lists.",
      "Check no label differs only in wording.",
    ],
    expectedBehaviour:
      "Actions come from a shared registry, so an action offered in two places carries one label. Two hand-written copies drift in wording first and in behaviour second, and a differently-worded destructive action is one an admin will hesitate over or misread.",
    expectedUiState:
      "Any action present on both surfaces reads identically. A wording difference is a finding, quoting both.",
    endResult: "Clear both selections.",
  },
  "checklist-admin-bulk-actions-bulk-no-dead-actions": {
    roles: ["admin"],
    startPage: "/admin/offers",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/offers and select two rows.",
      "Read every bulk action offered.",
      "Run each one in turn, noting what changed.",
      "Reload after each and check whether the records actually changed.",
      "Record any action that only cleared the selection.",
    ],
    expectedBehaviour:
      "Every offered action does what its label says. A destructively-labelled bulk action once existed here whose handler only cleared the selection — it read as working, cancelled nothing, and an admin using it believed a batch of offers had been cancelled.",
    expectedUiState:
      "Each action produces a visible, persisted change matching its label. An action whose only effect is clearing the selection is the finding, named.",
    endResult: "Restore whatever the actions changed.",
  },
  "checklist-admin-bulk-actions-bulk-users-actions": {
    roles: ["admin"],
    startPage: "/admin/users",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/users and select two accounts that no other checklist page signs in as.",
      "Run a reversible bulk action on them.",
      "Read the result message.",
      "Open each account and check the change applied to both.",
      "Open /admin/audit-log and check both changes are recorded with the acting admin.",
      "Reverse the change on both accounts.",
    ],
    expectedBehaviour:
      "A bulk action over accounts applies to every selected account and each change is audited individually. One log entry for a batch loses which accounts were affected, which is the only thing the log is there to answer.",
    expectedUiState:
      "Both accounts changed, and both appear separately in the audit log with the acting admin. One entry for the batch, or a missing entry, are both findings.",
    endResult: "Both accounts are restored.",
  },
};
