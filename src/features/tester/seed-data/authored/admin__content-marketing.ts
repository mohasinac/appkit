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
 * VERIFIED FIXED 2026-09-29 before asserting it: `adSettings` is now in
 * `PRIVATE_SITE_SETTINGS_FIELDS`, and `/api/ads` serves the public view behind
 * `if (String(item.status || "") !== "active") return false`. So the ads case
 * should PASS; it is kept because the leak was invisible from the admin seat.
 *
 * 🛑 THE NAVIGATION EDITOR REACHES NO PUBLIC SURFACE.
 *
 * `AdminNavigationView` reads and writes `siteSettings.navbarConfig.navItems`
 * through /api/admin/navigation. The public navbar renders `MAIN_NAV_ITEMS`
 * from `src/constants/navigation.tsx` — a static array, filtered only by the
 * listing-type toggles. A repo-wide grep for `navbarConfig` finds the two admin
 * routes, the `/api/admin/site` field list, the seed and the projection, and
 * **no renderer at all**. So it is a complete CRUD surface over data nothing
 * displays, and the projection lists `navbarConfig` as private with the reason
 * "rendered server-side" — which is not true of anything. Recorded in
 * OUTOFSCOPE; the case below now expects the public half to fail.
 *
 * 🛑 THERE IS NO FEATURE-FLAGS SURFACE. The `featureFlags` group was DELETED on
 * 2026-08-29 — "11 of its 14 keys had zero readers, and the survivors were not
 * flags at all". The survivors moved: listing and category types to the
 * `listings` tab (a PRODUCT CONTROL, per that schema comment), and
 * `smsVerification` / `adminCheckoutBypass` to the `payment` group. The last
 * case is rewritten onto the control that actually exists and actually reaches
 * public behaviour.
 *
 * /admin/site has TWENTY tabs, not nineteen: about, branding, appearance,
 * themes, announcement, seo, contact, watermark, fees, procurement, emi, gst,
 * listings, integrations, shipping, auction, limits, whatsapp, notifications,
 * legal.
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
      "Open /admin/ads and read every existing ad, its status and its placement.",
      "In the provider settings, read how 'AdSense client id' and 'Third-party script URL' are presented — whether a stored value is shown or only a masked placeholder.",
      "Create an ad named 'QA Ad crud-preview' in a DRAFT state with a placement selected.",
      "Save, RELOAD, and read every field.",
      "Use the preview and read what it renders.",
      "Sign out, open /, and check the draft ad is NOT rendered anywhere.",
      "View that page's source and search it for 'QA Ad crud-preview' and for any AdSense client id.",
      "Open /api/ads signed out and check the draft is absent from the response.",
      "Sign back in and delete the ad.",
    ],
    inputs: { name: "QA Ad crud-preview", status: "draft", publicEndpoint: "/api/ads" },
    expectedBehaviour:
      "A draft ad is invisible publicly and its provider credentials never leave the server. The ads group was written by the admin form while undeclared on the settings type, so it was published wholesale by an unauthenticated endpoint — including drafts and unmasked credentials — and nothing type-driven could see it.",
    expectedUiState:
      "The ad round-trips. Provider credentials appear only as masked placeholders in the admin form, never as editable stored values. The public page does not render the draft, its source contains neither the ad's name nor an AdSense id, and /api/ads omits it — that endpoint keeps only `status === \"active\"`. A draft appearing publicly, or a credential in the source, is a leak rather than a display bug.",
    expectedData: { credentialInPublicSource: 0, draftInPublicAdsResponse: false },
    endResult: "The ad is deleted by the final step.",
  },
  "checklist-admin-content-marketing-newsletter-export-admin": {
    roles: ["admin"],
    startPage: "/admin/newsletter",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/newsletter and read the subscriber count and the rows.",
      "Read whether subscriber email addresses are shown in full or masked.",
      "Click 'Export CSV' and read what the page does IMMEDIATELY — whether it returns at once with a job accepted, or blocks.",
      "Navigate to /admin and back to /admin/newsletter, then read whether the export's progress is still reported.",
      "Wait for it to finish and open the exported file.",
      "Compare the file's row count against the subscriber count shown.",
    ],
    inputs: { action: "Export CSV" },
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
      "Signed out, open /contact and submit a message: name 'QA Contact submissions-admin', email qa-contact-admin@mailnull.com, subject 'Checklist submission', message 'Sent by the tester checklist.'.",
      "Sign in as admin@letitrip.in / TempPass123! and open /admin/contact.",
      "Find that message and read its status — a new submission reads 'new'.",
      "Open the row menu and use its View action, then read every field in the drawer and confirm the full message body is there rather than a truncated preview.",
      "Use the row menu's mark-read action, RELOAD, and read the status.",
      "Use the row menu's archive action, RELOAD, and read the status again.",
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
      "The submission appears with its name, email, subject and full body. The View action opens a drawer rather than only offering mutations — a row you can act on but not read is the acting-blind shape. Status moves new → read → resolved and each survives a reload. 'zzzznope' returns zero rows rather than the full list.",
    expectedData: { nonsenseResultCount: 0 },
    endResult:
      "The submission remains, marked handled. Its arrival is the assertion — a missing message means the contact form delivers nowhere.",
  },
  "checklist-admin-content-marketing-media-library-admin": {
    roles: ["admin"],
    startPage: "/admin/media",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/media and read the grid.",
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
      "Open /admin/navigation and write down every nav item, its label, its destination and its order.",
      "Create one labelled 'QA Nav navigation-editor' pointing at /about, and save.",
      "RELOAD the editor and read every field of it — this half is the editor's own round trip.",
      "Sign out and open /. Read the public navbar and record every item it shows.",
      "Compare that list against the editor's: is 'QA Nav navigation-editor' there, and do the two lists agree at all?",
      "Sign back in, reorder two items, save, reload, then sign out and check whether the public navbar order followed.",
      "Sign back in, delete the item, restore the original order, and confirm the editor matches what was written down in step 2.",
    ],
    inputs: { label: "QA Nav navigation-editor", href: "/about" },
    expectedBehaviour:
      "An editor that saves is not an editor that reaches anything. The claim under test is that /admin/navigation is the source of the public navbar — a create, a reorder and a delete should all show up there.",
    expectedUiState:
      "🛑 EXPECT THE PUBLIC HALF TO FAIL, AND RECORD IT AS A FAILURE. The editor round trip should work: the item saves and survives a reload. But the public navbar is `MAIN_NAV_ITEMS`, a static array in src/constants/navigation.tsx filtered only by the listing-type toggles, and nothing anywhere reads `navbarConfig.navItems` — so expect the new item to be absent from /, the reorder to change nothing publicly, and the two lists to disagree. Record both lists side by side; that comparison is the finding.",
    expectedData: { savedInEditor: true, appearsInPublicNavbar: false },
    endResult:
      "The item is deleted and the original order restored, so the editor matches step 2 again. Keep the halves apart: the editor persisting correctly and reaching nothing is a different defect from an editor that fails to save.",
  },
  "checklist-admin-content-marketing-settings-navigation-actions": {
    roles: ["admin"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site and read every tab in the strip — there should be twenty: about, branding, appearance, themes, announcement, seo, contact, watermark, fees, procurement, emi, gst, listings, integrations, shipping, auction, limits, whatsapp, notifications, legal.",
      "Open the header search and type 'fees'.",
      "Click the result and read which tab opens.",
      "Read the URL and check it names the tab rather than being bare /admin/site.",
      "Copy that URL, open it in a new browser tab, and confirm it opens on the same settings tab.",
      "Open /admin/site?tab=zzzznope and read what happens.",
    ],
    inputs: { searchTerm: "fees", expectedTab: "fees", unknownTab: "zzzznope", tabCount: 20 },
    expectedBehaviour:
      "Settings are reachable by deep link and by search, and search reaches individual tabs rather than only the page. Landing on the first of twenty tabs and leaving the admin to hunt is a fail rather than a partial pass, and an unknown tab value falls back quietly because the realistic cause is a stale bookmark.",
    expectedUiState:
      "The search result opens the named tab, the URL carries it, and the copied URL reopens the same tab. An unknown value opens the default with no error banner and no blank panel.",
    expectedData: { tabCount: 20 },
    endResult: "Read-only; nothing is saved.",
  },
  "checklist-admin-content-marketing-features-feature-flags-admin": {
    roles: ["admin", "guest"],
    startPage: "/admin/site",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/site, then its 'Listings' tab, and write down the state of every listing-type and category-type toggle.",
      "Turn the auction listing type OFF and save.",
      "RELOAD the tab and check that ONLY that toggle changed.",
      "Sign out and open /: the Auctions item must be gone from the main navbar. Then open /auctions and read what is shown.",
      "Sign back in, turn the auction type back ON, save, sign out, and confirm the navbar item and /auctions both return.",
      "Signed out, open /api/site-settings and search the response for 'adminCheckoutBypass', 'smsVerification' and 'commissions'.",
    ],
    inputs: { tab: "listings", toggled: "auction" },
    expectedBehaviour:
      "A product control reaches the behaviour it names, in both directions, and saving one leaves the others alone — a disabled listing type is hidden from every listing surface and rejected on create and add-to-cart. The public settings response is an ALLOW-LIST projection: an operational setting such as the admin checkout bypass has no business being readable by an anonymous caller, and such settings were published for a long time because the response was built by spreading the document and deleting three keys.",
    expectedUiState:
      "Only the toggled type changes after the reload. With auctions off the navbar drops its Auctions item; with them on it returns. The public settings response contains no operational setting — nothing naming a checkout bypass, an SMS-verification switch or the commission economics.",
    expectedData: { operationalSettingsInPublicResponse: 0 },
    endResult:
      "Every toggle is back in its original state and the navbar shows Auctions again. A setting visible in the public response is a projection leak rather than a settings bug. Note this page has NO 'feature flags' surface: that group was deleted in favour of this one, because 11 of its 14 keys had no readers at all.",
  },
};
