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
 * 🛑 BOTH RECURRING SHAPES ARE PRESENT TODAY, and three cases were pointed at a
 * surface where neither can be observed (checked 2026-09-29).
 *
 * `BulkActionItem` is `{ id, label, variant, onClick }`. There is NO `action`
 * ActionDef on it, so Rule #7's auto-confirmation — which works by resolving
 * `ActionDef.confirmation` inside `<Button action={…}>` — never runs here.
 * `BulkActionBar.handleApply` calls `selectedAction?.onClick()` directly, and
 * `variant: "danger"` only adds `--danger` styling to the trigger and the
 * option. So **bulk Cancel on /admin/orders cancels every selected order with
 * no dialog**, which is exactly the failure this file's own header describes.
 *
 * And every bulk handler is a fire-and-forget loop —
 * `for (const rowId of selection.selectedIds) void handleQuickStatus(rowId, …)`
 * then `clearSelection()` — so there is no aggregated outcome anywhere: no
 * succeeded count, no failed count, and no way to name which rows failed. Two
 * cases asked for those counts; they now expect their absence and say so.
 *
 * 🛑 /admin/products HAS NO DESTRUCTIVE BULK ACTION. Its preset is
 * [FEATURE, PROMOTE, SALE] — three boolean flags — so the confirmation case
 * cannot start there. It now starts on /admin/orders, whose preset carries
 * CANCEL. Note those three are TOGGLES (`!row[field]`), so running "Feature"
 * over a mixed selection UN-features the rows that were already featured.
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
    startPage: "/admin/orders",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/products and read its bulk actions with three rows selected — they are Feature, Promote and Sale, and NONE of them is destructive, so there is nothing to confirm here.",
      "Open /admin/orders and select ONE order that is already cancelled, so that running the action cannot destroy anything.",
      "Open the bulk action picker and read the options — Mark Shipped, Mark Delivered and Cancel.",
      "Choose Cancel and apply it. Watch carefully for a confirmation dialog BEFORE anything commits.",
      "Record whether a dialog appeared at all, and what the bar did immediately afterwards.",
      "Open /admin/users, select one row, and check whether its Delete bulk action confirms.",
    ],
    inputs: { productBulkActions: "Feature, Promote, Sale", orderBulkActions: "Mark Shipped, Mark Delivered, Cancel" },
    expectedBehaviour:
      "Every destructive bulk action should confirm first, naming the count. Bulk is where selections are largest, so an unconfirmed destructive action is irreversible across the most rows an admin ever touches at once.",
    expectedUiState:
      "🛑 EXPECT NO CONFIRMATION, AND RECORD IT AS A FAILURE. `BulkActionItem` carries no ActionDef, so the registry's confirmation never resolves; the bar calls the handler directly and `variant: \"danger\"` only colours the control. Select an ALREADY-CANCELLED order so that proving this costs nothing. Say for each surface whether a dialog appeared.",
    expectedData: { confirmationShownOnOrdersCancel: false },
    endResult:
      "Nothing that mattered was destroyed — the only order actioned was already cancelled. Do not test this with a live order.",
  },
  "checklist-admin-bulk-actions-bulk-action-reports-result": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/products and note which of three rows are already Featured — the bulk action is a TOGGLE, so this matters.",
      "Select three rows that are all NOT featured, so the toggle moves them the same way.",
      "Run the Feature bulk action.",
      "Read whatever message appears when it completes, and record the exact wording.",
      "Check whether the three rows show the change without a manual reload.",
      "Re-select the same three and run Feature again to put them back.",
    ],
    inputs: { action: "Feature", rowCount: 3 },
    expectedBehaviour:
      "The result should name the counts. A bare 'Done' after an action over N rows tells the admin nothing about whether it was N — and a partial success reported as an unqualified success is how rows silently stay unchanged.",
    expectedUiState:
      "🛑 EXPECT NO COUNTS, AND RECORD IT AS A FAILURE. The handler is a fire-and-forget loop over the selected ids followed by clearSelection(), so nothing collects an outcome: there is no succeeded count, no failed count, and no aggregated message to read. Record what IS shown — per-row toast, nothing at all, or a bare success — and whether the rows updated in place. 🛑 Select rows that are all in the same starting state: Feature inverts each row independently, so a mixed selection un-features the ones that were already featured.",
    expectedData: { succeededCountShown: false, failedCountShown: false },
    endResult:
      "The three rows are back to not-featured. Running the same toggle twice restores them, which is only true because they all started the same way.",
  },
  "checklist-admin-bulk-actions-bulk-partial-failure-named": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/orders and build a selection mixing rows the action can apply to with rows it cannot — one PENDING order alongside one already CANCELLED and one already DELIVERED.",
      "Run Mark Shipped over that selection.",
      "Read the result message and record the exact wording.",
      "Check whether the rows that could not be shipped are NAMED, merely counted, or not mentioned at all.",
      "Reload and read each of the three rows' status to find out what actually happened to each.",
      "Restore any order whose status this changed.",
    ],
    inputs: { action: "Mark Shipped", mixedStatuses: "pending + cancelled + delivered" },
    expectedBehaviour:
      "Failures should be named. 'Two rows failed' out of a selection of twenty leaves the admin re-checking twenty rows by hand to find which two — and the usual next step is to run the action again on everything, which is worse. Naming nothing at all is worse still: the admin cannot even tell that anything failed.",
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
      "Read what the bulk bar offers — the correct answer here is NOTHING.",
      "If any bulk action IS offered, run it, reload, and check whether the records actually changed.",
      "Open a single offer's row menu and confirm Cancel is there instead, and that it demands a reason.",
    ],
    inputs: { expectedBulkActionCount: 0 },
    expectedBehaviour:
      "Every offered action does what its label says — and where it cannot, it is not offered. A destructively-labelled bulk action once existed here whose handler only cleared the selection: it read as working, cancelled nothing, and an admin using it believed a batch of offers had been cancelled. It was DELETED rather than wired, because cancelling an offer requires a reason and one shared reason across a mixed selection is worse audit data than no bulk action at all.",
    expectedUiState:
      "No bulk actions are offered on this page. That absence is the pass. A re-appeared bulk Cancel is the finding — whether it works or not — and per-offer Cancel is still available from the row menu, where it can ask for a reason.",
    endResult: "Nothing is changed; no offer is cancelled.",
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
