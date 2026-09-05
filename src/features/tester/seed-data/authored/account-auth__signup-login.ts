/*
 * WHY: Authored six-part procedures for the account-auth/signup-login checklist page.
 * WHAT: 15 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 TWO CASES HERE CHANGE A PASSWORD, and each owns a persona nothing else uses —
 * `password-reset` has neha.op@gmail.com, `auth-email-links-single-use` has
 * divya.funko@gmail.com. `seed-cli` sets `TempPass123!` only when it CREATES an
 * Auth record and never resets an existing one, so a changed password outlives
 * every future re-seed. Both cases restore it in their last step. They used to
 * point at vivaan.kapoor@gmail.com, which four other authored pages sign in as.
 *
 * 🛑 THE GOOGLE CASES NEED REAL GOOGLE CREDENTIALS and cannot be seeded — a
 * provider link lives in Firebase Auth, not Firestore. They are NOT flagged
 * `needsReview`: their intent is perfectly clear, and a case that cannot be
 * reached is a `null` verdict at run time, not an authoring doubt. Confusing the
 * two hides the unwritten cases inside the unanswerable ones.
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
  "checklist-account-auth-signup-login-auth-email-links-single-use": {
    roles: ["guest"],
    startPage: "/auth/forgot-password",
    steps: [
      "Open /auth/forgot-password.",
      "Type divya.funko@gmail.com in the 'Email address' field.",
      "Click 'Send reset link'.",
      "Open the inbox for divya.funko@gmail.com and copy the reset link URL out of the email before opening it.",
      "Open the copied URL, type QaSingleUse789! as the new password, confirm it, and submit.",
      "Open the same copied URL a second time.",
      "Register a fresh account at /auth/register using an inbox you can open, then open its verification link once, and then open that same link a second time.",
      "Open /auth/forgot-password, request a link for divya.funko@gmail.com again, and use it to set the password back to TempPass123!.",
    ],
    inputs: {
      email: "divya.funko@gmail.com",
      newPassword: "QaSingleUse789!",
      restoredPassword: "TempPass123!",
    },
    expectedBehaviour:
      "The action code in each link is one-time. The second open is refused by Firebase and the site turns that refusal into readable English with a way to get a fresh link. No second password change is applied and no second verification is recorded.",
    expectedUiState:
      "On the second open of the reset link: a message in the shape of 'This link has already been used or has expired', plus a control to request a new one. Not a blank page, not a raw 'auth/invalid-action-code', not a stack trace, and not a working password form. The second open of the verification link reads the same way.",
    expectedData: { passwordChangesApplied: 1 },
    endResult:
      "Account state after the second click is identical to after the first. divya.funko@gmail.com is back on TempPass123! by the final step — skipping that restore leaves the account unusable by every later case, since the seeder never resets an existing password.",
  },
  "checklist-account-auth-signup-login-auth-emails-sender-identity-and-inbox": {
    roles: ["guest"],
    startPage: "/auth/register",
    steps: [
      "Open /auth/register.",
      "Type QA Sender Test in 'Full name', a real Gmail address you can open in 'Email address', TestPass123! in both password fields, tick the terms checkbox, and click 'Create account'.",
      "Open that Gmail inbox, checking the Spam and Promotions tabs as well, and find the verification email.",
      "Read its From name and From address, and open the link inside it.",
      "Open /auth/forgot-password, type the same Gmail address, and click 'Send reset link'.",
      "Open the Gmail inbox again, find the password-reset email, and read its From name and From address.",
      "Repeat both flows with a non-Gmail address if one is available, and check that inbox the same way.",
    ],
    inputs: { fullName: "QA Sender Test", password: "TestPass123!" },
    expectedBehaviour:
      "Both emails are delivered to the inbox within a few minutes, from the site's own configured sender. The links inside resolve to the live site and complete their flows rather than 404ing or landing on a Firebase-hosted page the site does not control.",
    expectedUiState:
      "The From display name is spelled 'LetItRip' exactly — not 'Letitrip', not 'LetiTrip', not 'letitrip.in'. Both messages sit in the Primary inbox, not Spam or Promotions. Clicking through opens letitrip.in and the flow finishes.",
    expectedData: { senderDisplayName: "LetItRip" },
    endResult:
      "Verification marks the new account verified and the reset link changes its password. If Gmail and non-Gmail were both tried, note in the comment whether delivery differed — that difference is the point of testing two providers.",
  },
  "checklist-account-auth-signup-login-email-signup": {
    roles: ["guest"],
    startPage: "/auth/register",
    steps: [
      "Open /auth/register.",
      "Type QA Signup Tester in the 'Full name' field.",
      "Type qa-signup-1@mailnull.com in the 'Email address' field — if that address already has an account from a previous run, increment the number and use qa-signup-2@mailnull.com, and so on.",
      "Type TestPass123! in the 'Password' field.",
      "Type TestPass123! in the 'Confirm password' field.",
      "Tick the 'I accept the terms' checkbox.",
      "Click 'Create account'.",
      "Open /user.",
    ],
    inputs: {
      fullName: "QA Signup Tester",
      email: "qa-signup-1@mailnull.com",
      password: "TestPass123!",
    },
    expectedBehaviour:
      "A Firebase Auth record and a matching Firestore user document are created, keyed on the Auth uid rather than on a generated user-* slug. A verification email is dispatched. The browser is signed in and moved off /auth/register.",
    expectedUiState:
      "The address bar leaves /auth/register for / or /user, and the header shows a signed-in avatar with no 'Sign in' link. Submitting the same address a second time is refused with a readable 'email already in use' message, not a duplicate account.",
    expectedData: { displayName: "QA Signup Tester" },
    endResult:
      "Reloading /user shows 'QA Signup Tester' and the address used. The account persists — this case creates a real row that a later teardown does not remove, which is why the address is numbered rather than fixed.",
  },
  "checklist-account-auth-signup-login-email-verify": {
    roles: ["guest"],
    startPage: "/auth/register",
    steps: [
      "Open /auth/register and create an account with an inbox you can open, using TestPass123! as the password.",
      "Open the inbox and find the verification email from Firebase.",
      "Open the verification link in the email.",
      "Open /auth/login and sign in with that account.",
      "Open /user.",
    ],
    inputs: { password: "TestPass123!" },
    expectedBehaviour:
      "Following the link flips the account's emailVerified flag in Firebase Auth, and the site reads that flag rather than a separate copy of its own. The verified state survives sign-out and sign-in.",
    expectedUiState:
      "The link lands on a confirmation page. After signing in, /user carries no 'Your email is not verified' banner and no prompt to resend the verification email.",
    expectedData: { emailVerified: true },
    endResult:
      "Reloading /user still shows no verification warning. An account that reads as unverified after a successful link click is the failure this case catches.",
  },
  "checklist-account-auth-signup-login-forgot-password-no-account-enumeration": {
    roles: ["guest"],
    startPage: "/auth/forgot-password",
    steps: [
      "Open /auth/forgot-password.",
      "Type nobody-here-12345@example.com in the 'Email address' field.",
      "Click 'Send reset link'.",
      "Read the resulting message and note its exact wording.",
      "Reload /auth/forgot-password, type rehan.sheikh@gmail.com, and click 'Send reset link'.",
      "Read that message and compare the two word for word.",
    ],
    inputs: { unknownEmail: "nobody-here-12345@example.com", knownEmail: "rehan.sheikh@gmail.com" },
    expectedBehaviour:
      "The browser calls Firebase directly, so it is the client that must swallow auth/user-not-found. Both submissions produce the identical generic response; nothing in the message, the timing or an error toast distinguishes an address that has an account from one that does not.",
    expectedUiState:
      "Both attempts show the same text — 'If an account exists for that email, a reset link is on its way.' or equivalent. The unknown address produces no red toast, no 'user not found', no field-level error, and no different button state.",
    endResult:
      "No email arrives for nobody-here-12345@example.com. The two on-screen responses were indistinguishable, which is the whole point — a difference of any kind is an account-enumeration leak.",
  },
  "checklist-account-auth-signup-login-google-link-confirmation-shown": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as an account that already has Google linked — or link one first through /user/settings > 'Linked Accounts' > 'Connect Google'.",
      "Open /user.",
      "Read the alert area near the top of the dashboard.",
      "Reload the page.",
    ],
    expectedBehaviour:
      "The dashboard handles the linked case explicitly, not just by omitting the unlinked prompt. Before this was fixed the whole alert block disappeared once linked, so a user had no confirmation on /user at all — only Settings showed a Connected badge.",
    expectedUiState:
      "A green confirmation alert reading 'Google account connected', carrying a Connected badge and the linked Google email address. The blue 'Connect your Google account' prompt is absent. An empty space where the alert used to be is a fail, not a pass.",
    endResult:
      "After reload the green confirmation is still there and the blue prompt has not returned. Needs a Google account to reach — answer null with that reason rather than guessing if none is available.",
  },
  "checklist-account-auth-signup-login-google-link-conflict-rejected": {
    roles: ["buyer"],
    startPage: "/user/settings",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open /user/settings, expand 'Linked Accounts', click 'Connect Google', and complete the popup with a Google account G.",
      "Sign out.",
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /user/settings.",
      "Expand the 'Linked Accounts' accordion.",
      "Click 'Connect Google'.",
      "Select the same Google account G in the popup and complete the flow.",
      "Reload /user/settings and expand 'Linked Accounts'.",
    ],
    inputs: { accountA: "vivaan.kapoor@gmail.com", accountB: "rehan.sheikh@gmail.com" },
    expectedBehaviour:
      "The second link is refused because G already belongs to rehan.sheikh@gmail.com. Neither account is modified: the two are not merged, and G's email is not moved from one to the other. A silent merge here would join two people's orders, addresses and wishlists.",
    expectedUiState:
      "A readable error in the shape of 'This Google account is already linked to another account'. vivaan.kapoor@gmail.com still shows a 'Connect Google' button, not a Connected badge.",
    endResult:
      "After reload vivaan.kapoor@gmail.com has no Google link and rehan.sheikh@gmail.com still has G. Unlink G from rehan.sheikh@gmail.com afterwards. Needs a real Google account — answer null if none is available.",
  },
  "checklist-account-auth-signup-login-google-link-different-email": {
    roles: ["buyer"],
    startPage: "/user/settings",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /user/settings.",
      "Expand the 'Linked Accounts' accordion.",
      "Click 'Connect Google'.",
      "Select a Google account whose email is NOT vivaan.kapoor@gmail.com, and complete the popup.",
      "Reload /user/settings and expand 'Linked Accounts'.",
      "Sign out, open /auth/login, and click 'Sign in with Google' choosing that same Google account.",
    ],
    inputs: { primaryEmail: "vivaan.kapoor@gmail.com" },
    expectedBehaviour:
      "Linking a differently-addressed Google account requires this explicit button press — it never happens as a side effect of merely signing in with Google. One account now answers to two emails; a second account is not created. The primary login email is unchanged.",
    expectedUiState:
      "'Linked Accounts' shows Google as Connected and displays the OTHER email. The account's own email elsewhere in Settings still reads vivaan.kapoor@gmail.com. Signing in with that Google account afterwards lands in this same account, with its existing orders and wishlist.",
    expectedData: { primaryEmail: "vivaan.kapoor@gmail.com" },
    endResult:
      "After reload the link persists and the primary email is still vivaan.kapoor@gmail.com. Unlink afterwards. Needs a second Google account — answer null if none is available.",
  },
  "checklist-account-auth-signup-login-google-link-existing": {
    roles: ["guest"],
    startPage: "/auth/register",
    steps: [
      "Open /auth/register.",
      "Type QA Google Merge in 'Full name', the email address of a Google account you control in 'Email address', TestPass123! in both password fields, tick the terms checkbox, and click 'Create account'.",
      "Add any product to the wishlist so the account has something identifying in it.",
      "Sign out.",
      "Open /auth/login.",
      "Click 'Sign in with Google'.",
      "Select that same Google account in the popup and complete it.",
      "Open /wishlist.",
      "Open /user/settings and expand 'Linked Accounts'.",
    ],
    inputs: { fullName: "QA Google Merge", password: "TestPass123!" },
    expectedBehaviour:
      "Because the Google email matches an existing password account exactly, the sign-in resolves to that same account automatically — no duplicate, and no explicit linking step asked of the user. Google is recorded as connected as a side effect.",
    expectedUiState:
      "No 'create account' step appears after the popup. The header shows 'QA Google Merge', and /wishlist still holds the item added before signing out — the proof it is the same account and not a fresh one wearing the same email. 'Linked Accounts' shows Google Connected.",
    expectedData: { displayName: "QA Google Merge" },
    endResult:
      "One account exists for that email, not two, and it kept its wishlist. Needs a Google account whose address you can also register with — answer null if none is available.",
  },
  "checklist-account-auth-signup-login-google-oauth": {
    roles: ["guest"],
    startPage: "/auth/login",
    steps: [
      "Open /auth/login.",
      "Click 'Sign in with Google'.",
      "Complete the Google popup by choosing an account.",
      "Wait for the popup to close and the site to respond.",
      "Open /user.",
    ],
    expectedBehaviour:
      "The popup opens, Google authenticates, the popup closes, and the site establishes its own session cookie from the returned credential. An account is created if the email is new, or signed into if it already exists.",
    expectedUiState:
      "The address bar leaves /auth/login. The header shows a signed-in avatar and no 'Sign in' link. No error toast, and no popup left hanging open after authentication.",
    endResult:
      "Reloading /user keeps the session. Needs a Google account — answer null with that reason if none is available.",
  },
  "checklist-account-auth-signup-login-google-popup-blocked-fallback": {
    roles: ["guest"],
    startPage: "/auth/login",
    steps: [
      "Set the browser to block popups for letitrip.in.",
      "Open /auth/login.",
      "Click 'Sign in with Google'.",
      "Leave the blocked-popup notification alone without unblocking it.",
      "Wait up to 30 seconds and watch the page.",
      "Open /user.",
    ],
    expectedBehaviour:
      "The site notices the popup never opened and falls back — either to a full-page redirect flow, or to the RTDB signal plus postMessage path — and completes sign-in without asking the user to change browser settings.",
    expectedUiState:
      "Within 30 seconds the page reaches a signed-in state: avatar in the header, no 'Sign in' link. What must NOT happen is a button stuck in a loading state forever, or an error toast telling the user to allow popups and nothing else.",
    endResult:
      "Reloading /user keeps the session. Needs a Google account plus popup blocking — answer null if either is unavailable.",
  },
  "checklist-account-auth-signup-login-login": {
    roles: ["guest"],
    startPage: "/auth/login",
    steps: [
      "Open /auth/login.",
      "Type vivaan.kapoor@gmail.com in the 'Email address' field.",
      "Type TempPass123! in the 'Password' field.",
      "Click 'Sign in'.",
      "Open /user.",
    ],
    inputs: { email: "vivaan.kapoor@gmail.com", password: "TempPass123!" },
    expectedBehaviour:
      "Firebase validates the credential, the site exchanges it for its own __session cookie, and the browser is moved off /auth/login. A wrong password is refused with a readable message rather than a raw Firebase code.",
    expectedUiState:
      "The address bar leaves /auth/login for / or /user, and the header shows the avatar for Vivaan Kapoor. No error toast.",
    expectedData: { signedInUid: "user-seto-kaiba" },
    endResult:
      "Reloading /user keeps the session as user-seto-kaiba. Every seeded account uses TempPass123!, so no separate credential lookup is needed.",
  },
  "checklist-account-auth-signup-login-logout": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as vivaan.kapoor@gmail.com / TempPass123!.",
      "Open /user.",
      "Click 'Log out' in the sidebar.",
      "Open /user again.",
    ],
    expectedBehaviour:
      "Both halves of the session end: the server __session cookie is cleared and the Firebase client session is revoked. Clearing only one leaves the browser able to re-mint a session on the next request, which is what makes the second navigation the real check.",
    expectedUiState:
      "After Log out the page redirects and the header shows the signed-out state. Opening /user afterwards redirects to /auth/login rather than rendering the dashboard, even briefly with real data in it.",
    expectedData: { redirectTarget: "/auth/login" },
    endResult:
      "Navigating to /user lands on /auth/login and no data for Vivaan Kapoor is rendered at any point. A back-button press does not restore the dashboard.",
  },
  "checklist-account-auth-signup-login-password-reset": {
    roles: ["guest"],
    startPage: "/auth/login",
    steps: [
      "Open /auth/login.",
      "Click 'Forgot password?'.",
      "Type neha.op@gmail.com in the 'Email address' field.",
      "Click 'Send reset link'.",
      "Open the inbox for neha.op@gmail.com and open the reset link.",
      "Type QaReset321! as the new password, confirm it, and submit.",
      "Open /auth/login, type neha.op@gmail.com and TempPass123!, and click 'Sign in'.",
      "Type neha.op@gmail.com and QaReset321! instead, and click 'Sign in'.",
      "Request another reset link for neha.op@gmail.com and use it to set the password back to TempPass123!.",
    ],
    inputs: {
      email: "neha.op@gmail.com",
      newPassword: "QaReset321!",
      restoredPassword: "TempPass123!",
    },
    expectedBehaviour:
      "The reset email arrives, its link opens a set-password form, and the submitted password replaces the old one in Firebase Auth. The old password stops working at that moment — a reset that leaves both passwords valid is the failure worth catching.",
    expectedUiState:
      "'Send reset link' produces the generic 'If an account exists for that email…' message. Signing in with TempPass123! after the reset is refused with a readable error; signing in with QaReset321! succeeds and lands on the dashboard.",
    endResult:
      "The password is back at TempPass123! by the final step. That restore is mandatory: the seeder never resets an existing password, so skipping it leaves this account permanently signed out of every later case.",
  },
  "checklist-account-auth-signup-login-signup-verification-email-arrives": {
    roles: ["guest"],
    startPage: "/auth/register",
    steps: [
      "Open /auth/register.",
      "Type QA Verify Tester in the 'Full name' field.",
      "Type a real inbox address you can open in the 'Email address' field.",
      "Type TestPass123! in the 'Password' field.",
      "Type TestPass123! in the 'Confirm password' field.",
      "Tick the 'I accept the terms' checkbox.",
      "Click 'Create account'.",
      "Open that inbox, checking Spam as well, and wait up to five minutes.",
      "Open the verification link in the email.",
    ],
    inputs: { fullName: "QA Verify Tester", password: "TestPass123!" },
    expectedBehaviour:
      "Firebase's client SDK sends the verification mail directly, so it carries Firebase's own template and sender rather than the branded LetItRip one. The link resolves to the live site and marks the account verified. The on-screen 'check your email' message is not the thing being tested — the arrival is.",
    expectedUiState:
      "An email is present in the inbox within a few minutes. It looks like Firebase's default template, and that difference from the branded Resend emails is expected here, not a defect. Its link opens letitrip.in and reports success.",
    expectedData: { emailVerified: true },
    endResult:
      "Signing in and reloading /user shows no 'email not verified' warning. A 'check your email' screen with no email ever arriving is exactly the failure this case exists to separate from success.",
  },
};
