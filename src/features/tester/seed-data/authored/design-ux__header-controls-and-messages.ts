/*
 * WHY: Authored six-part procedures for the design-ux/header-controls-and-messages page.
 * WHAT: 6 case(s), keyed by full checklist id.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

/*
 * Two 2026-10-15 changes to the header's right-hand control cluster.
 *
 * 🛑 THE HELP ICON AND THE TOUR WERE ONE CONTROL, not two. `tourBtn` rendered
 * `<Icon name="help">` under `aria-label="Start product tour"`, so a case that
 * asks for "the help icon" and a case that asks for "the tour button" would be
 * the same case written twice. Removing it also removed the only caller of
 * `startTour` — which is why `tour-does-not-autostart` exists: the way this
 * change can be incomplete is a tour that still fires from somewhere else.
 *
 * 🛑 MESSAGES WAS NEVER MISSING CODE. The page, the API, the repository and the
 * header slot were all present; the slot is gated on
 * `siteSettings.chat.enabled`, which was ABSENT in Firestore. And the gate
 * renders NOTHING when off — not a disabled icon — so there was no visible
 * difference between "chat is off" and "chat is broken". That is why the guest
 * and the mobile-row cases are both here: the control's visibility rules are
 * the thing most likely to be wrong now that it can appear at all.
 */

import type { AuthoredCase } from "./_types";

export const authored: Record<string, AuthoredCase> = {
  "checklist-design-ux-header-controls-and-messages-no-help-or-tour-icon": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products at a maximised window.",
      "Read every icon in the top header row, right of the logo.",
      "Repeat at 1024px, 768px and 320px.",
    ],
    expectedBehaviour:
      "The tour control was removed outright, along with the prop that fed it, so there is no width at which it can reappear.",
    expectedUiState:
      "No '?' icon anywhere in the header at any of the four widths. The right-hand cluster is search, Today's Deals (640px and up), theme toggle and hamburger — plus the signed-in icons at 1024px and up. The removed control previously sat between the theme toggle and the hamburger.",
    endResult:
      "Nothing persists; this is a pure chrome check. The hamburger must still be present and fully visible at 320px.",
  },

  "checklist-design-ux-header-controls-and-messages-tour-does-not-autostart": {
    roles: ["guest", "buyer"],
    startPage: "/",
    steps: [
      "Signed out, load /, then /products, then a product detail page.",
      "Wait a few seconds on each without clicking anything.",
      "Sign in and repeat the same three pages.",
    ],
    expectedBehaviour:
      "Removing the header button removed the only call to `startTour`. Nothing else should be able to begin a tour, on any route or for any role.",
    expectedUiState:
      "No tour popover, spotlight, highlight ring or step counter appears at any point, signed in or out. A tour appearing means something still calls startTour and the removal is incomplete — record which page it fired on.",
    endResult:
      "No tour state is written. Reloading any of the pages produces no tour either.",
  },

  "checklist-design-ux-header-controls-and-messages-messages-icon-visible-when-signed-in": {
    roles: ["buyer"],
    startPage: "/messages",
    steps: [
      "Sign in as any buyer.",
      "At a window 1024px or wider, look at the header beside the notification bell.",
      "Click the messages icon.",
    ],
    expectedBehaviour:
      "The header renders the messages control only when `siteSettings.chat.enabled` is true — and renders nothing at all when it is not, rather than a disabled icon. The flag is now on, so the control should exist and route to the inbox.",
    expectedUiState:
      "A messages/inbox icon is present beside the notification bell and carries an unread badge when there are unread messages. Clicking it navigates to /messages, which loads — not a 404 and not /unauthorized.",
    endResult:
      "Navigation only; nothing is written. Going back returns to the previous page with the icon still present.",
  },

  "checklist-design-ux-header-controls-and-messages-messages-icon-on-mobile-row": {
    roles: ["buyer"],
    startPage: "/messages",
    steps: [
      "Still signed in, narrow the window to 320px.",
      "Look at BOTH header rows — the main row and the secondary row beneath it.",
      "Tap the messages icon.",
    ],
    expectedBehaviour:
      "Several signed-in icons are hidden from the main row below 1024px and carried on a secondary row instead, so the control moves rather than disappearing.",
    expectedUiState:
      "The messages icon is present and fully visible in the secondary header row at 320px — not clipped at the edge and not absent. Tapping it opens /messages.",
    endResult:
      "Nothing persists. Widening back past 1024px moves the icon to the main row again.",
  },

  "checklist-design-ux-header-controls-and-messages-messages-absent-for-guests": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Sign out completely.",
      "Reload /products.",
      "Inspect both header rows at a desktop width and again at 320px.",
    ],
    expectedBehaviour:
      "A message inbox is per-user, so enabling the feature site-wide must not expose the control to visitors who have no inbox.",
    expectedUiState:
      "No messages icon in either header row at either width. The guest header shows search, deals, theme, hamburger and the sign-in affordances only.",
    endResult:
      "No state. Signing back in brings the icon back, which also confirms the gate is on the session and not on the page.",
  },

  "checklist-design-ux-header-controls-and-messages-messages-inbox-loads": {
    roles: ["buyer"],
    startPage: "/messages",
    steps: [
      "Signed in, navigate directly to /messages.",
      "Wait for the page to settle.",
      "Reload once.",
    ],
    expectedBehaviour:
      "The messaging feature has been dormant behind a disabled flag, so this is the first real exercise of the page. It must handle having no conversations as a normal state.",
    expectedUiState:
      "The inbox shell renders with either a list of conversations or an explicit empty state saying there are none. It must NOT be a crash, an error boundary, a redirect to /unauthorized, or a spinner that never resolves. Note the exact empty-state wording so a later run can tell 'empty' from 'failed to load'.",
    endResult:
      "Reloading shows the same state. Visiting /messages signed out should send you to sign-in rather than rendering an empty inbox.",
  },
};
