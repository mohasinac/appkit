/*
 * WHY: Authored six-part procedures for the admin/bans-and-trust page.
 * WHAT: 12 case(s), keyed by full checklist id.
 *
 * 🛑 THESE CASES BAN REAL SEEDED ACCOUNTS AND EVERY ONE RESTORES WHAT IT CHANGED.
 * `users` is in the PRESERVE tier — a tester run never re-seeds it — so a ban left
 * in place outlives every reseed and quietly breaks whichever other checklist page
 * signs in as that persona. Each procedure names its restore step for that reason,
 * and each uses a persona reserved for this page rather than one another page
 * depends on.
 *
 * The unban case is the load-bearing one. Session role fields refresh only
 * periodically, so a guard reading the cached snapshot keeps blocking a user who
 * was unbanned a moment ago — the fix is to re-read on navigation, not to widen
 * the refresh interval.
 *
 * 🛑 A SOFT BAN DOES NOT BLOCK SIGN-IN (corrected 2026-09-29). Three cases and
 * one catalogue label said it did. It does not, and the code is unambiguous:
 *
 *   soft ban   POST /api/admin/users/{uid}/soft-ban appends to `user.softBans[]`
 *              as `{ action, reason, bannedBy, bannedAt, expiresAt }`, where
 *              `action` is one of EIGHT: write_reviews, write_blog_comments,
 *              join_events, place_bids, create_listings, send_messages,
 *              create_support_tickets, report_scammers. It is a PER-ACTION
 *              restriction. Sign-in is untouched.
 *   lift       DELETE /api/admin/users/{uid}/soft-ban/{action} — one action at a
 *              time. `/unban` does NOT clear softBans.
 *   hard ban   POST …/hard-ban sets `disabled: true` on the Auth record and
 *              enqueues the 8-stage `hardBanCascade` job. `/api/auth/login`
 *              refuses on `userRecord.disabled` alone — so THIS is the ban that
 *              blocks sign-in.
 *   unban      POST …/unban sets `disabled: false` on Auth and the user doc and
 *              clears the hard-ban fields only.
 *
 * So the sign-in case now exercises a HARD ban for the sign-in half and a soft
 * ban for the restriction half, and says plainly that a soft-banned account
 * signing in normally is CORRECT — otherwise the first tester to run it reports
 * a defect that is really the case being wrong.
 *
 * `reason` is `z.string().min(1)`, so a ONE-CHARACTER reason is accepted. The
 * requires-reason case hedged on "if a minimum length applies"; it now states
 * the contract so a one-character reason being accepted is not written up.
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
  "checklist-admin-bans-and-trust-soft-ban-blocks-signin": {
    roles: ["admin", "buyer"],
    startPage: "/admin/users",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/users and find the account rohit.collect@gmail.com.",
      "Soft-ban it from place_bids with the reason 'QA ban probe — checklist case, will be lifted.'",
      "Sign out and sign in as rohit.collect@gmail.com / TempPass123!. This must SUCCEED — a soft ban restricts one action, it does not block sign-in.",
      "Open any live auction and try to place a bid. Read the refusal and whether it quotes the reason the admin typed.",
      "Sign back in as the admin and lift that soft ban.",
      "Now HARD-ban the same account with the reason 'QA sign-in block probe — checklist case, will be lifted.'",
      "Sign out and try to sign in as rohit.collect@gmail.com / TempPass123!. Read exactly what is shown.",
      "Sign back in as the admin and unban the account, then confirm it signs in again.",
    ],
    inputs: {
      reason: "QA ban probe — checklist case, will be lifted.",
      softBanAction: "place_bids",
      hardBanReason: "QA sign-in block probe — checklist case, will be lifted.",
    },
    expectedBehaviour:
      "The two bans do different things and both must say why. A soft ban blocks ONE action and leaves sign-in alone; a hard ban disables the account outright and sign-in is refused. A refusal with a generic credentials error is worse than a block — the user believes their password is wrong and resets it, repeatedly, against an account that would refuse them either way.",
    expectedUiState:
      "The soft-banned account SIGNS IN NORMALLY — that is correct and is not a finding — and is refused only at the bid, with the admin's reason quoted. The hard-banned account is refused at sign-in with a message naming the disabled account, not an invalid-credentials error. Record the exact wording of both refusals.",
    expectedData: { softBannedCanSignIn: true, hardBannedCanSignIn: false },
    endResult:
      "The soft ban is lifted, the hard ban is lifted, and the account signs in and can bid again. 🛑 Both must be lifted separately — /unban clears the hard-ban fields only and leaves softBans untouched.",
  },
  "checklist-admin-bans-and-trust-soft-ban-requires-reason": {
    roles: ["admin"],
    startPage: "/admin/users",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/users and start a soft ban on the account rohit.collect@gmail.com.",
      "Leave the reason field empty and submit.",
      "Read what happens and WHERE the error appears — on the field, or as a banner.",
      "Type a single character as the reason and submit.",
      "Read whether that is accepted — the schema is a minimum of one character, so it should be.",
      "If it was accepted, lift that soft ban immediately.",
    ],
    inputs: { minimumReasonLength: 1 },
    expectedBehaviour:
      "A ban carries a reason, enforced rather than requested. The reason is what the banned user reads and what the audit log records — a ban with none leaves both the user and the next admin with an action and no explanation.",
    expectedUiState:
      "The empty submission is refused with an inline error ON THE REASON FIELD, not a banner. A one-character reason IS accepted — the contract is `z.string().min(1)` — so do not record that as a finding; record instead whether a reason that short is useful to the person who reads it. What would be a finding is an empty reason being accepted, or the refusal appearing only as a banner with nothing marked on the field.",
    expectedData: { emptyReasonRejected: true, oneCharReasonAccepted: true },
    endResult: "Nobody is left banned — if the one-character ban applied, it is lifted.",
  },
  "checklist-admin-bans-and-trust-unban-restores-access": {
    roles: ["admin", "buyer"],
    startPage: "/admin/users",
    steps: [
      SIGN_IN_ADMIN,
      "In a second browser, sign in as rohit.collect@gmail.com / TempPass123! and leave that session open on a signed-in page.",
      "As the admin, soft-ban that account from place_bids with the reason 'QA unban probe — checklist case.'",
      "In the second browser, WITHOUT signing out or reloading, open a live auction and confirm bidding is refused.",
      "As the admin, lift that soft ban.",
      "In the second browser, WITHOUT signing out or reloading, navigate to another page and try to bid again.",
      "Read whether access is restored, and note how long it took if it was not immediate.",
    ],
    inputs: { reason: "QA unban probe — checklist case.", softBanAction: "place_bids" },
    expectedBehaviour:
      "A lifted ban takes effect on the next navigation. Role and status fields on a session refresh only periodically, so a guard reading that cached snapshot keeps blocking for minutes after the ban is gone — which reads to the user as the unban not having worked. The guard re-reads on navigation into a gated area for exactly this reason.",
    expectedUiState:
      "Bidding is restored on the next navigation, without a sign-out or a hard reload. A block persisting for minutes is the finding, recorded with how long — that is the cached-session-snapshot failure this case exists for, and it reads to a user as the unban not having worked.",
    endResult:
      "The soft ban is lifted and the account can bid again. Note this case uses a SOFT ban deliberately: a hard ban ends the session outright, so there would be no live session left to observe the restoration on.",
  },
  "checklist-admin-bans-and-trust-hard-ban-cascade-runs": {
    roles: ["admin"],
    startPage: "/admin/users",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/users and hard-ban the account arjun.builder@gmail.com with the reason 'QA hard-ban cascade probe — checklist case.'",
      "Read what the interface says IMMEDIATELY after submitting — the route returns a job id and a token, so it should report started work rather than a finished cascade.",
      "Wait for the completion signal and read what it reports.",
      "Open the account and read its state — it should now be disabled.",
      "Unban the account and confirm it is enabled again.",
    ],
    inputs: {
      reason: "QA hard-ban cascade probe — checklist case.",
      jobType: "hardBanCascade",
      cascadeStages: 8,
    },
    expectedBehaviour:
      "A hard ban runs a multi-stage cascade that exceeds a single request's time budget, so it is queued as a background job and its completion is reported back. A screen that claims success at submit time is claiming an outcome it cannot know — the job may still fail.",
    expectedUiState:
      "The submit reports started or queued work, a completion signal follows separately, and only then does the account's state reflect the finished cascade. An immediate unqualified 'user banned' with no later signal is the finding — the eight-stage cascade runs in a background job and the request cannot know its outcome.",
    endResult:
      "The ban is lifted and the account is enabled again. A hard ban left in place outlives every reseed — users is PRESERVE tier — and silently breaks whichever other page signs in as this persona.",
  },
  "checklist-admin-bans-and-trust-hard-ban-recorded-in-audit-log": {
    roles: ["admin"],
    startPage: "/admin/audit-log",
    steps: [
      SIGN_IN_ADMIN,
      "Soft-ban the account rohit.collect@gmail.com with the reason 'QA audit-log probe — checklist case.', then lift it.",
      "Open /admin/audit-log.",
      "Find the ban entry and the unban entry.",
      "Read the acting admin, the target and the reason on each.",
      "Check the reason is the one typed.",
      "Check no personal name or email of the banned user appears in the entry's stored detail.",
    ],
    inputs: { reason: "QA audit-log probe — checklist case." },
    expectedBehaviour:
      "Bans, unbans and role changes are the privileged actions the audit log exists for, and each records who acted and why. The log is not encrypted, so it carries the target's identifier rather than their name or email — a readable name there is a leak into a surface that was never designed to hold one.",
    expectedUiState:
      "Both entries present with the acting admin, the target and the exact reason. A missing entry is one finding; a readable email or personal name in the entry's detail is a different and more serious one.",
    endResult: "The account is unbanned; the log entries remain.",
  },
  "checklist-admin-bans-and-trust-ban-status-visible-in-list": {
    roles: ["admin"],
    startPage: "/admin/users",
    steps: [
      SIGN_IN_ADMIN,
      "Soft-ban the account rohit.collect@gmail.com with the reason 'QA list-marker probe — checklist case.'",
      "Return to /admin/users without opening the account.",
      "Find the row and read what marks it as banned.",
      "Check the marker is readable against its background.",
      "Switch to dark mode and read it again.",
      "Lift the ban and check the marker clears.",
    ],
    inputs: { reason: "QA list-marker probe — checklist case." },
    expectedBehaviour:
      "A banned account is marked in the list without opening it, and the marker is legible in both themes. A status tint and its ink both invert with the theme, so a badge pairing a tint with fixed white text is invisible in exactly one of them.",
    expectedUiState:
      "A readable badge on the row in both light and dark mode, cleared when the ban is lifted. White-on-near-white in either theme is the finding.",
    endResult: "The account is unbanned and unmarked.",
  },
  "checklist-admin-bans-and-trust-ban-filter-returns-banned-only": {
    roles: ["admin"],
    startPage: "/admin/users",
    steps: [
      SIGN_IN_ADMIN,
      "Soft-ban the account rohit.collect@gmail.com with the reason 'QA filter probe — checklist case.'",
      "Open /admin/users and apply the filter for banned accounts.",
      "Read the rows returned and check the account rohit.collect@gmail.com is among them.",
      "Check no unbanned account is in the result.",
      "Clear the filter and check the full list returns.",
      "Lift the ban and re-apply the filter, checking the account has left it.",
    ],
    inputs: { reason: "QA filter probe — checklist case." },
    expectedBehaviour:
      "The filter returns exactly the banned accounts. A filter chip whose value does not byte-for-byte match a stored one matches nothing forever and reports no error — an empty result is indistinguishable from 'no banned users', which is why the case bans somebody first.",
    expectedUiState:
      "The banned account is in the filtered result and unbanned accounts are not. An empty result with a known banned account present is the finding.",
    endResult: "The account is unbanned.",
  },
  "checklist-admin-bans-and-trust-session-ip-masked": {
    roles: ["admin"],
    startPage: "/admin/sessions",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/sessions and read a session's IP address as displayed.",
      "Check it is partially hidden rather than complete.",
      "Open the browser's network panel and read the response that populated the list.",
      "Search that payload for a complete IP address.",
      "Search the page's own embedded data for one as well.",
    ],
    expectedBehaviour:
      "The IP is masked before it leaves the server, not on the way to the screen. A masked display over an unmasked payload is still a leak — the value is in the page and in the browser's history, and only the rendering hides it.",
    expectedUiState:
      "The displayed value is partial AND no complete IP appears in the payload or the page data. A complete address anywhere is the finding, with where it was found.",
    endResult: "Read-only.",
  },
  "checklist-admin-bans-and-trust-sessions-list-device-details": {
    roles: ["admin"],
    startPage: "/admin/sessions",
    steps: [
      SIGN_IN_ADMIN,
      "Open /admin/sessions.",
      "Read each row's browser, operating system and device.",
      "Read the last-activity time and check it is a real timestamp rather than a placeholder.",
      "Sort or filter by activity and check the order follows.",
      "Open a session's detail, if one is offered, and read the same fields there.",
    ],
    expectedBehaviour:
      "Each session states which device it belongs to and when it was last used, because that is what an admin needs to decide whether to revoke it. A row showing only an identifier makes the decision impossible.",
    expectedUiState:
      "Browser, operating system, device and a real last-activity timestamp on every row, with sorting that follows. A dash where a device should be is a finding.",
    endResult: "Read-only.",
  },
  "checklist-admin-bans-and-trust-revoke-session-signs-out": {
    roles: ["admin", "buyer"],
    startPage: "/admin/sessions",
    steps: [
      "In a second browser, sign in as rohit.collect@gmail.com / TempPass123! and leave a page open.",
      SIGN_IN_ADMIN,
      "Open /admin/sessions and find that account's session.",
      "Revoke it.",
      "In the second browser, navigate to any signed-in page.",
      "Read whether the account is still signed in.",
      "Reload the admin sessions list and check the row is gone.",
    ],
    expectedBehaviour:
      "Revoking a session ends it. Removing the row without invalidating the credential is the failure that matters — it reads as done, and the device it was supposed to lock out keeps working indefinitely.",
    expectedUiState:
      "The second browser is signed out on its next navigation and the row is gone from the list. A still-signed-in second browser is the finding, regardless of the row disappearing.",
    endResult: "The session is ended; sign the account back in if another case needs it.",
  },
  "checklist-admin-bans-and-trust-unban-request-reaches-admin": {
    roles: ["admin", "buyer"],
    startPage: "/admin/users",
    steps: [
      SIGN_IN_ADMIN,
      "Soft-ban the account rohit.collect@gmail.com with the reason 'QA unban-request probe — checklist case.'",
      "In a second browser, sign in as rohit.collect@gmail.com / TempPass123! and follow whatever route the block offers for appealing.",
      "Submit an unban request with the text 'QA unban request — checklist case, please ignore.'",
      "As the admin, find that request in an admin surface.",
      "Read whether it can be actioned from there.",
      "Lift the ban afterwards.",
    ],
    inputs: {
      banReason: "QA unban-request probe — checklist case.",
      requestText: "QA unban request — checklist case, please ignore.",
    },
    expectedBehaviour:
      "An appeal a banned user can submit must land somewhere an admin will see it. A submission form with no admin-side surface is the worst half-built shape available here — the user is told their appeal was received, and nobody will ever read it.",
    expectedUiState:
      "The request is visible to the admin with its text and its author, and can be actioned. A form with no admin surface behind it is the finding.",
    endResult: "The account is unbanned.",
  },
  "checklist-admin-bans-and-trust-banned-user-content-handling": {
    roles: ["admin", "seller"],
    startPage: "/admin/users",
    steps: [
      "Open /stores/store-beyblade-arena as a signed-out visitor and note that its listings are visible.",
      SIGN_IN_ADMIN,
      "Soft-ban the seller account tyson@beybladearena.in with the reason 'QA seller-ban content probe — checklist case.'",
      "As a signed-out visitor, reload /stores/store-beyblade-arena and read what is shown.",
      "Open /products and check whether that store's listings still appear.",
      "Lift the ban and reload both.",
    ],
    inputs: { storeId: "store-beyblade-arena", reason: "QA seller-ban content probe — checklist case." },
    expectedBehaviour:
      "Banning a seller takes their storefront and listings out of public view, and lifting it restores them. Public visibility is gated on the store's own status rather than the user's, so flipping only the user record leaves a banned seller's catalogue fully purchasable.",
    expectedUiState:
      "After the ban, the store page and its listings are not publicly reachable; after the lift, both return exactly as before. Listings still buyable during the ban is the finding.",
    endResult: "The ban is lifted and the store is public again.",
  },
};
