/*
 * WHY: Authored six-part procedures for the admin/users-trust checklist page.
 * WHAT: 33 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 TWO THEMES RUN THROUGH THIS PAGE.
 *
 * First: an admin must be able to READ a record before acting on it. Moderation
 * queues, reports, item requests and catalogue approvals all shipped as rows
 * offering Approve and Reject over content that was never rendered — a decision
 * made blind, and it looks complete because the buttons work.
 *
 * Second: a list serializer that omits a field the editor also sends back is how
 * saving one thing silently resets another. The user editor did exactly that with
 * the tester flags: the list omitted them, the editor seeded them as undefined,
 * and the save handler sent that default unconditionally — so editing anything
 * else stripped a real tester's access.
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
  "checklist-admin-users-trust-users-role-change": {
    roles: ["admin"],
    startPage: "/admin/users",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/users and find karthik.new@gmail.com.",
      "Open the editor and write down every field, including the tester flags.",
      "Change ONLY the role and save.",
      "RELOAD the editor and compare every field against what was written down.",
      "Check the tester flags specifically.",
      "Open /admin/audit-log and read the newest entry.",
      "Set the role back to what it was.",
    ],
    inputs: { user: "karthik.new@gmail.com" },
    expectedBehaviour:
      "A role change is recorded in the audit log with the actor, the target and the before-and-after values — that is one of the eight instrumented privileged actions. It must also leave every other field alone: the list serializer once omitted the tester flags, so the editor seeded them as undefined and the save sent that default back, stripping a real tester's access as a side effect of an unrelated edit.",
    expectedUiState:
      "After the reload only the role differs. The tester flags hold their previous values. The audit log's newest entry names the role change, the acting admin and the target.",
    expectedData: { unintendedFieldChanges: 0 },
    endResult:
      "The role is restored. Re-read the flags after the reload, not just the field that was edited.",
  },
  "checklist-admin-users-trust-admin-user-detail-enriched": {
    roles: ["admin"],
    startPage: "/admin/users",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/users and open a buyer with orders and a wishlist.",
      "Read every section of their detail page.",
      "Check their orders, addresses, wishlist and history are reachable from here.",
      "Read how their email and phone are displayed.",
      "Read whether their session list and any ban state are shown.",
      "Search the page source for the full unmasked email.",
    ],
    expectedBehaviour:
      "The user page is where an admin assembles a picture of one person, so the related records are reachable from it — which is also why two other listings deliberately route their rows here rather than to a detail of their own. Email and phone are PII-encrypted at rest, so how much is decrypted and displayed is a deliberate choice worth recording.",
    expectedUiState:
      "Orders, addresses, wishlist and history are all reachable. Ban state and sessions are shown. Record exactly how the email and phone appear, and whether the full email is present in the page source even if masked on screen.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-users-trust-admin-delete-user-complete": {
    roles: ["admin"],
    startPage: "/admin/users",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/users and locate the delete action on a row.",
      "Read the confirmation it opens WITHOUT confirming it.",
      "Check whether it names what will be removed and what will be kept.",
      "Check whether it warns that the Firebase Auth record is also destroyed.",
      "CANCEL the dialog.",
      "RELOAD and confirm the user is untouched.",
    ],
    expectedBehaviour:
      "Deleting a user is irreversible and reaches beyond Firestore into the Auth record. A destructive action of that reach must carry a confirmation naming the consequences — the users collection is the one tier a tester run never wipes precisely because it cannot be rebuilt from seed data.",
    expectedUiState:
      "The confirmation names what is destroyed rather than asking a generic 'Are you sure?'. Cancelling leaves the user present after a reload.",
    endResult:
      "No user is deleted. CANCEL rather than confirm — a real signup deleted here cannot be restored.",
  },
  "checklist-admin-users-trust-roles-crud": {
    roles: ["admin"],
    startPage: "/admin/team",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the roles or permissions surface and read every role and its permissions.",
      "Read whether a permissions catalogue page exists and is reachable from the sidebar.",
      "Create a role named 'QA Role users-trust' with two permissions and save.",
      "RELOAD and read its permissions.",
      "Edit it to add a third, save, RELOAD, and check the first two are still there.",
      "Delete the role and confirm it is gone.",
    ],
    inputs: { name: "QA Role users-trust" },
    expectedBehaviour:
      "Roles carry permission sets and an edit adds rather than replaces. Permissions are keyed on nav item ids, and the filter that applies them short-circuits when an item has no id — which is how every requiredPermission in the config was decorative while looking configured.",
    expectedUiState:
      "After each reload the role holds every permission assigned. The third addition does not drop the first two. Any permissions catalogue page linked from the nav actually exists.",
    endResult: "The role is deleted by the final step.",
  },
  "checklist-admin-users-trust-sessions-revoke": {
    roles: ["admin", "buyer"],
    startPage: "/admin/sessions",
    steps: [
      "In window A, sign in as karthik.new@gmail.com / TempPass123! and open /user.",
      "In window B, sign in as admin@letitrip.in / TempPass123! and open the admin sessions listing.",
      "Find that user's active session and read what the row shows — device, last activity, location.",
      "Read whether the IP address is shown in full or masked.",
      "Revoke the session.",
      "Return to window A and navigate to another /user page without reloading.",
      "Then reload window A and read what happens.",
    ],
    inputs: { user: "karthik.new@gmail.com" },
    expectedBehaviour:
      "Revoking ends the session. The IP is stored masked and must never be returned to a client in full — it is one of the few network identifiers the product holds. The client re-reads its session state on a periodic ping rather than every navigation, so a revoked session may survive a client-side navigation and must not survive a reload.",
    expectedUiState:
      "The row shows device, last activity and a MASKED IP. After revocation window A is signed out on reload at the latest. Record how long it took — an immediate effect is better, a reload-scoped one is expected, and no effect at all is the failure.",
    endResult:
      "The session is revoked. Sign the account back in afterwards, since other cases use it.",
  },
  "checklist-admin-users-trust-scammers-registry-admin": {
    roles: ["admin"],
    startPage: "/admin/scammers",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/scammers and read every column.",
      "Read every status filter offered and select each, noting any that returns nothing.",
      "For each empty filter, check the unfiltered list for rows of that status.",
      "Create a profile named 'QA Scammer users-trust' with a scam type and a description, and save.",
      "RELOAD and read every field.",
      "Edit ONLY the description, save, RELOAD, and check the status and type are unchanged.",
      "Delete the profile.",
    ],
    inputs: { name: "QA Scammer users-trust" },
    expectedBehaviour:
      "Every status chip names a value profiles actually hold — the canonical field-name constants and the feature's own type file have disagreed before, one missing a real status the other had, so the chips must be read against the real list. An edit is recorded with a history entry; this route once bypassed that entirely.",
    expectedUiState:
      "Every status filter returns its own rows or is empty with none unfiltered either. After the description edit the status and type are unchanged and a history entry records the change.",
    endResult: "The profile is deleted by the final step.",
  },
  "checklist-admin-users-trust-banned-addresses-admin": {
    roles: ["admin"],
    startPage: "/admin/addresses",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the banned-addresses surface and read every column.",
      "Check each row shows the address, who banned it, when, and why.",
      "Read whether an unban request from the owner is visible on the row.",
      "Open one and read the requester's full note before deciding anything.",
      "Read the actions offered and check a view exists alongside them.",
      "Use every filter offered and confirm each changes the rows.",
    ],
    expectedBehaviour:
      "A ban carries its reason and an unban request carries its note — the note is the ENTIRE case a reviewer reads, which is why the buyer-side form enforces a twenty-character minimum. A row offering Approve and Reject without showing that note is a decision made blind.",
    expectedUiState:
      "Rows show the address, the actor, the time and the reason. The requester's note is readable before any decision. Filters change the rows.",
    endResult: "Read-only; decide nothing.",
  },
  "checklist-admin-users-trust-address-clusters-admin": {
    roles: ["admin"],
    startPage: "/admin/addresses",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the address clusters surface and read what a cluster row represents.",
      "Check each row states how many accounts share the address and names them.",
      "Open a cluster and read the accounts it groups.",
      "Read whether the shared address itself is shown in full or masked.",
      "Read the actions offered and check a view exists alongside them.",
      "Use every filter offered and confirm each changes the rows.",
    ],
    expectedBehaviour:
      "A cluster is the fraud signal — several accounts sharing one delivery address. The row has to name the accounts, because acting on a cluster without seeing who is in it is the same blind decision as approving a submission whose contents were never rendered.",
    expectedUiState:
      "Rows state the account count and the cluster opens to name them. Address detail is shown only as far as the moderation task needs. A cluster row with a count and no way to see the accounts is the failure.",
    endResult: "Read-only; take no action.",
  },
  "checklist-admin-users-trust-moderation-queue-admin": {
    roles: ["admin"],
    startPage: "/admin/moderation",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the moderation queue and read every row.",
      "Check each row identifies what is being moderated and shows enough to judge it.",
      "Open one item and read its full content — text, images, whatever was submitted.",
      "Return to the list and check the same is reachable from the row itself.",
      "Read every status filter and select each, noting any that returns nothing.",
      "Read the ordering and check the oldest pending item is first.",
    ],
    expectedBehaviour:
      "An item's content is readable before a decision. This queue and the report, item-request and catalogue-approval surfaces all shipped as rows offering Approve and Reject over content that was never rendered — the buttons worked, which is why it looked finished.",
    expectedUiState:
      "Every row shows or reaches the content being judged. Filters return their own rows. The oldest pending item is first, since a queue ordered newest-first buries the items that have waited longest.",
    endResult: "Read-only; decide nothing.",
  },
  "checklist-admin-users-trust-moderation-reject-requires-reason": {
    roles: ["admin"],
    startPage: "/admin/moderation",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the moderation queue and open an item.",
      "Read its content, then choose Reject.",
      "Submit with the reason box empty and read what happens.",
      "Type 'Too short' and submit, reading what happens.",
      "Type a full sentence explaining the rejection and submit.",
      "RELOAD and read the item's status and the recorded reason.",
    ],
    expectedBehaviour:
      "A rejection carries a reason, enforced on the field rather than by a disabled button. The reason is what the submitter is told and what a later reviewer reads — a rejection with no reason is an outcome nobody can appeal or learn from.",
    expectedUiState:
      "The empty submit puts an error on the reason field rather than silently doing nothing. The full sentence is accepted. After the reload the item is rejected and the reason is stored against it.",
    endResult:
      "One item is rejected with a reason. A disabled button that does nothing when pressed is the failure — the admin cannot tell it from a broken page.",
  },
  "checklist-admin-users-trust-moderation-reject-keeps-note-on-failure": {
    roles: ["admin"],
    startPage: "/admin/moderation",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open a moderation item and choose Reject.",
      "Type a long, carefully worded reason into the box.",
      "Open browser DevTools and set the network to offline.",
      "Submit and read what happens.",
      "Set the network back online.",
      "Read whether the typed reason is still in the box.",
      "Submit again and confirm it succeeds.",
    ],
    expectedBehaviour:
      "A failed submit keeps the typed text. Clearing the form on failure destroys work the admin cannot recover, and a long rejection reason is exactly the kind of text nobody wants to write twice.",
    expectedUiState:
      "The offline submit shows a readable error rather than a stack trace. The reason is still in the box afterwards, character for character. The retry succeeds.",
    endResult:
      "The item is rejected on the retry. An emptied box after a failed submit is the failure.",
  },
  "checklist-admin-users-trust-support-tickets-triage-admin": {
    roles: ["admin"],
    startPage: "/admin/support",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin support tickets surface and read every column.",
      "Read every status filter and select each, noting any that returns nothing.",
      "Open a ticket and read the full message thread.",
      "Reply to it and change its status in the same action.",
      "RELOAD and read the thread, the status and the history entries.",
      "Reply again WITHOUT changing the status and read the history.",
    ],
    expectedBehaviour:
      "A reply appends to the ticket's thread and a status change is recorded with an actor. An ordinary reply that carries no status change costs one write and no read — the ticket is only re-read when a status accompanies the message, which is why the second reply is worth making separately.",
    expectedUiState:
      "The thread grows by one entry per reply, in order, with the earlier messages unchanged. The status change is recorded in history with an actor and a time. The status-free reply adds a message without inventing a status transition.",
    endResult: "The ticket carries both replies.",
  },
  "checklist-admin-users-trust-item-requests-admin": {
    roles: ["admin"],
    startPage: "/admin/item-requests",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the item-requests surface and read every row.",
      "Check each row shows the requested item's title and description rather than only a requester.",
      "Open one and read the full request before acting.",
      "Read the actions offered and check a view exists alongside them.",
      "Read every status filter and select each.",
      "Search zzzznope and read the count.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "A request is readable before it is actioned. This surface is one of the four that offered decisions over content the row never rendered — and an item request is nothing BUT its text, so a row without it shows the admin nothing at all.",
    expectedUiState:
      "Rows show the requested title and enough description to judge, and open to the full text. Filters return their own rows and 'zzzznope' returns none.",
    expectedData: { nonsenseResultCount: 0 },
    endResult: "Read-only; decide nothing.",
  },
  "checklist-admin-users-trust-item-request-requires-title-and-description": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open the item-request form from the buyer side.",
      "Submit it completely empty and read where the errors appear.",
      "Type a title only and submit, reading what happens.",
      "Type a one-word description and submit, reading what happens.",
      "Type 'QA Item Request users-trust' as the title and a full sentence as the description, then submit.",
      "RELOAD and confirm the request was created.",
    ],
    inputs: { title: "QA Item Request users-trust" },
    expectedBehaviour:
      "Both a title and a real description are required, enforced on their own fields before any request is sent. A request with no description is one an admin cannot act on, so accepting it just moves the dead end downstream.",
    expectedUiState:
      "The empty submit marks both fields individually rather than showing one banner. The title-only submit marks the description. The complete submission is accepted and survives a reload.",
    endResult:
      "One request exists. It is the fixture the admin item-requests case reads.",
  },
  "checklist-admin-users-trust-reports-admin": {
    roles: ["admin"],
    startPage: "/admin/reports",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the reports surface and read every row.",
      "Check each row names what was reported and by whom, and shows the reporter's stated detail.",
      "Open one and read the full report before acting.",
      "Read every status filter and select each, noting any that returns nothing.",
      "For each empty filter, check the unfiltered list for rows of that status.",
      "Read the actions offered and check a view exists alongside them.",
    ],
    expectedBehaviour:
      "A report is readable before it is dismissed or closed. Its status values must be ones reports actually hold — a chip naming a value the documents never carry matches nothing forever and looks like a category with no reports.",
    expectedUiState:
      "Rows name the target, the reporter and the reason, and open to the full detail. Every filter returns its own rows or is empty with none unfiltered either.",
    endResult: "Read-only; decide nothing.",
  },
  "checklist-admin-users-trust-report-submit-requires-detail": {
    roles: ["buyer"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /products/product-beyblade-burst-valkyrie and find the report control.",
      "Submit the report with no detail and read where any error appears.",
      "Type a single word and submit, reading what happens.",
      "Type 'QA Report users-trust — listing description does not match the photos.' and submit.",
      "Read the confirmation.",
    ],
    inputs: { detail: "QA Report users-trust — listing description does not match the photos." },
    expectedBehaviour:
      "A report requires enough detail to act on, enforced on the field. A report with no detail is one a moderator cannot judge, so accepting it fills the queue with items that can only be dismissed.",
    expectedUiState:
      "The empty and one-word submissions put an error on the detail field. The full sentence is accepted with a confirmation. A disabled submit button that says nothing is the failure.",
    endResult:
      "One report exists. It is the fixture the admin reports cases read.",
  },
  "checklist-admin-users-trust-report-dismiss-asks-why": {
    roles: ["admin"],
    startPage: "/admin/reports",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the reports surface and open the report created by the buyer case.",
      "Read its full detail, then choose Dismiss.",
      "Submit with the reason empty and read what happens.",
      "Type 'QA Dismissal users-trust — reviewed, no policy breach.' and submit.",
      "RELOAD and read the report's status and the recorded reason.",
    ],
    inputs: { reason: "QA Dismissal users-trust — reviewed, no policy breach." },
    expectedBehaviour:
      "A dismissal carries a reason. Without one there is no record of why a report was rejected, and the next moderator reading the same target has nothing to go on — the reason is the only artefact a dismissal leaves.",
    expectedUiState:
      "The empty submit is refused on the reason field. After the reload the report reads as dismissed and the reason is stored and readable.",
    endResult: "The report is dismissed with a reason recorded.",
  },
  "checklist-admin-users-trust-report-close-stores-a-real-date": {
    roles: ["admin"],
    startPage: "/admin/reports",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the reports surface and open an open report.",
      "Note the current date and time.",
      "Close the report with a resolution note.",
      "RELOAD and read the closed date shown.",
      "Compare it against the time the action was taken.",
      "Check no other status on the report shows an invented timestamp.",
    ],
    expectedBehaviour:
      "Closing stores a real timestamp taken at the moment of the action. A status with no recorded date renders an em-dash rather than a fabricated one — never the current time as a stand-in, and never a proxy field such as the record's last-updated value, which means 'last write of any kind' and not 'when this happened'.",
    expectedUiState:
      "The closed date matches when the action was taken. Statuses with no recorded date show an em-dash rather than a plausible-looking substitute.",
    endResult:
      "The report is closed with a real date. A fabricated timestamp is worse than a missing one, because it cannot be distinguished from a true one later.",
  },
  "checklist-admin-users-trust-report-status-rejects-unknown-values": {
    roles: ["admin"],
    startPage: "/admin/reports",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the reports surface and read every status the status control offers.",
      "Write the list down.",
      "Select each in turn on a test report and confirm each is accepted.",
      "Open the reports list and read every status filter chip.",
      "Compare the chip list against the status list from the editor.",
      "Note any chip naming a status the editor cannot set, or any status the editor sets that has no chip.",
    ],
    expectedBehaviour:
      "The statuses a report can be SET to and the statuses it can be FILTERED by are the same list. Where the two are maintained separately they drift — a chip for a status nothing can produce matches nothing forever, and a status with no chip makes those reports unfindable.",
    expectedUiState:
      "The editor's statuses and the filter chips are the same set, with nothing in one and not the other. A chip returning zero rows for a status the editor can set is the more likely half.",
    endResult: "Read-only apart from any status set on a test report.",
  },
  "checklist-admin-users-trust-catalogue-approvals-admin": {
    roles: ["admin"],
    startPage: "/admin/catalogue-approvals",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the catalogue approvals surface and read every row.",
      "Check each row shows the submitted item's photos, description and price.",
      "Read every status filter and select each.",
      "Open one submission and read everything the user submitted.",
      "Read the actions offered and check a view exists alongside them.",
    ],
    expectedBehaviour:
      "A submission's photos and details are visible before it is approved. This surface offered Approve and Reject over a user's photos, description and price that were never rendered anywhere — the clearest instance of a decision made blind in the admin panel.",
    expectedUiState:
      "Rows show or reach the submitted photos and detail. Filters return their own rows. A row with Approve and Reject and no content is the failure this case exists for.",
    endResult: "Read-only; decide nothing.",
  },
  "checklist-admin-users-trust-catalogue-approvals-view-before-deciding": {
    roles: ["admin"],
    startPage: "/admin/catalogue-approvals",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the catalogue approvals surface and find a pending submission.",
      "WITHOUT using Approve or Reject, find a way to open the submission in full.",
      "Read every photo at full size and the complete description.",
      "Read the price the submitter set and any linked marketplace listing.",
      "Return to the list and confirm the same content is reachable from the row.",
    ],
    expectedBehaviour:
      "The content is reachable without taking a decision. This is the same assertion as the case above stated from the tester's side: if the only way to see the submission is to act on it, the review is theatre.",
    expectedUiState:
      "The photos open at full size and the description reads in full, all before any action. A submission that can only be seen after approving it is the failure.",
    endResult: "Read-only; take no decision.",
  },
  "checklist-admin-users-trust-payment-methods-clusters-admin": {
    roles: ["admin"],
    startPage: "/admin/payment-methods",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the payment-methods clusters surface and read what a row represents.",
      "Check each row states how many accounts share the instrument and names them.",
      "Read how the payment identifier itself is displayed.",
      "Search the page source for a full card or UPI identifier.",
      "Read the sort dropdown's default and check it is one of the offered options.",
      "Open a row and read the accounts it groups.",
    ],
    expectedBehaviour:
      "A shared payment instrument is a fraud signal and the row must name the accounts. The identifier is the most sensitive value on this page and must be masked in the payload as well as on screen — a masked display over an unmasked payload is a leak that looks like a fix. This listing has also shipped with a default sort that was not among its own options, opening the dropdown blank.",
    expectedUiState:
      "Rows state the account count and open to name them. Identifiers are masked, and the full value does not appear in the page source. The sort dropdown opens with a selection that is one of its options.",
    expectedData: { fullIdentifierInSource: 0 },
    endResult: "Read-only; take no action.",
  },
  "checklist-admin-users-trust-listing-form-every-section-reachable": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open a product editor and read every section header.",
      "Expand each in turn and confirm its fields render.",
      "Resize to 390 pixels wide and expand each again.",
      "Check no section is unreachable behind a horizontal scroll or a clipped control.",
      "Open a picker inside the LAST section and check its list is not clipped.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "Every section opens at both widths. A collapsing container needs overflow hidden to animate, and that same rule clips any picker list opened inside it — the options exist and cannot be seen, worst in the last section where there is least room below.",
    expectedUiState:
      "All sections expand and their fields render at 1280 and at 390. The picker in the last section shows its full list rather than one cut off at the section boundary.",
    endResult: "Read-only; leave the editor without saving.",
  },
  "checklist-admin-users-trust-listing-form-errors-land-on-fields": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and start a new product.",
      "Read the page before typing and note whether any errors are already listed.",
      "Leave required fields empty in two different sections and collapse both.",
      "Attempt to save.",
      "Read the error summary and click an entry belonging to a collapsed section.",
      "Read where the page lands and whether the field is focused and marked.",
    ],
    expectedBehaviour:
      "The summary appears only after a submit attempt — a form that opens listing every empty required field accuses the user of mistakes before they have typed anything. Clicking an entry expands its section and lands ON the field, focused; landing on the section heading leaves the admin hunting through a dozen fields.",
    expectedUiState:
      "No errors before the save attempt. Afterwards each entry names its section, and clicking one expands that section with the field focused and marked.",
    expectedData: { errorsBeforeSubmit: 0 },
    endResult: "Nothing is saved; leave the editor.",
  },
  "checklist-admin-users-trust-listing-form-save-draft-anywhere": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and start a new product.",
      "Fill only the title and leave every other required field empty.",
      "Use Save draft from the first section and read what happens.",
      "Expand a later section, fill one field there, and use Save draft again.",
      "RELOAD the draft and read both values.",
      "Delete the draft.",
    ],
    inputs: { title: "QA Product save-draft-anywhere" },
    expectedBehaviour:
      "A draft saves from anywhere in the form without satisfying the publish rules — that is what makes it a draft. It must also not lose the fields from sections the user has not opened, which is the same partial-population trap that blanks untouched fields on a full save.",
    expectedUiState:
      "Save draft succeeds from both positions without demanding the missing required fields. After the reload both entered values are present. A draft save that enforces publish validation is the failure.",
    endResult: "The draft is deleted by the final step.",
  },
  "checklist-admin-users-trust-seller-shipping-storefront-sections": {
    roles: ["admin"],
    startPage: "/admin/stores",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/stores and open a store's editor.",
      "Read every section, including shipping and storefront presentation.",
      "Write down every field's value.",
      "Change one storefront field and save.",
      "RELOAD and compare every field, paying attention to verified, featured and the capabilities.",
      "Restore the changed field.",
    ],
    expectedBehaviour:
      "Editing a storefront field leaves the store's trust flags alone. The list serializer once omitted verified, featured, capabilities and notes, so the editor seeded them as undefined and sent those defaults back on every save — un-verifying the store and resetting its capabilities as a side effect of an unrelated edit.",
    expectedUiState:
      "After the reload only the storefront field differs. Verified, featured and the capabilities are unchanged. A store that quietly lost its verified badge is the failure, and the save reported success.",
    expectedData: { verifiedPreserved: true },
    endResult: "The field is restored; the store's flags are as they were.",
  },
  "checklist-admin-users-trust-admin-tables-render-badges-not-text": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and read the status column.",
      "Check statuses render as coloured badges rather than plain text.",
      "Check different statuses use different colours.",
      "Open /admin/stores, /admin/payouts and /admin/users and read their status columns.",
      "Switch to dark mode and read all four again.",
    ],
    expectedBehaviour:
      "Status renders as a badge with its own colour so a table can be scanned rather than read word by word. Inline chips take a status tint with matching ink, and both halves invert with the theme — a literal white ink against a tint is invisible in exactly one theme, which is why both are read.",
    expectedUiState:
      "All four tables show coloured status badges, with distinct statuses in distinct colours, readable in both themes. Plain text, or badges all one colour, are both failures.",
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-admin-users-trust-admin-table-readable-on-phone": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders at 1280 pixels and note how rows are presented.",
      "Resize to 390 pixels and read the same rows.",
      "Try to scroll the page sideways.",
      "Open a row's action menu and check it is fully on screen.",
      "Repeat on /admin/users and /admin/products.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "A table becomes cards on a phone rather than a sideways-scrolling table — columns off the right edge are columns nobody reads. Every row action stays reachable in the card form.",
    expectedUiState:
      "All three listings render as cards at 390 with their key fields, and none scrolls sideways. Row action menus open fully on screen rather than being clipped at the viewport edge.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-admin-users-trust-action-buttons-have-icons": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and open a row action menu.",
      "Read every entry and check each carries an icon alongside its label.",
      "Check destructive entries are visually distinguished from the rest.",
      "Compare the icon size against the row height.",
      "Open a bulk action bar by ticking rows and read its buttons the same way.",
    ],
    expectedBehaviour:
      "Actions come from the shared registry, which carries each one's icon, label and destructive flag — so an entry with no icon is one defined inline, outside the registry, and an inline definition also bypasses permission gating and confirmation copy.",
    expectedUiState:
      "Every menu and bulk-bar entry has an icon at a size proportionate to its control. Destructive entries are marked as such. An entry with a label and no icon is the tell that it was defined inline.",
    endResult: "Read-only; choose nothing.",
  },
  "checklist-admin-users-trust-sold-flag-badge-readable": {
    roles: ["admin"],
    startPage: "/admin/products",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/products and switch the availability scope to show sold and ended listings.",
      "Find a sold listing and read its badge.",
      "Read the badge against its background.",
      "Switch to dark mode and read it again.",
      "Compare it against an ended auction's badge and a depleted digital-code listing's.",
    ],
    expectedBehaviour:
      "The sold badge is readable in both themes. Availability is asymmetric per type — sold, ended, closed and depleted are different states — so the badges should distinguish them rather than collapsing everything into one word.",
    expectedUiState:
      "The sold badge is legible in both themes. A sold product, an ended auction and a depleted code listing are distinguishable from their badges. A badge whose text vanishes in one theme is the failure.",
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-admin-users-trust-homepage-section-all-types-creatable": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the homepage sections editor and open the section type picker.",
      "Write down every type offered.",
      "Compare the list against the section types the homepage can render.",
      "Create one of each type not already present, saving after each.",
      "Open / in a private window and check each new section renders.",
      "Delete every section created.",
    ],
    expectedBehaviour:
      "Every renderable section type is creatable. A type the renderer supports but the picker omits is a feature nobody can reach, and a type the picker offers that the renderer does not handle produces a saved section that renders as nothing.",
    expectedUiState:
      "The picker's types match what the homepage renders. Each created section appears publicly. A section that saves and renders nothing is the finding, named by type.",
    endResult: "Every created section is deleted by the final step.",
  },
  "checklist-admin-users-trust-analytics-alert-threshold-is-numeric": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the analytics alert settings and find the threshold field.",
      "Type abc into it and attempt to save.",
      "Read where any error appears.",
      "Type -5 and attempt to save, reading what happens.",
      "Type 250 and save.",
      "RELOAD and read the stored value.",
    ],
    inputs: { invalidText: "abc", negative: -5, valid: 250 },
    expectedBehaviour:
      "The threshold accepts only a sensible number, validated on the field before any request. A text value stored where a number is expected produces a comparison that silently never fires — the alert simply never triggers, and nothing reports that it is broken.",
    expectedUiState:
      "'abc' and -5 are both rejected on the field. 250 saves and survives the reload. A text value accepted here is the failure, and its consequence is an alert that never fires.",
    expectedData: { threshold: 250 },
    endResult: "Restore the original threshold value.",
  },
  "checklist-admin-users-trust-scammer-removed-badge-readable": {
    roles: ["admin"],
    startPage: "/admin/scammers",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/scammers and find a profile in the removed state, or set one to removed.",
      "Read its status badge.",
      "Read the badge against its background.",
      "Switch to dark mode and read it again.",
      "Check the removed status also appears as a filter chip and that the chip returns this row.",
    ],
    expectedBehaviour:
      "The removed status is a real stored value and is both rendered and filterable. The canonical field-name constants have been missing this exact value while the feature's own type file had it — so a badge that renders and a chip that does not, or the reverse, is the signature of two lists that have drifted.",
    expectedUiState:
      "The removed badge is legible in both themes and a removed filter chip exists and returns this profile. A badge with no matching chip, or a chip returning nothing, is the drift.",
    endResult: "Restore the profile's original status if it was changed.",
  },
};
