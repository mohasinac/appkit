/*
 * WHY: Authored six-part procedures for the account-auth/profile-settings checklist page.
 * WHAT: 9 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 ONE CASE HERE CHANGES A PASSWORD. `password-change-reset-link` uses
 * karthik.new@gmail.com and nothing else does, deliberately: `seed-cli` sets
 * `TempPass123!` only when it CREATES an Auth record and never resets an existing
 * one, so a persona whose password this case changed would stay changed through
 * every future re-seed and every later case that signs in as them would fail for a
 * reason that is not a bug. Its last step puts the password back.
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
  "checklist-account-auth-profile-settings-avatar-upload": {
    roles: ["buyer"],
    startPage: "/user/profile",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/profile.",
      "Click 'Profile Details' to expand the section.",
      "Click 'Edit Profile'.",
      "Click 'Choose image'.",
      "Select the file public/test-media/sample-image.png (561 bytes, image/png) from the checkout of this repo.",
      "Click 'Save changes'.",
      "Reload the page.",
      "Click 'Profile Details' to expand the section.",
    ],
    inputs: { avatarFile: "public/test-media/sample-image.png", avatarMimeType: "image/png" },
    expectedBehaviour:
      "The file uploads through the signed-URL flow and is stored as the user's avatar. The stored URL is a /media/… proxy path, never a raw storage-bucket URL — the proxy is what applies the watermark and keeps the bucket private. After reload the avatar renders from that stored image rather than the initial-letter placeholder.",
    expectedUiState:
      "After reload, the Profile Details section shows the uploaded image where the round initial-letter placeholder ('R' for Rehan) previously was. The image renders — not a broken-image icon and not the grey placeholder glyph.",
    expectedData: { avatarUrlPrefix: "/media/" },
    endResult:
      "After reload the uploaded avatar is still displayed, and it also appears in the header account menu. The upload survived the reload.",
  },
  "checklist-account-auth-profile-settings-edit-profile": {
    roles: ["buyer"],
    startPage: "/user/profile",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/profile.",
      "Click 'Profile Details' to expand the section.",
      "Click 'Edit Profile'.",
      "Clear the 'Display name' field and type 'QA Profile account-auth-profile-settings-edit-profile'.",
      "Clear the 'Bio' field and type 'Tester bio update for QA.'.",
      "Click 'Save changes'.",
      "Reload the page.",
      "Click 'Profile Details' to expand the section.",
    ],
    inputs: {
      displayName: "QA Profile account-auth-profile-settings-edit-profile",
      bio: "Tester bio update for QA.",
    },
    expectedBehaviour:
      "The save succeeds and both fields are written to the user document. The header account menu picks up the new display name too, since it reads the same field.",
    expectedUiState:
      "After reload, Profile Details shows the display name 'QA Profile account-auth-profile-settings-edit-profile' and the bio 'Tester bio update for QA.'. Neither field has reverted to 'Rehan Sheikh' or to an empty bio.",
    expectedData: {
      displayName: "QA Profile account-auth-profile-settings-edit-profile",
      bio: "Tester bio update for QA.",
    },
    endResult:
      "After reload the edited display name and bio are still present. A save that 200s and reverts on reload is the failure this case exists to catch.",
  },
  "checklist-account-auth-profile-settings-hand-mode-persists-reload": {
    roles: ["buyer"],
    startPage: "/user/settings",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/settings.",
      "Click the 'Appearance' tab.",
      "Set the 'Left-hand mode' switch to on.",
      "Reload the page.",
      "Click the 'Appearance' tab.",
      "Sign out.",
      "Sign back in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/settings.",
      "Click the 'Appearance' tab.",
    ],
    inputs: { leftHandMode: true },
    expectedBehaviour:
      "Left-hand mode is stored on the user's record, not only in browser storage. It therefore survives both a reload and a full sign-out/sign-in cycle, which a localStorage-only preference would not.",
    expectedUiState:
      "After reload: the 'Left-hand mode' switch is still on, and the sidebar/drawers are still on the left. After sign-out and sign back in: still on. At no point does it silently reset to off.",
    expectedData: { leftHandMode: true },
    endResult:
      "After a sign-out and sign back in, Left-hand mode is still enabled. Reset it to off afterwards so later cases start from the default layout.",
  },
  "checklist-account-auth-profile-settings-hand-mode-toggle-exists": {
    roles: ["buyer"],
    startPage: "/user/settings",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/settings.",
      "Click the 'Appearance' tab.",
      "Set the 'Left-hand mode' switch to on.",
      "Open /user/profile.",
      "Scroll to the 'Left-hand mode' toggle below the 'Profile Details' section.",
      "Set the same switch to off.",
    ],
    inputs: { leftHandMode: false },
    expectedBehaviour:
      "The toggle exists in both places and each writes the same single preference. Switching it takes effect immediately — the drawers and floating buttons move side without a full page load.",
    expectedUiState:
      "On the /user/settings Appearance tab a 'Left-hand mode' switch sits under the Layout heading. On /user/profile the same switch appears with the description 'Move drawers, sidebars, and floating buttons to the left side of the screen'. Flipping either one moves the sidebar immediately; the browser does not navigate or re-render the whole page.",
    endResult:
      "The switch is present in both places and the page did not reload when it was flipped. The preference is left off, which is the default.",
  },
  "checklist-account-auth-profile-settings-notification-prefs": {
    roles: ["buyer"],
    startPage: "/user/settings",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/settings.",
      "Click the 'Notifications' tab.",
      "Set the 'Email' switch to off.",
      "Set the 'Promotions' switch to off.",
      "Click 'Save preferences'.",
      "Reload the page.",
      "Click the 'Notifications' tab.",
    ],
    inputs: { emailNotifications: false, promotions: false },
    expectedBehaviour:
      "Both changed switches are persisted, and the ones that were not touched keep their prior values. A save that writes the whole preference object from a partly-populated form — resetting untouched switches to their defaults — is the failure to watch for.",
    expectedUiState:
      "After reload the Notifications tab shows 'Email' off and 'Promotions' off. Every other switch is exactly as it was before the edit, not reset.",
    expectedData: { emailNotifications: false, promotions: false },
    endResult:
      "After reload the two switches are still off. Turn them back on afterwards so later notification cases are not silently suppressed.",
  },
  "checklist-account-auth-profile-settings-own-public-profile-quick-links": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user.",
      "Click the 'View public profile' link in the dashboard header.",
      "Note the URL, then go back to /user.",
      "Click the 'My Public Profile' tile in the quick-links grid.",
      "Note the URL, then go back.",
      "Open /user/profile.",
      "Click 'Profile Details' to expand the section.",
      "Click 'View Public Profile', beside 'Manage Addresses'.",
      "Note the URL.",
      "Click 'Edit Profile', expand 'Visibility', set profile visibility to Private and click 'Save changes'.",
      "Open /profile/user-yugi-muto.",
    ],
    inputs: { profileVisibility: "Private" },
    expectedBehaviour:
      "All three entry points — dashboard header, quick-links tile, and the /user/profile link next to 'Manage Addresses' — resolve to the SAME public profile URL, /profile/user-yugi-muto. None of them lands on the edit-profile page. With visibility set to Private the page still loads for its owner, even though another signed-in user would get a 404.",
    expectedUiState:
      "Each of the three clicks puts /profile/user-yugi-muto in the address bar and renders the public profile — a display name, avatar and public tabs — with no 'Display name' input, no 'Save changes' button, and no /user/profile chrome. After switching to Private, /profile/user-yugi-muto still renders for the owner rather than a 'Not found' page.",
    expectedData: { publicProfileUrl: "/profile/user-yugi-muto" },
    endResult:
      "All three links reach the same page. Set profile visibility back to Public afterwards, since other cases read this profile as another user.",
  },
  "checklist-account-auth-profile-settings-password-change-reset-link": {
    roles: ["buyer"],
    startPage: "/user/settings",
    steps: [
      "Sign in as karthik.new@gmail.com / TempPass123!.",
      "Open /user/settings.",
      "Expand the 'Change Password' section.",
      "Read the section without submitting anything, looking for a 'New password' or 'Confirm password' field.",
      "Click 'Update Password'.",
      "Open the inbox for karthik.new@gmail.com.",
      "Open the password-reset email from LetItRip and click the reset link.",
      "Type QaReset456! as the new password on the reset page and submit it.",
      "Sign out of LetItRip.",
      "Sign in as karthik.new@gmail.com / QaReset456!.",
      "Open /user/settings, expand 'Change Password', click 'Update Password' again, open the new email, follow the link and set the password back to TempPass123!.",
    ],
    inputs: { email: "karthik.new@gmail.com", newPassword: "QaReset456!", restoredPassword: "TempPass123!" },
    expectedBehaviour:
      "'Update Password' sends a Firebase password-reset email to the account's own address and changes nothing by itself. Identity is proved by reaching that inbox, so a stolen session cookie alone cannot change the password. The new password only becomes active once the emailed link is completed.",
    expectedUiState:
      "The 'Change Password' section offers no new-password field at all — only a button that sends the link. After clicking it a confirmation names karthik.new@gmail.com. The email arrives; its link opens the reset page; after submitting, signing in with QaReset456! succeeds and lands on the account dashboard, while the old password is refused.",
    expectedData: { passwordFieldsOnSettingsPage: 0 },
    endResult:
      "The password is back at TempPass123! by the last step. That restore is not optional: the seeder never resets an existing password, so skipping it leaves this account permanently unusable by every other case.",
  },
  "checklist-account-auth-profile-settings-public-profile-toggle": {
    roles: ["buyer"],
    startPage: "/user/profile",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/profile.",
      "Click 'Profile Details' to expand the section.",
      "Click 'Edit Profile'.",
      "Click 'Visibility' to expand it.",
      "Set profile visibility to Private.",
      "Click 'Save changes'.",
      "Reload the page.",
      "Click 'Profile Details' to expand the section.",
      "Click 'Edit Profile', expand 'Visibility', set profile visibility back to Public and click 'Save changes'.",
    ],
    inputs: { profileVisibility: "Private" },
    expectedBehaviour:
      "The visibility value is saved without a full page load, and the saved value is what the profile read path uses — not the value the form happened to be showing.",
    expectedUiState:
      "After reload, the 'Profile visibility' line in Profile Details reads 'Private'. It has not reverted to 'Public', and the page did not navigate away when Save was clicked.",
    expectedData: { profileVisibility: "Private" },
    endResult:
      "The Private setting survived a reload. Visibility is returned to Public in the final step, because other cases open this profile as a different user.",
  },
  "checklist-account-auth-profile-settings-user-pages-signed-out-redirect": {
    roles: ["guest"],
    startPage: "/user/profile",
    steps: [
      "Open a private/incognito browser window with no active session.",
      "Open /user/profile and watch the page for 5 seconds.",
      "Open /user/orders and watch the page for 5 seconds.",
      "Open /user/bids and watch the page for 5 seconds.",
    ],
    expectedBehaviour:
      "Each route serves a prerendered static shell carrying no session data, then hydrates, finds no user, and redirects to /auth/login. Because the shell is static it is the SAME bytes for every visitor, so it cannot contain anyone's uid, email, display name, order or store id.",
    expectedUiState:
      "For each URL: site chrome plus a brief loading state, then the address bar becomes /auth/login. At no point does a real name, email address, order number or store name appear. No spinner is still turning after 5 seconds. Record in the comment whether the flash before the redirect feels acceptable — that tradeoff is what this case is evaluating.",
    expectedData: { redirectTarget: "/auth/login" },
    endResult:
      "All three navigations end on /auth/login with no account data shown. Any trace of a real account is a serious leak and fails this case immediately, separately from the spinner question.",
  },
};
