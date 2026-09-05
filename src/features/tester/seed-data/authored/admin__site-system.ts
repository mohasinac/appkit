/*
 * WHY: Authored six-part procedures for the admin/site-system checklist page.
 * WHAT: 35 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 SITE SETTINGS IS ONE DOCUMENT. Nineteen tabs write one record, so a form that
 * submits its whole object from partly-populated state can blank branding, fees,
 * integrations and legal copy in a single save that reports success. Two cases
 * here walk EVERY tab after editing one field, and that is not padding.
 *
 * 🛑 THE CREDENTIALS ARE AES-ENCRYPTED AND NEVER LEAVE THE SERVER. The admin read
 * strips the ciphertext and returns masked values; the public read is an
 * allow-list projection. Several cases read the PUBLIC response rather than the
 * admin form, because a masked field over an unmasked payload is a leak that looks
 * like a fix.
 *
 * 🛑 THE OBSERVABILITY PAGES ARE WHERE PRERENDER FAILURES SURFACE. Removing a
 * blanket dynamic-rendering export once exposed four error pages that were
 * throwing a missing-index precondition in production — invisible until then
 * because those pages were never prerendered.
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
  "checklist-admin-site-system-site-settings-admin": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site and read every tab in the strip.",
      "Open each tab in turn and note one distinctive value from each.",
      "Check every tab renders its fields rather than an empty panel.",
      "Read whether any tab shows raw ciphertext beginning with an encryption prefix.",
      "Reload and confirm every tab still renders.",
    ],
    expectedBehaviour:
      "Every settings tab renders its own fields from the one settings document. The admin read strips the raw encrypted credential blob and returns masked values instead — ciphertext in a browser is needless exposure even though it is unreadable.",
    expectedUiState:
      "All nineteen tabs render fields. No tab shows a raw encrypted value. A tab that opens empty is the finding, named specifically.",
    endResult: "Read-only; save nothing.",
  },
  "checklist-admin-site-system-site-settings-credentials-save": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site and go to the credentials tab.",
      "Read how existing credentials are displayed.",
      "Type QA-CREDENTIAL-118427 into one credential field and save.",
      "Read the confirmation and RELOAD the tab.",
      "Read how that credential now displays.",
      "Open /api/site-settings in a private window and search the response for QA-CREDENTIAL-118427.",
      "Clear the field, save, and reload to confirm.",
    ],
    inputs: { credential: "QA-CREDENTIAL-118427" },
    expectedBehaviour:
      "A credential is encrypted before storage and returned masked. The encryption helper THROWS when its key is unset — so a save that fails outright is a missing-key problem rather than a form bug, and a save that succeeds while storing plaintext is worse than either.",
    expectedUiState:
      "After the reload the credential shows masked rather than as the typed value or as raw ciphertext. The public settings response contains no trace of it. A save that errors should name the missing configuration rather than showing a stack trace.",
    expectedData: { credentialInPublicResponse: 0 },
    endResult:
      "The field is cleared. A hit in the public response is a credential leak and fails the case outright.",
  },
  "checklist-admin-site-system-site-settings-credentials-partial-save-keeps-others": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the credentials tab and write down which credentials are currently SET versus empty.",
      "Type a value into ONE empty credential field and save.",
      "RELOAD the tab and read every credential's state again.",
      "Compare against what was written down.",
      "Check no previously-set credential has become empty.",
      "Clear the field you set, save, and reload.",
    ],
    expectedBehaviour:
      "Saving one credential leaves the others encrypted and intact. A form that submits masked placeholders back as real values would overwrite every other credential with its own mask — and because the values are write-only from the browser's point of view, nobody would notice until an integration stopped working.",
    expectedUiState:
      "After the reload only the edited credential has changed state. Every previously-set credential is still set. One reading as empty afterwards is the failure, and it is unrecoverable — the original value cannot be read back to restore it.",
    expectedData: { credentialsUnintentionallyCleared: 0 },
    endResult:
      "The edited field is cleared. This is the most destructive save on the page: a cleared credential cannot be recovered from the UI.",
  },
  "checklist-admin-site-system-site-settings-themes-tab": {
    roles: ["admin", "guest"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the themes tab and read every theme listed.",
      "Check the two built-in themes are present and cannot be deleted.",
      "Duplicate one, rename the copy 'QA Theme site-system', change a brand colour and save.",
      "Set it as the default for light mode and save.",
      "Open / in a private window and check the new colour is applied.",
      "Restore the original default and delete the copy.",
    ],
    inputs: { themeName: "QA Theme site-system" },
    expectedBehaviour:
      "Themes are records whose colour tokens are written to the document root at runtime, so a change restyles the site without a deploy. The two built-ins cannot be deleted — deleting the active default would leave the site with no theme to apply.",
    expectedUiState:
      "Both built-ins are present and their delete controls are absent or refused. The duplicate saves, becomes the default, and the public site picks up the changed colour. After restoring, the original colours return.",
    endResult:
      "The original default is restored and the copy deleted. Leaving a QA theme as the site default changes the site for every visitor.",
  },
  "checklist-admin-site-system-site-settings-notifications-non-digest": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the notifications tab and read every notification type listed.",
      "Count them and compare against the full type list the system uses.",
      "Look specifically for offer-received and payment-review among them.",
      "Turn one channel off for one type and save.",
      "RELOAD and check only that one changed.",
      "Turn it back on and save.",
    ],
    expectedBehaviour:
      "Every notification type is listed so every one can be allow-listed per channel. The channel allow-list was once built from a nine-value copy of a twenty-seven-value union — eighteen types were unfilterable and two could not be configured for any channel at all.",
    expectedUiState:
      "The tab lists every type, including offer-received and payment-review. After the reload only the toggled channel differs and every other type's settings are unchanged.",
    endResult: "The channel is restored.",
  },
  "checklist-admin-site-system-whatsapp-credentials-persist": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the WhatsApp settings and read every field and its current state.",
      "Type QA-WA-TOKEN-552310 into the access-token field and fill any account identifier fields.",
      "Save and RELOAD, then read how each field displays.",
      "Open /api/site-settings in a private window and search for QA-WA-TOKEN-552310.",
      "Open a public store page's source and search for it too.",
      "Clear the fields, save, and reload.",
    ],
    inputs: { token: "QA-WA-TOKEN-552310" },
    expectedBehaviour:
      "The token is encrypted at rest and masked on read. It is also decrypted on every read of a store document, so any page handing a raw store document to a client component serialises it into public HTML — which is why both the settings response and a public store page are checked rather than the admin form alone.",
    expectedUiState:
      "After the reload the token displays masked. Neither the public settings response nor a public store page's source contains it.",
    expectedData: { tokenInPublicSurfaces: 0 },
    endResult: "The fields are cleared by the final step.",
  },
  "checklist-admin-site-system-whatsapp-channel-toggle-persists": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the WhatsApp settings and read every channel toggle and its state.",
      "Turn one OFF and save.",
      "RELOAD and read every toggle.",
      "Check only the one changed.",
      "Turn it back on, save, and reload to confirm.",
    ],
    expectedBehaviour:
      "Off is the direction that proves persistence when the default is on: a toggle that never saves reads back as its default and passes a test that only ever turns it on. Saving one toggle must not rewrite the rest.",
    expectedUiState:
      "After the reload the toggled channel is off and every other is unchanged. A toggle that has reverted to on is the failure, and the save reported success.",
    endResult: "The toggle is restored.",
  },
  "checklist-admin-site-system-whatsapp-order-announcement-fires": {
    roles: ["admin", "buyer"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and confirm the WhatsApp order channel is enabled.",
      "Read whether real credentials are configured or whether the fields are empty.",
      "Sign in as rehan.sheikh@gmail.com / TempPass123! and place an order that would trigger an order announcement.",
      "Read whether the buyer opted into WhatsApp updates and what fee was charged for it.",
      "Check the in-app notification for the order arrived.",
      "If real credentials are configured, check whether a WhatsApp message arrived.",
    ],
    expectedBehaviour:
      "WhatsApp order announcements are a paid per-store add-on, so the charge and the delivery must agree — a buyer charged the add-on fee and sent nothing is the failure that matters. With no credentials configured, the dispatch skips cleanly rather than failing loudly: the Meta secrets are seeded as empty strings rather than placeholders for exactly that reason.",
    expectedUiState:
      "The in-app notification arrives regardless. With credentials configured a message arrives; without them nothing is sent and no error surfaces to the buyer. A charged add-on with no delivery is the finding.",
    endResult:
      "One order exists. Record whether credentials were configured — the case reads differently either way.",
  },
  "checklist-admin-site-system-auction-bid-tiers-admin": {
    roles: ["admin", "buyer"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the auction settings and read every bid-increment tier and its price band.",
      "Check the bands are contiguous with no gap and no overlap.",
      "Change one tier's increment and save.",
      "RELOAD and confirm only that tier changed.",
      "Sign in as a buyer, open an auction whose current bid sits in that band, and read the minimum increment shown.",
      "Restore the original tier.",
    ],
    expectedBehaviour:
      "The tiers are contiguous price bands, so every possible current bid falls in exactly one — a gap leaves an auction with no defined increment and an overlap makes the answer depend on evaluation order. A per-listing override may only RAISE the tier's floor, never lower it.",
    expectedUiState:
      "The bands cover the range with no gap or overlap. After the reload only the edited tier differs, and an auction in that band shows the new increment.",
    endResult: "The tier is restored.",
  },
  "checklist-admin-site-system-daily-digest-recipients-save": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the daily digest settings and read the current recipients.",
      "Add qa-digest@mailnull.com to the list and save.",
      "RELOAD and read the recipients.",
      "Remove one existing recipient, save, RELOAD, and check the others survived.",
      "Type not-an-email and attempt to save, reading where the error appears.",
      "Restore the original recipient list.",
    ],
    inputs: { newRecipient: "qa-digest@mailnull.com", invalid: "not-an-email" },
    expectedBehaviour:
      "The recipient list round-trips and each entry is validated as an email before saving. Removing one must not disturb the rest — a list field replaced wholesale from a partly-populated form loses every entry the form did not load.",
    expectedUiState:
      "After each reload the list holds exactly what was saved. 'not-an-email' is rejected on the field before any request. Removing one leaves the others.",
    endResult: "The original recipient list is restored.",
  },
  "checklist-admin-site-system-daily-digest-on-deploy": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the daily digest settings and read whether a send-on-deploy option exists.",
      "Read what it says it will do and when.",
      "Read whether a manual send or preview control exists.",
      "Use the preview if one is offered and read what it produces.",
      "Read whether the digest's schedule is stated.",
    ],
    expectedBehaviour:
      "The digest runs on a schedule and its trigger is stated rather than implied. Each scheduled function is a registered job with a real recurring cost, so a digest that claims to send on every deploy as well as on a schedule is describing two triggers and the page should say which is live.",
    expectedUiState:
      "The schedule and any deploy trigger are both stated. A preview, where offered, renders the digest rather than erroring. An option whose behaviour is not described is the finding.",
    endResult: "Read-only; send nothing.",
  },
  "checklist-admin-site-system-daily-digest-email-content": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the daily digest settings and trigger a preview or a test send to qa-digest@mailnull.com.",
      "Read the digest's subject and body.",
      "Check the figures in it against the admin dashboard's own figures.",
      "Read the From name and check it is spelled LetItRip exactly.",
      "Check every link in the digest resolves to the live site.",
      "Read whether any buyer PII appears in the digest.",
    ],
    expectedBehaviour:
      "The digest reports real figures from the same source the dashboard reads, from the site's own sender. Its links must be absolute and on the canonical host — a digest is read in a mail client where a relative link is meaningless.",
    expectedUiState:
      "Figures match the dashboard. The From name reads 'LetItRip' exactly, not 'Letitrip' or 'LetiTrip'. Every link opens the live site. Record any buyer name, email or address that appears.",
    endResult: "One test digest exists in the mailbox.",
  },
  "checklist-admin-site-system-admin-dashboard-widgets": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin and read every widget and its figure.",
      "Write down any widget reading zero, a dash, or an empty state.",
      "Cross-check two figures against their own listing pages.",
      "Reload and confirm the figures are the same.",
      "Resize to 390 pixels and check every widget is readable.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "Dashboard figures come from pre-computed rollups rather than scanning collections per request — that is the pattern that keeps a dashboard load inside the read budget. A figure that fails to compute must read as unknown rather than as zero: zero is a claim and it is the wrong one.",
    expectedUiState:
      "Widgets show real figures consistent with their listing pages. A dash for a genuinely unavailable metric is fine; a confident zero beside a list that clearly has rows is not. Everything is readable at 390 pixels.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-site-system-analytics-admin": {
    roles: ["admin"],
    startPage: "/admin/analytics",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin analytics page and read every card and chart.",
      "Write down any figure reading zero or a dash.",
      "Change the date range if one is offered and read the figures again.",
      "Reload and confirm the figures are stable.",
      "Read whether any card reports an error rather than a figure.",
    ],
    expectedBehaviour:
      "Analytics render real figures. A pageview counter backed by Firestore is the live one; an older realtime-database counter was never writable by clients at all — its rules deny every write — so any card fed by it reported nothing while rendering as though it were loading.",
    expectedUiState:
      "Cards show figures rather than persistent dashes. A card stuck showing a placeholder is indistinguishable from one still loading, which is why the reload matters. Record any card that never resolves.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-site-system-analytics-traffic-card-has-numbers": {
    roles: ["admin", "guest"],
    startPage: "/admin/analytics",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and read the traffic card's current figure.",
      "In a private window, open /, /products and a product page.",
      "Wait a minute, then reload the admin analytics page.",
      "Read the traffic figure again and compare.",
      "Read whether the card distinguishes unique visitors from pageviews.",
    ],
    expectedBehaviour:
      "The traffic card counts real pageviews and moves when pages are viewed. A card fed by a write path that is denied by the database rules never increments and shows a dash forever — which reads as 'still loading' rather than as broken.",
    expectedUiState:
      "The figure increases after the browsing. A figure that never moves, or a dash that never resolves, is the failure. Record whether the card counts views or visitors.",
    expectedData: { figureIncreased: true },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-site-system-analytics-no-permission-denied": {
    roles: ["admin"],
    startPage: "/admin/analytics",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the browser console and clear it.",
      "Open the admin analytics page and wait for every card to settle.",
      "Read the console for any permission-denied message.",
      "Open the admin dashboard and read the console again.",
      "Note which card or widget was loading when any such message appeared.",
    ],
    expectedBehaviour:
      "No client-side read is denied. A denied realtime read fires no error callback at all where none is supplied, so the component sits in its initial state forever — the console message is the only evidence, and it is the difference between a card that is slow and one that will never load.",
    expectedUiState:
      "The console shows no permission-denied messages. Any that appear are recorded with the card that was loading, since that pairing is what identifies the dead read.",
    expectedData: { permissionDeniedMessages: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-site-system-pageviews-report-listing-standard": {
    roles: ["admin", "guest"],
    startPage: "/admin/analytics",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and open the pageviews report.",
      "Note the figure for a specific standard product page.",
      "In a private window, open that product page three times.",
      "Wait a minute and reload the report.",
      "Read the figure for that page and compare.",
      "Check the report identifies the page by a readable path rather than an internal id.",
    ],
    expectedBehaviour:
      "Pageviews are recorded per path and the report attributes them to a page a human can recognise. The counter that works is the Firestore one; the report must read that rather than an older realtime counter whose writes are denied.",
    expectedUiState:
      "The product page's figure rises by roughly three. Rows name readable paths. A figure that does not move is the failure.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-site-system-pageviews-tracks-all-listing-types": {
    roles: ["admin", "guest"],
    startPage: "/admin/analytics",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and open the pageviews report.",
      "In a private window, open one page of each listing type — a product, an auction, a pre-order, a prize draw, a classified, a digital code, a live item and an art print.",
      "Wait a minute and reload the report.",
      "Read the report for each of those paths.",
      "Write down any listing type whose page does not appear.",
    ],
    expectedBehaviour:
      "Every listing type's detail page is tracked. Each type has its own route, so a tracker wired per route rather than shared misses whichever routes were added after it — and the types added last are exactly the ones most likely to be missing.",
    expectedUiState:
      "All eight paths appear in the report with a non-zero figure. Any type absent is the finding, named by type.",
    expectedData: { untrackedListingTypes: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-site-system-maintenance-pages-admin": {
    roles: ["admin"],
    startPage: "/admin/maintenance",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the maintenance section and read every page it links to.",
      "Open each in turn and confirm it renders content rather than an error.",
      "Note any that shows a failed-precondition or missing-index error.",
      "Note any that shows a permission or credentials error.",
      "Reload each one that errored and read whether the error is consistent.",
    ],
    expectedBehaviour:
      "Every maintenance page renders. These pages are where prerender failures surface: removing a blanket dynamic-rendering export once exposed four error pages throwing a missing-index precondition in production, invisible until then because they were never prerendered. A server-side read here belongs in a guarded read so one missing index degrades the page rather than failing the build.",
    expectedUiState:
      "Every page renders content or a named empty state. A raw failed-precondition or index error shown as the page body is the finding, named by page.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-site-system-maintenance-error-lists-have-rows": {
    roles: ["admin"],
    startPage: "/admin/maintenance",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the server errors list and read the rows.",
      "Read whether rows carry a source, a code, a message and a time.",
      "Open the client errors list and read its rows.",
      "Open the function errors list and read its rows.",
      "Note which of the three lists is empty.",
      "Check the sort order puts the newest first.",
    ],
    expectedBehaviour:
      "Server and client errors both have live producers — route throws, render throws, action failures, and the browser beacon. The FUNCTION source has no production producer at all, so an empty function list is expected rather than a failure, and mistaking it for a working-but-quiet list is the trap. These lists are also ordered newest-first, which requires the index to be declared in that direction.",
    expectedUiState:
      "Server and client lists hold rows with source, code, message and time, newest first. An empty function list is expected. A list showing an index error instead of rows is the failure.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-site-system-maintenance-cloud-logs-degrades": {
    roles: ["admin"],
    startPage: "/admin/maintenance",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the cloud logs page and read what renders.",
      "Read whether it shows log entries, an empty state, or an error.",
      "If it errors, read whether the message names the missing configuration.",
      "Reload and confirm the behaviour is consistent.",
      "Check the rest of the admin panel still works afterwards.",
    ],
    expectedBehaviour:
      "This page calls an external cloud API, so it must degrade rather than throw when that call is unavailable — an unguarded read here fails the production BUILD, not merely the page, because the framework still attempts to prerender pages beneath a session-reading layout even though it discards the output.",
    expectedUiState:
      "The page renders logs, or a readable message naming what is unavailable. It does not show a stack trace, and it does not take the rest of the admin panel with it.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-site-system-copilot-admin": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the copilot or assistant surface and read what it offers.",
      "Read whether it states which model or provider it uses.",
      "Submit a simple request and read the response.",
      "Read whether any error surfaces a provider key or a raw response body.",
      "Read whether the feature declines cleanly when unconfigured.",
    ],
    expectedBehaviour:
      "The feature works or declines cleanly, and never surfaces a provider credential or a raw upstream error to the browser. Every 5xx message is scrubbed before it reaches a client, with the real one kept server-side for the error recorder.",
    expectedUiState:
      "A response renders, or a readable message names what is missing. No provider key, no raw upstream body, no stack trace.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-site-system-team-admin": {
    roles: ["admin"],
    startPage: "/admin/team",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/team and read every employee, their role and their permission preset.",
      "Open the invite panel by URL at /admin/team/new and check it opens already showing the form.",
      "Close it and confirm the browser lands back on /admin/team.",
      "Open an employee's editor, change only their preset, and save.",
      "RELOAD and check every other field is unchanged.",
      "Restore the original preset.",
    ],
    expectedBehaviour:
      "The team list and the invite editor are both real pages, and the editor opens already showing its form when reached by URL. A preset change must leave the rest of the record alone — the same list-serializer trap that stripped tester flags applies to any field the list omits.",
    expectedUiState:
      "The invite URL opens with the form visible rather than a blank page, and closing returns to /admin/team. After the preset change only the preset differs.",
    endResult: "The preset is restored.",
  },
  "checklist-admin-site-system-team-permission-group-filter": {
    roles: ["admin"],
    startPage: "/admin/team",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/team and note the total number of employees listed.",
      "Apply one filter chip and read the rows returned.",
      "Clear it, apply a different chip, and read the rows.",
      "Apply two chips together and read the rows.",
      "Clear everything and confirm the original count returns.",
    ],
    expectedBehaviour:
      "Applying a filter chip narrows the list and still returns employees. A filter builder that CONCATENATES its clauses rather than joining them produces one malformed clause matching nothing, so any chip empties the whole list — and the unit test for this route asserted against the correct behaviour rather than the real one, so it passed for as long as the bug existed.",
    expectedUiState:
      "Every chip returns at least one employee and two chips together return a subset. A chip that empties the list entirely is the exact failure.",
    expectedData: { emptyChipCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-site-system-audit-log-actor-search": {
    roles: ["admin"],
    startPage: "/admin/audit-log",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/audit-log and read the newest entries.",
      "Check each names an actor, an action, a target and a time.",
      "Read every action filter offered and select each, noting any that returns nothing.",
      "Search for an actor and read the results.",
      "Search zzzznope and read the count.",
      "Read whether any entry contains a buyer's name or email rather than an id.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "The log records high-value privileged actions with actor, action and target. It is deliberately NOT PII-encrypted, which is exactly why its metadata carries uids rather than names — a name in this collection would be stored in plaintext and never decrypted on the way out.",
    expectedUiState:
      "Entries name an actor, action, target and time. Every action filter returns its own rows or is genuinely empty. 'zzzznope' returns none. No entry carries a buyer's name or email in place of an id.",
    expectedData: { piiInAuditEntries: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-site-system-admin-audit-log-page": {
    roles: ["admin"],
    startPage: "/admin/audit-log",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/audit-log directly and confirm it renders.",
      "Find its entry in the admin sidebar and click it.",
      "Perform one instrumented action elsewhere — change a user's role and change it back.",
      "Return to the audit log and read the newest entries.",
      "Check both changes are recorded with the acting admin.",
      "Open an entry's detail and read its metadata.",
    ],
    expectedBehaviour:
      "The log is reachable from the sidebar and records the instrumented actions — role changes, bans, coupon updates, payout marks, store status changes and the checkout bypass. Writing to it is best-effort: a failed audit write never fails the underlying action, so a missing entry is a logging gap rather than a failed change.",
    expectedUiState:
      "The page is linked from the sidebar and renders. Both role changes appear with the acting admin and timestamps. An entry opens to show its metadata.",
    endResult:
      "The user's role is unchanged overall. Two audit entries exist for it.",
  },
  "checklist-admin-site-system-notifications-user-search": {
    roles: ["admin"],
    startPage: "/admin/notifications",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/notifications and read the search box's placeholder for how it matches.",
      "Read a recipient identifier from any row.",
      "Search that identifier exactly and read the results.",
      "Search only the first half and read the results.",
      "Search zzzznope and read the count.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "Recipient identities are PII-encrypted at rest, so they match exactly through a blind index and a partial cannot match — by design rather than omission, which is why the box has to SAY so. Without that, a partial search returning nothing reads as a broken search.",
    expectedUiState:
      "The exact identifier returns its rows, the partial returns none, and the box states that matching is exact. 'zzzznope' returns none.",
    expectedData: { partialMatchCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-site-system-admin-notification-detail-modal": {
    roles: ["admin"],
    startPage: "/admin/notifications",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/notifications and open a row's view action.",
      "Read the full title, body and any payload the notification carries.",
      "Read whether its destination link is shown.",
      "Close the modal and check the list is unchanged behind it.",
      "Open a different row and confirm it shows that notification rather than the first.",
    ],
    expectedBehaviour:
      "A notification opens to show its full body and payload. This listing was list-only for a long time — there was no way to read a notification's contents at all, only its title in a row, which made every triage decision a guess.",
    expectedUiState:
      "The modal shows the full title, body, payload and destination. Opening a second row shows that row's notification rather than repeating the first, which is what a modal bound to stale state does.",
    endResult: "Read-only; close without acting.",
  },
  "checklist-admin-site-system-carousel-edit-and-delete": {
    roles: ["admin", "guest"],
    startPage: "/admin/carousels",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/carousels and read what the page lists.",
      "Open a carousel and use its edit control to change its name and status.",
      "Save, RELOAD, and read both.",
      "Add a slide, save, reload, and read the slide back.",
      "Delete that slide, save, reload, and check the others survived.",
      "Restore the original name and status.",
    ],
    expectedBehaviour:
      "A named carousel can be edited and its slides added and removed after creation. The group editor was create-only for its whole life, so a carousel's name was fixed permanently and the list page rendered the flat slide editor rather than a list at all.",
    expectedUiState:
      "The page lists named carousels and the edit control exists. After each reload the change holds. Deleting one slide leaves the others — a delete keyed on array position removes the wrong one once the list has shifted.",
    endResult: "The original name and status are restored.",
  },
  "checklist-admin-site-system-guide-pages-admin": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin guide pages and read each one.",
      "Check each renders its own content and no two are the same.",
      "Follow every link inside them and note where each lands.",
      "Pick one guide and compare its instructions against the screen it describes.",
      "Note any instruction naming a control that no longer exists.",
    ],
    expectedBehaviour:
      "Each guide renders its own content and its links resolve. The comparison against the real screen is the substance: a guide describing a control that has been renamed is worse than no guide, because the admin trusts it and then cannot find what it names.",
    expectedUiState:
      "Every guide has distinct content and working links. Instructions match the current screens. Quote any sentence that is wrong rather than reporting only that the page loads.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-admin-site-system-tester-checklist-crud-admin": {
    roles: ["admin"],
    startPage: "/admin/tester-checklist",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/tester-checklist and read the catalogue.",
      "Create a case with a label, a description, a group, a page, roles, a start page and steps.",
      "Save, RELOAD, and read every field including roles and steps.",
      "Open /user/tester as a tester and find the new case.",
      "Check its roles, steps and expectations all render there.",
      "Delete the case and confirm it disappears from both surfaces.",
    ],
    expectedBehaviour:
      "The admin editor accepts every field a case carries, including the roles list, the input values and the expected data — fields added to the document type reach this form too, or the admin can create cases the hub cannot fully display.",
    expectedUiState:
      "After the reload the case holds every field. The Tester Hub shows its roles, steps, both value tables and the expectations. A field the editor accepts but the hub never shows, or the reverse, is the finding.",
    endResult: "The case is deleted from both surfaces.",
  },
  "checklist-admin-site-system-tester-feedback-report-export": {
    roles: ["admin"],
    startPage: "/admin/tester-feedback",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/tester-feedback and read the responses listed.",
      "Note how many are answered no and how many are answered yes with a comment.",
      "Use Download Report and open the file.",
      "Read its two sections and check one holds the no answers and the other the commented yes answers.",
      "Compare the entries in the file against what the page shows.",
      "Check each entry names the tester, the case and any screenshot link.",
    ],
    expectedBehaviour:
      "The report groups issues separately from notes on passing cases, and its content matches the page. There are two implementations of this report — the download and a standalone script — with no shared code between them, so a change to one is a change that has to be made twice.",
    expectedUiState:
      "The file has an issues section and a notes-on-passing-cases section, and its entries match the page. Each entry names the tester, the case label and any screenshot link.",
    endResult: "A report file exists on disk.",
  },
  "checklist-admin-site-system-tester-feedback-view-before-confirming-bug": {
    roles: ["admin"],
    startPage: "/admin/tester-feedback",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/tester-feedback and find a response answered no.",
      "WITHOUT using Confirm bug, find a way to read the tester's comment in full.",
      "Open any screenshot they attached and view it at full size.",
      "Read the case's own label and expectation alongside the response.",
      "Return to the list and check all of that is reachable from the row.",
    ],
    expectedBehaviour:
      "The comment and screenshot are readable before a bug is confirmed. This surface offered Confirm bug over a tester's comment and screenshot that were never rendered — and confirming a bug credits a bug hunter on a public leaderboard, so it is a decision with an outward-facing consequence.",
    expectedUiState:
      "The comment reads in full and the screenshot opens at full size, before any action. The case's own expectation is visible alongside so the response can be judged against it.",
    endResult: "Read-only; confirm nothing.",
  },
  "checklist-admin-site-system-admin-sidebar-logout-button": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin and find the log-out control in the sidebar.",
      "Click it and read where the browser lands.",
      "Open /admin again and read what happens.",
      "Press the browser back button and read what is shown.",
      "Open /admin/site directly and read what happens.",
    ],
    expectedBehaviour:
      "Log out clears both the server session cookie and the client auth session. Clearing only one leaves the browser able to re-mint a session on the next request, which is why the second navigation rather than the redirect is the real check — and an admin panel restored from the back-forward cache after log-out is a real exposure on a shared machine.",
    expectedUiState:
      "The browser leaves the admin panel. Opening /admin or /admin/site afterwards redirects to sign-in rather than rendering, even briefly with real data. The back button does not restore the dashboard.",
    endResult: "The session is ended.",
  },
  "checklist-admin-site-system-dashboard-tables-colors-avatars-icons": {
    roles: ["admin"],
    startPage: "/admin/users",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/users and read the avatar column.",
      "Check each avatar renders an image or a readable initial rather than an empty box.",
      "Read the role and status columns and check they render as coloured badges.",
      "Open /admin/orders and /admin/stores and read the same.",
      "Switch to dark mode and read all three again.",
      "Resize to 390 pixels and check the avatars and badges are still legible.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "Avatars, badges and icons all render at a size proportionate to their row. An avatar is an image inside a control, which is the shape that collapses to nothing when a shrink-to-fit wrapper sits between the two — the tile becomes an empty box while the row still works.",
    expectedUiState:
      "Every avatar shows an image or an initial. Roles and statuses are coloured badges, distinct per value, readable in both themes and at both widths. An empty bordered box where an avatar should be is the collapse failure.",
    endResult: "Read-only; return the site to light mode and restore the width.",
  },
};
