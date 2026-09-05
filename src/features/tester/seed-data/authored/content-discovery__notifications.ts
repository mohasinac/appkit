/*
 * WHY: Authored six-part procedures for the content-discovery/notifications page.
 * WHAT: 8 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE OPT-OUT CASE IS THE IMPORTANT ONE. The map from notification type to
 * preference key must be COMPLETE: a missing entry left the key undefined, so the
 * opt-out check never ran and the user's preference was silently ignored while the
 * toggle sat there reading as honoured. Three types were missing.
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
  "checklist-content-discovery-notifications-receive-notification": {
    roles: ["buyer"],
    startPage: "/user/notifications",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/notifications and read the unread count on the header bell.",
      "In a second window, sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "As that second buyer, open /auctions/auction-tester-sandbox-cycle-1 and place a bid high enough to outbid the first buyer.",
      "Return to the first window and open /user/notifications.",
      "Read the newest entry and the bell's unread count.",
    ],
    expectedBehaviour:
      "An event that concerns a user produces a notification addressed to them, carrying a title, a body and a destination. The destination is filled in from the record it relates to rather than hand-written per caller, which is why almost no call site used to set one.",
    expectedUiState:
      "A new entry appears naming the auction, and the bell's unread count has increased. The entry has a readable title and body — not a raw type string like 'bid_outbid' shown as the whole message.",
    endResult:
      "The notification survives a reload. This case requires the first buyer to hold the leading bid beforehand; place one first if they do not.",
  },
  "checklist-content-discovery-notifications-mark-read": {
    roles: ["buyer"],
    startPage: "/user/notifications",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/notifications and note the unread count on the bell.",
      "Click one unread notification.",
      "Read the bell's count and that row's unread styling.",
      "Reload the page and read both again.",
      "Use the mark-all-read control and read the count.",
      "Reload once more.",
    ],
    expectedBehaviour:
      "Read state is persisted per notification, so the count is the same before and after a reload. A count held only in component state resets to the original number on refresh and the user sees the same badge again.",
    expectedUiState:
      "Opening one notification drops the count by exactly one and removes that row's unread styling. After the reload the count is still the reduced one. Mark-all-read takes it to zero and it is still zero after reloading.",
    expectedData: { unreadCountAfterMarkAll: 0 },
    endResult: "The count stays at zero across reloads.",
  },
  "checklist-content-discovery-notifications-notification-channel-prefs": {
    roles: ["buyer"],
    startPage: "/user/settings",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/settings and click the 'Notifications' tab.",
      "Read every channel offered and every notification type listed.",
      "Turn one channel off for one type and click 'Save preferences'.",
      "Reload the page and open the tab again.",
      "Read whether that one switch is still off and whether the others are unchanged.",
    ],
    expectedBehaviour:
      "Preferences save per type and per channel, and saving one does not rewrite the others from a partly-populated form. The tab must also list every notification type — an incomplete list leaves whole categories with no way to opt out at all.",
    expectedUiState:
      "The changed switch is off after the reload and every switch the tester did not touch holds its previous value. Types such as offer_received and payment_review are present in the list rather than missing.",
    endResult:
      "Restore the switch afterwards, so later notification cases are not suppressed by a leftover opt-out.",
  },
  "checklist-content-discovery-notifications-notification-type-sample": {
    roles: ["buyer"],
    startPage: "/user/notifications",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/notifications.",
      "Read every entry, noting its type icon or label, its title and its body.",
      "Write down any entry whose body is empty, or reads as a raw type string, or repeats its own title verbatim.",
    ],
    expectedBehaviour:
      "Each notification type renders its own title and body from a template keyed on the type. A type with no template falls back to something generic, which is visible as a body that simply restates the title or shows the type identifier.",
    expectedUiState:
      "Every entry has a distinct, readable title and body. None shows a bare type identifier such as 'order_confirmed' as its message, and none has an empty body.",
    expectedData: { untemplatedEntryCount: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-content-discovery-notifications-notification-tab-filters": {
    roles: ["buyer"],
    startPage: "/user/notifications",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/notifications and read every filter tab or chip offered.",
      "Note the total number of entries with no filter applied.",
      "Select each filter in turn and read the resulting count and rows.",
      "Write down any filter that returns zero rows.",
      "Clear the filter and check the original count returns.",
    ],
    expectedBehaviour:
      "Every filter value offered corresponds to a type that notifications actually carry. A chip whose value is not a real stored type matches byte-exactly against nothing and stays empty forever, with no error to explain it.",
    expectedUiState:
      "Each filter either returns rows or is genuinely empty for this account — and where it is empty, the same type is absent from the unfiltered list too. A chip that is empty while matching entries sit in the unfiltered list is the failure.",
    endResult: "Read-only; nothing persists beyond the URL.",
  },
  "checklist-content-discovery-notifications-notification-email-actually-arrives": {
    roles: ["buyer"],
    startPage: "/user/settings",
    steps: [
      "Sign in as an account whose inbox you can open.",
      "Open /user/settings, click the 'Notifications' tab, and make sure Email is on for order updates.",
      "Place an order that will produce an order-confirmed notification.",
      "Open /user/notifications and confirm the in-app entry is there.",
      "Open the inbox, checking Spam as well, and wait up to five minutes.",
      "Read the email's From name and address, its subject and its body.",
      "Click the button or link inside it.",
    ],
    expectedBehaviour:
      "The dispatcher fans out to in-app first and then email, rendering a per-type template rather than wrapping the one-line message in a paragraph — for a long time not one caller supplied email HTML, so every type shipped the same bare body.",
    expectedUiState:
      "The email arrives in the inbox. Its From display name is spelled 'LetItRip' exactly. Its body is a real templated message rather than a single unstyled sentence. Its link opens the right page on the live site.",
    endResult:
      "The in-app notification and the email both exist. An in-app entry with no email, while email is enabled for that type, is the failure this case separates from a delivery problem.",
  },
  "checklist-content-discovery-notifications-notification-email-opt-out-respected": {
    roles: ["buyer"],
    startPage: "/user/settings",
    steps: [
      "Sign in as an account whose inbox you can open.",
      "Open /user/settings, click the 'Notifications' tab, and turn Email OFF for order updates.",
      "Click 'Save preferences' and reload to confirm it stayed off.",
      "Place an order that would produce an order-confirmed notification.",
      "Open /user/notifications and read the entries.",
      "Open the inbox and wait five minutes, checking Spam as well.",
      "Turn Email back on for order updates and save.",
    ],
    expectedBehaviour:
      "Turning a channel off suppresses that channel and nothing else — the in-app notification still appears. The suppression depends on a complete type-to-preference-key map: a type missing from it leaves the key undefined, the opt-out check never runs, and mail keeps arriving while the toggle reads as honoured.",
    expectedUiState:
      "The in-app entry is present. NO email arrives for it. An email arriving with the toggle off is the exact failure, and it is invisible from the settings page — the switch looks the same either way.",
    expectedData: { emailsReceived: 0 },
    endResult:
      "The preference is turned back on by the final step. Waiting the full five minutes matters: concluding after thirty seconds proves nothing about a queue.",
  },
  "checklist-content-discovery-notifications-notification-links-to-right-entity": {
    roles: ["buyer"],
    startPage: "/user/notifications",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/notifications.",
      "Click an order notification and read the address bar and the record shown.",
      "Go back and click a bid notification, reading the address bar and what is shown.",
      "Go back and click an offer notification, reading the address bar and what is shown.",
      "Note any that land on a 404.",
    ],
    expectedBehaviour:
      "The destination is resolved from the related record's type and id, so a caller cannot forget it. Bids, offers and reviews have no per-record page in any role, so those correctly resolve to their LIST — a real destination. Fabricating a per-record URL for them would 404, which is worse than a list.",
    expectedUiState:
      "An order notification opens that specific order. A bid notification opens the bids list. An offer notification opens the offers list. None lands on a 404 and none lands on the dashboard root with no relation to what was clicked.",
    expectedData: { notFoundCount: 0 },
    endResult:
      "Read-only; nothing persists. A list is a pass for bids and offers; a 404 is a fail for anything.",
  },
};
