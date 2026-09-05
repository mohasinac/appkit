/*
 * WHY: Authored six-part procedures for the admin/content-marketing page.
 * WHAT: 7 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE ADS SETTINGS WERE WRITTEN BY THE ADMIN FORM WHILE UNDECLARED ON THE
 * SETTINGS TYPE, which is how a whole group escapes every type-driven review —
 * provider credentials and every draft, paused and scheduled ad went out through
 * an unauthenticated public endpoint, unmasked and invisible to any reader
 * checking the interface. Two cases here read the PUBLIC response rather than the
 * admin form.
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
  "checklist-admin-content-marketing-ads-crud-preview": {
    roles: ["admin", "guest"],
    startPage: "/admin/ads",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin ads surface and read every existing ad, its status and its provider settings.",
      "Create an ad named 'QA Ad crud-preview' in a DRAFT state, with a placement and any provider credential field filled in.",
      "Save, RELOAD, and read every field including how the credential is displayed.",
      "Use the preview and read what it renders.",
      "Open / in a private window and check the draft ad is NOT rendered anywhere.",
      "Open that page's source and search for the ad's name and for the credential value.",
      "Delete the ad.",
    ],
    inputs: { name: "QA Ad crud-preview", status: "draft" },
    expectedBehaviour:
      "A draft ad is invisible publicly and its provider credentials never leave the server. The ads group was written by the admin form while undeclared on the settings type, so it was published wholesale by an unauthenticated endpoint — including drafts and unmasked credentials — and nothing type-driven could see it.",
    expectedUiState:
      "The ad round-trips with its credential MASKED in the admin form. The public page does not render it and its source contains neither the ad's name nor the credential value. A draft appearing publicly, or a credential in the source, is a leak rather than a display bug.",
    expectedData: { credentialInPublicSource: 0 },
    endResult: "The ad is deleted by the final step.",
  },
  "checklist-admin-content-marketing-newsletter-export-admin": {
    roles: ["admin"],
    startPage: "/admin/newsletter",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin newsletter surface and read the subscriber count and the rows.",
      "Read whether subscriber email addresses are shown in full or masked.",
      "Trigger the export and read what the page does immediately.",
      "Navigate away and back, then read whether the export's progress is still reported.",
      "Wait for it to finish and open the exported file.",
      "Compare the file's row count against the subscriber count shown.",
    ],
    expectedBehaviour:
      "The export runs as a background job rather than inside the request — an unbounded scan of every subscriber is exactly the shape that dies at the ten-second function ceiling in production while a small local list passes. The page subscribes to the job's progress instead of waiting on a response.",
    expectedUiState:
      "The export returns immediately with a job accepted rather than freezing the page. Progress survives navigating away and back. The finished file's row count matches the subscriber count. A request that hangs and then times out is the failure.",
    endResult:
      "An export file exists. Note whether subscriber emails are exposed in the LIST as well as in the file — the file is expected to carry them, the list is a judgement.",
  },
  "checklist-admin-content-marketing-contact-submissions-admin": {
    roles: ["admin", "guest"],
    startPage: "/contact",
    steps: [
      "Open /contact in a private window and submit a message: name 'QA Contact submissions-admin', email qa-contact-admin@mailnull.com, subject 'Checklist submission', message 'Sent by the tester checklist.'.",
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin contact submissions surface and find that message.",
      "Read every field of it and check the full message body is readable from the list or a detail view.",
      "Read the row actions offered and check at least one lets you VIEW rather than only act.",
      "Use any status control to mark it handled, then RELOAD and read the status.",
      "Search zzzznope and read the result count.",
    ],
    inputs: {
      name: "QA Contact submissions-admin",
      email: "qa-contact-admin@mailnull.com",
      message: "Sent by the tester checklist.",
    },
    expectedBehaviour:
      "A submitted message arrives in the admin surface with its full body readable. This is the round trip the contact form's own case cannot prove — a form that shows a confirmation and delivers nothing looks identical to one that works, from the sender's side.",
    expectedUiState:
      "The submission appears with its name, email, subject and full body. A view affordance exists alongside any actions. The status change survives a reload. 'zzzznope' returns zero rows rather than the full list.",
    expectedData: { nonsenseResultCount: 0 },
    endResult:
      "The submission remains, marked handled. Its arrival is the assertion — a missing message means the contact form delivers nowhere.",
  },
  "checklist-admin-content-marketing-media-library-admin": {
    roles: ["admin"],
    startPage: "/admin/media",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the admin media library and read the grid.",
      "Check every tile renders its image rather than an empty bordered box.",
      "Read the filter and sort controls and use each, confirming the results change.",
      "Search for a known filename, then search zzzznope and read the count.",
      "Open one item and read its detail — filename, dimensions, where it is used.",
      "Read whether any stored URL shown is a proxy path rather than a raw bucket URL.",
    ],
    inputs: { nonsenseQuery: "zzzznope" },
    expectedBehaviour:
      "The library lists stored media with working previews. Every tile is a clickable image inside a control, which is the exact shape that collapses to nothing when a shrink-to-fit wrapper sits between the button and the image — the tile renders as an empty box while the control still works.",
    expectedUiState:
      "Every tile shows its image at the same size as its neighbours. Filters and sorts change the grid and 'zzzznope' returns none. Stored URLs are proxy paths, since a raw bucket URL bypasses the watermark and the private-bucket guarantee.",
    expectedData: { nonsenseResultCount: 0 },
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-admin-content-marketing-navigation-editor-admin": {
    roles: ["admin", "guest"],
    startPage: "/admin/navigation",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/navigation and read every nav item, its label and its destination.",
      "Create one labelled 'QA Nav navigation-editor' pointing at /about, and save.",
      "RELOAD and read every field of it.",
      "Open / in a private window and find the new item in the public navigation.",
      "Click it and confirm it lands on /about.",
      "Reorder two items, save, reload, and check the new order holds publicly.",
      "Delete the item and confirm it disappears from both the editor and the public nav.",
    ],
    inputs: { label: "QA Nav navigation-editor", href: "/about" },
    expectedBehaviour:
      "The editor is the source of the public navigation, so a create, a reorder and a delete all reach it. A nav entry pointing at a page that does not exist is blocked elsewhere as a hard failure; this case is the other half — an entry that exists and never renders.",
    expectedUiState:
      "The new item appears in the public navigation and resolves to /about. The reorder holds after a reload, publicly as well as in the editor. After the delete it is gone from both.",
    endResult:
      "The item is deleted and the original order restored. An item saved in the editor but absent from the public nav is the failure.",
  },
  "checklist-admin-content-marketing-settings-navigation-actions": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site and read every tab in the strip.",
      "Open the header search and type a settings term such as fees.",
      "Click the result and read which tab opens.",
      "Read the URL and check it names the tab.",
      "Copy that URL, open it in a new tab, and confirm it opens on the same tab.",
      "Open /admin/site with an unknown tab value and read what happens.",
    ],
    expectedBehaviour:
      "Settings are reachable by deep link and by search, and search reaches individual tabs rather than only the page. Landing on the first of nineteen tabs and leaving the admin to hunt is a fail rather than a partial pass, and an unknown tab value falls back quietly because the realistic cause is a stale bookmark.",
    expectedUiState:
      "The search result opens the named tab, the URL carries it, and the copied URL reopens the same tab. An unknown value opens the default with no error banner and no blank panel.",
    endResult: "Read-only; nothing is saved.",
  },
  "checklist-admin-content-marketing-features-feature-flags-admin": {
    roles: ["admin", "guest"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open the feature-flags surface and read every flag and its state.",
      "Write down the state of each.",
      "Turn ONE flag off and save.",
      "RELOAD and check only that flag changed.",
      "Open the public surface that flag controls and confirm the behaviour changed.",
      "Turn it back on, save, and confirm the behaviour returns.",
      "Open /api/site-settings in a private window and read whether any flag is present in the response.",
    ],
    expectedBehaviour:
      "A flag reaches the behaviour it names, and a save of one leaves the others alone. The public settings response is an ALLOW-LIST projection: a flag such as the admin checkout bypass has no business being readable by an anonymous caller, and it was published for a long time because the response was built by spreading the document and deleting three keys.",
    expectedUiState:
      "Only the toggled flag changes after the reload. The public behaviour follows it in both directions. The public settings response carries no operational flag — specifically nothing naming a checkout bypass or an admin capability.",
    expectedData: { operationalFlagsInPublicResponse: 0 },
    endResult:
      "Every flag is back in its original state. A flag visible in the public response is a projection leak rather than a settings bug.",
  },
};
