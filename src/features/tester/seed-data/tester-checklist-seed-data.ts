/*
 * WHY: Seeds the initial tester QA checklist catalog — DB-backed, admin-manageable (mirrors faq-seed-data.ts).
 * WHAT: Default test cases across 8 groups (Account & Auth, Buying, Selling, Content & Discovery,
 *       Community & Support, Design & UX, Public & Marketing Pages, Admin (Testing)). Admins add/edit
 *       further cases via /admin/tester-checklist — this array is a starting point, not the source of
 *       truth. Every case is searchable by title or route in the Tester Hub (/user/tester), which any
 *       isTester account OR admin can open. Items in the "admin" group carry adminOnly:true — only
 *       visible to a tester with canTestAdmin (or a real admin); see `group()`'s `opts.adminOnly`.
 *
 * EXPORTS:
 *   testerChecklistSeedData — Array of Partial<TesterChecklistItemDocument> for seed runner
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { TesterChecklistItemDocument } from "../schemas";
import { assignDefaultPhases } from "../utils/phases";

const ADMIN_TESTING_GROUP_LABEL = "Admin (Testing)";
const BUG_HUNTER_REWARDS_PAGE_LABEL = "Bug Hunter Rewards";

interface CaseInput {
  key: string;
  label: string;
  description?: string;
  href?: string;
}

function group(
  groupKey: string,
  groupLabel: string,
  pages: { pageKey: string; pageLabel: string; href?: string; cases: CaseInput[] }[],
  opts?: { adminOnly?: boolean; orderOffset?: number },
): Partial<TesterChecklistItemDocument>[] {
  const items: Partial<TesterChecklistItemDocument>[] = [];
  pages.forEach((page, pageIdx) => {
    page.cases.forEach((c, caseIdx) => {
      items.push({
        id: `checklist-${groupKey}-${page.pageKey}-${c.key}`,
        groupKey,
        groupLabel,
        pageKey: page.pageKey,
        pageLabel: page.pageLabel,
        label: c.label,
        description: c.description,
        // Every case gets a link: its own href, or the page's default —
        // guarantees "Go test this ->" always has somewhere real to send
        // the tester, even for cases nobody bothered to link individually.
        href: c.href ?? page.href,
        order: (opts?.orderOffset ?? 0) + pageIdx * 10 + caseIdx,
        isActive: true,
        adminOnly: opts?.adminOnly ?? false,
      });
    });
  });
  return items;
}

/**
 * Array order below IS the intended catalog order (groups concatenated via
 * spread, in authoring order) — `assignDefaultPhases` walks it directly
 * rather than sorting by `order`, since `order` restarts at 0 within each
 * group and is not globally unique across groups.
 */
const rawTesterChecklistItems: Partial<TesterChecklistItemDocument>[] = [
  ...group("account-auth", "Account & Auth", [
    {
      pageKey: "signup-login",
      pageLabel: "Signup & Login",
      href: "/auth/login",
      cases: [
        { key: "email-signup", label: "Sign up with email works", href: "/auth/register" },
        { key: "google-oauth", label: "Sign up / log in with Google works", href: "/auth/login" },
        {
          key: "google-link-existing",
          label: "Signing in with Google using the SAME email as an existing password account logs into that same account automatically — no duplicate account, no explicit linking needed",
          description: "This is the auto-merge path: register with email/password (email A), log out, then \"Sign in with Google\" using a Google account whose email is also A. You should land back in the same account (same orders/wishlist/etc.), and Settings > Account tab should now show Google as Connected.",
          href: "/auth/login",
        },
        {
          key: "google-link-different-email",
          label: "Linking a Google account whose email differs from your original signup email requires the explicit \"Connect Google\" button (My Account dashboard or Settings > Account tab) — it does not happen automatically just by signing in with Google",
          description: "Sign up/log in normally with email A (password). While logged in as A, use the \"Connect Google\" button and complete the popup with a Google account using a DIFFERENT email B. Afterward, Settings > Account tab should show Google as Connected with email B, while your account's primary login email is still A — the account now has two associated emails, not a second account.",
          href: "/user/settings",
        },
        {
          key: "google-link-confirmation-shown",
          label: "After Google is connected, the My Account dashboard shows a \"Google account connected\" confirmation with a Connected badge and your linked email — it does not just silently stop showing the \"Connect Google\" prompt",
          description: "Fixed 2026-08-20 — the /user dashboard only ever handled the unlinked case; once linked, the whole alert block disappeared with no confirmation, unlike Settings > Account tab which already showed a Connected badge. Link a Google account (or use an already-linked test account) and confirm the green confirmation alert appears on /user, not just an absence of the blue prompt.",
          href: "/user",
        },
        {
          key: "google-link-conflict-rejected",
          label: "Trying to link a Google account whose email is already used by a DIFFERENT existing account is rejected with a clear error — it does not silently merge the two accounts or move the email over",
          href: "/user/settings",
        },
        { key: "google-popup-blocked-fallback", label: "If the Google sign-in popup is blocked, the fallback (RTDB signal + postMessage) still completes sign-in" },
        { key: "login", label: "Log in with email + password works", href: "/auth/login" },
        { key: "logout", label: "Log out works and clears the session" },
        { key: "email-verify", label: "Email verification link works" },
        { key: "password-reset", label: "Forgot-password / reset-password flow works" },
        {
          key: "signup-verification-email-arrives",
          label: "The verification email actually arrives in the inbox after signing up — not just a \"check your email\" message on screen",
          description: "Changed 2026-08-21 — signup verification is now sent by Firebase itself (client SDK) instead of being generated server-side and delivered through Resend. Register a brand-new account with a real inbox you can check, and confirm the email lands (check spam too) and its link marks the account verified. The email will come from Firebase's sender with Firebase's template, NOT the branded LetItRip template — that difference is expected, not a bug.",
          href: "/auth/register",
        },
        {
          key: "forgot-password-no-account-enumeration",
          label: "Submitting \"Forgot password\" for an email that has NO account shows the same generic message as a real account — it never reveals whether the account exists",
          description: "Changed 2026-08-21 — this flow now calls Firebase directly from the browser instead of going through a server route, so the client must swallow Firebase's auth/user-not-found error. Submit a made-up address like nobody-here-12345@example.com and confirm you see \"If an account exists for that email, a reset link is on its way.\" — the same wording a real address produces, with no error toast and nothing in the UI distinguishing the two cases.",
          href: "/auth/forgot-password",
        },
        {
          key: "auth-emails-sender-identity-and-inbox",
          label: "Signup-verification and password-reset emails arrive in the real inbox, from the site's own sender identity — not spam, not a stranger's domain",
          description: "Added 2026-08-21. Register with an address you can actually open, and separately request a password reset. For BOTH emails confirm: (a) it arrives within a few minutes; (b) the From name and address are the site's configured sender, and the display name is spelled \"LetItRip\" exactly — not \"Letitrip\" or \"LetiTrip\"; (c) it landed in the inbox rather than spam or promotions; (d) the button/link inside opens the live site and completes the flow. Try it once with a Gmail address and once with a non-Gmail address if you can — deliverability often differs between providers.",
          href: "/auth/register",
        },
        {
          key: "auth-email-links-single-use",
          label: "A used or expired verification / password-reset link fails cleanly with a readable message — it never silently succeeds twice",
          description: "Added 2026-08-21. Complete a password reset, then click the SAME link in that email a second time. Confirm you get a clear, human-readable \"this link has already been used or has expired\" style message with a way to request a fresh one — not a blank page, not a raw Firebase error code, and definitely not a second successful password change. Repeat the same double-click test with a signup verification link.",
          href: "/auth/forgot-password",
        },
      ],
    },
    {
      pageKey: "profile-settings",
      pageLabel: "Profile & Settings",
      href: "/user/settings",
      cases: [
        { key: "edit-profile", label: "Editing display name / bio saves correctly", href: "/user/profile" },
        { key: "avatar-upload", label: "Uploading a profile avatar works" },
        { key: "notification-prefs", label: "Notification preferences save correctly" },
        { key: "public-profile-toggle", label: "Public profile visibility toggle works" },
        {
          key: "password-change-reset-link",
          label: "Changing your password from Settings sends a reset link to your account email — the password only changes after you open that link, never from the Settings page alone",
          description: "Changed 2026-08-21 — password change is now Firebase-native (the same reset-link flow as \"Forgot Password\"), replacing the older emailed 6-digit-code flow. Click \"Send password reset link\", confirm the email arrives at your account address, and that following the link lets you set a new password which then works for sign-in. Identity is proved by access to the inbox, so verify no password change is possible from the Settings page by itself.",
          href: "/user/settings",
        },
        {
          key: "own-public-profile-quick-links",
          label: "\"View public profile\" is easy to find and works from three places: the My Account dashboard header, the My Account quick-links grid (\"My Public Profile\" tile), and the /user/profile page (next to \"Manage Addresses\")",
          description: "Each of the three links should open your own public-facing profile page (/profile/[your uid]) — not the edit-profile page. If your profile visibility is set to Private, confirm the page still loads for you (the owner) even though other users would get a 404.",
          href: "/user",
        },
        {
          key: "hand-mode-toggle-exists",
          label: "A \"Left-hand mode\" toggle is visible on the Appearance tab of Settings, and also on the /user/profile page, and switching it saves without a page reload",
          href: "/user/settings",
        },
        {
          key: "hand-mode-persists-reload",
          label: "After turning on Left-hand mode, reloading the page (and logging out/back in) keeps the setting on",
          href: "/user/settings",
        },
      ],
    },
    {
      pageKey: "testing-program",
      pageLabel: "Tester Hub",
      href: "/user/tester",
      cases: [
        { key: "tester-hub-loads", label: "Tester Hub loads the full checklist grouped by section", href: "/user/tester" },
        { key: "tester-hub-search", label: "Tester Hub search finds test cases by typing part of the title or the route (e.g. \"/store/payouts\")", href: "/user/tester" },
        { key: "tester-hub-answer-saves", label: "Answering Yes/No and adding a comment on a test case saves without reloading" },
        { key: "admin-tester-access", label: "Signed-in admin accounts can open the Tester Hub and see the same checklist as testers", href: "/user/tester" },
        { key: "admin-testing-section", label: "Admin dashboard's Testing section shows both the Tester Checklist and Tester Feedback (results) links", href: "/admin/tester-feedback" },
        {
          key: "tester-flag-live-refresh",
          label: "A tester whose isTester/canTestAdmin flag is granted by an admin gets Tester Hub access without needing to log out and back in — within a few minutes of the change, on a tab that's stayed open",
          description: "Fixed 2026-08-20 — the client session only refreshed role/isTester/canTestAdmin/disabled/storeId on login or a full page reload, never on ordinary client-side navigation, so a flag flip by an admin was invisible until the user manually re-authenticated. Now piggybacked onto the existing 5-minute session-activity ping. To test: as admin, grant isTester to a second test account that's already logged in elsewhere with the app open; within ~5 minutes (no reload) it should gain access to /user/tester.",
          href: "/user/tester",
        },
      ],
    },
  ]),

  ...group("buying", "Buying", [
    {
      pageKey: "browsing-search",
      pageLabel: "Browsing & Search",
      href: "/products",
      cases: [
        { key: "browse-categories", label: "Browsing categories shows relevant products", href: "/categories" },
        { key: "search", label: "Search returns relevant results", href: "/search" },
        { key: "filters", label: "Search/listing filters (price, brand, condition) work correctly" },
        {
          key: "grid-one-card-per-row-on-phone",
          label: "On a phone, a product listing shows exactly ONE card per row — not two narrow ones",
          description:
            "BEFORE (until 2026-08-28): every listing put 2 cards per row at 375px, so each card was ~170px wide and its title/price squeezed. AFTER: 1 card per row on a phone, 2 on a tablet (~768px), 3–4 on a desktop. Check /products, /stores, /blog and an admin listing in card view. Resize slowly through 375 / 768 / 1024 / 1440 — the count should go 1, 2, 3, 4 and the cards should always fill the full width between the page margins, never leave a gap on the right.",
          href: "/products",
        },
        {
          key: "grid-short-last-row-not-stretched",
          label: "A listing whose last row is short does NOT stretch that card across the page",
          description:
            "Find a listing showing e.g. 4 items while 3 fit per row (add filters until the count is not a multiple of the row size). The single card left over on the last row must be exactly as wide as the cards above it, sitting on the left with empty space to its right. If it stretches to full width, the grid was switched from `auto-fill` to `auto-fit` — report it, this is the specific bug the layout was rebuilt to fix.",
          href: "/products",
        },
        {
          key: "grid-follows-sidebar-not-viewport",
          label: "Opening the desktop filter sidebar drops ONE column and keeps the cards the same size",
          description:
            "On a wide desktop (~1440px) open /products and toggle the filter sidebar. The card count per row should drop by one while each card stays roughly the same width — the grid measures its own container, not the window. If the cards instead shrink to squeeze the same number in, report it.",
          href: "/products",
        },
        {
          key: "homepage-prize-draws-section",
          label: "The homepage shows a \"Prize Draws\" strip with real cards — NOT an empty gap and NOT a \"Something went wrong\" block",
          description:
            "This section crashed the entire homepage in production (React error 441) until 2026-08-26. Scroll the whole homepage: every strip should render or be cleanly absent. If any single strip is replaced by an error message while the rest of the page is fine, that is the section boundary doing its job — report which strip.",
          href: "/",
        },
        {
          key: "homepage-event-raffles-section",
          label: "If there are active raffle events, the homepage shows a \"Live Raffles & Spin Wheels\" strip",
          description:
            "This section silently rendered nothing in production — it looked exactly like \"no active raffles\". Cross-check against /events: if an event with a raffle is active there but no strip appears on the homepage, that is a bug.",
          href: "/",
        },
        {
          key: "listing-no-missing-message",
          label: "Open the browser console on /products and confirm there are NO \"MISSING_MESSAGE\" errors",
          description:
            "Press F12 → Console tab, then load the page. A missing translation key logs 'MISSING_MESSAGE: <key>' and renders the raw key text instead of a readable label. Report the exact key name if you see one.",
          href: "/products",
        },
        {
          key: "listing-toolbar-collapsed-on-mobile",
          label: "On a phone, a listing opens with the search/filter toolbar COLLAPSED to a single \"Show Toolbar\" strip",
          description:
            "BEFORE (until 2026-08-28): every listing opened with two stacked toolbar rows — search + Filter, then a scrolling sort/view chip row — roughly 100px of chrome above the first card. AFTER: a phone gets one thin \"Show Toolbar\" strip instead. Tap it: search, Filter and sort appear. Navigate to another listing and back — it should stay expanded, because you chose that. On a desktop (~1440px) the toolbar must still be open by default, exactly as before. Also confirm the toolbar is never simply GONE — there must always be a visible strip to tap.",
          href: "/products",
        },
        {
          key: "listing-toolbar-forced-open-on-selection",
          label: "Selecting rows on a phone force-opens the toolbar so the bulk actions are reachable",
          description:
            "In an admin or seller listing on a phone, collapse the toolbar, then select a row (long-press or the checkbox). The toolbar must open by itself, because the bulk-action bar lives inside it — if it stays collapsed you can select rows but have no way to act on them. Report if the bulk bar is invisible or cut off.",
          href: "/products",
        },
        {
          key: "product-filter-status-labels",
          label: "In an admin/seller listing's filter drawer, every Status option reads as words (Published / Draft / In Review / Archived) — never a raw key like \"filters.statusInReview\"",
          href: "/products",
        },
        { key: "pagination", label: "Pagination / infinite scroll works on listing pages" },
        {
          key: "compare-custom-fields",
          label: "Selecting 2+ items and using the \"Compare\" bulk action shows each item's custom spec fields (dimensions, material, edition, etc.) as extra comparison rows, not just image/price/condition/brand/category/store",
          href: "/products",
        },
        {
          key: "compare-double-row-arrows",
          label: "On a homepage section rendered as a double row (e.g. Auctions), the left/right scroll arrows are tall slivers spanning the full row height, not small circular buttons",
          href: "/",
        },
        {
          key: "default-listing-not-empty",
          label: "Products, Auctions, Pre-Orders, Art & Stickers, and Prize Draws listing pages show real items by default — not an empty \"no products found\" state or a toast about a missing Firestore index",
          description: "A 2026-08-19 index-shape bug (2-field composite left in place of the 3-field one the actual sort-inclusive query needed) silently broke the default \"hide sold/ended/closed\" query on several listing pages and dashboards, returning zero results with a swallowed FAILED_PRECONDITION error. Load each listing page fresh (no filters applied) and confirm it's populated, not blank.",
          href: "/products",
        },
        {
          key: "show-sold-toggle-reveals-items",
          label: "The \"Show sold\" / \"Show ended\" / \"Show closed\" toggle on Products/Auctions/Prize Draws listing pages is off by default (hiding sold-out/ended/closed items) and reveals them when switched on",
          description: "Verify against the seeded fixtures: \"Test Collectible — Sold Out\" (standard, hidden until \"Show sold\" is on), \"Test Auction — Already Won\" (hidden until \"Show ended\" is on), \"Test Prize Draw — Already Closed\" (hidden until \"Show closed\" is on). All three should be genuinely absent by default, not just from an unrelated broken query.",
          href: "/products",
        },
        {
          key: "product-type-filter-lives-in-drawer",
          label: "There is NO standalone \"TYPE\" chip row on /products — the listing-type filter is a \"Listing type\" checkbox section at the TOP of the Filters drawer",
          description: "Changed 2026-08-28. BEFORE: a full-width band of pill chips (Standard / Auctions / Pre-Orders / …) sat between the Available-Sold-All tabs and the product grid, and clicking one filtered instantly. AFTER: that band is gone — the availability tabs sit directly above the grid — and the same options appear as checkboxes under \"Listing type\" when you press Filters. Report it if you can still see the old chip band anywhere.",
          href: "/products",
        },
        {
          key: "product-type-chips-cover-all-types",
          label: "The \"Listing type\" section in the /products Filters drawer lists ALL nine listing types — Standard, Auctions, Pre-Orders, Prize Draws, Classifieds, Digital Codes, Live Items, Art and Stickers",
          description: "Open Filters and count the checkboxes under \"Listing type\": there should be nine, and none labelled \"Bundles\" (bundles are not a listing type). A type missing here is unreachable from the main catalogue even when items of that type exist.",
          href: "/products",
        },
        {
          key: "product-type-chips-multi-select",
          label: "The \"Listing type\" boxes are CHECKBOXES, not radio buttons — ticking Auctions + Pre-Orders and pressing Apply shows both types in one grid",
          description: "Tick Auctions, then tick Pre-Orders WITHOUT unticking Auctions, then press Apply. Both must stay ticked when you reopen the drawer, and the grid must contain items of both types. Untick both, Apply, and the grid returns to showing every type.",
          href: "/products",
        },
        {
          key: "product-type-chips-none-means-all",
          label: "With NO \"Listing type\" box ticked, /products shows a mix of listing types — check the coloured type badges on the cards",
          description: "\"Nothing ticked\" means \"every type\", so you should be able to spot at least two different badges (e.g. an \"Auction\" and a \"Digital Code\") within the first page without filtering.",
          href: "/products",
        },
        {
          key: "product-type-filter-counts-in-badge",
          label: "Ticking a \"Listing type\" box and pressing Apply increases the number on the Filters button, and \"Reset all\" in the drawer clears the type selection again",
          description: "Changed 2026-08-28 — the type filter used to sit outside the drawer and was invisible to both the badge and Reset. BEFORE: pick a type, badge stays where it was, Reset all leaves the type selection in place. AFTER: the badge goes up by one, and Reset all unticks every type box and repopulates the grid with all types.",
          href: "/products",
        },
        {
          key: "product-type-chip-drives-sort-options",
          label: "Applying exactly ONE listing type changes the Sort dropdown to that type's own sorts — Auctions alone offers \"Ending Soon\", Pre-Orders alone offers \"Earliest Delivery\"",
          description: "Filters → tick only Auctions → Apply, then open Sort: \"Ending Soon\" must be present. Swap to only Pre-Orders and Apply: \"Earliest Delivery\" must be present and \"Ending Soon\" gone. With two types applied only the sorts valid for both remain (Newest / Price / Name) — that is correct, not a bug.",
          href: "/products",
        },
        {
          key: "product-type-chip-sort-resets-no-empty-page",
          label: "Choosing a type-specific sort and THEN changing the type selection never leaves an empty grid or an error",
          description: "The important regression check. Apply Auctions, sort by \"Ending Soon\", then reopen Filters, untick Auctions, tick Standard, Apply. The grid must repopulate with products and the Sort dropdown must fall back to Newest. A blank page here means a stale sort leaked into the new query.",
          href: "/products",
        },
        {
          key: "product-type-toggles-follow-selection",
          label: "The middle availability tab is worded for the applied types — \"Ended\" for Auctions alone, \"Sold\" for Standard alone, \"Sold & Ended\" with nothing applied",
          description: "Apply only Auctions and read the middle tab above the grid; then swap to only Standard and read it again. It must re-word itself, and switching to that tab must list the unavailable items of the applied type.",
          href: "/products",
        },
        {
          key: "product-type-chip-dedicated-page-link",
          label: "Ticking exactly one type that has its own browse page shows a \"Full <type> filters\" link, inside the drawer under the Listing type section, that lands on the right page",
          description: "Changed 2026-08-28 — the link used to sit beside the old chip row. Open Filters, tick only Auctions: a \"Full Auctions filters →\" link appears directly under the Listing type checkboxes (before you press Apply) and opens /auctions. Repeat for Pre-Orders and Prize Draws. With two types ticked, or none, the link must NOT appear.",
          href: "/products",
        },
        {
          key: "product-type-selection-survives-reload",
          label: "The applied listing types are reflected in the URL and survive a reload and the browser Back button",
          description: "Apply Auctions + Art, copy the URL, open it in a new tab: the grid must match and reopening Filters must show those two boxes already ticked. Then press Back and confirm the previous selection returns.",
          href: "/products",
        },
        {
          key: "product-type-pending-until-apply",
          label: "Ticking a \"Listing type\" box does NOT change the grid until you press Apply — and closing the drawer with the X discards the change",
          description: "Changed 2026-08-28 — the old chips filtered on every click. Tick Auctions and watch the grid behind the drawer: it must not change. Press Apply and it does. Reopen, tick Art, close the drawer with the X (not Apply), and reopen: Art must be unticked again, matching what is actually applied.",
          href: "/products",
        },
        {
          key: "free-shipping-toggle-actually-filters",
          label: "The \"Free shipping\" toggle on /products actually REDUCES the number of results — it is not a no-op",
          description: "Fixed 2026-08-21 — the toggle sent a filter on a field that was not permitted, so it was silently discarded and the toggle did nothing at all. Note the result count with it off, switch it on, and confirm the count drops and every remaining card really is free-shipping.",
          href: "/products",
        },
        {
          key: "filter-drawer-facets-actually-filter",
          label: "The Tags, Sublisting Type and Features sections in the Filters drawer actually change the results — not just the number on the Filters button",
          description: "Fixed 2026-08-21 — all three were drawn and counted toward the Filters badge but were never sent to the server. Pick a value in each, Apply, and confirm the result set genuinely narrows instead of staying identical while the badge increments.",
          href: "/products",
        },
        {
          key: "pre-orders-reachable-from-products",
          label: "Pre-orders are reachable from /products — Filters → Listing type → tick Pre-Orders → Apply, and confirm real pre-order items appear with a \"Pre-Order\" badge",
          description: "This was the original report: pre-orders (and auctions, prize draws, art, stickers) had no entry in the type filter at all, so they could only be found via their own dedicated pages.",
          href: "/products",
        },
        {
          key: "art-stickers-default-not-empty",
          label: "The Art & Stickers listing (/art) shows real items by default — not an empty grid that only populates after clicking \"Show sold\"",
          description: "Fixed 2026-08-21, two independent bugs: (1) \"art\"/\"stickers\" were missing from the repository's listing-type alias map, so the type filter was silently dropped and the query lost its listingType clause entirely on every path (SSR, /api/products, and the listingProcessor Function); (2) the SSR page pushed a stockQuantity>0 inequality into Firestore against a createdAt sort, which Firestore rejects, and the failure was swallowed into a bare empty page. Load /art fresh, with no filters touched, and confirm both Art and Sticker items are visible.",
          href: "/art",
        },
        {
          key: "art-stickers-type-chips-narrow",
          label: "On /art, the Filters drawer's \"Listing type\" section offers exactly two boxes — Art and Stickers — and each one alone narrows the grid to that type without ever returning zero rows",
          description: "This page spans only two of the nine listing types, so its Listing type section must show only those two. Tick Art → Apply, then Stickers → Apply, then untick both → Apply; all three states must return rows.",
          href: "/art",
        },
        {
          key: "art-stickers-show-sold-adds-not-reveals",
          label: "On /art, turning \"Show sold\" ON adds sold-out items to the grid (it should not be required to see anything at all)",
          href: "/art",
        },
        {
          key: "auctions-show-ended-off-shows-live",
          label: "With \"Show ended\" off (the default), the Auctions listing shows LIVE auctions — not empty, and not requiring the toggle to see anything",
          description: "Fixed 2026-08-20 — the bounded fetch behind the \"unsafe filter\" workaround used to be sorted by the same field the date filter was about to reject on (auctionEndDate ASC = oldest/most-ended first), so once a store accumulated enough already-ended auctions the entire batch could be all-ended and live ones never got fetched at all — you had to turn \"Show ended\" ON to see anything, including live auctions. Load /products?listingType=auction fresh with the toggle off and confirm live auctions appear without touching the toggle.",
          href: "/products",
        },
        {
          key: "auctions-show-ended-with-nondefault-sort",
          label: "Switching the Auctions sort to something other than \"Ending Soon\" (e.g. \"Highest Current Bid\") while \"Show ended\" stays off still shows live auctions, correctly sorted by the chosen field",
          description: "Same root cause as auctions-show-ended-off-shows-live, but for the case where the sort field doesn't match the date field being filtered on — a separate code path (in-memory re-sort after filtering) that needs its own check.",
          href: "/products",
        },
        {
          key: "sort-options-per-listing-type",
          label: "Every sort dropdown option (Price, Newest, Ending Soon, Highest/Lowest Bid, Most Bids, Delivery Date, etc.) actually reorders the results on Products, Auctions, and Pre-Orders listing pages",
          href: "/products",
        },
        {
          key: "filter-drawer-combines-correctly",
          label: "Applying multiple filters together (price range + brand + category + condition) narrows results correctly, and clearing filters restores the full list — on Products, Auctions, and Pre-Orders",
          href: "/products",
        },
        {
          key: "filter-drawer-flips-hand-mode",
          label: "With Left-hand mode ON, the product/auction filter drawer opens from the left instead of the right",
          href: "/products",
        },
        {
          key: "search-filter-sort-combo",
          label: "Typing a search query, then applying a filter, then changing sort — all three stay applied together and pagination reflects the combined result count (not just the last action applied)",
          href: "/products",
        },
        {
          key: "listing-toggles-persist-across-pagination",
          label: "Toggling \"Show sold\"/\"Show ended\"/\"Show closed\" and then navigating to page 2 keeps the toggle state — page 2 doesn't silently reset back to hiding those items",
          href: "/products",
        },
      ],
    },
    {
      pageKey: "product-detail",
      pageLabel: "Product / Auction / Pre-order Detail",
      href: "/products",
      cases: [
        { key: "standard-detail", label: "Standard product detail page loads correctly", href: "/products/product-tester-standard-1" },
        {
          key: "auction-detail",
          label: "Auction detail page shows current bid + a live, ticking countdown correctly",
          description: "The countdown (\"Ends in 2d 5h 30m\", ticking every second — not a static date) must appear directly above every \"Place a bid\" button: the info panel, the desktop and mobile compact bid-summary cards, inside the \"Place your bid\" modal above the submit button, and in the mobile sticky bottom bar (as a row above the current-bid/bid-count line). It should switch to \"Ended\" once the end time passes.",
          href: "/auctions/auction-tester-sandbox-cycle-1",
        },
        { key: "preorder-detail", label: "Pre-order detail page shows expected ship date correctly", href: "/pre-orders/preorder-tester-sandbox-1" },
        {
          key: "image-gallery",
          label: "Product image gallery thumbnails load reliably (no broken-image icons) and click-to-zoom/rotate works in the lightbox",
          description: "The thumbnail strip occasionally showed a broken-image icon instead of the photo (transient 3rd-party fetch failures with no retry, fixed 2026-08-19). Reload an auction or product detail page a few times and confirm every thumbnail — not just the main image — renders correctly each time.",
        },
        {
          key: "image-gallery-thumbnails-not-blank",
          label: "The mini thumbnail strip under the main gallery image shows the ACTUAL photos — not empty/blank boxes",
          description: "Fixed 2026-08-21 — the thumbnails rendered as blank bordered squares while the large main image above them was fine. Cause: a wrapper element inside the appkit <Button> primitive collapsed to zero size, so every image inside a button-shaped image tile had nothing to fill. Open \"Beyblade Burst B-01 Valkyrie\" (product-beyblade-burst-valkyrie) or any product with 2-3 photos and confirm each mini thumbnail below the main image shows its own picture, that the active one is outlined, and that clicking one swaps the large image.",
          href: "/products/product-beyblade-burst-valkyrie",
        },
        {
          key: "video-playback",
          label: "A product's video slide opens in theater mode with playback, zoom, and rotate controls",
          description: "When a product has a video, it appears as a trailing gallery slide (poster image + play badge) alongside the photos. Clicking it opens the full-screen lightbox in theater mode. For a raw-file video (native <video> element) the zoom (+/-) and rotate (R) buttons in the top bar apply; for a YouTube-sourced video (see \"video-playback-youtube\" below) they don't — the embed has its own player chrome. Test on the raw-file fixtures: \"Beyblade Original — Dragoon F (Video Demo)\" and \"Beyblade X BX-02 Dran Sword (Video Demo)\".",
        },
        {
          key: "video-playback-youtube",
          label: "A product whose video is sourced from YouTube (via MediaUploadField's \"YouTube\" tab) actually plays — not \"No video with supported format\"",
          description: "Fixed 2026-08-21 — a YouTube-sourced video.url (e.g. youtube.com/watch?v=...) was always rendered as a raw <video src>, which can't play a YouTube watch-page URL. getYouTubeVideoId() now detects this and renders a youtube-nocookie.com iframe embed instead, in both the gallery lightbox and the standalone MediaVideo preview (used by the upload form's own \"YouTube\" tab preview). Verify on \"Metal Fight Beyblade BB-118 Dark Bull (Video Demo, YouTube)\" (standard product) and \"Beyblade Original — Dragoon Storm (Rare Sealed)\" (auction) — the video slide should open and actually play the embedded YouTube video, not show an error.",
          href: "/products",
        },
        {
          key: "video-lightbox-fullscreen-sizing",
          label: "The video/YouTube-embed lightbox has a real minimum size on both mobile and desktop, and the top-bar \"expand\" button toggles real browser fullscreen",
          description: "Fixed 2026-08-21 — the lightbox's \"Maximize2\" button used to just duplicate the zoom-reset button (no real fullscreen). It now toggles the native Fullscreen API (icon swaps to a \"shrink\" glyph while active) and syncs correctly if you exit via Esc instead of the button. Separately, the video/embed area now has a minimum width/height (bigger on desktop than mobile) so it never collapses to a tiny box while loading or on a low-resolution video. Test on a narrow (mobile-width) browser window and a full desktop window against \"Beyblade Burst B-97 Spryzen S2 (Video Demo, Wikimedia)\".",
        },
        {
          key: "video-real-file-upload",
          label: "Uploading a real video file via the product form's \"Upload\" tab (not YouTube or External URL) plays back correctly with an auto-captured poster frame",
          description: "This path can't be covered by a permanent seed fixture — there's no real Storage object for a seeded URL to point at, so it has to be tested by hand. As a seller/admin, edit any product's Video field, use the default \"Upload\" tab (not the YouTube or External URL tab) to upload a real .mp4/.webm/.mov file, and confirm: (1) a poster/thumbnail frame is auto-captured and shown once upload finishes, (2) the video plays correctly in both the product form's own preview panel and the public product detail page's gallery lightbox, (3) it opens the trim modal if enabled, and (4) removing it and re-uploading works without leaving orphaned files (no error toast).",
          href: "/store/products",
        },
        {
          key: "related-listings-sections",
          label: "A standard product's detail page shows up to 4 \"related\" carousels below the main content — More in [category], More by [brand], You might also like (shared tags), and More from [store] — each populated with real items, not empty",
          description: "Verify against \"Beyblade Burst B-01 Valkyrie\" (product-beyblade-burst-valkyrie) — all 4 sections should show real items: other Beyblade Burst products, other \"Beyblade\"-brand products, other attack-type/starter-set tagged products, and other Beyblade Arena store listings.",
          href: "/products",
        },
        { key: "prizedraw-buy-reveal", label: "Buying a prize-draw entry correctly assigns a prize once payment is confirmed (instant mode) or shows a pending state until the draw closes (scheduled mode)", href: "/prize-draws/prizedraw-tester-sandbox-1" },
        {
          key: "bundle-purchase",
          label: "Purchasing a bundle works and shows all included items in the order",
          description: "Verify against \"Test Bundle\" (bundle-tester-sandbox, findable from the bundles listing page) — after checkout, the order should show a single \"Test Bundle\" line item, not two separate product lines.",
          href: "/bundles/bundle-tester-sandbox",
        },
        {
          key: "product-group-set-widget",
          label: "A product's detail page shows a collapsible \"Part of / Parts in this group\" panel with a working thumbnail strip and a \"View whole group\" table when the product belongs to a product-group (\"Set\")",
          description: "Verify against \"Test Product Set — Standard #1 + Standard #2\" (group-tester-sandbox-bundle) and either of its two children (product-tester-standard-1 / product-tester-standard-2), findable from the products listing page — all three should show the panel with each other listed, the arrow/triangle expand icons should render as real glyphs (not garbled text), and \"View whole group\" should open a working modal/drawer.",
          href: "/products/group-tester-sandbox-bundle",
        },
        {
          key: "grouped-listings-carousel-on-detail",
          label: "A \"Grouped listings\" themed carousel appears on a product detail page with real, clickable member items",
          description: "Added 2026-08-21 — this carousel previously had no test case of its own outside the category/brand check. It is DIFFERENT from the \"Part of / Parts in this group\" set panel: this one is a horizontal themed scroller (titled by the group's theme, e.g. \"Same character\" / \"From the same set\"), it sits lower down near the related-items carousels, and it only shows for products that belong to an active, visible group. Confirm the cards show real titles and images (not placeholders) and that clicking one lands on that item's own detail page.",
          href: "/products/product-tester-standard-1",
        },
        { key: "classified-contact-flow", label: "A classified listing shows a contact-seller flow with deliberately no checkout/buy button", href: "/classified/classified-tester-sandbox-1" },
        { key: "digitalcode-delivery", label: "Purchasing a digital-code listing delivers the code to the buyer post-purchase", href: "/digital-codes/digitalcode-tester-sandbox-1" },
        { key: "live-item-detail", label: "A live-item listing's detail page shows the livestream link correctly", href: "/live/live-tester-sandbox-1" },
        {
          key: "live-item-video-mandatory",
          label: "Creating a live-item listing (species: animals/plants) without a video is rejected with a clear error; a live listing WITH a video plays correctly in the gallery's video slide and its poster thumbnail is watermarked",
          description: "Verify the block on both the admin product editor and the seller \"List a live item\" form. Then verify playback against the tester-sandbox fixture \"Test Live Item — Golden Retriever Puppy\" (live-tester-sandbox-1) — its video is a real dog clip (previously a broken YouTube link that never played); confirm it actually plays in theater mode and the thumbnail carries the site watermark.",
          href: "/store/live/new",
        },
      ],
    },
    {
      // Root Cause #68, part 2. Every case here is a LAYOUT assertion — an image
      // that renders at 0x0, or a tile that lays out sideways, is invisible to
      // tsc, to lint and to jsdom, so a human eye is the only gate that catches
      // a regression. Bundle tiles rendered blank for weeks before this.
      pageKey: "image-tile-layout",
      pageLabel: "Image Tiles & Collages",
      href: "/bundles/bundle-burst-battlers-pack",
      cases: [
        {
          key: "bundle-member-thumbnails",
          label: "A bundle's member tiles show the real product photo, filling the whole square tile — not a blank/grey box",
          description:
            "The three members of \"Burst Battlers Pack\" each have a mainImage. If you see grey boxes, the image collapsed to 0x0 — check whether a `block`/`flex`/`hidden` Tailwind class has been added back onto the tile's <Button>, which silently overrides appkit's own display and voids the fix.",
        },
        {
          key: "bundle-badge-position",
          label: "The #1 / #2 / #3 badge sits at the TOP-LEFT corner of each bundle tile, not floating in the middle of it",
          description:
            "The badge is absolutely positioned. If it drifts toward the centre, it is anchoring to the button's collapsed inner span instead of the tile box — the same root cause as a blank thumbnail, and often the first visible symptom.",
        },
        {
          key: "bundle-tile-opens-lightbox",
          label: "Clicking a bundle tile opens the lightbox at that item and cycles through the others; the product title below the tile still links to the product page",
        },
        {
          key: "prizedraw-collage-stacked",
          label: "Prize-draw collage tiles stack the image ABOVE the title/value caption at full card width — the image is never squashed beside the text at half width",
          href: "/prize-draws/prizedraw-tester-sandbox-1",
        },
        {
          key: "concern-card-icon-above-label",
          label: "Category concern cards show their icon ABOVE the label, not beside it",
          description:
            "This is a deliberate visual change: the card always asked for a vertical layout but had been rendering side-by-side. Confirm the stacked layout looks right rather than assuming the old side-by-side was intended.",
          href: "/categories",
        },
        {
          key: "media-picker-existing-grid",
          label: "In any media field, \"Choose existing\" shows each file as a square thumbnail with the filename underneath — not thumbnail-beside-filename with a shrunken image",
          href: "/admin/media",
        },
        {
          key: "icon-button-spacing",
          label: "Buttons that combine an icon and a label still have normal spacing between them, and a loading button's spinner stays centred against its text",
          description:
            "Regression check for the shared Button change that fixed the tiles — it altered how the button's own alignment reaches its children, so spot-check a few ordinary buttons anywhere in the app.",
          href: "/products",
        },
      ],
    },
    {
      pageKey: "buying-checkout",
      pageLabel: "Buying & Checkout",
      href: "/checkout",
      cases: [
        { key: "add-to-cart", label: "Add to cart works from the product page" },
        { key: "add-to-cart-out-of-stock", label: "Add to cart is disabled/blocked once a listing's stock reaches zero" },
        { key: "add-to-cart-max-quantity", label: "Increasing quantity in the cart is capped at the listing's available stock, with a clear message" },
        { key: "checkout-flow", label: "Checkout flow completes without errors", href: "/checkout" },
        { key: "checkout-order-review", label: "The order-review step before payment shows correct items, quantities, addresses, and totals" },
        { key: "checkout-multi-seller-split", label: "A cart with items from multiple sellers correctly splits into separate orders at checkout" },
        { key: "shipping-address", label: "Selecting/adding a shipping address works" },
        { key: "shipping-address-inline-add", label: "Adding a new address inline during checkout (without leaving the flow) works and the new address is selectable immediately" },
        { key: "shipping-address-edit", label: "Editing an existing shipping address from checkout works" },
        { key: "shipping-method-selection", label: "Selecting a shipping method/provider at checkout recalculates the shipping fee correctly" },
        { key: "gst-breakdown-display", label: "When GST is enabled in Site Settings, checkout shows the correct CGST/SGST or IGST breakdown based on buyer vs seller state" },
        {
          key: "checkout-otp-highvalue",
          label: "Carts ≥ the admin-configured high-value OTP threshold (Site Settings → Shipping → \"High-value checkout OTP threshold\", default ₹5,000) prompt a \"Verify this order\" email OTP right before payment (except COD); carts below the threshold check out directly with no OTP step at all",
          description: "Root-caused 2026-08-20 — the OTP email send used to be fire-and-forget, so a Resend/API failure silently left the buyer stuck with no code and no error. Sending now surfaces a real error if the email genuinely fails to send, and the \"already sent, retry in N minutes\" rate-limit message is a clear sentence instead of a raw error code. Place a real order ≥ the threshold and confirm the code actually arrives by email (check spam too) — report the exact error text if it still doesn't.",
        },
        {
          key: "checkout-otp-whatsapp-option",
          label: "When the admin has WhatsApp OTP switched on, the high-value checkout verification step offers a \"Send via WhatsApp instead\" option — and email, not WhatsApp, is still what gets sent by default",
          description: "Added 2026-08-21. WhatsApp is deliberately opt-in for OTP: the code must arrive by email unless the buyer explicitly clicks the WhatsApp option. Requires Site Settings → Notifications → WhatsApp → \"WhatsApp OTP\" enabled AND real Meta Cloud API credentials saved, AND the selected delivery address having a phone number. Verify: (a) the default send is email; (b) the WhatsApp option only appears when all three conditions hold; (c) clicking it delivers the code to the address's phone and the on-screen text switches to the masked phone number; (d) the code from WhatsApp verifies successfully.",
        },
        {
          key: "checkout-otp-whatsapp-hidden-without-phone",
          label: "The \"Send via WhatsApp instead\" option is NOT offered when the selected delivery address has no phone number on it, even with WhatsApp OTP enabled",
          description: "Added 2026-08-21. The phone is resolved server-side from the selected address (never from anything the browser sends), so an address with no phone has nowhere to send the code. Select/create a delivery address with the phone field empty and confirm the WhatsApp option is absent rather than appearing and then failing.",
        },
        { key: "payment-method-selection", label: "Choosing between COD, UPI/manual, and Razorpay (when enabled) at checkout works" },
        { key: "payment-window-countdown", label: "Manual-payment orders show a 15-minute countdown timer on the payment page" },
        { key: "payment-proof-upload", label: "Uploading manual payment proof (screenshot, UTR, mark-as-paid + agreement checkboxes) works" },
        { key: "payment-proof-reupload", label: "Requesting a proof re-upload extends the buyer's payment window and the buyer can successfully re-submit" },
        { key: "payment-window-expiry", label: "An order whose 15-minute payment window expires with no proof auto-cancels and the item returns to stock" },
        { key: "emi-checkout-flow", label: "Choosing EMI at checkout (when enabled) shows the correct tenure options, token amount, and surcharge, and creates the installment schedule" },
        { key: "out-of-stock-policy-cancel", label: "With the \"cancel whole order\" out-of-stock policy, checkout correctly rejects the entire batch if any item goes out of stock mid-checkout" },
        { key: "out-of-stock-policy-skip", label: "With the \"skip unavailable items\" policy, checkout proceeds with only the still-available items" },
        { key: "order-confirmation", label: "Order confirmation page/email shows correct order details" },
        { key: "payment-auto-approve-dispute", label: "An auto-approved order (2h, no admin review) shows the badge, and \"Raise a dispute\" submits successfully" },
        { key: "checkout-mobile-responsive", label: "The full checkout flow (cart → address → payment → confirmation) is usable and correctly laid out on a mobile viewport" },
        { key: "checkout-back-navigation", label: "Using the browser back button mid-checkout does not lose cart state or double-submit the order" },
        {
          key: "checkout-manual-payment-consent",
          label: "Choosing manual payment (UPI/Cash) at checkout shows a how-it-works guide (payment steps, refund summary, what happens if an item sells out) and requires a consent checkbox before the \"Pay via UPI / Cash\" button becomes clickable",
          href: "/checkout",
        },
        {
          key: "checkout-cash-payment-no-validation-error",
          label: "Checking the consent box and clicking \"Pay via UPI / Cash\" places the order successfully — no red \"Validation failed\" error appears",
          description: "Fixed 2026-08-20 — the checkout API's schema only accepted paymentMethod \"cod\"/\"online\"/\"upi_manual\"/\"emi\"; the manual-payment button has always sent \"cash\", which was never in that list, so every attempt was rejected with a generic \"Validation failed\" message even with the out-of-stock policy and consent checkbox correctly filled in. Add items to cart, reach the payment step, check the consent box, and click \"Pay via UPI / Cash\" — confirm it succeeds and lands on the order confirmation / payment-proof page.",
          href: "/checkout",
        },
        {
          key: "checkout-order-summary-full-breakdown",
          label: "The checkout Order Summary panel shows Shipping, COD handling fee (when COD is the likely method), the selected add-on fees (WhatsApp updates / gift wrap / shipment protection — only the ones checked), GST (when enabled), and Coupon discount as separate line items with icons before you pay — not just Subtotal and Total",
          description: "Fixed 2026-08-20 — the Order Summary previously showed Total = Subtotal − coupon discount only; shipping and every fee were computed and charged server-side but never shown to the buyer beforehand. Reach the payment step with an address selected, toggle an add-on checkbox, and confirm the matching line appears in the summary a moment later and the Total updates to match — then confirm the same Total appears on the order confirmation page afterward.",
          href: "/checkout",
        },
        {
          key: "checkout-razorpay-charge-includes-shipping",
          label: "When Razorpay online payment is enabled, the amount charged in the Razorpay checkout modal matches the order's recorded Total exactly, including shipping fee",
          description: "Fixed 2026-08-20 — the Razorpay pre-charge amount (computed before opening the payment modal) omitted the seller's shipping fee entirely, while the order created afterward recorded a higher total that included it, so the buyer was silently charged less via the gateway than what got recorded as owed. Only testable when Site Settings → Payments → Razorpay is enabled and the seller has a configured shipping fee. Compare the amount shown in the Razorpay modal against the order's Total on the confirmation page — they should match exactly.",
          href: "/checkout",
        },
      ],
    },
    {
      pageKey: "my-orders",
      pageLabel: "My Orders — List & Dashboard",
      href: "/user/orders",
      cases: [
        {
          key: "orders-item-summary",
          label: "Each row on My Orders shows the order's items (thumbnail, title, quantity) instead of just an order ID — and orders with more than 3 items show a \"+N more\" summary for the rest",
          description: "Verify against the seeded \"order-tester-sandbox-multi-item\" fixture (5 items: Test Gadget — Standard Listing #1, Test Collectible — Standard Listing #2, Test Accessory — Carry Case, Display Stand ×2, Sticker Set ×3) — its card should show the first 3 items and a \"+2 more\" badge, plus the correct ₹602 total and delivered status.",
          href: "/user/orders",
        },
        {
          key: "orders-view-details-button",
          label: "Each order row has a visible \"View Details\" button (in addition to the row itself being clickable) that opens that exact order's detail page",
          href: "/user/orders",
        },
        {
          key: "orders-type-tabs-actually-filter",
          label: "The Type filter (All / Normal / Auction wins / Offer wins) on My Orders actually narrows the list — picking \"Auction wins\" must show only auction-won orders, not the full list",
          description: "Fixed 2026-08-21. The tabs rendered and were clickable but the server never read the orderType filter, so every tab returned the complete unfiltered list with no error. Pick each tab in turn and confirm the row count and contents genuinely change. Against the tester sandbox, \"Auction wins\" should surface the won-auction order and \"Normal\" should not.",
          href: "/user/orders",
        },
        {
          key: "orders-normal-tab-includes-legacy",
          label: "The \"Normal\" Type tab also lists older orders placed before order types existed — it must not silently drop them",
          description: "Legacy orders carry no orderType value at all, so a strict database match would exclude every one of them. \"Normal\" is deliberately resolved differently for that reason. Confirm your oldest seeded orders still appear under \"Normal\", not only under \"All\".",
          href: "/user/orders",
        },
        {
          key: "dashboard-recent-orders-linked",
          label: "The My Account dashboard's \"Recent Orders\" widget rows are clickable and each shows a \"View Details\" button linking to the correct order — not a dead, non-interactive preview",
          href: "/user",
        },
        {
          key: "order-item-thumbnails-render",
          label: "Line-item thumbnails actually render on both the My Orders list and an individual order's detail page — not a blank/missing image slot",
          description: "A 2026-08-19 bug meant real checkout orders never carried a per-item image at all (the field didn't exist on the order document, so the detail page's image block was silently skipped rather than showing a broken-image icon). Place a fresh order through checkout and confirm its item thumbnail shows up both in the My Orders list and on the order-detail page.",
          href: "/user/orders",
        },
        {
          key: "my-orders-search-filter-sort",
          label: "My Orders has a working search box (by order id), a status filter (drawer), and a sort dropdown (Newest/Oldest/Highest total/Lowest total) — the same toolbar pattern as every other dashboard listing",
          description: "Converted 2026-08-21 off a page-specific hand-wired toolbar onto the standard DataListingView scaffold. Type part of a real order id into search and confirm it narrows the list, open the filter drawer and pick a status, and confirm changing sort actually reorders the cards.",
          href: "/user/orders",
        },
        {
          key: "order-tracking-timeline",
          label: "\"Track Shipment\" opens a real page with a status timeline (Order placed → Shipped, each with a real date) and, when a tracking URL is set, a \"Track with carrier\" link that opens in a new tab — not a blank page",
          description: "Fixed 2026-08-21 — /user/orders/[id]/track previously rendered <UserOrderTrackView /> with zero render-props (a Root Cause #8 blank slot-shell), and the underlying adapter dropped orderDate/shippingDate/deliveryDate/cancellationDate/trackingUrl entirely, so even a fixed page would have had nothing to show. From My Orders, open the seeded \"order-tester-sandbox-standard-shipped\" order and click \"Track Shipment\" — confirm both timeline steps show real dates and the tracking link opens www.example.com/track/TEST-TRACK-001 in a new tab.",
          href: "/user/orders",
        },
        {
          key: "manual-payment-panel-on-order-detail",
          label: "A manual-payment (UPI/Cash) order's detail page shows a \"Payment pending\" panel with a \"Complete payment\" button that opens the proof-upload page — you can get back to it at any time, not only right after checkout",
          description: "Fixed 2026-08-21. `ROUTES.USER.ORDER_PAYMENT` previously had exactly one caller — the post-checkout redirect — so a buyer who navigated away could never find the upload page again. Place a UPI/Cash order, leave the payment page WITHOUT uploading, go to My Orders, open that order, and confirm the panel + \"Complete payment\" button are there and land on the upload page.",
          href: "/user/orders",
        },
        {
          key: "manual-payment-page-renders-upi-and-countdown",
          label: "The payment-proof page for a UPI/Cash order actually shows the upload form, the UPI ID to pay, and a live 15-minute countdown — NOT the message \"This order does not require manual payment upload\"",
          description: "Fixed 2026-08-21 — the order adapter (`orderDocumentToOrder`) dropped `paymentMethod`, `displayedUpiId` and `paymentDeadline` entirely, so the page's own manual-payment check always failed and every buyer saw the \"does not require manual payment upload\" dead end, with no UPI ID and no timer. This is the single most important case in this group: if it fails, the whole manual-payment flow is unusable.",
          href: "/user/orders",
        },
        {
          key: "manual-payment-awaiting-review-state",
          label: "After submitting proof, the order detail page switches to a \"Payment under review\" panel and the \"Complete payment\" button disappears (you can't double-submit)",
          href: "/user/orders",
        },
        {
          key: "manual-payment-reupload-note-visible-to-buyer",
          label: "When an admin requests a proof re-upload, the buyer's order detail page shows \"Payment proof needs correction\" WITH the admin's note, and a \"Re-upload proof\" button that works",
          description: "Added 2026-08-21. Pair with the admin-side case `admin-orders-request-reupload`. The buyer previously got a notification telling them to re-upload but had no link anywhere to do it. Confirm the admin's exact note text is shown to the buyer, and that re-submitting succeeds (it must not fail with \"proof already attached\").",
          href: "/user/orders",
        },
        {
          key: "manual-payment-rejected-state",
          label: "An order rejected as fraudulent shows a \"Payment rejected\" panel with the admin's reason, and the account is suspended for 7 days",
          description: "Pair with the admin-side case `admin-orders-reject-fraud`. Use a throwaway buyer account — this really does ban it for 7 days.",
          href: "/user/orders",
        },
        {
          key: "order-lifecycle-emails-arrive",
          label: "As a buyer you get an email at each real order milestone — placed, shipped, delivered, cancelled/refunded — and each one names the right item and order",
          description: "Added 2026-08-21. Walk one throwaway order through its whole life with a seller account driving the status changes, keeping the buyer's real inbox open. At each transition confirm an email arrives and that it names the actual product (not a bare order id / GUID), shows the correct status, and links to that specific order. Note which transitions produce NO email — a missing \"delivered\" or \"refunded\" email is exactly the kind of gap this case exists to surface, so record it in the comment rather than passing the case.",
          href: "/user/orders",
        },
      ],
    },
    {
      pageKey: "bidding",
      pageLabel: "Bidding",
      href: "/user/bids",
      cases: [
        { key: "place-bid", label: "Placing a bid on an auction works", href: "/auctions/auction-tester-sandbox-cycle-1" },
        { key: "place-bid-live-self", label: "After placing a bid, the current bid amount and bid count update immediately on the auction page for the bidder — no manual page refresh needed" },
        { key: "place-bid-live-other-viewer", label: "Opening the same auction in two browser tabs (or two accounts) and placing a bid in one updates the current bid and bid count in the other within a few seconds, without a manual refresh (realtime SSE)" },
        { key: "outbid-notification", label: "Getting outbid triggers a notification" },
        {
          key: "win-auction",
          label: "Winning an auction creates a payable locked cart line, not a stuck order",
          description: "Fixed 2026-08-21 — settlement used to write a document that was not a real order (no items[], no buyerId, no payment method), so a winner had no way to pay anywhere in the product. Wait for `auction-tester-sandbox-won` to settle (or trigger the sweep manually), then confirm: a \"Won auction\" badge appears on the /user/bids row with a working \"Pay now\" link; the item shows up in the Cart's \"Won Auctions\" tab as a non-removable, non-editable line; and completing checkout produces a real order visible under the \"Auction wins\" tab on /user/orders.",
          href: "/auctions/auction-tester-sandbox-won",
        },
        {
          key: "auction-below-reserve-no-winner",
          label: "An auction that ends below its reserve price declares no winner and archives the listing, instead of awarding it to the highest bidder anyway",
          description: "Fixed 2026-08-21 — the reserve price was displayed and editable everywhere but never actually enforced at settlement.",
        },
        {
          key: "auction-win-unpaid-forfeit",
          label: "A won auction left unpaid past its 48-hour checkout window is removed from the cart and the bid is marked forfeited, with a notification to the buyer",
          description: "Requires waiting out the window (or adjusting the fixture's checkoutDeadline) — a background/low-priority case.",
        },
        { key: "bid-history", label: "My Bids page shows accurate bid history, paginated with the most recent bid first", href: "/user/bids" },
        { key: "bid-history-auction-detail-pagination", label: "An auction detail page's Bid History section shows the most recent bid first and paginates once there are more bids than fit on one page (try the L-Drago auction — 13 seeded bids)" },
        {
          key: "bid-history-shows-date-time-and-masked-name",
          label: "Each row in an auction detail page's Bid History section shows the bid amount, the exact date AND time the bid was placed (e.g. \"Aug 21, 3:45 PM\"), and the bidder's identity as a masked name (e.g. \"R*** K***\") or a partial bidder id — never a bidder's real, unmasked full name",
          description: "Fixed 2026-08-21 — `maskPublicBid()` (the helper meant to mask a bidder's display name before it reaches the public product page) was a silent no-op that returned the bid document unchanged, so a real bidder's full name was being sent to every visitor; separately, the Bid History row never displayed any bidder identity at all (only amount + date), so the leak had no visible symptom. Open the L-Drago auction (or any auction with bids) as a DIFFERENT, non-bidder account and expand Bid History — every row should show a masked name, not a bidder's real full name.",
        },
        {
          key: "bid-increment-tiered",
          label: "The \"min increment\" shown on an auction matches the admin-configured tier for the current bid amount, not a flat ₹1 — and a bid below that increment is rejected",
          description: "Default tiers: current bid ≤₹100 → ₹10 increment, ≤₹1,000 → ₹100, ≤₹5,000 → ₹200, ≤₹10,000 → ₹500, above that → ₹1,000. On an auction with no per-listing \"Minimum Bid Increment\" set, confirm the displayed \"min increment\" matches the tier for its current bid, and that trying to bid only current+1 (below the tier) is rejected with a minimum-increment error, while current+tier (or more) is accepted.",
        },
        {
          key: "bid-increment-override-floor-raising",
          label: "A seller's per-listing \"Minimum Bid Increment\" can require MORE than the admin tier, but can never let a bid undercut the tier",
          description: "Set a listing's \"Minimum Bid Increment\" below the current tier's value (e.g. 1) and confirm the effective minimum bid still enforces the tier, not the smaller override. Then set it above the tier (e.g. 500 when the tier is 100) and confirm the higher override is now enforced instead.",
        },
        {
          key: "bid-succeeds-and-outbids-previous-winner",
          label: "Placing a valid bid actually records it — the current bid rises and the previous high bid flips to \"outbid\"",
          description:
            "Fixed 2026-08-28. BEFORE: every bid failed and the modal showed the raw text \"Batch write failed: Cannot find module '../providers/db-firebase' Require stack: - /var/task/.next/server/chunks/ssr/...\" in the amount field. AFTER: the bid is accepted, \"Current bid\" rises by at least the minimum increment, and the previous winner's row in Bid History reads \"outbid\". Note the failure returned a normally-rendered modal and an HTTP 200, so \"the page loaded\" and \"no error in the network tab\" both prove nothing — read the actual numbers. Root cause: a relative-path runtime require inside appkit that only breaks once bundled into a Lambda chunk.",
          href: "/auctions/auction-tester-sandbox-cycle-1",
        },
        {
          key: "server-error-copy-is-never-raw",
          label: "A server failure shows plain-English copy — never a file path, stack trace or \"Cannot find module\"",
          description:
            "Fixed 2026-08-28. BEFORE: any 500 printed its own internal message to the user, including absolute server paths under /var/task/. AFTER: the user sees \"A database error occurred. Please try again\" (or \"Something went wrong. Please try again.\"), while the FULL original text plus its cause chain appears in Admin → Maintenance → Server errors. Check both halves: generic in the browser, specific in the admin list. Seeing the raw text in either the bid modal or any toast is a regression.",
          href: "/auctions/auction-tester-sandbox-cycle-1",
        },
        {
          key: "bid-increment-live-tier-change",
          label: "The displayed \"min increment\" on an open auction updates live (without a page refresh) if another bidder's bid pushes the current bid across a tier boundary",
        },
        {
          key: "bid-presets-are-increment-multiples",
          label: "The quick-bid buttons above the amount field are multiples of the auction's OWN minimum increment — never a flat +₹1 / +₹5 / +₹10",
          description: "Fixed 2026-08-21 — the presets were always 1x/5x/10x of the effective increment, but `resolveTieredBidIncrement` treated an empty `auctionConfig.bidIncrementTiers` array as \"no rule\" and fell through to the ₹1 last-resort constant, so every auction on the site rendered +₹1 / +₹5 / +₹10. On an auction whose current bid is in the ₹100-₹1,000 band (₹100 increment) the three buttons must read +₹100 / +₹500 / +₹1,000; on one above ₹10,000 (₹1,000 increment) they must read +₹1,000 / +₹5,000 / +₹10,000. Each button also shows the resulting bid amount underneath the step.",
          href: "/auctions/auction-tester-sandbox-cycle-1",
        },
        {
          key: "bid-preset-follows-live-price",
          label: "With a quick-bid preset selected, another bidder raising the price updates the amount in the field too — it does not leave a now-too-low number behind",
          description: "Fixed 2026-08-21 — the amount was only ever written on mount or on button click, while the current bid keeps updating over SSE. Open the auction in two tabs, select the +1x preset in tab A, place a higher bid from tab B, then watch tab A: the preset button labels, the \"minimum next bid\" helper text AND the number in the field must all move up together. Before the fix the buttons relabelled but the field kept its stale value, so pressing Place Bid was a guaranteed \"bid must exceed the current winning bid\" rejection.",
          href: "/auctions/auction-tester-sandbox-cycle-2",
        },
        {
          key: "bid-below-current-plus-increment-rejected",
          label: "A bid below current bid + minimum increment is rejected with a clear inline error on the amount field — and the rejection is identical whether it is typed in Custom mode or forced through the API",
          description: "Switch the preset row to \"Custom\", type an amount between the current bid and current+increment, and submit. Expect an inline error on the field (not a toast, not a silent no-op). Also confirm an amount BELOW the current bid gives the distinct \"must exceed the current winning bid\" message rather than the increment one.",
          href: "/auctions/auction-tester-sandbox-cycle-1",
        },
        {
          key: "bid-custom-need-not-be-exact-multiple",
          label: "In Custom mode any amount at or above the minimum is accepted — it does NOT have to be an exact multiple of the increment",
          description: "With a ₹100 increment and a ₹1,000 current bid, ₹1,137 must be accepted (it is above the ₹1,100 minimum). The helper text under the field states this explicitly. A client-side rule claiming to enforce exact multiples existed but was a no-op; it was removed rather than made real, because the server never enforced multiples and a real client rule would have rejected bids the server accepts.",
          href: "/auctions/auction-tester-sandbox-cycle-1",
        },
        {
          key: "first-bid-can-equal-starting-bid",
          label: "On an auction with NO bids yet, the seller's starting bid is itself an acceptable opening bid — you are not forced to bid starting bid + increment",
          description: "Changed 2026-08-21. On a bid-free auction the card's big number is labelled \"Starting bid\" (not \"Current bid\" beside an identical \"Starting bid\"), the first quick-bid button reads \"Minimum\" rather than \"+₹0\", and bidding exactly the starting bid succeeds. Previously a ₹100 auction could only be opened at ₹110, contradicting the \"Starting bid ₹100\" label right next to the field. The increment applies from the second bid onward — confirm the second bidder IS held to current + increment.",
        },
        {
          key: "first-bid-displays-at-starting-price",
          label: "The opening bid displays at the starting price, even when the opening bidder's maximum is much higher",
          description: "Proxy-bid semantics: the amount submitted is a MAXIMUM, and with no competition the visible price should sit at the seller's starting price. On a bid-free ₹100 auction with a ₹100 increment, bid ₹500 — the auction's current bid must then read ₹100, not ₹200. Place a second, competing bid from another account and confirm the price then steps up in increments against that ₹500 proxy maximum as expected.",
        },
        {
          key: "bid-count-increments-by-one",
          label: "Placing one bid increases the auction's bid count by exactly ONE, and the current bid never moves backwards",
          description: "Fixed 2026-08-21 — the `onBidPlaced` Firestore trigger duplicated work `placeBid` already did atomically: it incremented the bid count a second time (so one bid read as two), force-marked every new bid as winning, and overwrote the current bid with the new bid's amount. On the proxy path where a new bid LOSES to a standing higher maximum, that last part actually lowered the current bid to the loser's amount and named the loser as the leading bidder. Place a single bid and confirm the count goes up by 1, not 2. Then, from a second account, bid BELOW the standing proxy maximum: your bid must be recorded as outbid, and the auction's current bid must go UP (or hold), never down.",
          href: "/auctions/auction-tester-sandbox-cycle-3",
        },
        {
          key: "outbid-notification-goes-to-outbid-user",
          label: "The outbid notification goes to the bidder who actually lost the lead — and only when someone genuinely takes the lead from them",
          description: "Fixed 2026-08-21 alongside bid-count-increments-by-one — the notification used to be sent from a Firestore trigger that re-read \"who is winning\" AFTER the fact, racing the write that had just changed it, so it could notify the wrong account or nobody. It now fires from the same code path that decides the outcome. Check both directions: (a) outbid the leader and confirm THEY get the notification; (b) place a bid that loses to a standing proxy maximum and confirm the existing leader is NOT sent an \"outbid\" notification, since they never lost the lead.",
        },
      ],
    },
    {
      pageKey: "wishlist-history",
      pageLabel: "Wishlist & History",
      href: "/wishlist",
      cases: [
        { key: "add-wishlist-pdp", label: "Adding a product to the wishlist from the product detail page works", href: "/wishlist" },
        { key: "add-wishlist-card", label: "Adding a product to the wishlist from a listing card (checkbox/long-press) works on both listing and search pages" },
        { key: "remove-wishlist", label: "Removing a product from the wishlist works" },
        { key: "wishlist-persists-guest-to-login", label: "Wishlist items added as a guest are preserved after logging in" },
        { key: "wishlist-idempotent-readd", label: "Re-adding a product already on the wishlist is a no-op and doesn't create a duplicate entry" },
        { key: "wishlist-cap-enforced", label: "Adding a 21st item to the wishlist is blocked with a clear \"wishlist full\" message (20-item cap)" },
        { key: "wishlist-across-listing-types", label: "Auctions and pre-orders (not just standard products) can be added to and viewed correctly in the wishlist" },
        { key: "wishlist-price-drop-accuracy", label: "A wishlist item's displayed price matches the product's current price, not a stale snapshot" },
        { key: "wishlist-sold-out-item", label: "A wishlist item whose product later sells out or is removed still displays gracefully (no crash) with an appropriate indicator" },
        { key: "wishlist-empty-state", label: "The empty-wishlist state renders correctly with no items", href: "/wishlist" },
        { key: "wishlist-add-to-cart-from-list", label: "Adding a wishlist item directly to the cart from the wishlist page works" },
        { key: "wishlist-card-clickable", label: "Tapping/clicking a wishlist card (not the heart icon) navigates to that product's detail page", href: "/wishlist" },
        { key: "wishlist-heart-solid-red", label: "The wishlist heart icon on a saved item renders as a clearly visible solid red heart, not a washed-out white-on-pale circle", href: "/wishlist" },
        { key: "wishlist-view-remove-buttons", label: "Each wishlist card shows explicit \"View\" and \"Remove\" buttons below it, in addition to the heart toggle", href: "/wishlist" },
        { key: "wishlist-sync-item", label: "Tapping the per-card \"Sync\" button on a wishlist item refreshes its stored price/title/image and removes it if the product is no longer available", href: "/wishlist" },
        { key: "wishlist-sync-all", label: "The \"Sync all\" button in the wishlist header syncs every item and shows a toast summarizing how many were synced/removed", href: "/wishlist" },
        { key: "view-history", label: "Recently viewed history shows accurate items in most-recent-first order", href: "/user/history" },
        { key: "history-revisit-reorders", label: "Re-visiting a product already in history removes the old entry and moves it to the front, rather than duplicating it" },
        { key: "history-fifo-cap", label: "History silently evicts the oldest entry once more than 50 items have been viewed (no error shown to the user)" },
        { key: "history-guest-merge-on-login", label: "Guest browsing history (localStorage) merges correctly with the account's history after login, deduplicated by product" },
      ],
    },
    {
      pageKey: "cart",
      pageLabel: "Cart",
      href: "/cart",
      cases: [
        { key: "update-qty", label: "Updating item quantity in cart recalculates the total" },
        // ── Grouped & bundle cart lines ──────────────────────────────────
        // Fixtures backing these: product-tester-standard-1/2/3 (three members
        // of one group, deliberately spanning two GST rates),
        // product-tester-group-soldout (blocked member),
        // product-tester-crossstore-a/b (a group spanning two sellers),
        // bundle-tester-sandbox (a priced, all-or-nothing bundle).
        {
          key: "group-picker-opens",
          label: "On a product that belongs to a group, the \"Part of: …\" strip has a \"Pick items →\" control that opens a picker with a Qty column and a +/- stepper on each member",
          description:
            "Before this existed the panel was navigation only — the buyer had to open each member separately and add it as its own cart line.",
          href: "/products/product-tester-standard-1",
        },
        {
          key: "group-picker-running-total",
          label: "Changing any member's quantity updates the picker's running total (\"N items · ₹X\") immediately, and \"Add selected to cart\" stays disabled while nothing is selected",
          href: "/products/product-tester-standard-1",
        },
        {
          key: "group-picker-stock-cap",
          label: "A member's + button stops at that member's available stock — it cannot be pushed past it",
          href: "/products/product-tester-standard-1",
        },
        {
          key: "group-picker-blocked-member",
          label: "A sold-out member shows a reason chip (e.g. \"Sold\" / \"Out of stock\") in place of its stepper and cannot be selected",
          description:
            "Test Part — Sold Out is seeded into the tester group specifically for this. The rest of the group must stay selectable around it.",
          href: "/products/product-tester-group-soldout",
        },
        {
          key: "group-picker-one-line",
          label: "\"Add selected to cart\" with two or more members creates ONE cart line, not one line per product",
          description:
            "Pick 2 of one member and 1 of another, then open the cart: a single line reading \"N items\", not three separate rows.",
          href: "/products/product-tester-standard-1",
        },
        {
          key: "group-picker-single-member-plain-line",
          label: "Selecting exactly ONE member produces an ordinary product line (with a normal quantity stepper), not a grouped line",
          description:
            "1 item × qty N is already what a normal cart line means, so it deliberately does not become a group line.",
          href: "/products/product-tester-standard-1",
        },
        {
          key: "group-picker-cross-store",
          label: "A group whose members belong to DIFFERENT sellers renders read-only — no Qty column, no \"Add selected\" button — with an explanation, rather than a button that always fails",
          description:
            "Use the Test Cross-Store Set. Its two members sit in different stores on purpose.",
          href: "/products/product-tester-crossstore-a",
        },
        {
          key: "group-picker-guest",
          label: "A signed-out visitor using the picker is shown the login prompt rather than silently losing the selection",
          href: "/products/product-tester-standard-1",
        },
        {
          key: "group-line-expands-in-cart",
          label: "A grouped cart line in the cart expands to list its members with a thumbnail, unit price and its own +/- stepper each",
          href: "/cart",
        },
        {
          key: "group-line-no-line-level-stepper",
          label: "A grouped line has NO line-level quantity stepper — only the per-member ones",
          description:
            "The member quantities carry the whole selection; a second multiplier on top would double every price, tax and stock decrement.",
          href: "/cart",
        },
        {
          key: "group-line-member-edit-recalculates",
          label: "Changing one member's quantity in the cart updates that line's total AND the seller-group subtotal above it",
          href: "/cart",
        },
        {
          key: "group-line-remove-member",
          label: "Removing one member from a grouped line leaves the rest of the line intact; removing the LAST member removes the whole line",
          href: "/cart",
        },
        {
          key: "group-line-link-target",
          label: "Clicking a grouped or bundle line's title in the cart lands on a real page — never a 404",
          description:
            "A bundle line goes to /bundles/{slug}, a grouped-listing line to /groups/{slug}, a product-group line to its parent product. It used to point at /products/{categoryId}, which never existed.",
          href: "/cart",
        },
        {
          key: "bundle-copies-stepper",
          label: "A bundle page has a \"Copies\" +/- stepper and BOTH \"Buy now\" and \"Add to cart\" — Add to cart stays on the page, Buy now goes to checkout",
          description:
            "A bundle is all-or-nothing: there must be no per-member quantity controls anywhere on the bundle page, only the copies stepper.",
          href: "/bundles/bundle-tester-sandbox",
        },
        {
          key: "bundle-line-in-cart",
          label: "A bundle in the cart lists its members READ-ONLY and offers a copies stepper; raising copies multiplies the bundle's discounted price, never the sum of the members' individual prices",
          description:
            "Test Bundle is ₹199 while its members list at ₹199 + ₹149. Two copies must read ₹398, not ₹696.",
          href: "/cart",
        },
        {
          key: "bundle-cross-store-rejected",
          label: "Saving a bundle whose items come from two different sellers is refused with a clear message naming how many sellers they span",
          description:
            "Build a bundle mixing Test Cross-Store Set — Seller A with any Tester Sandbox product and save. Applies to both creating and editing, on the admin and the seller bundle editors. A bundle's storeId is a single value and is what decides which seller gets the order, the shipment and the payout — so a two-seller bundle would pay only one of them.",
          href: "/store/bundles/new",
        },
        {
          key: "grouped-listing-page-picker",
          label: "A grouped listing has its own public page with the same picker, reachable from the \"Pick items from this group →\" button on a group carousel",
          href: "/groups/group-beyblade-original-lineage",
        },
        {
          key: "group-lane-gate",
          label: "While an unpaid won auction or accepted offer is sitting in the cart, adding a group selection is refused with the same lane message as any other add",
          description:
            "This path used to bypass the gate entirely, so a buyer could keep shopping around an obligation they had already committed to.",
          href: "/products/product-tester-standard-1",
        },
        {
          key: "group-checkout-order-rows",
          label: "After checking out a grouped or bundle line, the order shows one row PER MEMBER under a single group header, and the line totals add up to the order total",
          description:
            "Rows are expanded so each carries its own HSN code and GST rate — a collapsed row can only carry one of each, which is why bundles previously showed none.",
          href: "/user/orders",
        },
        {
          key: "group-checkout-stock",
          label: "Checking out a grouped line decrements each member by (its per-copy quantity × the number of copies), not by one each",
          href: "/user/orders",
        },
        { key: "apply-coupon", label: "Applying a coupon code at checkout works" },
        { key: "remove-coupon", label: "Removing an already-applied coupon from the cart recalculates the total back down" },
        { key: "remove-item", label: "Removing an item from the cart works" },
        { key: "cart-empty-state", label: "The empty-cart state renders correctly with a clear call to action" },
        { key: "cart-persists-across-session", label: "Cart contents persist across a page reload and across login/logout for the same account" },
        { key: "cart-guest-to-login-merge", label: "A guest cart's items merge correctly into the account's cart after logging in" },
        { key: "cart-price-revalidated", label: "If a product's price changes after it was added to the cart, checkout uses the current price and shows the buyer the updated total" },
        { key: "cart-checkout-button-visible", label: "The \"Proceed to Checkout\" button renders as a clearly visible, prominently-colored primary button — not a dull/near-invisible one blending into the page background", href: "/cart" },
        {
          key: "cart-added-toast-totals",
          label: "Adding any item to the cart shows a toast naming the item plus the cart's updated item count and total value (not a bare \"Added to cart\")",
          href: "/products",
        },
        {
          key: "bottom-nav-cart-not-wishlist",
          label: "The mobile bottom navigation bar shows a Cart tab with a live item-count badge; Wishlist is no longer a bottom-tab slot but is still reachable from the header",
          description: "Wishlist was intentionally removed only from the bottom tab bar, not from the header/app-bar or main navigation — confirm the header wishlist icon is unaffected.",
        },
        {
          key: "cart-badge-matches-cart-page",
          label: "After adding an item to the cart, the item actually appears when you open the cart page — not just an updated badge count with an empty cart",
          description: "Root-caused 2026-08-20 — a background sync manager that replays queued cart/wishlist writes to the server was built but never mounted anywhere in the app, so the cart badge (read from a local queue) updated instantly while the server-backed cart page (read from Firestore) never received the write and showed empty. Add an item, then navigate to /cart (not just glance at the badge) and confirm it's really there — check on both a fresh session and after a page reload.",
          href: "/cart",
        },
        {
          key: "cart-mobile-no-overflow",
          label: "On mobile, cart item cards stay fully within the screen width per seller group — no horizontal overflow/clipping — and a floating checkout bar (styled like the bulk-action bar, sitting above the bottom nav) shows the total and a Checkout button, with enough bottom margin that the last cart item is never hidden behind it",
          description: "Root-caused 2026-08-21 — the appkit <Checkbox> root div is width:100%, and the caller's className landed on the inner <input> instead of that root, so the select-item checkbox claimed the whole row, squeezed each item card to ~0px, and pushed its 80px thumbnail outside the seller card's border (same defect class as <Select>/wrapperClassName, Root Cause #29). Test at a 360px viewport with at least two sellers.",
          href: "/cart",
        },
        {
          key: "cart-seller-group-contains-items",
          label: "At a 360px viewport, every cart item row sits fully inside its seller's rounded card, separated by thin divider lines — no card-inside-a-card look, nothing overlapping or extending past the card border, and no horizontal scrolling of the page",
          description: "Add items from two different sellers, ideally one with a very long product title. The seller card should be the only card: header with \"Sold by <store>\" and that seller's subtotal, then divider-separated item rows, then that seller's fees and add-ons.",
          href: "/cart",
        },
        {
          key: "checkout-lanes-auction-blocks-others",
          label: "With a won auction pending, the cart's Offers and Cart tabs render their checkout button DISABLED with a stated reason, and adding any new item to the cart is refused",
          description: "Added 2026-08-21 (Checkout Lanes). Get a won auction into your cart (see win-auction), then try to: (a) check out from the Cart tab — button disabled, reason names the auction; (b) add a new standard product to cart — refused with the same reason, item does not appear.",
          href: "/cart",
        },
        {
          key: "checkout-lanes-offer-blocks-standard-only",
          label: "With an accepted offer pending (and no won auction), only the Cart tab's checkout is disabled — the Offers tab itself is checkoutable",
          href: "/cart",
        },
        {
          key: "auction-win-countdown-visible",
          label: "A won-auction cart line shows a live countdown next to \"payment required\" — days/hours/minutes remaining out of the 48-hour window — that ticks down while you watch",
          description: "Payment for a won auction is MANDATORY (unlike an accepted offer, which the buyer may walk away from). The deadline was being written by settlement and enforced by the expiry sweep, but nothing ever rendered it, so a win could silently lapse and be forfeited with no warning anywhere in the UI. Use auction-tester-sandbox-won.",
          href: "/cart",
        },
        {
          key: "auction-win-forfeits-after-deadline",
          label: "A won auction left unpaid past its 48-hour deadline is forfeited — the cart line disappears, the bid shows as forfeited, and the buyer is notified that repeated non-payment can restrict their account",
          description: "An accepted offer past its deadline must lapse quietly instead, with no penalty — walking away from your own offer is allowed. Confirm the two behave differently.",
          href: "/user/bids",
        },
        {
          key: "checkout-lanes-totals-scoped",
          label: "Each cart tab's summary total reflects ONLY that tab's items — the Cart tab total never includes a pending auction or offer amount, and vice versa",
          href: "/cart",
        },
        {
          key: "checkout-lanes-checkout-page-matches-tab",
          label: "Opening checkout from a specific cart tab lands on the matching lane, shows only that lane's items and total, and (for Auction/Offer lanes) shows an info banner and hides the coupon field",
          href: "/checkout",
        },

        // --- Mobile bar parity with the desktop summary ---------------------
        {
          key: "cart-mobile-bar-lane-scoped",
          label: "The mobile bottom bar's total matches the desktop Summary total on every cart tab, and both name which lane the total covers (\"This total covers your cart only\" / \"…your won auctions only\")",
          description: "The desktop Summary was converted to per-lane totals but the mobile bar was left reading the old blended figure, so the two disagreed on the same cart. Needs items in more than one lane — e.g. a normal product plus auction-tester-sandbox-won. Switch tabs and compare both viewports.",
          href: "/cart",
        },
        {
          key: "cart-mobile-bar-lane-gated",
          label: "On a cart tab that is not currently payable, the mobile Checkout button is disabled and shows the same blocking reason the desktop button shows — tapping it does nothing",
          description: "On a phone viewport with a won auction pending, open the Cart tab. The total still shows (so you can see what's there), but Checkout must be disabled with a reason naming the blocking lane. Previously the mobile button stayed enabled and navigated.",
          href: "/cart",
        },
        {
          key: "cart-mobile-checkout-carries-lane",
          label: "Tapping Checkout from the Won Auctions or Accepted Offers tab on mobile lands on the checkout page already on that lane (URL contains ?lane=auction or ?lane=offer)",
          description: "The desktop button already carried the lane; the mobile one navigated to a lane-less /checkout.",
          href: "/cart",
        },
        {
          key: "cart-select-all-lane-scoped",
          label: "\"Select all (N)\" counts only the items on the current tab, and \"Remove all\" never deletes won-auction or accepted-offer lines",
          href: "/cart",
        },

        // --- Expandable price breakdown -------------------------------------
        {
          key: "cart-breakdown-expand-mobile",
          label: "On mobile, the total row in the bottom bar shows an up-arrow; tapping it opens a panel ABOVE the checkout bar with the full price breakdown, and tapping again (or outside) closes it",
          href: "/cart",
        },
        {
          key: "cart-breakdown-expand-desktop",
          label: "On desktop, \"Show details\" in the Summary panel expands the same breakdown below the subtotal, and \"Hide details\" collapses it",
          href: "/cart",
        },
        {
          key: "cart-breakdown-aggregate-only",
          label: "The expanded breakdown shows ONE line per fee type (Shipping, WhatsApp updates, Gift wrap, Platform fee, GST…) with a \"(N stores)\" qualifier where a fee applies to several sellers — not a separate block per store",
          description: "Per-store detail belongs on each seller card, not in this panel. Confirm the two don't duplicate each other.",
          href: "/cart",
        },
        {
          key: "cart-breakdown-checked-items-only",
          label: "Deselecting an item lowers the breakdown's item count and every affected line; deselecting ALL of one seller's items removes that seller's shipping and add-on fees from the total entirely",
          description: "Use a two-seller cart. Deselect everything from seller B and confirm B's shipping leaves the breakdown and the total drops — the preview prices only what is actually being checked out.",
          href: "/cart",
        },
        {
          key: "cart-breakdown-no-coupon-on-locked-lanes",
          label: "The Won Auctions and Accepted Offers tabs show no coupon-discount line in the breakdown (those prices are already won/negotiated)",
          href: "/cart",
        },
        {
          key: "cart-guest-breakdown-fallback",
          label: "Signed out, the cart shows subtotals plus a \"Sign in to see shipping & fees\" note instead of fee lines — no error and no blank panel",
          href: "/cart",
        },

        // --- Per-store add-ons ----------------------------------------------
        {
          key: "cart-store-card-fee-lines",
          label: "Each seller card shows that seller's own shipping and add-on fees below its items, and those per-store figures add up to the matching lines in the expanded breakdown",
          href: "/cart",
        },
        {
          key: "cart-addons-per-store",
          label: "Ticking \"WhatsApp order updates\" on ONE seller's card charges the fee once (₹10, not ₹20 on a two-seller cart) and shows it under that seller only",
          description: "Requires Site Settings → Fees → WhatsApp notify fee enabled. Core regression guard: the selection used to be a single cart-wide checkbox while the fee was billed per seller, so one tick charged every store in the cart.",
          href: "/cart",
        },
        {
          key: "cart-addons-deselected-store-excluded",
          label: "Deselecting all of a seller's items disables that seller's add-on checkboxes with an explanation and removes their fees from the total; re-selecting restores both",
          href: "/cart",
        },
        {
          key: "cart-addons-persist-to-checkout",
          label: "Add-ons ticked per seller in the cart are still ticked against the SAME seller at checkout, and survive a page reload",
          description: "Tick gift wrap for seller A only, go to checkout, confirm A's block is ticked and B's is not, then reload and confirm it holds.",
          href: "/checkout",
        },
        {
          key: "cart-addons-editable-at-checkout",
          label: "Add-ons can still be changed on the checkout page itself, per seller — important because Buy Now skips the cart entirely",
          description: "Use Buy Now on a product without touching the cart page, and confirm checkout still offers that seller's add-on checkboxes and that ticking one updates the Order Summary total.",
          href: "/checkout",
        },
        {
          key: "cart-addons-hidden-when-disabled",
          label: "With an add-on disabled in Site Settings → Fees, its checkbox does not appear on any seller card in the cart or at checkout",
          href: "/cart",
        },
        {
          key: "cart-addons-order-record",
          label: "After placing a multi-seller order, only the seller whose add-on was ticked has that fee on their order — the other seller's order shows no add-on fee",
          href: "/user/orders",
        },
        {
          key: "order-addon-icons-visible",
          label: "An order that included add-ons shows icon chips for them (WhatsApp updates / Gift wrap / Protected) plus the coupon code, on the buyer's order page, the seller's order detail AND the admin order drawer",
          description: "These are fulfilment instructions, not decoration: WhatsApp tells the notifier to message this buyer on status change, and gift wrap tells the packer to wrap the parcel. Check all three surfaces — they render from one shared component, so if one is missing something is unwired.",
          href: "/user/orders",
        },
        {
          key: "order-gift-message-visible-to-seller",
          label: "When a buyer bought gift wrap and left a message, the seller sees the full message text on the order detail — not truncated and not hidden behind a tooltip",
          description: "The packer has to physically write or enclose it, so it must be readable in full.",
          href: "/store/orders",
        },
        {
          key: "order-addons-queryable",
          label: "Admin can filter the orders list down to orders that opted into a given add-on (e.g. only gift-wrap orders), so \"who do I need to do this for?\" is answered from the orders list itself and not a side list",
          href: "/admin/orders",
        },
        {
          key: "order-coupon-shown-all-lanes",
          label: "A coupon applied to an order is shown on the order for every lane — standard, won-auction and accepted-offer orders alike",
          href: "/user/orders",
        },

        // --- Platform fee ----------------------------------------------------
        {
          key: "platform-fee-capped",
          label: "The buyer's platform fee stops at the configured maximum instead of scaling with cart value",
          description: "With Site Settings → Fees at platform fee 5%, maximum platform fee ₹10, GST 18%: a ₹100 cart must show a ₹5.00 platform fee and ₹0.90 GST on it; a ₹700 cart must show ₹10.00 and ₹1.80 — NOT ₹35.00. Check the arithmetic, not just that a line exists.",
          href: "/checkout",
        },
        {
          key: "platform-fee-all-methods",
          label: "The platform fee is charged on every payment method — COD, UPI-manual/cash and Razorpay all include it; COD additionally shows the COD handling fee and the 10% token",
          description: "It used to be added only on the Razorpay path, so COD and UPI buyers were never charged it. Compare the same cart across each available method.",
          href: "/checkout",
        },
        {
          key: "platform-fee-charged-once",
          label: "A three-seller cart is charged the platform fee ONCE for the checkout, not once per seller",
          href: "/checkout",
        },
        {
          key: "platform-fee-sums-across-orders",
          label: "After placing a multi-seller order, the platform fees recorded on the resulting orders add up to exactly the single figure the cart and checkout showed — no rupee of drift",
          href: "/user/orders",
        },

        // --- The money has to agree everywhere -------------------------------
        {
          key: "cart-checkout-order-totals-agree",
          label: "For the same cart, the expanded cart breakdown, the sum of the per-seller card fee lines, the checkout Order Summary and the created orders all show the SAME total",
          description: "Repeat on COD, UPI-manual and Razorpay. Acceptance test for the whole pricing change — if any two of those four disagree, something is reading a different source than it charges from.",
          href: "/checkout",
        },
        {
          key: "addons-follow-cart-not-checkout-request",
          label: "Add-on fees are charged strictly according to the per-store checkboxes on the cart page — leaving the cart and returning, or re-entering checkout, never adds or drops an add-on on its own",
          description: "Hardened 2026-08-21. The add-on booleans used to be accepted in the checkout request body as well as being stored per-store on the cart, so two sources could disagree about what the buyer had actually selected — and the cart's selection is the only one the buyer ever saw. The request body no longer carries them at all. To test: tick gift wrap for seller A only, go to checkout and note the Total, press Back to the cart, then return to checkout — the same single gift-wrap fee must still be there, for seller A only, with an unchanged Total. Repeat having ticked nothing and confirm no add-on line ever appears.",
          href: "/cart",
        },
      ],
    },
    {
      pageKey: "buying-coupons",
      pageLabel: "Coupons — Scoping & Stacking",
      href: "/checkout",
      cases: [
        {
          key: "coupon-help-visible-cart",
          label: "The cart's order summary has an expandable \"How coupons work\" panel, collapsed by default",
          href: "/cart",
          description: "Open /cart with at least one item. Below the \"Apply coupons at checkout\" note there should be a collapsed \"How coupons work\" panel. Expand it and confirm it explains: one coupon per store, plus one platform-wide coupon, and why a coupon might not apply.",
        },
        {
          key: "coupon-help-visible-checkout",
          label: "The checkout coupon box has the same \"How coupons work\" panel, and it mentions re-checking at payment",
          description: "At checkout, below the coupon input and any error text. The checkout version has one extra line the cart version does not: that coupons are re-checked when you place the order. Confirm the wording matches the cart panel otherwise.",
        },
        {
          key: "coupon-help-visible-listing",
          label: "The public coupons listing shows the same \"How coupons work\" panel above the coupon grid",
          href: "/promotions",
          description: "Also check a store-scoped listing at /stores/store-beyblade-arena/coupons. Wording must be identical on all three surfaces (cart, checkout, listing) — any difference is a bug.",
        },
        {
          key: "coupon-stack-two-stores-plus-global",
          label: "Two store coupons AND one platform-wide coupon all apply to the same cart at once",
          description: "Build a cart with ≥₹1,000 from Beyblade Arena and ≥₹500 from LetItRip Official. At checkout apply ARENA25, then OFFICIAL10, then FREESHIP499. All three should stay applied and each should be listed in the applied-coupons list with its own discount amount. This is the headline behaviour — if any of the three is rejected, stop and report it.",
        },
        {
          key: "coupon-stack-second-store-coupon-rejected",
          label: "A second coupon for a store that already has one is declined with a clear message",
          description: "With ARENA25 applied, try SEALED20 (also Beyblade Arena). Expect a message naming the already-applied code, along the lines of \"A coupon for this store is already applied (ARENA25). Remove it first.\" The first coupon must stay applied — it must not be silently swapped.",
        },
        {
          key: "coupon-stack-second-global-rejected",
          label: "A second platform-wide coupon is declined with a clear message",
          description: "With FREESHIP499 applied, try BLADER50 (also platform-wide, needs ≥₹2,000). Expect \"Only one platform-wide coupon can be applied at a time (FREESHIP499). Remove it first.\" Then remove FREESHIP499 and confirm BLADER50 now applies — i.e. the slot frees up.",
        },
        {
          key: "coupon-stack-duplicate-code-rejected",
          label: "Applying the exact same code twice is declined",
          description: "Apply ARENA25, then type ARENA25 again. Expect \"Coupon ARENA25 is already applied.\" and no duplicate row in the applied list.",
        },
        {
          key: "coupon-store-scope-limited-to-its-own-items",
          label: "A store coupon only discounts that store's items, not the whole cart",
          description: "With items from both stores in the cart, apply only ARENA25 (25%, max ₹500). The discount must be computed from the Beyblade Arena items alone — it should NOT change if you add or remove LetItRip Official items (unless the Arena subtotal itself crosses the ₹1,000 minimum).",
        },
        {
          key: "coupon-min-purchase-uses-eligible-subtotal",
          label: "Minimum spend is measured against the coupon's eligible items, not the whole cart total",
          description: "ARENA25 needs ₹1,000. Put ₹600 of Beyblade Arena items plus ₹900 of LetItRip Official items in the cart — cart total is ₹1,500 but the Arena-eligible subtotal is only ₹600, so ARENA25 must be REJECTED for not meeting the minimum. A cart-total-based check would wrongly accept it.",
        },
        {
          key: "coupon-category-restriction-rejects-non-matching-cart",
          label: "A category-restricted coupon is rejected when the cart has none of those categories",
          description: "SEALED20 is restricted to the Burst and X categories. With a Beyblade Arena cart of ONLY Original/Metal-generation items, applying SEALED20 must be declined with a category-related message. Previously category restrictions were ignored entirely and it would have been accepted and discounted the whole store — that is the regression this case guards.",
        },
        {
          key: "coupon-category-restriction-accepts-matching-cart",
          label: "The same category-restricted coupon IS accepted once a matching item is in the cart",
          description: "Continuing from the case above: add a Burst or X generation Beyblade to the cart, then apply SEALED20 again. It should now be accepted, and the discount should be based only on the Burst/X items — not on the Original/Metal items sharing the cart.",
        },
        {
          key: "coupon-remove-one-of-many",
          label: "Removing one coupon from a stack leaves the others applied and recalculates the total",
          description: "With three coupons applied, remove the middle one. The other two must remain, the total must go up by exactly the removed coupon's amount, and the Order Summary discount line(s) must update to match.",
        },
        {
          key: "coupon-summary-total-matches-sum",
          label: "The Order Summary's discount equals the sum of the applied coupons",
          description: "With a stack applied, add up the individual coupon amounts in the applied-coupons list and compare against the \"Coupon discount\" line in the Order Summary. They must agree. Also confirm the Total equals Subtotal − discount + shipping + fees + GST.",
        },
        {
          key: "coupon-persists-across-reload",
          label: "Applied coupons survive a page reload and are still there when you return to checkout",
          description: "Apply a stack, reload the checkout page, and confirm all coupons are still listed with the same amounts. Then navigate to the cart and back to checkout — still there.",
        },
        {
          key: "coupon-split-across-per-store-orders",
          label: "After placing a multi-store order, each store's order shows its own share of the discount",
          href: "/user/orders",
          description: "Check out a multi-store cart carrying a platform-wide coupon plus at least one store coupon. A multi-store cart creates one order PER STORE. Open each resulting order: the store coupon must appear only on its own store's order, the platform-wide coupon must appear on every order as a proportional share, and the shares across all orders must add up to the discount shown at checkout.",
        },
        {
          key: "coupon-all-codes-listed-on-order",
          label: "An order placed with several coupons lists every one of them, not just the first",
          href: "/user/orders",
          description: "Open the order detail page and the invoice page for an order placed with 2+ coupons. Both must show a separate discount line per coupon, each naming its code. Previously only the first coupon's code was shown — a single \"Discount (CODE)\" line for a multi-coupon order is the bug this case guards.",
        },
        {
          key: "coupon-expired-in-cart-dropped-at-placement",
          label: "A coupon that expired while sitting in the cart is dropped at placement instead of being honoured",
          description: "Needs an admin: apply a coupon at checkout, then have an admin deactivate or expire it in /admin/coupons, then place the order without touching the cart. The order must be priced WITHOUT that coupon, and the buyer must be told it was removed — the order must not silently charge the pre-discount amount without explanation, and must not honour a dead coupon.",
        },
        {
          key: "coupon-usage-limit-increments-after-order",
          label: "Placing an order increments the coupon's usage count and counts against your per-user limit",
          description: "Note a coupon's current usage in /admin/coupons, place an order using it, then re-check. Usage must have gone up by one. Then, for a coupon with perUserLimit 1, try to apply it again on a new cart — it must be refused as limit-reached.",
        },
        {
          key: "coupon-wallet-apply-lands-on-checkout",
          label: "\"Use\" on a claimed coupon in My Coupons carries the code through to checkout",
          href: "/user/coupons",
          description: "From /user/coupons press Use on an active coupon. You should end up on checkout with that coupon already applied (it may route via /cart first). If the coupon can't apply to your current cart, the reason must be shown rather than failing silently.",
        },
        {
          key: "coupon-auction-offer-lane-no-coupon-field",
          label: "Auction and Offer checkout lanes hide the coupon field entirely",
          description: "Open checkout from the Auction or Offer cart tab. The coupon input and the \"How coupons work\" panel should not be shown at all for those lanes, and an info banner should explain why.",
        },
      ],
    },
    {
      pageKey: "offers",
      pageLabel: "Offers",
      href: "/products",
      cases: [
        {
          key: "make-offer",
          label: "Making an offer on a product's detail page works and the seller receives a notification",
          href: "/products",
        },
        {
          key: "seller-sees-and-can-act-on-offers",
          label: "A seller's Offers page (/store/offers) actually lists incoming offers, and Accept / Decline / Counter all work from the row menu",
          description: "Fixed 2026-08-21 — the page rendered the view with no handlers at all (so the row menu had nothing but a status badge), and separately the view read an API response key (`offers`) the route never sent (it sends `items`), so the list rendered empty even before the handler gap. Make an offer as a buyer, then confirm the seller can see it, open its details, and Accept/Decline/Counter each work.",
          href: "/store/offers",
        },
        {
          key: "buyer-sees-offer-status-changes",
          label: "\"My Offers\" (/user/offers) actually lists the buyer's offers and reflects accept/decline/counter as the seller responds",
          description: "Fixed 2026-08-21 — the panel read `json.items` off a response the API always wraps as `{success, data:{items}}`, so it showed \"No offers yet\" for every buyer regardless of how many offers existed.",
          href: "/user/offers",
        },
        {
          key: "offer-seller-can-read-before-acting",
          label: "Before accepting/declining/countering, the seller can open a \"View details\" panel showing the buyer's note, listed vs. offered price, and expiry — not just a bare row with action buttons",
          href: "/store/offers",
        },
        {
          key: "counter-offer-has-a-form",
          label: "Countering an offer opens a form asking for the counter amount (and an optional note) — it is not a bare confirm with no input",
          description: "Fixed 2026-08-21 — the counter action previously took no input at all, so it had no real caller anywhere in the codebase.",
          href: "/store/offers",
        },
        {
          key: "offer-accept-checkout-charges-agreed-price",
          label: "Accepting an offer, then completing checkout from the Offers cart tab, charges the NEGOTIATED price — not the listing's current price",
          description: "Fixed 2026-08-21 — every copy of the checkout price calculation ignored the offer's locked price and billed the listing price instead, while the cart UI displayed the correct negotiated figure — so the buyer saw one number and was charged another. Accept an offer below the listing price, complete checkout, and confirm the order total matches the AGREED amount.",
          href: "/user/offers",
        },
        {
          key: "offer-flips-to-paid-after-order",
          label: "After completing checkout on an accepted offer, the offer's status becomes \"paid\" and it can't be added to the cart or checked out again",
          description: "Fixed 2026-08-21 — the \"paid\" status existed in the schema but had no server-side writer anywhere, so an accepted offer stayed re-orderable indefinitely.",
          href: "/user/offers",
        },
        {
          key: "offer-expired-accepted-cannot-checkout",
          label: "An accepted offer past its 48-hour checkout window can no longer be checked out, and is cleared from the cart with a notification to the buyer",
          description: "Background/low-priority — requires waiting out the window or adjusting the fixture's checkoutDeadline.",
        },
        {
          key: "nav-item-invalid-href-inline",
          label: "A nav item with a bad destination is refused on the FIELD, not by a banner",
          description: "The routes always validated nav items; the form did not, so an invalid href came back as a 400 after a round-trip. Enter \"products\" (no leading slash) and confirm the error appears under the Destination field.",
          href: "/admin/navigation",
        },
        {
          key: "homepage-section-invalid-config-inline",
          label: "A homepage section with malformed config JSON, or a negative order, is refused inline",
          description: "Same shape: the route validated, the form did not. Paste broken JSON into Config, and separately set Order to -1 — each should report on its own field.",
          href: "/admin/sections",
        },
        {
          key: "classified-keeps-meetup-city",
          label: "A classified listing still has its meetup city after saving",
          description: "Regression test for CONFIRMED silent data loss found 2026-08-24: the product create schema stripped every key it did not name, and it named NONE of the classified / digital-code / live-item / prize-draw fields. A seller filled them in, pressed Publish, saw a success — and the fields were dropped before the write. Create a classified with a meetup city and contact method, save, then reopen it: both must still be there.",
          href: "/store/classified/new",
        },
        {
          key: "live-item-keeps-species-and-cites",
          label: "A live-item listing keeps its species, transport method, permitted jurisdictions and CITES reference",
          description: "Same bug. Jurisdiction is the one that matters most — shipping a live animal into a territory that forbids it is exactly what that field exists to prevent, and it was being discarded.",
          href: "/store/live/new",
        },
        {
          key: "digital-code-keeps-delivery-method",
          label: "A digital-code listing keeps its delivery method and pool size",
          href: "/store/digital-codes/new",
        },
        {
          key: "prize-draw-keeps-entry-price",
          label: "A prize draw keeps its price per entry and maximum entries",
          href: "/store/prize-draws/new",
        },
        {
          key: "per-type-fields-survive-EDIT-too",
          label: "Editing a classified's TITLE does not wipe its meetup city",
          description: "The fix had to cover the update path as well as create — a create-only fix would mean the listing saved correctly and then lost its per-type block the first time anyone edited anything else (Root Cause #39).",
          href: "/store/classified",
        },
        {
          key: "notification-email-is-a-real-email",
          label: "A notification email has a heading, a lead line and a button — not one bare paragraph",
          description: "`emailHtml` existed on the input since the channel was built and 0 of 40 call sites passed it, so all 28 notification types shipped `<p>{message}</p>`. Trigger any notification that emails (place an order as a buyer). The mail must carry the site header, a bold title, a one-line lead saying what kind of mail it is, the message, and a CTA button.",
          href: "/user/notifications",
        },
        {
          key: "notification-click-lands-on-the-right-page",
          label: "Clicking a notification opens the record it is about, in YOUR portal",
          description: "actionUrl was set by 5 of 40 writers, so 35 notifications had nothing to click. It is now resolved centrally from relatedType + relatedId + audience. Check that an order notification opens /user/orders/view/... for the buyer and /store/orders/.../view for the seller — the SAME event, two destinations. A bid or offer lands on the list, deliberately: no per-record page exists in any role yet.",
          href: "/user/notifications",
        },
        {
          key: "admin-can-filter-every-notification-type",
          label: "The admin notifications filter offers all 28 types, and no imaginary ones",
          description: "The chips came from a hand-written 9-value list while the document held 27 — so 18 real types were unfilterable and two chips (`review_posted`, `payout_processed`) matched zero rows because no notification has ever had those values. The list is derived now. Confirm `offer_received` and `payment_review` are both present.",
          href: "/admin/notifications",
        },
        {
          key: "admin-can-allowlist-every-type-per-channel",
          label: "Site Settings can allow-list offer and payment-review notifications for email",
          description: "Same 9-value list fed the per-channel allow-list, so an admin literally could not allow-list `offer_received` or `payment_review` — the toggle did not exist. Open Site Settings → Notifications and confirm every type appears in the per-channel type picker.",
          href: "/admin/site",
        },
        {
          key: "notification-optout-is-honoured-for-emi-and-payment",
          label: "Turning off order updates actually stops EMI and payment-review emails",
          description: "`typeToPrefsKey` was a Partial map missing `emi_installment_due_soon`, `emi_installment_overdue` and `payment_review` — and a missing key meant the opt-out check never ran, so the user's setting was silently ignored while reading as honoured. Turn off Order updates in /user/settings, then trigger a payment-review notification and confirm no email arrives.",
          href: "/user/settings",
        },
        {
          key: "ticket-resolution-timestamp-stamped",
          label: "Resolving a support ticket records WHEN it was resolved",
          description: "`resolvedAt` and `closedAt` were declared on the document, had field-name constants, were listed in the update input — and nothing had ever written either (verified 2026-08-26), so no resolved ticket carried a resolution time. Move a ticket to Resolved, reopen it, and confirm the timeline shows a real date on that step. Re-save an unrelated field afterwards: the resolution time must NOT move forward.",
          href: "/admin/support-tickets",
        },
        {
          key: "payout-utr-actually-saves",
          label: "The UTR entered when marking a payout paid is still there on reload",
          description: "The mark-paid modal REQUIRES a transaction reference, the route declared it, its own test asserted it reached the action — and the action picked only status/adminNote/processedAt, so the UTR was dropped while the 200 echoed it back as if stored. Mark a payout paid with a reference, reload the payout, and confirm 'Transaction ref' shows it.",
          href: "/admin/payouts",
        },
        {
          key: "store-approval-makes-it-public",
          label: "Approving a pending store actually makes it visible on /stores",
          description: "`status` and `isPublic` are two distinct fields and public visibility gates on `isPublic`. The admin PATCH wrote `status` directly and never touched `isPublic`, so an approved store was active AND invisible with no error anywhere. Approve `store-blader-bazaar`, then open /stores and confirm it appears.",
          href: "/admin/stores",
        },
        {
          key: "store-timeline-shows-who-suspended",
          label: "A suspended store's page shows who suspended it, when, and why",
          description: "Previously recoverable only from /admin/audit-log, which a store owner can never see. Suspend a store with a reason, open its admin detail page, and confirm the History block names the admin, the time, and the reason.",
          href: "/admin/stores",
        },
        {
          key: "payout-failure-reasons-survive-retries",
          label: "A payout that failed twice shows BOTH reasons, not just the last",
          description: "`lastFailureReason` is overwritten by every retry, so the timeline is the only place earlier attempts survive. Also confirm the four dispatch fields (razorpayPayoutId, razorpayStatus, failureCount, lastFailureReason) render — they were written by the batch and UNDECLARED on the document until 2026-08-26, so nothing could safely surface them.",
          href: "/admin/payouts",
        },
        {
          key: "bid-timeline-explains-forfeited",
          label: "A forfeited bid says why it was forfeited",
          description: "Open a forfeited bid from /admin/bids. The History block must read 'Forfeited' with the system actor and the reason 'The 48-hour checkout window closed without payment.' A bid moves through more states than any record a buyer owns and every one of them happened inside a settlement batch with nothing recording it.",
          href: "/admin/bids",
        },
        {
          key: "catalogue-rejection-reason-survives",
          label: "A catalogue item rejected twice keeps both reasons",
          description: "`rejectionReason` holds only the last decision. Reject a submission, have the owner resubmit, reject again with a different reason — the approval modal's History block must show both, each with its own date.",
          href: "/admin/catalogue-approvals",
        },
        {
          key: "history-absent-renders-empty-not-invented",
          label: "A record created BEFORE history existed shows 'no recorded history', not a made-up date",
          description: "Never fabricate a timestamp. Open any store, payout or ticket that predates this feature: the History block must say there is none, NOT derive a step from `updatedAt` — 'last write of any kind' is not an event, and a made-up date makes the record lie.",
          href: "/admin/stores",
        },
        {
          key: "history-carries-no-pii",
          label: "No name or email appears anywhere in a record's History block",
          description: "`encryptPiiFields` is a flat top-level loop that never descends into arrays, so a PII value inside statusHistory would be stored in PLAINTEXT. Every entry shows a ROLE (Admin/System/Buyer/Store) and never a name. Check a payout (sellerEmail/upiId), a bid (userName/userEmail) and a scammer profile (built entirely of identifying details).",
          href: "/admin/payouts",
        },
        {
          key: "form-errors-wait-for-first-submit",
          label: "Opening the address form shows NO errors until you press Save",
          description: "Live bug fixed 2026-08-26: every schema-driven form greeted the user with a list of its own requirements as errors before they had typed anything. Two causes compounded — <FormErrorSummary> was deliberately un-gated, and ~20 views run validate(draft) in a mount effect, so an untouched empty draft failed every .min(1) on first paint. Open /user/addresses/new: the summary block must be absent. Press Save with the form empty: NOW it lists the missing fields.",
          href: "/user/addresses/new",
        },
        {
          key: "form-errors-stay-live-after-first-submit",
          label: "After a failed Save, the error list SHRINKS as you fill fields in",
          description: "The fix gates the DISPLAY, not the computation — the live validation underneath is what makes the list useful. Press Save on an empty address form, then fill Full name. The summary must drop that entry immediately, without a second Save. If the list is frozen, the on-mount validate() was removed instead of gated, which is the wrong fix.",
          href: "/user/addresses/new",
        },
        {
          key: "form-mobile-bar-pinned",
          label: "On a phone, Save and Cancel are pinned above the tab bar on the address form",
          description: "Added 2026-08-26 (W21). Narrow the window below 1024px, or use a real phone. Save/Cancel should sit in the same fixed bar the cart uses for 'Proceed to checkout' — above the bottom tab bar, not scrolled off the end of a long form. On desktop the bar is hidden and the inline Save/Cancel row at the bottom of the form is the control.",
          href: "/user/addresses/new",
        },
        {
          key: "form-mobile-error-sheet",
          label: "On a phone, a failed Save opens a 'Fix N issues' sheet you can tap through",
          description: "Below 1024px, press Save on an empty address form. A 'Fix 6 issues' row must appear above the buttons with the list already open. Collapse it, press Save again — it must RE-open (the count is a counter, not a boolean, precisely so a second attempt is a new event). Tapping an entry on a sectioned form jumps to that field.",
          href: "/user/addresses/new",
        },
        {
          key: "form-bar-restores-listing-bulk-bar",
          label: "Closing a form drawer over a listing brings the listing's bulk bar back",
          description: "Regression test for the singleton clobber: there is ONE bottom bar per route and DataListingView claims it on ~70 admin screens. Select a few rows on an admin listing so the bulk bar appears, open a row's editor drawer, then close it — the bulk bar must still be there with the selection intact. Before the claim stack landed, the drawer overwrote it and blanked it on close.",
          href: "/admin/products",
        },
        {
          key: "form-bar-absent-inside-a-modal",
          label: "A form inside a modal or drawer does NOT get a second bar at the bottom of the screen",
          description: "An overlay owns its own footer, and a viewport-fixed bar would render behind the backdrop, below the dialog it belongs to. Open any drawer-based editor on a phone-width window and confirm the only Save/Cancel controls are the ones inside the drawer.",
          href: "/admin/coupons",
        },
        {
          key: "address-routes-normalised",
          label: "Adding and editing an address works, and the OLD urls still resolve",
          description: "/user/addresses/add and /user/addresses/edit/[id] were the only two non-standard route shapes in the app; every other entity uses /new and /[id]/edit. Both old paths are kept as redirects, so a bookmark still works. Check the buttons on the addresses page, then visit /user/addresses/add directly and confirm it lands on /user/addresses/new.",
          href: "/user/addresses",
        },
        {
          key: "custom-role-rejects-fake-permissions",
          label: "A custom role cannot be saved with a permission this system does not define",
          description: "Regression test for a real gap found 2026-08-24: both the create and update routes spread the raw request body into Firestore with NO validation, and neither page had a schema. Enter \"admin:widgets:frobnicate\" in the permissions box — it should be refused and NAMED. A permission outside the catalogue never matches anything, so the role would have read as configured and granted nothing.",
          href: "/admin/roles/new",
        },
        {
          key: "custom-role-edit-does-not-rewrite-creator",
          label: "Editing a role does not change who created it",
          description: "The edit page used to PATCH the whole loaded document — id, createdAt, createdBy and slug included — so any save re-attributed the privilege grant and could change the role's stable identifier. Edit a role, save, and confirm its creator and slug are unchanged.",
          href: "/admin/roles",
        },
        {
          key: "custom-role-rejects-empty",
          label: "A role with no name cannot be created",
          href: "/admin/roles/new",
        },
        {
          key: "bid-row-opens-in-all-three-portals",
          label: "A bid can be OPENED, not just seen — as a buyer, as a seller, and as an admin",
          description: "All three bid listings were dead ends: a row could be seen and never opened, so the amount, auction, timing and outcome existed only as a table row. Open one from /user/bids, /store/bids and /admin/bids and confirm each shows the auction, amount, when it was placed and its status.",
          href: "/user/bids",
        },
        {
          key: "bid-detail-hides-bidder-from-buyer",
          label: "A buyer's own bid detail does NOT show a bidder name; the seller and admin views DO",
          description: "One shared field builder serves all three portals, gated on the viewer's role — so a copy-paste cannot start showing one buyer another's identity.",
          href: "/user/bids",
        },
        {
          key: "admin-bid-view-before-cancel",
          label: "The admin bid row menu offers View before Cancel",
          description: "It previously offered ONLY Cancel — a destructive action on a record the admin had never been able to read. A menu of pure mutations is not a detail affordance (Root Cause #56).",
          href: "/admin/bids",
        },
        {
          key: "bid-row-keyboard-reachable",
          label: "A bid row can be opened with the keyboard, and public bid history rows still cannot",
          description: "Rows are only focusable when they are actually interactive. On an auction's PUBLIC bid history the same table renders with no row handler, so those rows must not be tab stops.",
          href: "/user/bids",
        },
        {
          key: "listing-template-edit-page-works",
          label: "Editing a listing template loads, saves and deletes — the page is not a 404",
          description: "Regression test for a real bug found 2026-08-24: /api/store/listing-templates/[id] did not exist, while the constant, the edit page's three calls (GET on load, PATCH on save, DELETE) and the list page's Edit button all did. Clicking Edit gave a page that 404'd on load, on save and on delete. Open a template from the list, change its name, save, reopen.",
          href: "/store/listing-templates",
        },
        {
          key: "listing-template-not-editable-across-stores",
          label: "One seller cannot open another seller's listing template by URL",
          description: "The new route checks the template's storeId against the caller's own store and returns \"not found\" (deliberately not \"forbidden\", which would confirm the id exists).",
          href: "/store/listing-templates",
        },
        {
          key: "payout-method-rejects-blank-bank-details",
          label: "A BANK payout method cannot be saved with a blank account number, IFSC or holder name",
          description: "This was validated at ZERO layers: the fields were bare inputs with no `required` and no pattern, the page's onSave checked nothing, and both the POST and PATCH routes wrote the raw request body straight into Firestore. An empty bank payout method saved cleanly and only failed at payout time. Select Bank account, leave the fields blank, save — each should be refused on the field itself.",
          href: "/store/payout-methods/new",
        },
        {
          key: "payout-method-rejects-bad-ifsc",
          label: "An IFSC code of the wrong shape is refused",
          description: "Enter \"ABC123\" as the IFSC. It should be refused inline with the expected format, matching the rule Payout Settings already enforces. Then check a UPI method rejects a VPA with no @.",
          href: "/store/payout-methods/new",
        },
        {
          key: "shipping-config-rejects-rateless-rule",
          label: "A \"flat\" shipping rule with no flat rate is refused, and a negative rate is refused",
          description: "Both the page and the route used to accept anything — the route spread the raw body into Firestore, so a rate of \"abc\" or a negative free-above threshold was persisted verbatim.",
          href: "/store/shipping-configs/new",
        },
        {
          key: "grouped-listing-count-not-caller-settable",
          label: "A grouped listing's member count always matches its member list",
          description: "activeMemberCount is derived from productIds.length by the route and is no longer accepted from the request body — it is what the public visibility check reads, so a caller-supplied count could have hidden or shown a group incorrectly.",
          href: "/store/grouped-listings",
        },
        {
          key: "store-feature-new-actually-creates",
          label: "Creating a store feature badge from /store/features/new actually creates it",
          description: "Regression test for a real bug found 2026-08-24: that page collected a single Label, validated it was non-empty, then navigated back to the list WITHOUT calling any API — the badge was silently discarded and the seller saw a normal success flow. It now renders the real editor, so all ten fields are present and the badge appears in the list afterwards.",
          href: "/store/features/new",
        },
        {
          key: "store-feature-edit-page-exists",
          label: "A store feature badge can be edited on its own page, not only in a drawer",
          description: "ROUTES.STORE.FEATURES_EDIT used to point at /store/features/[id]/edit with no page behind it. The page exists now, but nothing links to it yet — so open a badge's edit page directly by URL and confirm it loads with that badge's current values, not an empty form.",
          href: "/store/features",
        },
        {
          key: "feature-editor-validates",
          label: "The feature badge editor reports what is wrong instead of just disabling Save",
          description: "It had NO validation: ten fields, `required` on the inputs (an HTML attribute a programmatic submit bypasses), and nothing else — max lengths, display-order bounds and the product-types minimum were never checked. Submit with an over-long label, or a store-scoped badge with no store selected, and confirm the error appears on the field itself.",
          href: "/admin/features/new",
        },
        {
          key: "store-category-rejects-empty",
          label: "A storefront category with no label cannot be created",
          description: "Both the form AND the route used to accept anything — the page had raw inputs with no validation and the API spread the request body straight into Firestore, so a completely empty category could be saved. They now share one schema. Confirm an empty Label is refused inline, not by a generic \"Save failed\" toast.",
          href: "/store/categories/new",
        },
        {
          key: "blog-editor-sections-not-steps",
          label: "The blog editor shows every field at once in collapsible sections — not a 4-step wizard that blocks step 2",
          description: "Open any post. Content / Media / SEO & Tags / Publish should all be reachable immediately, with ONE Save button at the bottom. Previously a missing title blocked access to every later step, so a post could become uneditable because of a field on page 1.",
          href: "/admin/blog",
        },
        {
          key: "blog-existing-post-slug-is-valid",
          label: "Opening an EXISTING blog post shows no error on the Slug field",
          description: "Regression test for a real bug found 2026-08-24: the form required slugs to start with `blog-`, but all 20 stored posts hold the bare slug (the `blog-` prefix is on the document ID, not the slug field, and the public URL uses the bare form). Every existing post therefore opened with an invalid Slug, and correcting it to satisfy the rule would have changed the stored slug and 404'd the live URL.",
          href: "/admin/blog",
        },
        {
          key: "blog-new-post-url-matches-existing",
          label: "A newly created post's public URL has the same shape as an existing post's — no doubled `blog-` segment",
          description: "Create a post titled \"Test Slug Shape\", save, then open it publicly. The URL should read /blog/test-slug-shape, matching every seeded post.",
          href: "/admin/blog/new",
        },
        {
          key: "blog-readtime-updates-on-edit",
          label: "Editing a post's body updates its \"N min read\" estimate",
          description: "It used to be computed on create only, so the estimate froze at whatever the first draft was (Root Cause #39 — a CREATE transform with no UPDATE counterpart). Add several paragraphs to an existing post, save, and confirm the read time grows.",
          href: "/admin/blog",
        },
        {
          key: "blog-error-summary-jumps-to-section",
          label: "Clearing the title shows an error summary whose link OPENS the right section and focuses the field",
          description: "The jump was dead before this work — the section list was hardcoded empty in both context paths, so the summary's link resolved to nothing for every form in the app.",
          href: "/admin/blog",
        },
        {
          key: "blog-media-survives-collapse",
          label: "Collapsing the Media section mid-upload does NOT cancel the upload",
          description: "Collapsible panels unmount their children by default, which discards an in-flight transfer. The Media section is explicitly kept mounted.",
          href: "/admin/blog",
        },
        {
          key: "event-editor-sections-not-steps",
          label: "The event editor shows Details / Media / Settings / Raffle as sections, all reachable at once",
          description: "The old wizard gated Settings behind Details validating, so a missing end date made a poll's options unreachable. Also confirm the per-type rules still surface inline: an Offer event with no coupon, and a Poll with fewer than 2 options, should each show an error on the field itself rather than a step-blocking banner.",
          href: "/admin/events",
        },
        {
          key: "offer-history-timeline-renders",
          label: "An offer shows a timeline of every phase it went through, each stamped with who did it and when",
          description: "Open any offer on My Offers and expand its history. Offer made / countered / accepted / paid should each appear with a real timestamp and a Buyer or Store tag. Before this existed, an offer showed only its current status — the negotiation that produced it was not merely un-displayed, it was destroyed: each counter created a brand-new unlinked document.",
          href: "/user/offers",
        },
        {
          key: "offer-history-legacy-no-fabricated-date",
          label: "An offer with NO recorded history still renders a timeline, and its Expired step shows an em-dash rather than a made-up date",
          description: "Open the X Wizard Arrow expired offer — it is seeded deliberately without statusHistory, which is the exact shape of every offer written before this feature. Its timeline must still render, and the Expired step must show a dash, not a date. A date there would be fabricated: expireMany never wrote one, updatedAt means \"last write of any kind\", and expiresAt is a deadline rather than an event.",
          href: "/admin/offers",
        },
        {
          key: "offer-chain-walks-three-rounds",
          label: "A three-round negotiation reads as ONE story, oldest first, with rounds 1 and 2 labelled Superseded — never Withdrawn",
          description: "Open the Metal Storm Pegasus offer in the admin list. All three rounds should appear on one rail under Round 1 / Round 2 / Round 3 dividers, each with its own note. The first two rounds are stored as withdrawn but carry supersededByOfferId, and must read neutral: the buyer did not walk away, they countered. Contrast the Driger V offer, a genuine walk-away, which reads Withdrawn.",
          href: "/admin/offers",
        },
        {
          key: "offer-detail-opens-on-fresh-data",
          label: "Opening an offer row fetches that offer, rather than showing whatever the list last cached",
          description: "Open an offer, close it, have the seller respond in another session, then reopen the same row — the panel should show the new state without a full page reload, and the chain should be present.",
          href: "/admin/offers",
        },
        {
          key: "admin-offer-cancel-requires-reason",
          label: "Admin Cancel opens a form demanding a reason — a short one is rejected inline, and a valid one reaches the buyer, the audit log AND the offer's own timeline",
          description: "Cancel an offer as an admin. Type fewer than 10 characters: it must be refused before submitting. Then give a real reason and confirm four things: the offer is cancelled, the buyer's locked cart line is cleared (their whole cart is otherwise blocked by the offer lane), the buyer's notification quotes the reason, and the action appears in both /admin/audit-log and the offer's own timeline. Previously the route accepted a reason and never read it, so the buyer was told nothing.",
          href: "/admin/offers",
        },
        {
          key: "admin-cannot-accept-or-counter",
          label: "The admin row menu offers only View and Cancel — never Accept, Counter or Decline",
          description: "The store keeps sole authority over its own pricing; admin is a coordinator, and cancel is an escalation that is itself recorded. There should also be no bulk Cancel: one shared reason across a mixed selection is worse audit data than none.",
          href: "/admin/offers",
        },
        {
          key: "store-still-accepts",
          label: "The store can still Accept, Counter and Decline its own offers after the admin surface was added",
          href: "/store/offers",
        },
      ],
    },
    {
      pageKey: "reviews",
      pageLabel: "Reviews",
      href: "/reviews",
      cases: [
        { key: "leave-review", label: "Leaving a review with rating + photo works" },
        { key: "view-seller-reviews", label: "Viewing a seller's reviews on their store page works" },
        { key: "seller-response", label: "Seller responding to a review works" },
        {
          key: "review-detail-related-sections",
          label: "An individual review's permalink page (/reviews/[id]) shows \"More reviews for [product]\" and \"More reviews for [store]\" sections with real reviews, not empty",
          description: "Verify against review-7 (the first review on \"Beyblade Original — Dranzer S\"), reachable via My Reviews or a store's Reviews tab.",
          href: "/reviews",
        },
        {
          key: "review-photos-render",
          label: "A review's uploaded photos actually render — on the review-detail permalink page, the reviews list on a product/store page, and the admin \"View review\" modal — not a fallback icon",
          description: "A 2026-08-19 type mismatch (review images stored as plain URL strings but read as {url,thumbnailUrl} objects) meant every review photo silently fell back to a placeholder icon everywhere. Leave a review with a photo, then confirm it renders on all three surfaces.",
          href: "/reviews",
        },
      ],
    },
    {
      pageKey: "reviews-pagination",
      pageLabel: "Reviews — Pagination, Sort & Filter",
      // "Beyblade Original Dranzer S" is the deep-review fixture: 19 approved reviews
      // spread across all five star ratings, so it is the only product where page 2
      // and the rating filter have anything to show.
      href: "/products/product-beyblade-original-dranzer-s",
      cases: [
        {
          key: "detail-tab-paginates",
          label: "The Reviews tab on a product page shows at most 10 reviews with page controls underneath — it does NOT dump every review into one endlessly long tab",
          description: "Open the Dranzer S product page and click the Reviews tab. It has 19 approved reviews, so you should see 10 and a pager offering page 2. Before this change every approved review rendered at once, which is what made these pages so long.",
        },
        {
          key: "detail-tab-newest-first",
          label: "Reviews are ordered newest first by default (the dates run downward as you read down the list)",
        },
        {
          key: "detail-tab-page-2-differs",
          label: "Page 2 shows DIFFERENT reviews from page 1 — not a repeat of the same 10",
          description: "This is the one to be fussy about. The first page is server-rendered and handed to the browser cache; if that hand-off is wired wrong, page 2 silently re-displays page 1's reviews. Note the top review's title on page 1, go to page 2, and confirm it is not there.",
        },
        {
          key: "detail-tab-url-unchanged",
          label: "Paging through reviews on a product page does NOT change the page URL, and does not reload/flicker the rest of the product page (gallery, price, Add to Cart all stay put)",
          description: "Deliberate: on a detail page the review pager keeps its state in the component, because writing it to the URL would re-run the whole product page just to turn a page of reviews.",
        },
        {
          key: "detail-tab-sort",
          label: "The sort dropdown in the Reviews tab works — Newest / Oldest / Highest rated / Lowest rated each reorder the list correctly",
        },
        {
          key: "detail-tab-rating-filter",
          label: "Filtering by star rating in the Reviews tab works — picking 5★ shows only 5-star reviews, and the result count/pager updates to match",
          description: "Open the Filters drawer in the Reviews tab. The fixture has reviews at every star level from 1 to 5. If this shows an error or an empty list for every rating, the Firestore index for it has not been deployed yet — report that.",
        },
        {
          key: "detail-tab-summary-stable",
          label: "The average rating and total review count above the list describe ALL reviews — they do not shrink when you apply a rating filter",
          description: "Note the \"x.x / 5 · N reviews\" line, then filter to 5★ only. The list shortens but that summary line should stay the same, because it describes the product overall, not the current filter.",
        },
        {
          key: "detail-tab-filters-all-work",
          label: "Every control shown in the Reviews tab's Filters drawer actually does something — there is no filter you can set that changes nothing",
          description: "A filter that renders but is never applied looks broken to a buyer. Set each control in turn and confirm the list responds.",
        },
        {
          key: "date-range-sort-options",
          label: "While a review date range is set, the sort dropdown offers only the date-based sorts — and choosing a date range never produces an error page",
          description: "Set a From/To date in the Filters drawer. \"Highest rated\"/\"Lowest rated\" are withdrawn on purpose while a date range is active — the database cannot serve that combination, so it is hidden rather than allowed to fail.",
        },
        {
          key: "other-listing-types-paginate",
          label: "The Reviews tab paginates the same way on a digital-code and a live-item page, not just standard products",
          href: "/digital-codes/digitalcode-beyblade-x-app-unlock",
        },
        {
          key: "auction-store-reviews-paginated",
          label: "An auction page's \"Store Reviews\" section is paginated and genuinely newest-first — not a fixed block of 10 with no way to see more",
          description: "Previously this section showed exactly 10 reviews with no pager, and they were grouped by product rather than ordered by date, so the \"latest\" reviews were not actually the latest. Scroll to Store Reviews on this auction and confirm you can page through and that the dates run downward.",
          href: "/auctions/auction-beyblade-original-dragoon-storm",
        },
        {
          key: "store-reviews-tab-url-state",
          label: "On the store's own Reviews tab (a full page, not a tab inside a product), the page number and sort DO appear in the URL and survive a browser refresh / can be shared as a link",
          description: "Open the store below and click its Reviews tab. The opposite of the product-page behaviour above, and intentional: this is a page in its own right, so its state belongs in the URL. Go to page 2, refresh, and confirm you are still on page 2.",
          href: "/stores/store-beyblade-arena",
        },
        {
          key: "reviews-index-unchanged",
          label: "The site-wide /reviews page still works exactly as before — search, sort, filters, paging, and grid/list toggle",
          description: "This page was rebuilt on shared internals during the pagination work, so it is worth a regression pass even though nothing about it was meant to change.",
          href: "/reviews",
        },
        {
          key: "empty-state",
          label: "A product with no reviews yet shows \"No reviews yet — be the first to review this product.\" and no pager, rather than an empty box or a stray page control",
          href: "/products/product-beyblade-x-dran-sword-video-demo",
        },
      ],
    },
    {
      pageKey: "messaging",
      pageLabel: "Messaging a Seller",
      href: "/user/messages",
      cases: [
        { key: "start-conversation", label: "Starting a conversation with a seller works" },
        { key: "receive-reply", label: "Receiving and reading a seller's reply works" },
        {
          key: "message-realtime-update",
          label: "A new message appears in the RECIPIENT's thread without a manual page refresh (realtime ping-channel)",
          description:
            "Fixed 2026-08-28. BEFORE: only the SENDER saw their own message, because the send handler calls refetch() directly — the recipient saw nothing until they reloaded. Two stacked faults: the hooks subscribed without ever signing in to the realtime database, AND the `conversationIds` claim the security rule requires had no issuer anywhere (the token route only sent `chatIds`, from an unrelated collection). Both errors were swallowed, one into a literal `// ignore`. AFTER: open the same conversation as buyer in one browser and seller in another, send from one, and the other updates on its own. Test it from BOTH directions — testing only the sender's own window is what let this pass before.",
          href: "/user/messages",
        },
        {
          key: "message-live-updates-survive-bulk-job",
          label: "Running a bulk admin action while a message thread is open does not kill that thread's live updates",
          description:
            "Fixed 2026-08-28. BEFORE: the realtime app is a single shared connection, and finishing a bulk job signed it out globally — so an open chat or message thread silently stopped updating, and vice versa (opening a chat killed an in-flight bulk job's progress). AFTER: open a message thread, run any bulk action from an admin listing until it completes, then send a message from the other account — the thread must still update live without a reload.",
          href: "/user/messages",
        },
        { key: "messages-list-thread", label: "The messages list and individual thread view both load correctly", href: "/user/messages" },
      ],
    },
    {
      pageKey: "user-dashboard-extras",
      pageLabel: "User Dashboard — Addresses, Catalogue, Settings, My Orders-by-Type",
      href: "/user",
      cases: [
        { key: "addresses-crud", label: "Adding, editing, and listing delivery addresses works", href: "/user/addresses" },
        { key: "catalogue-crud", label: "Adding, editing, and deleting a personal catalogue item works", href: "/user/catalogue" },
        { key: "settings-page", label: "The user settings page loads and saves correctly", href: "/user/settings" },
        { key: "my-prize-draws", label: "\"My Prize Draw Entries\" shows accurate entries and outcomes", href: "/user/prize-draws" },
        { key: "my-digital-codes", label: "\"My Digital Codes\" shows purchased codes correctly", href: "/user/digital-codes" },
        { key: "my-offers", label: "\"My Offers\" list shows accurate offer history", href: "/user/offers" },
        {
          key: "order-timeline-shows-real-events",
          label: "An order's timeline shows the transitions that actually happened, each stamped with who made it",
          description: "Open a delivered order. Placed / confirmed / shipped with its tracking number / delivered should each carry a real timestamp and a Buyer, Store, Admin or System tag. This used to be synthesised from four scalar date fields, so any transition without a dedicated date column — a payment review, a re-upload request — was invisible.",
          href: "/user/orders",
        },
        {
          key: "order-partial-refund-in-timeline",
          label: "A PARTIAL refund appears on the order timeline with its amount and reason",
          description: "Open the X Knife Shinobi order. A partial refund changes no status field at all, so it can only reach the timeline as an explicit entry — if partial refunds are missing while full ones show, that is the bug.",
          href: "/user/orders",
        },
        {
          key: "order-auction-won-vs-bought-out",
          label: "A won auction and a bought-out auction are visibly DIFFERENT on the order, not both just \"auction\"",
          description: "Compare the Diablo Nemesis order (won at ₹6,200 against a real ladder) with the Spriggan Requiem order (bought out at ₹4,999 while the standing bid was ₹3,100). Both are orderType \"auction\" — only the provenance record separates them. Crucially the buyout must NOT report zero bids: a buyout is itself a real bid, and Buy Now is no longer gated on the auction having no bids.",
          href: "/user/orders",
        },
        {
          key: "order-offer-shows-what-was-saved",
          label: "An order placed from an accepted offer shows the offered amount against the asking price at the time",
          description: "The listing price can change afterwards, which is exactly why it is captured once at order time and never recomputed.",
          href: "/user/orders",
        },
        {
          key: "order-history-no-money-churn",
          label: "The order timeline shows status, payment and refund events only — NOT every coupon or add-on the buyer tried",
          description: "Deliberate: the final coupon and add-on state already lives on the order. Replaying pricing churn would bury the handful of transitions anyone actually reads.",
          href: "/user/orders",
        },
        {
          key: "order-history-carries-no-personal-data",
          label: "No timeline entry anywhere shows a buyer's name or email — only a role tag",
          description: "Security-relevant, not cosmetic. PII encryption does not descend into arrays, so a name written into an order or offer history would sit in the database in plain text and never be decrypted on the way out.",
          href: "/admin/orders",
        },
        {
          key: "my-returns",
          label: "Requesting and viewing a return works",
          description: "Also confirm the page itself loads without an empty/error state on a fresh visit — it queries orders by status, which was silently broken site-wide by a 2026-08-19 missing-index bug (now fixed).",
          href: "/user/returns",
        },
        { key: "my-reviews", label: "\"My Reviews\" shows reviews the user has left", href: "/user/reviews" },
        {
          key: "user-personal-listings-search-sort",
          label: "My Digital Codes, My Pre-Orders, My Prize Draws, and My Reviews each now have a working search box and sort dropdown (Newest/Oldest, plus a rating sort on Reviews) using the standard listing toolbar — not a bare unsearchable list",
          description: "Converted 2026-08-21 off page-specific hand-wired toolbars onto the standard DataListingView scaffold. Spot-check at least two of the four: type a product name into search and confirm it narrows the list, and change the sort dropdown and confirm the order changes.",
          href: "/user/digital-codes",
        },
      ],
    },
    {
      pageKey: "user-dashboard-navigation",
      pageLabel: "User Dashboard Navigation",
      href: "/user",
      cases: [
        { key: "sidebar-all-links-work", label: "Every item in the user dashboard sidebar navigates to its page without a 404 or broken layout", href: "/user" },
        { key: "sidebar-active-highlight", label: "The sidebar correctly highlights the currently active section as you navigate between pages" },
        { key: "sidebar-mobile-collapse", label: "The user dashboard sidebar collapses into a mobile-friendly menu/bottom bar on small screens" },
        { key: "deep-link-direct-load", label: "Directly loading a deep user dashboard URL (e.g. /user/orders/view/[id]) works without first visiting the dashboard home" },
        { key: "become-seller-crossnav", label: "\"Become a Seller\" (buyer) vs \"Go to my Store\" (seller) shows the correct one based on account state and navigates correctly" },
        { key: "browser-back-forward", label: "Browser back/forward buttons move correctly between dashboard sub-pages without breaking the layout" },
        { key: "logged-out-redirect", label: "Opening a user dashboard URL while logged out redirects to login, then returns to the originally requested page after signing in" },
        { key: "breadcrumbs-accurate", label: "Breadcrumbs (where present) on nested user dashboard pages accurately reflect the current location" },
        {
          key: "sidebar-logout-button",
          label: "The user dashboard sidebar itself (not just the header profile dropdown) has a visible \"Log out\" action at the bottom, and clicking it signs out and redirects to login",
          description: "Previously the only logout affordance while on a dashboard page was the header profile dropdown — the sidebar had none. Check on both mobile (drawer) and desktop (persistent rail).",
          href: "/user",
        },
      ],
    },
  ]),

  ...group("selling", "Selling", [
    {
      pageKey: "become-seller",
      pageLabel: "Become a Seller & Store Setup",
      href: "/user/become-seller",
      cases: [
        {
          key: "sell-redirect",
          label: "Visiting /sell redirects to the Become a Seller page — it must NOT show \"Something went wrong\"",
          description:
            "In production this returned a 200 carrying an error instead of redirecting, so the whole seller-onboarding entry point was dead while looking healthy to monitoring. Type /sell in the address bar directly; the URL should end up on /user/become-seller.",
          href: "/sell",
        },
        { key: "apply-seller", label: "Applying to become a seller works", href: "/user/become-seller" },
        { key: "store-setup", label: "Setting up store name/description/logo works" },
        { key: "store-address", label: "Adding a pickup address for the store works" },
      ],
    },
    {
      pageKey: "listing-a-product",
      pageLabel: "Listing a Product",
      href: "/store/products",
      cases: [
        { key: "list-standard", label: "Listing a standard product works" },
        { key: "list-auction", label: "Listing an auction works" },
        { key: "list-preorder", label: "Listing a pre-order works" },
        { key: "edit-listing", label: "Editing an existing listing works" },
        { key: "media-upload", label: "Uploading product images/video during listing works" },
        {
          key: "media-upload-preview-no-white-box",
          label: "A freshly-uploaded image's thumbnail renders as a real preview within a couple seconds — it never gets stuck as a blank/white box",
          description: "Fixed 2026-08-21 — a fresh upload can briefly 404 while the Firestore doc and Storage object finish propagating; the thumbnail now retries with backoff instead of latching a permanent broken-image placeholder. Try uploading 2-3 images back-to-back on a slower connection to see the retry in action.",
          href: "/store/products/new",
        },
        {
          key: "media-upload-images-capped-at-5",
          label: "The product gallery upload UI caps at 5 images (not 10) and its label reads \"up to 5\"",
          description: "Fixed 2026-08-21 — the UI previously advertised/allowed up to 10 images while the server schema only ever accepted 5, so a 6th+ image silently failed validation with no clear reason.",
          href: "/store/products/new",
        },
        {
          key: "media-upload-video-duration",
          label: "Attaching a directly-uploaded video file during listing captures its duration automatically and saves without a validation error; attaching a YouTube or external video URL also saves fine without needing a duration",
          description: "Fixed 2026-08-21 — the video schema always required a duration the UI never collected, so ANY product with a directly-uploaded video previously failed server validation invisibly. Duration is now captured client-side for file uploads; YouTube/external sources are exempt since their duration can't be read client-side.",
          href: "/store/products/new",
        },
        {
          key: "media-upload-multiple-images",
          label: "Uploading several gallery images in one go works — each shows its own progress and all of them survive the save",
          description: "Select 3-4 images at once. They upload one after another. After saving and reopening the product for editing, every image should still be attached.",
          href: "/store/products/new",
        },
        {
          key: "media-upload-remove-image",
          label: "Removing one gallery image removes only that image, and the removal sticks after save + reload",
          href: "/store/products/new",
        },
        {
          key: "media-upload-main-image-crop",
          label: "The main product image's crop tool opens, the 1:1 aspect lock works, and the cropped result is what actually gets saved",
          description: "Not the uncropped original — check the saved product's main image on the public detail page.",
          href: "/store/products/new",
        },
        {
          key: "media-upload-video-both-sources-render",
          label: "A video attached by file upload AND a video attached via the YouTube tab both play on the public product page",
          description: "Two separate products, one per source. A raw file renders a native player; a YouTube URL renders an embedded player. Neither should show \"No video with supported format and MIME type found\".",
          href: "/store/products/new",
        },
        { key: "seller-quick-add-drawer-flips", label: "With Left-hand mode ON, the seller's quick-add-listing side drawer opens from the left instead of the right" },
      ],
    },
    {
      pageKey: "seller-bids-bundles-filters",
      pageLabel: "Seller — Bids & Bundles Filtering",
      href: "/store/bids",
      cases: [
        {
          key: "seller-bids-status-filter",
          label: "The status filter on the seller Bids page actually narrows the list",
          description: "Fixed 2026-08-21. The status chips, the sort dropdown AND the bidder search box on this page were all inert — the server read none of the three, so every control silently returned the same unfiltered list. Pick a status and confirm the rows genuinely change.",
          href: "/store/bids",
        },
        {
          key: "seller-bids-sort-dropdown",
          label: "Changing the Sort dropdown on the seller Bids page reorders the rows",
          description: "The sort was hardcoded to bid date server-side regardless of what the dropdown said. Switch to a different sort (e.g. bid amount) and confirm the ordering visibly changes.",
          href: "/store/bids",
        },
        {
          key: "seller-bids-bidder-search",
          label: "Typing a bidder's name into the search box on the seller Bids page and pressing Enter narrows the list to that bidder",
          description: "Search matches from the START of the bidder name (a database limitation — mid-name fragments will not match), so type the first part of the name rather than a middle fragment.",
          href: "/store/bids",
        },
        {
          key: "seller-bundles-active-filter",
          label: "The Active / Inactive and \"Sold out\" chips on the seller Bundles page actually narrow the list",
          description: "Fixed 2026-08-21 — these chips existed and were clickable but the seller endpoint ignored them entirely, unlike the admin Bundles page which honoured the same chips. Compare the two pages: they should now behave identically.",
          href: "/store/bundles",
        },
      ],
    },
    {
      pageKey: "seller-orders",
      pageLabel: "Seller Order Management & Shipping/Tracking",
      href: "/store/orders",
      cases: [
        { key: "view-orders", label: "Seller order list shows accurate incoming orders", href: "/store/orders" },
        {
          key: "seller-auction-forfeit-notification",
          label: "When a winning bidder fails to pay by the deadline, the SELLER also receives a notification that the win was forfeited and the item is unsold",
          description: "Added 2026-08-21. Only the buyer was told, so to a seller a forfeited win looked like a completed sale that simply never paid out. Check the seller's notification bell after an auction win lapses — the message should say the item can be relisted or offered to the next highest bidder.",
          href: "/store/orders",
        },
        {
          key: "seller-order-manual-payment-badge",
          label: "A manual-payment (UPI/Cash) order's seller detail shows a payment badge — Awaiting payment / Awaiting verification / Verified / Re-upload requested / Rejected — next to the Payment heading, plus the UTR once the buyer submits one",
          description: "Added 2026-08-21. Sellers previously saw only the payment method word (\"upi_manual\") with no indication of whether the money had actually landed. The buyer's payment screenshot is deliberately NOT shown to sellers — it's a bank/UPI capture, and verifying is admin/moderator-only — so confirm the badge and UTR appear but no screenshot image does.",
          href: "/store/orders",
        },
        { key: "confirm-payment", label: "Approving a buyer's manual payment proof works" },
        { key: "request-reupload", label: "Requesting a proof re-upload (honest-mistake tier) clears the proof and extends the buyer's deadline" },
        { key: "reject-fraud", label: "Rejecting a proof as fraudulent cancels the order, restores stock, and bans the buyer's account for 7 days" },
        { key: "whatsapp-admin-share", label: "Uploading payment proof pings the admin WhatsApp numbers, and the buyer's \"Share for review\" link opens with a pre-filled message" },
        { key: "mark-shipped", label: "Marking an order shipped with tracking info works" },
        { key: "tracking-visible", label: "Buyer sees updated tracking status after seller ships" },
        {
          key: "seller-order-detail-full-page",
          label: "Every seller order row has an \"Open full page\" action landing on a real bookmarkable /store/orders/[id]/view page showing the same items (with thumbnails)/address/payment/EMI/status content as the drawer",
          description: "Added 2026-08-21 — sellers previously had no dedicated order-detail page, only a drawer, unlike buyer/admin. The drawer and the new page now share one content component (SellerOrderDetailPanel) so they can't drift.",
          href: "/store/orders",
        },
        {
          key: "seller-new-order-notification-reaches-seller",
          label: "A seller is actually told when an order lands — in-app AND by email — without having to sit refreshing the orders page",
          description: "Added 2026-08-21. Place an order against your store from a separate buyer account, then check the seller side WITHOUT opening /store/orders first: does the notification bell update, and does an email reach the seller account's inbox? A marketplace where sellers only discover orders by polling the dashboard is a real (and easily-missed) failure. Also confirm the notification/email names the buyer's item and links straight to that order.",
          href: "/store/orders",
        },
      ],
    },
    {
      pageKey: "seller-analytics-payouts",
      pageLabel: "Seller Analytics & Payouts",
      href: "/store/analytics",
      cases: [
        { key: "view-analytics", label: "Seller analytics dashboard shows accurate sales data", href: "/store/analytics" },
        { key: "view-payouts", label: "Seller payouts list shows accurate payout history", href: "/store/payouts" },
        { key: "payouts-checkbox-select", label: "Selecting payouts with the row checkboxes shows a working bulk action bar (Export Selected)", href: "/store/payouts" },
        { key: "payouts-detail-panel", label: "Opening \"View Details\" on a payout shows a side panel with status progress, transaction ID, and expected payout date" },
        { key: "payouts-reminder-toggle", label: "Toggling the payout reminder flag in the detail panel saves correctly" },
        {
          key: "seller-payout-detail-full-page",
          label: "Every payout row has an \"Open full page\" action landing on a real /store/payouts/[id]/view page showing a gross/platform-fee/refund-deduction/net breakdown, not just the drawer's flat amount",
          description: "Added 2026-08-21 — the drawer previously showed only a flat amount with orderIds as plain unlinked monospace text. Both the drawer and the new page now render from one shared SellerPayoutDetailContent component.",
          href: "/store/payouts",
        },
      ],
    },
    {
      pageKey: "seller-shipping-payouts-setup",
      pageLabel: "Seller Shipping & Payout Setup",
      href: "/store/shipping",
      cases: [
        { key: "shipping-page", label: "Store shipping settings page saves correctly", href: "/store/shipping" },
        { key: "shipping-configs-crud", label: "Creating, editing, and listing shipping configs works", href: "/store/shipping-configs" },
        { key: "payout-methods-crud", label: "Adding, editing, and listing payout methods works", href: "/store/payout-methods" },
        { key: "payout-settings-page", label: "Payout settings page saves correctly", href: "/store/payout-settings" },
      ],
    },
    {
      pageKey: "seller-listing-types",
      pageLabel: "Seller — All Listing Types (Coupons, Bundles, Classifieds, Digital Codes, Live, Prize Draws, Art, Stickers)",
      href: "/store/products",
      cases: [
        {
          key: "seller-listing-type-dropdown-all-types",
          label: "The \"Listing type\" dropdown on the seller Products page offers all nine types including Art and Stickers, and no longer offers \"Bundle\"",
          description: "Fixed 2026-08-21 — the dropdown was a hand-written list missing art and stickers, and still offered \"Bundle\", which is a category type rather than a listing type and therefore always returned zero rows. Open the dropdown and check every option returns results for a store that has that type.",
          href: "/store/products",
        },
        {
          key: "seller-products-badge-per-type",
          label: "Each row in the seller Products list shows a badge naming its real listing type — a classified row says \"classified\", a sticker row says \"stickers\", and so on",
          description: "Fixed 2026-08-21 — the row mapper collapsed classified, digital-code, live, art and stickers all down to \"standard\", so five of the nine types were mislabelled in the table. Create or find one listing of each type and confirm each badge is correct.",
          href: "/store/products",
        },
        {
          key: "seller-products-featured-promoted-sorts",
          label: "The seller Products \"Featured first\" and \"Promoted first\" sorts actually reorder the list",
          description: "Same fix as the admin equivalent — both sorts previously did nothing at all. Confirm the order genuinely changes.",
          href: "/store/products",
        },
        { key: "seller-coupons-crud", label: "Seller can create, edit, and list their own coupons", href: "/store/coupons" },
        {
          key: "seller-coupon-auto-scoped-to-own-store",
          label: "A seller-created coupon is automatically scoped to that seller's own store, with no store picker",
          href: "/store/coupons/new",
          description: "The coupon form must NOT offer a store selector — the store is taken from the logged-in seller. After creating one, confirm it only discounts that store's items when a buyer applies it, and that it can be stacked alongside a different store's coupon.",
        },
        {
          key: "seller-coupon-no-stacking-toggle",
          label: "The seller coupon form has no \"allow stacking\" option — stacking is always permitted",
          href: "/store/coupons/new",
          description: "Stacking is now governed by scope alone (one per store + one platform-wide), so any leftover stacking checkbox on this form is a bug.",
        },
        {
          key: "seller-coupon-category-restriction-works",
          label: "Restricting a seller coupon to specific categories actually limits which items it discounts",
          href: "/store/coupons/new",
          description: "Create a coupon restricted to one category, then as a buyer put a non-matching item from that store in the cart and try the code — it must be refused. Add a matching item and confirm the discount covers only the matching item's value.",
        },
        {
          key: "seller-coupon-cannot-be-site-wide",
          label: "A seller has no way to create a site-wide/platform coupon — the form offers no scope choice and the created coupon only ever discounts their own store",
          href: "/store/coupons/new",
          description: "By design: scope is resolved from the logged-in seller, not chosen. Verify as a buyer that a seller coupon leaves a second store's items in the same cart at full price. Only an admin can create a platform-wide coupon.",
        },
        {
          key: "seller-coupon-second-for-same-store-rejected",
          label: "Applying a second seller coupon for the SAME store replaces or refuses — you can never have two coupons from one store active at once",
          href: "/cart",
          description: "The rule is one seller coupon per store, plus at most one admin coupon overall. Try applying two of store-beyblade-arena's codes back to back.",
        },
        {
          key: "seller-coupon-stacks-with-admin-coupon",
          label: "One seller coupon and one admin (site-wide) coupon apply together, and the order total reflects both",
          href: "/cart",
          description: "Try ARENA25 (store-beyblade-arena) together with a platform coupon such as FREESHIP499. Both should stay applied and the breakdown should list both.",
        },
        { key: "seller-bundles-crud", label: "Seller can create, edit, and list bundles/grouped listings", href: "/store/bundles" },
        { key: "seller-classified-crud", label: "Seller can create, edit, and list classified listings", href: "/store/classified" },
        { key: "seller-digitalcodes-crud", label: "Seller can create, edit, and list digital-code listings", href: "/store/digital-codes" },
        { key: "seller-live-crud", label: "Seller can create, edit, and list live-item listings", href: "/store/live" },
        { key: "seller-prizedraws-crud", label: "Seller can create, edit, and list prize-draw listings, and view entries", href: "/store/prize-draws" },
        { key: "seller-art-stickers-crud", label: "Seller can create, edit, and list art and sticker listings", href: "/store/art" },
        {
          key: "seller-products-auctions-default-load",
          label: "The seller Products, Auctions, and Prize Draws dashboards each show real listings by default (not empty), and their \"Show sold\"/\"Show ended\"/\"Show closed\" toggles work",
          description: "A 2026-08-19 index-shape bug broke the default storeId-scoped queries on these three seller dashboards. Confirm each loads populated on first visit and its toggle reveals the corresponding hidden fixture.",
          href: "/store/products",
        },
        {
          key: "auction-row-shows-bid-info",
          label: "An auction's row/card in the seller Products listing (filtered to Auctions) shows its reserve price, bid count, and end date — not just condition/SKU like a standard product",
          description: "Restored 2026-08-20 — this info was dropped when the dedicated Auctions dashboard was consolidated into the shared Products listing. Filter to \"Auctions\" on /store/products (or the admin equivalent) and confirm each row's second line reads something like \"Reserve ₹X · N bids · Ends <date>\".",
          href: "/store/products",
        },
      ],
    },
    {
      pageKey: "seller-catalog-org",
      pageLabel: "Seller Categories, Sublisting Categories & Listing Templates",
      href: "/store/categories",
      cases: [
        { key: "seller-categories-crud", label: "Seller can create and edit their own categories", href: "/store/categories" },
        { key: "seller-sublisting-categories-crud", label: "Seller can create and edit sublisting categories", href: "/store/sublisting-categories" },
        {
          key: "sublisting-categories-standard-toolbar",
          label: "Seller Sublisting Categories now uses the same search+sort+pagination toolbar and \"New Category\" button placement as every other dashboard listing, instead of its own bespoke layout",
          description: "Converted 2026-08-21 off a fully custom self-contained page onto the standard DataListingView scaffold. Confirm search, sort, and pagination all still work, and the row-level View/Edit/Delete buttons are unchanged.",
          href: "/store/sublisting-categories",
        },
        { key: "seller-listing-templates-crud", label: "Seller can create, edit, and reuse listing templates when creating a new product", href: "/store/listing-templates" },
        {
          key: "seller-category-inline-create",
          label: "On the product form, the Category picker's \"+ Create new category\" opens a drawer, saves, and auto-selects the new category",
          description: "The inline drawer is reachable from the category picker on the product form. Type a name, save, and confirm the drawer closes and the new category is already selected in the picker — you should not have to search for it.",
          href: "/store/products/new",
        },
        {
          key: "seller-category-inline-create-persists",
          label: "A category created inline is still there after reload — reopen the picker on a fresh product form and search for it by name",
          description: "Proves the category actually persisted to Firestore rather than only existing in the form's local state.",
          href: "/store/products/new",
        },
        {
          key: "seller-category-inline-create-duplicate-rejected",
          label: "Creating a category with a name that already exists shows a readable \"already exists\" error, not a generic failure or a silent no-op",
          description: "Slug is derived from the name, so a duplicate name collides. Expect a clear message in the drawer.",
          href: "/store/products/new",
        },
      ],
    },
    {
      pageKey: "seller-custom-brands",
      pageLabel: "Seller — Custom Brands",
      // The ONLY way a seller creates a brand is the inline picker on the
      // product form — there is no /store/brands page.
      href: "/store/products/new",
      cases: [
        {
          key: "seller-brand-inline-create",
          label: "On the product form, the Brand picker's \"+ Create new brand\" saves successfully and auto-selects the new brand",
          description: "Fixed 2026-08-22 — this previously failed with a permissions error for every seller: the API route allowed sellers but the underlying action still demanded an admin role. Confirm a seller (not an admin) can complete this end to end.",
        },
        {
          key: "seller-brand-inline-create-persists",
          label: "A brand created inline is still there after reload — reopen the Brand picker on a fresh product form and search for it by name",
          description: "Proves the brand persisted rather than only existing in form state.",
        },
        {
          key: "seller-brand-appears-on-public-brands-page",
          label: "A newly created brand appears on the public /brands page",
          description: "Brands are stored as category rows discriminated by categoryType:\"brand\", and the public page filters on exactly that. If the brand saves but never shows here, the discriminator wasn't written.",
          href: "/brands",
        },
        {
          key: "seller-brand-inline-create-duplicate-rejected",
          label: "Creating a brand whose name matches an existing brand shows a readable \"already exists\" error rather than creating a second copy",
        },
        {
          key: "seller-brand-product-saves-with-new-brand",
          label: "A product saved with an inline-created brand keeps that brand after save — reopen the product for editing and the Brand field still shows it",
          description: "Catches the case where the brand is created but its id never makes it onto the product document.",
        },
      ],
    },
    {
      pageKey: "seller-ops-comms",
      pageLabel: "Seller Addresses, Messages, Fulfillment & Print",
      href: "/store/addresses",
      cases: [
        { key: "seller-addresses-crud", label: "Seller can add and edit store addresses", href: "/store/addresses" },
        { key: "seller-messages", label: "Seller messages list and thread view both work", href: "/store/messages" },
        { key: "seller-fulfillment-queue", label: "Seller fulfillment queue shows accurate pending items", href: "/store/fulfillment" },
        { key: "seller-print-center", label: "Seller print-center generates labels/invoices correctly", href: "/store/print-center" },
        { key: "seller-inventory-print", label: "Seller inventory print view works", href: "/store/print-center" },
      ],
    },
    {
      pageKey: "seller-marketing-extras",
      pageLabel: "Seller Offers, Features, Google Reviews & WhatsApp Catalog",
      href: "/store/offers",
      cases: [
        {
          key: "seller-offers-list",
          label: "Seller offers list shows accurate buyer offers",
          description: "Also confirm each status tab (Pending/Countered/Accepted/Declined/etc.) actually filters correctly rather than showing an empty or unchanged list — a 2026-08-19 missing-index bug affected the status-tab query.",
          href: "/store/offers",
        },
        { key: "seller-features-crud", label: "Seller can create and edit product features", href: "/store/features" },
        { key: "seller-google-reviews-sync", label: "Google Reviews sync pulls in real reviews correctly", href: "/store/google-reviews" },
        { key: "seller-whatsapp-catalog", label: "WhatsApp catalog import/push works", href: "/store/whatsapp" },
        {
          key: "seller-whatsapp-token-save",
          label: "Saving a WhatsApp access token on the store succeeds and comes back masked — it must not error out",
          description: "Added 2026-08-21. The store's WhatsApp access token is encrypted before storage by the same mechanism as the admin Integrations keys, and that mechanism was failing in production — so this save path was broken too, in a place nobody would think to check. Enter a throwaway token value, save, reload the page, and confirm you got a success toast and the field shows a masked value rather than an error or a blank field.",
          href: "/store/whatsapp",
        },
        {
          key: "seller-whatsapp-import-runs-in-background",
          label: "\"Import from WhatsApp\" returns immediately and reports its result when the background job finishes — the page never hangs waiting on it",
          description: "Changed 2026-08-22 — the import used to run inline and could time out on a large catalog, silently importing only the first 250 items. It now runs as a background job, so expect an immediate \"import started\" response and a result toast a few moments later.",
          href: "/store/whatsapp",
        },
        {
          key: "seller-whatsapp-import-skips-already-synced",
          label: "Re-running \"Import from WhatsApp\" a second time imports nothing new — everything is reported as already synced",
          description: "Items pushed from here carry their LetItRip slug, so a repeat import must not create duplicate draft products. Run it twice and compare the counts.",
          href: "/store/whatsapp",
        },
        {
          key: "seller-whatsapp-push-product-link-opens",
          label: "A product pushed to the WhatsApp catalog links back to a working, full product URL — not a broken relative link",
          description: "Fixed 2026-08-22 — the pushed link was a relative path Meta rejects. Open the item in your WhatsApp catalog and tap through to confirm it lands on the live product page.",
          href: "/store/whatsapp",
        },
        { key: "seller-reviews-response", label: "Seller can view and respond to product reviews", href: "/store/reviews" },
      ],
    },
    {
      pageKey: "seller-guide",
      pageLabel: "Seller Guide Pages",
      href: "/store/guide",
      cases: [
        { key: "seller-guide-pages", label: "The 5 seller guide pages (overview, capabilities, finance, listings, orders, settings) all load correctly", href: "/store/guide" },
      ],
    },
    {
      pageKey: "store-dashboard-navigation",
      pageLabel: "Store Dashboard Navigation",
      href: "/store",
      cases: [
        { key: "store-sidebar-all-links-work", label: "Every item in the store/seller dashboard sidebar navigates to its page without a 404 or broken layout", href: "/store" },
        { key: "store-sidebar-active-highlight", label: "The store sidebar correctly highlights the currently active section as you navigate between pages" },
        { key: "store-sidebar-mobile-collapse", label: "The store dashboard sidebar collapses into a mobile-friendly menu/bottom bar on small screens" },
        { key: "store-deep-link-direct-load", label: "Directly loading a deep store dashboard URL (e.g. /store/products/[id]/edit) works without first visiting the dashboard home" },
        { key: "store-user-crossnav", label: "The store dashboard's cross-nav link back to the buyer dashboard works and lands on the correct page" },
        { key: "store-browser-back-forward", label: "Browser back/forward buttons move correctly between store dashboard sub-pages without breaking the layout" },
        { key: "store-logged-out-redirect", label: "Opening a store dashboard URL while logged out (or as a non-seller) redirects appropriately instead of erroring" },
        { key: "store-nav-listing-type-groups", label: "The seller nav correctly groups/labels each listing-type management area (standard, auctions, pre-orders, prize draws, bundles, classifieds, digital codes, live, art, stickers)" },
        {
          key: "store-sidebar-logout-button",
          label: "The store dashboard sidebar has a visible \"Log out\" action at the bottom (not just the header profile dropdown), and clicking it signs out and redirects to login",
          href: "/store",
        },
      ],
    },
  ]),

  ...group("content-discovery", "Content & Discovery", [
    {
      pageKey: "blog",
      pageLabel: "Blog",
      href: "/blog",
      cases: [
        { key: "read-post", label: "Reading a blog post renders correctly (images, formatting)" },
        { key: "blog-listing", label: "Blog listing page shows all published posts" },
        { key: "blog-cover-image-display", label: "A blog post's cover image displays on both its listing card and its detail page" },
        { key: "blog-youtube-embed", label: "A blog post with a YouTube video ID set shows a working embedded video player above the article content" },
        {
          key: "blog-related-posts-sections",
          label: "A blog post detail page shows three \"related\" sections below the article — Related Posts (same category), You might also like (shared tags), and More from [author] — each populated with real posts, not empty",
          description: "Verify against \"How to Spot a Genuine Takara-Tomy Beyblade\" (slug: spot-genuine-takara-tomy-beyblade) — the tag-overlap section should include \"Authenticating Beyblades — What to Check Before You Buy\" (shares \"authentication\"/\"counterfeit\" tags, different category), proving it's genuinely tag-based and not just re-showing the same-category list.",
          href: "/blog",
        },
      ],
    },
    {
      pageKey: "events",
      pageLabel: "Events, Raffles & Spin Wheel",
      href: "/events",
      cases: [
        { key: "view-event", label: "Viewing an event detail page works", href: "/user/events" },
        { key: "events-listing-cards-images", label: "The events listing page shows each event's real cover image (not a generic icon placeholder) when one is set, and all cards in a row are the same height", href: "/events" },
        {
          key: "lottery-cover-image",
          label: "A lottery's cover image renders on both the lottery listing card and its detail page — not the 🎰 emoji placeholder",
          description:
            "Both views used to read a field the data never populates, so every lottery fell back to the emoji. Verify against \"Pokémon Number Draw — July 2026\" (event-pokemon-number-draw-july-2026), which has a real cover image.",
          href: "/lottery/event-pokemon-number-draw-july-2026",
        },
        {
          key: "lottery-prize-previews",
          label: "A lottery detail page shows a \"Prizes\" collage of prize photos above the numbered \"Slots\" grid, and the numbered grid itself still shows every slot as a plain number",
          description:
            "Only slots that actually have a photo get a collage tile — the seeded fixture has photos on the first 8 of its 25 slots, so expect 8 tiles above a 25-square grid. Claimed slots show a \"Claimed\" stamp. Prices and odds must never appear anywhere on this page.",
          href: "/lottery/event-pokemon-number-draw-july-2026",
        },
        {
          key: "related-events-section",
          label: "An event's Overview tab shows a \"Related Events\" carousel of other active events sharing at least one tag, with real events (not empty)",
          description: "Verify against \"Beyblade Original Series Clearance Sale\" (event-original-series-clearance) — it shares the \"original-series\" tag with the favourite-blader poll event and the \"singles\" tag with the buy-3-get-1 offer event, so Related Events should show both.",
          href: "/events",
        },
        { key: "poll-vote-inline", label: "Voting in a poll event from the Overview tab works, shows a confirmation, and a repeat visit shows the already-voted state" },
        {
          key: "poll-leaderboard-shows-tally",
          label: "A poll event's Leaderboard tab shows option labels with vote counts/percentages, not a list of voters ranked by who voted first",
          href: "/events",
        },
        {
          key: "admin-event-entries-export",
          label: "On an event's admin entries page, admin can view poll/form responses inline and download a Markdown report of all entries via the \"Download Report\" button",
          href: "/admin/events",
        },
        { key: "survey-feedback-submit", label: "Submitting a survey or feedback event's Participate form works, enforces required fields, and shows a success confirmation" },
        { key: "offer-coupon-display-copy", label: "An offer event shows its coupon code prominently on the Overview tab, and the \"Copy code\" button copies it to the clipboard with visible confirmation" },
        { key: "raffle-entry", label: "Entering an open_raffle event works and the Participate tab shows the prize hero, eligibility copy, and optional message field (not a blank form)" },
        { key: "raffle-entry-top-n-scorers", label: "Entering a top_n_scorers raffle event works and the leaderboard reflects entries" },
        { key: "raffle-entry-top-n-participants", label: "Entering a top_n_participants raffle event works" },
        {
          key: "spin-wheel",
          label: "Spinning the spin-wheel event works on the very first attempt and shows the prize immediately (realtime) — no \"Spin failed\" error",
          description: "Previously the first spin always failed because no eventEntries doc existed yet for the user; the spin now finds-or-creates its own entry transactionally.",
        },
        { key: "spin-wheel-max-per-user", label: "Spinning again after using up the event's configured spinMaxPerUser is blocked with a clear message, not silently allowed" },
        { key: "spin-wheel-window-blocked", label: "A second spin attempt within the same spinWindow is blocked with a clear message" },
        {
          key: "spin-results-tab",
          label: "A spin_wheel event shows a \"Last 10 Spin Results\" tab listing recent winners (or \"Guest\" for anonymous spins) and their prizes",
          href: "/events",
        },
        {
          key: "event-guest-participation-toggle",
          label: "An event created with \"allow guest participation\" enabled accepts one anonymous entry per device/IP and blocks a second attempt from the same device; an event with the toggle off still requires login",
          href: "/admin/events",
        },
        { key: "leaderboard-live-refresh", label: "After voting/entering an event, navigating to its Leaderboard tab shows the updated standings immediately rather than a stale cached ranking" },
      ],
    },
    {
      pageKey: "coupons",
      pageLabel: "Coupons",
      href: "/user/coupons",
      cases: [
        { key: "view-claimed-coupons", label: "Claimed coupons list shows accurate coupons", href: "/user/coupons" },
        { key: "coupon-discount-applied", label: "Coupon discount is correctly reflected in the order total" },
        { key: "coupon-expired-rejected", label: "Applying an expired coupon at checkout shows a specific expiry rejection message, not a generic error" },
        { key: "coupon-below-min-purchase", label: "Applying a coupon below its minPurchase threshold is rejected with a clear message" },
        { key: "coupon-not-combinable", label: "A seller-scoped coupon that isn't combinable with another seller's coupon is rejected when both are applied" },
        { key: "coupon-per-user-limit", label: "Re-applying a coupon after hitting its perUserLimit is rejected" },
      ],
    },
    {
      pageKey: "notifications",
      pageLabel: "Notifications",
      href: "/user/notifications",
      cases: [
        { key: "receive-notification", label: "In-app notifications appear for order/bid/message events", href: "/user/notifications" },
        { key: "mark-read", label: "Marking a notification as read works" },
        { key: "notification-channel-prefs", label: "Per-channel notification preferences (in-app / email / WhatsApp) save and are respected" },
        { key: "notification-type-sample", label: "A sample of notification types (order status change, bid outbid, message received, payout) each trigger correctly end-to-end" },
        { key: "notification-tab-filters", label: "Notification tab filters correctly narrow the list", href: "/user/notifications" },
        {
          key: "notification-email-actually-arrives",
          label: "With email enabled for a notification type, the email really lands in your inbox — and comes from the site's configured sender name and address",
          description: "Added 2026-08-21. Existing cases only checked that the preference SAVES and that the in-app notification appears; nobody ever checked the email itself leaves the building. Turn email on for one notification type, trigger that event for real (e.g. have a seller mark your order shipped), then open the actual inbox for the address on your account. Confirm: (a) an email arrives within a few minutes; (b) the From name and address match what Site Settings → Notifications is configured with, not a stranger's domain or a bare no-reply; (c) it landed in the inbox, not spam; (d) the links inside it open the right page on the live site and don't 404.",
          href: "/user/notifications",
        },
        {
          key: "notification-email-opt-out-respected",
          label: "Turning email OFF for a notification type stops the emails but still shows the in-app notification",
          description: "Added 2026-08-21. The two channels are meant to be independent — opting out of email must never silently opt you out of the in-app bell too. Turn email off for a type you can trigger on demand, trigger it, then confirm: no new email arrives, but the notification still appears in /user/notifications. Then turn it back on, trigger again, and confirm the email resumes — an opt-out that can't be reversed is just as much a bug.",
          href: "/user/notifications",
        },
        {
          key: "notification-links-to-right-entity",
          label: "Clicking a notification opens the exact order / bid / message it refers to — not a generic list page",
          description: "Added 2026-08-21. Click through several different notification types and confirm each one lands on the specific record it names. A notification that says \"Your order was shipped\" must open THAT order, not /user/orders. Also confirm nothing dead-ends on a 404 or an \"unauthorized\" page.",
          href: "/user/notifications",
        },
      ],
    },
    {
      pageKey: "faq-help",
      pageLabel: "FAQ & Help",
      href: "/faqs",
      cases: [
        { key: "faq-bottom-borders", label: "FAQ question rows show a clear bottom-border divider on the homepage and the FAQs page", href: "/faqs" },
        { key: "faq-mobile-count", label: "Homepage FAQ section shows a good number of questions on mobile, not just 1-2", href: "/" },
        { key: "tabs-mobile-dropdown", label: "Tabs on category/brand/product/event detail pages collapse into a colored dropdown on mobile once there are more than 5 tabs" },
      ],
    },
    {
      pageKey: "search",
      pageLabel: "Search",
      href: "/products",
      cases: [
        {
          key: "search-typeahead-differs",
          label: "Typing \"dranzer\" and then \"dragoon\" in the header search gives DIFFERENT suggestions",
          description:
            "WAS: the same 5 newest rows appeared for every keystroke, because no search term reached the query at all. If both terms give an identical list, the term is still being ignored.",
        },
        {
          key: "search-typeahead-no-drafts",
          label: "Header search suggestions contain no draft or archived listings",
          description:
            "WAS: the suggestion query applied no status filter, so unpublished drafts were visible to the public.",
        },
        {
          key: "search-prefix-match",
          label: "Searching \"dran\" finds Dranzer products on /products",
          description:
            "WAS: no match at all - only whole words matched, so a partial term found nothing.",
          href: "/products",
        },
        {
          key: "search-both-words-required",
          label: "Searching \"red dranzer\" returns only items matching BOTH words, not either one",
          description:
            "WAS: array-contains-any made multi-word search an OR, so adding a second word made the list LONGER instead of narrower. Check the count drops versus \"dranzer\" alone.",
          href: "/products",
        },
        {
          key: "search-plus-category-filter",
          label: "A search term AND a category filter apply together on /products",
          description:
            "WAS: an empty if-body dropped BOTH, so the page ignored the search and the filter simultaneously and showed everything. Apply one, note the count, then add the other and confirm it narrows again.",
          href: "/products",
        },
        {
          key: "search-keeps-sort",
          label: "Changing the sort while a search term is active re-orders the results and keeps the term",
          description:
            "WAS: the sort was silently discarded whenever a term was present, so the dropdown said \"Oldest\" over unsorted rows.",
          href: "/products",
        },
        {
          key: "search-keeps-facets",
          label: "On /products, searching keeps the price, tag and availability facets working",
          description:
            "WAS: the old case-insensitive operator threw inside the query builder, and because exceptions were suppressed the throw aborted every clause AFTER it - so one search term silently disabled the rest of the filter bar.",
          href: "/products",
        },
        {
          key: "search-case-and-accents",
          label: "\"POKEMON\" with an accent, without one, and capitalised all return the same results",
          description:
            "WAS: matching was case- and accent-sensitive, so only the exact stored spelling matched.",
          href: "/products",
        },
        {
          key: "search-single-char-narrows",
          label: "A single-character query narrows the list instead of showing everything",
          description:
            "WAS: a 1-char term was discarded as too short and the unfiltered collection came back - indistinguishable from a search that matched everything.",
          href: "/products",
        },
        {
          key: "search-faqs",
          label: "Searching on /faqs returns matching questions",
          description:
            "WAS: this is the report that started the whole migration - 63 FAQs existed, none had search tokens, so every query returned empty.",
          href: "/faqs",
        },
        {
          key: "search-faq-category-page",
          label: "Opening a FAQ category page renders its questions",
          description:
            "WAS: a missing index threw FAILED_PRECONDITION, which was swallowed, leaving a blank page with no error.",
          href: "/faqs",
        },
        {
          key: "search-scams-listing",
          label: "/scams lists the verified scammer profiles",
          description:
            "WAS: \"No verified scammers yet\" always, because the query needed an index that did not exist.",
          href: "/scams",
        },
        {
          key: "search-scam-partial-and-upi",
          label: "On /admin/scammers, searching \"Vikram\" finds \"Vikram Mehta\", and searching a UPI id also finds its profile",
          description:
            "WAS: the query matched a WHOLE array element, so \"Vikram\" found nothing against a list holding \"Vikram M\" and \"Vikram Mehta\" - and phones and UPI ids were never searched at all despite the box promising them.",
          href: "/admin/scammers",
        },
        {
          key: "search-store-event-blog-review",
          label: "Store, event, blog and review searches each return matches",
          description:
            "WAS: never implemented for any of the four - the box existed and the endpoint ignored the term.",
          href: "/blog",
        },
        {
          key: "search-admin-exact-match",
          label: "On /admin/reviews a FULL reviewer name matches, a partial one matches nothing, and the box says \"exact match\"",
          description:
            "This asserts a DELIBERATE decision, not a bug: the field is encrypted, and ciphertext has no usable prefix, so it is resolved through a blind index that matches exactly. What was wrong was the placeholder - it read \"Search reviews, products, or seller names\" and matched none of those three.",
          href: "/admin/reviews",
        },
        {
          key: "search-admin-degraded-sort",
          label: "Searching on /admin/payouts shows a notice that results are not sorted while searching",
          description:
            "Preserving the sort would need 14 more composite indexes to order a result an exact email match bounds at one row, so the sort is dropped on purpose. WAS: dropped SILENTLY - the sort dropdown kept displaying \"Oldest\" over unsorted rows.",
          href: "/admin/payouts",
        },
        {
          key: "search-admin-team-filter-chip",
          label: "On /admin/team, applying any filter chip still returns employees",
          description:
            "WAS: the filter string was CONCATENATED rather than joined, producing one malformed clause that matched nothing - so the team list silently emptied the moment anyone filtered it.",
          href: "/admin/team",
        },
        {
          key: "search-no-empty-toolbar-gap",
          label: "A listing page whose search box was removed shows no empty gap in its toolbar",
          description:
            "31 boxes were removed because their endpoints ignored the term. The toolbar should close up, not leave a hole where the input was.",
          href: "/admin/coupons",
        },
        {
          key: "search-nonsense-term-returns-nothing",
          label: "Searching \"zzzznope\" anywhere returns ZERO results",
          description:
            "The single most important case here. Every bug above returned HTTP 200 with plausible-looking rows, so a real term matching something proves nothing - only a nonsense term returning nothing distinguishes \"filtering\" from \"returning everything\". Try it on /products, /faqs, /blog and /admin/scammers.",
          href: "/products",
        },
        {
          key: "search-finds-older-records",
          label: "An OLDER listing - one that existed before this feature shipped - is findable by name",
          description:
            "Write this one carefully. Every other case here passes on freshly seeded data while real production documents stay invisible, because search tokens are only written when a record is saved. Pick a listing that has NOT been edited recently and confirm it is findable; if it is not, the backfill did not cover it.",
          href: "/products",
        },
      ],
    },
  ]),

  ...group("community-support", "Community & Support", [
    {
      pageKey: "support-tickets",
      pageLabel: "Support Tickets",
      href: "/user/support",
      cases: [
        { key: "create-ticket", label: "Creating a support ticket works", href: "/user/support" },
        { key: "reply-ticket", label: "Replying to an open support ticket works" },
        {
          key: "support-tickets-search-box",
          label: "The support tickets list now has a working search box (by subject, id, or category) — it did not have one at all before",
          description: "Converted 2026-08-21 off a hand-wired toolbar (which had status filter + \"hide resolved/closed\" toggle + sort, but no search input) onto the standard DataListingView scaffold, which adds search for free. Confirm typing part of a ticket's subject narrows the list, and the existing status filter + \"Hide resolved/closed\" toggle still work.",
          href: "/user/support",
        },
      ],
    },
    {
      pageKey: "public-profile",
      pageLabel: "Public Profiles & Stores",
      href: "/stores",
      cases: [
        { key: "view-seller-store", label: "Viewing a seller's public store page works" },
        { key: "view-public-profile", label: "Viewing another user's public profile works" },
      ],
    },
  ]),

  ...group("design-ux", "Design & UX", [
    {
      pageKey: "general-design",
      pageLabel: "Colors, Styles, Readability, Mobile",
      href: "/",
      cases: [
        { key: "contrast-readability", label: "Text contrast/readability is good on product cards" },
        { key: "mobile-nav", label: "Mobile navigation (bottom bar, menu) works and looks correct" },
        { key: "dark-mode", label: "Dark mode renders correctly across pages" },
        { key: "loading-states", label: "Loading/skeleton states look correct while data fetches" },
        { key: "empty-states", label: "Empty states (no results, empty cart) look correct" },
        { key: "error-states", label: "Error states (404, form validation) look correct" },
        { key: "card-row-heights-aligned", label: "Product/auction/pre-order/event cards in the same row are the same height, with their action button (Reserve now, Place bid, View details, etc.) aligned along a common bottom edge even when one card's description is longer than another's" },
        { key: "image-watermark-subtle", label: "Product and listing images show a small, subtle watermark (not oversized or fully opaque, doesn't obscure the image)" },
        {
          key: "clickable-image-tiles-not-blank",
          label: "Every CLICKABLE image tile across the site shows its picture, not an empty box — check all six surfaces listed below",
          description: "Fixed 2026-08-21. All of these are the same shape (a small image inside a clickable tile) and all broke together, so they must be re-checked together: (1) the mini thumbnail strip under a product's main gallery image; (2) the \"Photos (N)\" grid on a review detail page, AND the thumbnail strip along the bottom of that page's photo lightbox; (3) the image thumbnails inside a review popup/modal; (4) the tile grid on a prize-draw's collage of prizes; (5) the tile grid on a bundle's collage of included items; (6) the \"choose an existing file\" grid in the media picker when adding an image as a seller/admin. In every case the picture itself must be visible — a bordered but empty square is a fail.",
          href: "/products/product-beyblade-burst-valkyrie",
        },
        {
          key: "icon-button-label-spacing",
          label: "Buttons that show an icon next to their text have a normal gap between the icon and the word — the two are not jammed together",
          description: "Same 2026-08-21 fix as the blank image tiles: the button's spacing setting had stopped reaching its contents, so icon+label buttons were rendering with no gap at all. Scan a few pages with icon buttons (product detail actions, dashboard toolbars, the cart) and confirm the spacing looks deliberate rather than cramped.",
        },
        { key: "section-cta-buttons-visible", label: "Homepage section \"View all →\" / \"Go to…\" buttons use a solid primary-colored fill so they're clearly identifiable as clickable CTAs, not a plain white/outline box that blends into the page" },
        {
          key: "mobile-search-bar-proportions",
          label: "On mobile, the global header search bar's resource-type dropdown (Products/Auctions/etc.) is a compact, capped width and the text input takes up most of the remaining space — not an oversized dropdown squeezing the input down to a sliver",
          href: "/",
        },
      ],
    },
    {
      pageKey: "sticky-cta-bar",
      pageLabel: "Sticky Buy/Bid Bar on Scroll",
      href: "/products/product-beyblade-original-dranzer-s",
      cases: [
        {
          key: "desktop-hidden-at-top",
          label: "ON DESKTOP: when a product page first loads, there is NO floating bar across the bottom of the window — the page looks exactly as it always has",
          description: "Use a full-size browser window (not a phone or a narrow window). The bar is meant to stay out of the way while the real Add to Cart / Buy Now buttons are still visible on screen.",
        },
        {
          key: "desktop-appears-on-scroll",
          label: "ON DESKTOP: after scrolling down past the product images and buy buttons, a bar slides up from the bottom of the window with the price and the same Add to Cart / Buy Now actions",
          description: "This is the whole point of the change: on a long page the buy buttons used to scroll away with no way back except scrolling up.",
        },
        {
          key: "desktop-hides-scrolling-back-up",
          label: "ON DESKTOP: scrolling back to the top of the page slides the bar away again",
        },
        {
          key: "desktop-buttons-work",
          label: "ON DESKTOP: the buttons in the floating bar actually work — Add to Cart adds the item, Buy Now starts checkout, and the wishlist button saves it",
          description: "They should behave identically to the buttons in the main product panel, including going disabled for an out-of-stock item.",
        },
        {
          key: "desktop-not-covering-footer",
          label: "ON DESKTOP: scrolling to the very bottom of the page, the floating bar does not permanently cover the footer — you can still read and click footer links",
        },
        {
          key: "mobile-unchanged",
          label: "ON MOBILE: the bottom action bar behaves exactly as it did before — visible while you browse the product, sitting above the bottom navigation, not overlapping it",
          description: "Regression check. Nothing about the phone experience was supposed to change; only desktop gained the bar.",
        },
        {
          key: "auction-countdown-in-bar",
          label: "On an auction page the sticky bar shows the live countdown (\"Ends in …\"), the current bid and bid count, and its Place Bid button jumps to the bidding form",
          description: "The countdown should tick, not sit frozen.",
          href: "/auctions/auction-beyblade-original-dragoon-storm",
        },
        {
          key: "ended-auction-no-bar",
          label: "An auction that has already ended shows NO sticky bar at all — there is nothing left to bid on",
          href: "/auctions/auction-tester-sandbox-won",
        },
        {
          key: "preorder-bar",
          label: "A pre-order page's sticky bar says Reserve Now and shows the price, and the button jumps to the reserve panel",
          href: "/pre-orders/preorder-tester-sandbox-1",
        },
        {
          key: "prize-draw-bar-label",
          label: "A prize-draw page's sticky bar CTA reads \"Enter Draw\" (not \"Buy Now\") and the info line shows the price per entry",
          description: "Label changed on purpose — you are entering a draw, not buying a specific item. Flag it if \"Buy Now\" still appears.",
          href: "/prize-draws/prizedraw-tester-sandbox-1",
        },
        {
          key: "closed-prize-draw-no-bar",
          label: "A closed prize draw shows NO sticky bar",
          href: "/prize-draws/prizedraw-tester-sandbox-closed",
        },
        {
          key: "classified-bar-no-cart",
          label: "A classified listing's sticky bar offers \"Make an Offer\" and does NOT offer Add to Cart or Buy Now — classifieds are arranged directly with the seller",
          description: "Tapping it should jump to the contact-seller panel. An Add to Cart button appearing here is a real bug.",
          href: "/classified/classified-tester-sandbox-1",
        },
        {
          key: "digital-code-bar",
          label: "A digital-code listing has a sticky Buy Now bar, and a sold-out one has no bar at all",
          href: "/digital-codes/digitalcode-tester-sandbox-1",
        },
        {
          key: "live-item-bar",
          label: "A live-item listing has a sticky Buy Now bar that jumps to its buy panel",
          href: "/live/live-tester-sandbox-1",
        },
        {
          key: "bar-not-overlapping-content",
          label: "On every page above, nothing at the bottom of the page is left permanently hidden behind the sticky bar — you can always scroll far enough to read the last line of content",
        },
        {
          key: "no-bar-on-non-listing-pages",
          label: "Pages that never had a bottom bar still do not have one — homepage, blog posts, FAQ, and the site-wide listing pages show no floating buy bar on desktop",
          description: "The bar is opt-in per page; a stray one on the homepage would be a bug.",
          href: "/",
        },
        {
          key: "bar-with-keyboard-open",
          label: "ON MOBILE: opening the on-screen keyboard (e.g. tapping a bid amount or search field) does not leave the sticky bar floating in the middle of the screen or hidden behind the keyboard",
        },
      ],
    },
    {
      pageKey: "status-badge-legibility",
      pageLabel: "Listing Tags & Status Chips — Light vs Dark Mode",
      href: "/products",
      cases: [
        {
          key: "listing-type-tags-readable-light",
          label: "IN LIGHT MODE: on the main Products grid, every listing-type tag on a card — Auction, Pre-Order, Live Item, Digital Code, Prize Draw, Classified, Art Print, Sticker Sheet — is clearly readable, with a solid colored pill behind dark-enough text",
          description: "This is the headline fix for 2026-08-21. Reported as \"the auction tag / live tag is white text on a white pill, or a faint grey you cannot read.\" Switch the site to LIGHT mode first (theme toggle in the header) — the bug only appeared there. Read every tag out loud; a tag you have to squint at, tilt the screen for, or that shows text with no pill behind it at all, is still a bug.",
          href: "/products",
        },
        {
          key: "listing-type-tags-readable-dark",
          label: "IN DARK MODE: the same listing-type tags on the Products grid are still clearly readable — fixing light mode must not have broken dark mode",
          description: "Regression check, and a real risk here: the two modes use inverted color tokens, so it is genuinely possible to fix one and break the other. Toggle between light and dark a few times on the same page and confirm every tag survives both.",
          href: "/products",
        },
        {
          key: "live-item-tag-has-background",
          label: "The \"Live Item\" tag has an actual colored pill behind it — not bare red text floating directly on the product photo with no background",
          description: "This tag was a separate bug from the others: its background color name did not exist at all, so the browser threw the style away and rendered nothing behind the text. Easiest to spot on a card whose photo is busy or light-colored.",
          href: "/live",
        },
        {
          key: "promo-badges-readable",
          label: "IN LIGHT MODE: the small promotional badges on product cards — NEW, SALE, LIMITED, the bundle discount percentage, an auction's \"Ending soon\" / \"Reserve\" pill — are all readable against their colored background",
          href: "/products",
        },
        {
          key: "notification-count-bubbles-readable",
          label: "The unread-count bubbles (the small number circles on the header bell icon, the Messages nav item, and the cart/bottom action bar) show a readable number in BOTH light and dark mode — not a colored blob with an invisible digit",
          description: "You need at least one unread notification or message for the bubble to appear. Check both themes.",
          href: "/user/messages",
        },
        {
          key: "admin-status-chips-colored",
          label: "Admin and seller listing pages show status chips (Pending / Verified / Resolved / High priority / Featured / Sale, etc.) as genuinely COLORED pills — amber for pending, green for success, red for problems — not plain uncolored text",
          description: "Found 2026-08-21: a configuration gap meant every one of these colored chips authored inside the shared component library compiled to no CSS at all, so they had silently always rendered as plain unstyled text. Spot-check across a few pages: /admin/support-tickets, /admin/scammers, /admin/orders, /store/orders.",
          href: "/admin/support-tickets",
        },
        {
          key: "faq-helpful-buttons-readable",
          label: "On a FAQ, after clicking Yes or No on \"Was this helpful?\", the button you picked stays readable in BOTH light and dark mode — the selected button is a solid color with legible text, not white-on-pale",
          href: "/faqs",
        },
        {
          key: "detail-page-tags-readable",
          label: "Opening an individual auction, pre-order, prize draw, classified, digital code and live-item page, each one's type tag and status chips are readable in light mode",
          description: "Card grids and detail pages don't always share the same component, so check both. Use the sandbox listings linked from the Tester Hub if you need one of each type.",
          href: "/auctions/auction-beyblade-original-dragoon-storm",
        },
        {
          key: "whatsapp-community-member-pill",
          label: "IN LIGHT MODE: on the homepage's green WhatsApp community card, the member-count pill in its top-right corner (e.g. \"5,000+ members\") is readable — white text on a translucent darker pill, not white text on a white pill",
          description: "Reported alongside the tag bug: this pill was invisible in light mode. The people icon next to the number should be visible too.",
          href: "/",
        },
        {
          key: "image-lightbox-close-hover",
          label: "Opening a product image in the full-screen lightbox and hovering the X close button, the X stays visible as the button turns red — it does not vanish on hover",
          href: "/products/product-beyblade-original-dranzer-s",
        },
      ],
    },
    {
      pageKey: "back-to-top-button",
      pageLabel: "Back-to-Top Button",
      href: "/products",
      cases: [
        {
          key: "appears-and-clickable-on-long-page",
          label: "Scrolling down a long listing page, the floating back-to-top arrow appears in the bottom corner AND actually responds to a click — it is not sitting behind the bottom navigation bar, a sticky toolbar, or a buy bar",
          description: "Fixed 2026-08-21 — it previously shared a stacking level with the bottom navigation bar, so on many pages it was either partly covered or completely unclickable. Try it on a page that also has a sticky bottom bar (a product page scrolled down) — that is where it used to fail.",
          href: "/products",
        },
        {
          key: "above-sticky-buy-bar",
          label: "On a product page scrolled far enough for BOTH the sticky buy bar and the back-to-top arrow to be showing, the arrow sits above/clear of the buy bar rather than being hidden underneath it",
          href: "/products/product-beyblade-original-dranzer-s",
        },
        {
          key: "scrolls-to-top",
          label: "Clicking the back-to-top arrow smoothly scrolls the page back to the very top",
          href: "/products",
        },
        {
          key: "dismiss-returns-on-navigation",
          label: "Clicking the small X next to the back-to-top arrow hides it for the current page, and navigating to a different page brings it back",
          description: "Regression check on an older fix — dismissing it must not hide it for the rest of the browsing session.",
          href: "/products",
        },
        {
          key: "not-covering-toast-or-modal-actions",
          label: "The back-to-top arrow does not cover anything you need to click — check that a toast message, an open confirmation dialog's buttons, and the footer's bottom-right links are all still fully clickable while it is on screen",
          description: "It was deliberately raised to the frontmost layer, so this is the specific risk that change introduces. It should only ever float in the empty corner gutter.",
          href: "/products",
        },
      ],
    },
    {
      pageKey: "form-validation-errors",
      pageLabel: "Form Validation & Error Summary",
      href: "/store/products/new",
      cases: [
        {
          key: "error-summary-shows-beside-submit",
          label: "Submitting an admin/seller form (e.g. new product, new blog post, new event) with missing/invalid required fields shows a clearly-visible list of every problem right beside the Publish/Save button — not a generic \"something went wrong\" message",
          description: "Fixed 2026-08-21 — validation failures previously surfaced as an opaque, unhelpful production error with no indication of which field failed. A new shared FormErrorSummary component now lists every simultaneous issue live.",
          href: "/store/products/new",
        },
        {
          key: "error-summary-live-on-change",
          label: "The error summary beside Publish/Save updates live as you fix a field (the error disappears from the list immediately), not only after you click Submit again",
          href: "/store/products/new",
        },
        {
          key: "error-summary-step-tagged",
          label: "On a multi-step form (e.g. new product wizard), an error for a field on a step you're not currently viewing is labeled with that step's name in the summary, and clicking it jumps you to the correct step",
          href: "/store/products/new",
        },
        {
          key: "error-summary-supplements-inline",
          label: "Field-level inline error messages (shown directly under/beside the input) still appear as before — the new summary is in addition to them, not a replacement",
          href: "/store/products/new",
        },
      ],
    },
    {
      pageKey: "dashboard-layout",
      pageLabel: "Dashboards — Collapsible Sections & Mobile Tables",
      href: "/admin/dashboard",
      cases: [
        { key: "collapsible-admin", label: "Admin dashboard sections expand/collapse and remember their state on reload", href: "/admin/dashboard" },
        { key: "collapsible-store", label: "Store dashboard sections expand/collapse and remember their state on reload", href: "/store" },
        { key: "collapsible-user", label: "User profile dashboard sections expand/collapse and remember their state on reload", href: "/user/profile" },
        { key: "mobile-table-cards", label: "Admin/seller listing tables show full-row cards by default on mobile, with a working switch back to table view" },
        { key: "view-mode-persist", label: "Switching the dashboard table/card view mode is remembered on your next visit (filters/search/sort are not)" },
        {
          key: "list-view-default",
          label: "A dashboard listing you haven't set a view preference for opens in list (row-card) view by default, not table view",
          description: "The default view mode across every admin/store listing page changed from table to list on 2026-08-20. If you've already picked a view before, your saved preference still wins — check on a listing you haven't visited before, or clear the preference in your profile.",
        },
        {
          key: "row-table-click-consistency",
          label: "For any given dashboard listing, table rows, grid cards, and list cards all agree on whether clicking navigates somewhere — a card never looks clickable (hover/press styling) while doing nothing, and the table view never lacks a click affordance that the card view has",
          description: "Fixed 2026-08-20 — previously the default card renderer always looked clickable (cursor-pointer, hover state) even when the underlying listing had no real destination wired, while its table view correctly showed no affordance for the exact same config, reading as \"the table isn't clickable.\" Spot-check a few dashboard listings in both table and list/grid view.",
        },
        {
          key: "list-card-row-actions",
          label: "Row-level action buttons (the same ones in the table's overflow menu — edit, approve, delete, etc.) also appear directly on each list/grid card, not just in the table view",
          href: "/admin/orders",
        },
        {
          key: "listing-toolbar-consistency",
          label: "Every admin/seller/user dashboard listing page uses the exact same search+filter-drawer+sort-dropdown+pagination toolbar layout — no page has a bespoke, differently-laid-out search/filter UI of its own",
          description: "A 2026-08-21 sweep found 22 dashboard listings (admin Page Views/Ads/Carousel-adjacent/Event Entries, seller Bids/Orders/Products/Shipping Configs/Payout Methods/Store Categories/Reviews, and 10 user pages — Orders, Returns, Bids, Digital Codes, Events, Pre-Orders, Prize Draws, Reviews, Support, Notifications, plus seller Sublisting Categories) that had each hand-rolled their own toolbar with inconsistent capabilities (some had no search at all, some had no filter drawer). All were migrated onto the shared DataListingView scaffold, and a new strict-zero audit (audit-listing-view-standard.mjs) now blocks any future page from reintroducing a bespoke one. Spot-check 2-3 pages across different portals (e.g. /admin/analytics, /store/payout-methods, /user/support) and confirm they all look and behave identically in toolbar layout.",
          href: "/admin/analytics",
        },
      ],
    },
    {
      pageKey: "hand-mode-layout",
      pageLabel: "Left-Hand Mode",
      href: "/user/settings",
      cases: [
        { key: "sidebar-flips", label: "With Left-hand mode ON, the admin/store/user dashboard's persistent left navigation sidebar (and its collapse handle) moves to the right side of the screen; with it OFF (default), the sidebar stays on the left", href: "/admin/dashboard" },
        { key: "drawers-flip", label: "With Left-hand mode ON, side drawers/panels (filters, quick-add forms, cart, edit/create panels) that normally slide in from the right now slide in from the left", href: "/products" },
        { key: "close-buttons-flip", label: "With Left-hand mode ON, the X close button on drawers/panels/modals sits on the left edge of its header; with it OFF (default), it sits on the right edge" },
        { key: "back-to-top-cta-flips", label: "With Left-hand mode ON, the floating \"back to top\" button appears in the bottom-left corner instead of bottom-right after scrolling down a long listing page", href: "/products" },
        { key: "quick-links-unaffected", label: "Turning on Left-hand mode does not reorder or mirror the My Account / Admin dashboard quick-links tile grid — only its surrounding column shifts with the sidebar", href: "/user" },
        { key: "hero-carousel-arrows-flip", label: "With Left-hand mode ON, the homepage hero carousel's Prev/Next arrow pair appears in the bottom-left corner instead of bottom-right; the dots stay centered either way", href: "/" },
        { key: "gallery-arrows-unaffected", label: "Left-hand mode does NOT change a product image gallery/lightbox's Prev/Next arrows — Prev stays on the left edge and Next stays on the right edge in both modes" },
        { key: "homepage-section-buttons-mirror", label: "With Left-hand mode ON, homepage section header rows (e.g. Brands, Featured Bundles, Google Reviews) have their \"View All\" button on the opposite side from default — title and button swap sides", href: "/" },
        { key: "titlebar-actions-mirror", label: "With Left-hand mode ON, the top bar's action icons (search, Today's Deals, theme toggle, hamburger) move from the right edge to the LEFT edge and their order is mirrored — the hamburger ends up in the far-left corner — while the brand wordmark moves to the right edge; with it OFF (default), everything is the other way round", href: "/" },
        { key: "titlebar-centre-mark-unaffected", label: "Left-hand mode does NOT move the centred logo mark in the middle of the desktop top bar — it stays exactly centred in both modes", href: "/" },
        { key: "titlebar-row2-mirror", label: "On a phone-width viewport with Left-hand mode ON, the top bar's SECOND row (notifications / wishlist / cart / profile icons) packs against the LEFT edge in mirrored order with profile leftmost; with it OFF it packs against the right edge with notifications leftmost", href: "/" },
        { key: "titlebar-actions-no-overflow-narrow", label: "With Left-hand mode ON at the narrowest phone width (~320px), no top-bar icon is clipped or pushed off-screen — the mirrored row fits exactly as well as the default row does", href: "/" },
        { key: "bottom-nav-mirror", label: "With Left-hand mode ON, the mobile bottom tab bar's slots appear in reverse order (Profile leftmost, Home rightmost); with it OFF, Home is leftmost. Slot widths stay equal in both modes.", href: "/" },
        { key: "dashboard-bottom-nav-mirror", label: "With Left-hand mode ON, the dashboard's own mobile bottom tab bar (on admin/store/user routes) mirrors the same way the public one does — both bars behave identically", href: "/user" },
        { key: "count-badges-mirror", label: "With Left-hand mode ON, the red count bubbles on the cart / wishlist / notification icons sit on the TOP-LEFT corner of their icon instead of top-right — in BOTH the top bar and the mobile bottom tab bar — and neither is clipped by the icon's edge", href: "/" },
        { key: "nav-scroll-arrows-unaffected", label: "Left-hand mode does NOT flip the main navigation bar's overflow scroll chevrons — the left chevron still scrolls the nav left and the right chevron still scrolls it right, in both modes", href: "/" },
        { key: "header-tab-order-sane", label: "With Left-hand mode ON, pressing Tab repeatedly from the top of the page still reaches every top-bar control with none skipped or trapped", description: "The visual left-to-right order will NOT match the tab order in left-hand mode — that is expected and accepted (the mirror is visual only, DOM order is deliberately unchanged so screen-reader reading order stays stable). What must not happen is a control becoming unreachable.", href: "/" },
        { key: "hand-mode-no-fouc", label: "On a hard page reload with Left-hand mode already ON, panels/sidebars AND the top bar / bottom tab bar render in their left-hand positions immediately — there is no visible flash of the header icons or tab bar briefly appearing in their default positions before snapping over" },
      ],
    },
    {
      pageKey: "footer-theme",
      pageLabel: "Footer & Dark Mode",
      href: "/",
      cases: [
        { key: "footer-dark-mode", label: "Footer background and all link/text colors switch correctly between light and dark mode", href: "/" },
        {
          key: "footer-github-icon",
          label: "The footer's social icon row (brand column, bottom-left) shows a GitHub icon alongside Instagram/Twitter/WhatsApp, and clicking it opens the developer's real GitHub profile in a new tab",
          description: "Added 2026-08-20 — GITHUB was a new socialUrls key with no footer icon before this. Confirm the icon renders (not a broken/missing glyph) and the link target is a real, working github.com profile, not a placeholder or dead link.",
          href: "/",
        },
        {
          key: "footer-text-weight-readable",
          label: "Footer text is comfortably readable, not thin and washed out — the link lists, the brand description paragraph, the copyright line and the small sitemap/legal links at the very bottom all render in a slightly heavier weight than plain body text",
          description: "Changed 2026-08-21 — the footer's greyed text was previously at the lightest weight, which made it hard to read against the page background, especially on a laptop screen at an angle. Compare the footer against the same grey text elsewhere on the page; the footer should read as more solid, without looking bold.",
          href: "/",
        },
        {
          key: "footer-column-headings-stand-out",
          label: "On DESKTOP, each footer link column's heading (Shop, Company, Support, etc.) clearly stands out as a heading above its list of links, rather than looking like just another link in the list",
          href: "/",
        },
        {
          key: "footer-weight-both-themes",
          label: "The footer text weight change looks right in BOTH light and dark mode — heavier but not bold, and it never turns into an unreadable smudge in dark mode",
          href: "/",
        },
        {
          key: "footer-mobile-accordions",
          label: "ON MOBILE, the footer's collapsible link sections still open and close correctly, and their links are as readable as the desktop columns",
          href: "/",
        },
      ],
    },
    {
      pageKey: "homepage-carousels",
      pageLabel: "Homepage Carousels",
      href: "/",
      cases: [
        { key: "carousel-loops", label: "Homepage carousels (Shop by Category, Top Brands, Featured Products, Live Auctions, Reserve Before It Ships, Verified Stores, Tournaments & Events, Collector Reviews) loop back to the first item after reaching the last instead of getting stuck at the end", href: "/" },
        { key: "carousel-no-flicker", label: "Homepage carousel auto-scroll does not flash/flicker when looping back to the first item" },
        {
          key: "hero-carousel-video-plays",
          label: "The hero carousel slide with a video background actually PLAYS the video — not a blank/black panel",
          description:
            "Open the browser console (F12 → Console) while the homepage loads. There must be no 'Load of media resource … failed' or 404 for a .mp4. If the slide is blank, note the failing URL from the console's Network tab.",
          href: "/",
        },
        { key: "carousel-pause-on-interaction", label: "Homepage carousel auto-scroll pauses while hovering, touching, keyboard-focusing (Tab + arrow keys), or scrolling it, and resumes afterward" },
        { key: "carousel-arrows-work", label: "Homepage carousel prev/next arrow buttons work and wrap around at both ends" },
        { key: "hero-banner-loops", label: "Hero banner at the top of the homepage rotates through all slides and loops back to the first without getting stuck" },
        { key: "sections-showcase-render", label: "Categories showcase and brands strip sections render real seeded data" },
        { key: "sections-promo-render", label: "Deals/promotions, newsletter signup, and spotlight sections render correctly" },
        { key: "sections-live-reserve-render", label: "Live auctions and \"Reserve Before It Ships\" (pre-orders) sections show real listings" },
        { key: "sections-social-proof-render", label: "Verified stores, tournaments & events, and collector reviews sections render correctly" },
        { key: "sections-social-feed-hidden", label: "The social-feed section type is correctly hidden on the homepage since it's disabled in Site Settings" },
        { key: "hero-welcome-logo-sized-padded", label: "The homepage welcome hero's brand mark/logo panel (desktop, right side) is appropriately sized and padded inside its card — not oversized, cramped, or touching/overflowing the card edges", href: "/" },
        {
          key: "welcome-hero-no-gap",
          label: "There is no large empty gap between the sticky header/navbar (or the expanded search bar) and the homepage Welcome hero section below it",
          href: "/",
        },
        {
          key: "promo-banner-overlay",
          label: "The promotion/announcement banner overlays the top of the first homepage section (translucent strip) instead of pushing the page content down with extra vertical space",
          href: "/",
        },
      ],
    },
    {
      pageKey: "carousel-arrow-bounds",
      pageLabel: "Carousel Arrows — Card Boundaries",
      href: "/",
      cases: [
        {
          key: "arrows-never-cover-cards",
          label: "On a laptop/desktop, the carousel's ← / → arrows sit in their own empty strip to the left and right of the cards — no part of any card (image, title, price, badge, button) is ever hidden behind an arrow",
          description:
            "Fixed 2026-08-21. Previously the arrows were drawn ON TOP of the cards: an opaque white circle sat over the card's left and right edges, cutting into the title and image. The arrows should now read as boundary walls with the cards living strictly between them.",
          href: "/",
        },
        {
          key: "arrows-no-overlap-mid-scroll",
          label: "Scroll a carousel to a HALFWAY position (drag it, or click → once and stop mid-way) and confirm the cards are still cleanly cut off at the inner edge of the arrow strip — a card must never slide underneath an arrow while scrolling",
          description:
            "This is the single most important case — the old bug was invisible at rest and only appeared once you scrolled. The arrows looked fine on first load, then cards slid under them the moment the row moved. Check several carousels, and stop scrolling at a few different in-between positions.",
          href: "/",
        },
        {
          key: "no-arrows-on-mobile",
          label: "On a phone, carousels show NO ← / → arrow buttons at all — you scroll them by swiping",
          description:
            "Intentional as of 2026-08-21: on a narrow screen the arrows would eat roughly 60px of card width, so they are hidden below tablet size and swiping is the only control. Seeing arrows on a phone is now a bug.",
          href: "/",
        },
        {
          key: "mobile-card-not-clipped",
          label: "On a phone, a carousel card fills the row edge-to-edge and is NOT cut off on either side — its title, price and button are fully visible without any part running off-screen",
          description:
            "Fixed 2026-08-21. Cards used to be rendered wider than the space available, so both the left and right edges were chopped off simultaneously. Compare against the section heading above it: the card should line up with the section's own left/right margins.",
          href: "/",
        },
        {
          key: "mobile-swipe-and-snap",
          label: "On a phone, swiping a carousel still scrolls it, and it settles neatly on one card at a time rather than stopping halfway between two cards",
          href: "/",
        },
        {
          key: "no-white-fade-smear",
          label: "There is no washed-out white gradient smear at the left/right ends of a carousel — especially on sections that have a coloured or photo background, where a white haze would look obviously wrong",
          description:
            "The old fade-edge effect was removed on 2026-08-21 because the arrow gutters now mark the boundary. Check a section with a background image (if one is configured) as well as a plain one, in both light and dark mode.",
          href: "/",
        },
        {
          key: "two-row-tall-arrows",
          label: "On a section that shows TWO rows of cards (e.g. Reserve Before It Ships / Live Auctions when configured for 2 rows), the taller full-height arrow bars also sit beside the cards, not over them",
          href: "/",
        },
        {
          key: "arrows-dark-mode",
          label: "In dark mode the carousel arrows are still clearly visible against the page and sit in the same position beside the cards as in light mode",
          href: "/",
        },
        {
          key: "arrow-end-state-no-jump",
          label: "Clicking → repeatedly to the end of a carousel that does not loop dims/greys the → arrow, and the cards do NOT shift sideways when that happens",
          href: "/",
        },
        {
          key: "resize-across-breakpoint",
          label: "On a desktop browser, slowly narrow the window until it is phone-width and back again — the arrows disappear/reappear at the size change and the cards re-fit cleanly each time, never ending up underneath an arrow",
          description:
            "Easiest with the browser's responsive/device-toolbar mode. Drag the width slowly rather than jumping between presets.",
          href: "/",
        },
        {
          key: "related-carousels-same-behaviour",
          label: "The \"You might also like\" / related-items carousels lower down a PRODUCT page behave exactly the same as the homepage ones — arrows beside the cards, nothing covered, no arrows on mobile",
          description:
            "These are a different surface using the same underlying scroller, so they are the best check that the fix applied everywhere rather than only on the homepage.",
          href: "/products/product-tester-standard-1",
        },
        {
          key: "category-page-carousels-same-behaviour",
          label: "Carousels on a CATEGORY page (e.g. related groups / bundles strips) behave the same — arrows beside the cards, nothing covered",
          href: "/categories/category-beyblade-burst",
        },
      ],
    },
  ]),

  ...group("public-pages", "Public & Marketing Pages", [
    {
      pageKey: "core-listing-pages",
      pageLabel: "Homepage & Core Listing Pages",
      href: "/",
      cases: [
        { key: "homepage-loads", label: "The homepage loads without errors on both desktop and mobile", href: "/" },
        {
          key: "whatsapp-community-link-real",
          label: "The \"Join the Community\" WhatsApp button on the homepage opens the real LetItRip WhatsApp group, not a dead link",
          description: "Fixed 2026-08-21 — the seeded link was a placeholder that was never a valid WhatsApp invite code, so the button opened a page that could not resolve to any group. Tap it on a device with WhatsApp installed and confirm it offers to join an actual group. The Contact page's WhatsApp link must open the same group.",
          href: "/",
        },
        { key: "about-us-in-main-nav", label: "\"About Us\" appears as an item in the main public top navigation, not just the footer", href: "/about" },
        {
          key: "about-team-real-founder",
          label: "The About page's \"Who's Behind LetItRip\" team section shows the real founder's name (not a placeholder persona) and a working \"GitHub ↗\" link on their card",
          description: "Updated 2026-08-20 — the founder card previously used a fictional placeholder name with no GitHub link. Confirm the founder card's name matches the real developer and the GitHub link opens their actual profile.",
          href: "/about",
        },
        {
          key: "about-values-expanded",
          label: "The About page's \"Our Values\" section shows six values, each with a second smaller paragraph, plus a \"How we hold ourselves to this →\" link that opens the Ethics page",
          description: "Added 2026-08-24 — the section previously had three values, no subtitle, and no onward link. Confirm the subtitle line renders under the heading and the link lands on /ethics.",
          href: "/about",
        },
        {
          key: "developer-page-loads",
          label: "The Developer page loads correctly, is linked from the footer's Support column next to About Us, shows the real developer's name, and its \"GitHub ↗\" link opens their actual GitHub profile",
          href: "/developer",
        },
        { key: "products-listing-page", label: "The products listing page loads and paginates correctly", href: "/products" },
        { key: "auctions-listing-page", label: "The auctions listing page loads correctly", href: "/auctions" },
        { key: "preorders-listing-page", label: "The pre-orders listing page loads correctly", href: "/pre-orders" },
        { key: "bundles-listing-page", label: "The bundles listing page loads correctly", href: "/bundles" },
        { key: "categories-index", label: "The categories index page loads correctly", href: "/categories" },
        { key: "brands-index-detail", label: "The brands index and an individual brand detail page load correctly" },
        {
          key: "category-item-counts-accurate",
          label: "Category cards on the categories index page show an accurate, non-zero item count matching what's actually inside each category",
          description: "Verify \"Beyblade Burst\" shows 2 items (matching the 2 real products inside it when browsed), not \"0 items\". If any category shows 0 despite having published products, run `npm run categories:backfill-metrics` to recompute the counters.",
          href: "/categories",
        },
        {
          key: "parent-category-includes-children",
          label: "Visiting a PARENT category's page shows products filed under its child categories too (not just products tagged with the parent's own id), and its \"N products\" count is the sum of its own products plus every child category's",
          description: "Verify against \"Spinning Tops\" (category-spinning-tops, the root over Original/Metal Fight/Burst/X) — its product listing and count should include every Beyblade product across all 4 generations, not show empty or only the root's own (normally zero) direct products. Note: this rollup applies to page 1 / default sort only — changing sort or paging within the tab may still narrow back to the parent's own products (a known follow-up, not yet fixed).",
          href: "/categories",
        },
        {
          key: "category-brand-related-sections",
          label: "A category detail page shows a \"Related Categories\" section (other categories sharing the same root) and a brand detail page shows a \"Related Brands\" section, each with real items",
          description: "Verify against \"Beyblade Burst\" (category-beyblade-burst) — Related Categories should show Beyblade Original, Metal Fight, and Beyblade X (siblings under the \"Spinning Tops\" root).",
          href: "/categories",
        },
        {
          key: "category-brand-highlights-faq-grouped-listings",
          label: "A category detail page shows a highlights list + FAQ accordion right after the hero, a brand detail page shows the same plus an \"About this brand\" panel (website/country/founded), and both show a \"Grouped listings\" carousel populated with real items",
          description: "Added 2026-08-21 — CategoryDocument previously had no schema field at all for editorial content (highlights/FAQ), and GroupedListingsCarousel had zero public consumers on category/brand pages. Verify against \"Beyblade Burst\" (category-beyblade-burst, /categories/category-beyblade-burst) and \"Takara-Tomy\" (brand-takara-tomy, /brands/brand-takara-tomy) — both should show 3-5 highlight bullets, 2-4 FAQ entries, and (brand only) a working website link + country + founded year.",
          href: "/categories/category-beyblade-burst",
        },
      ],
    },
    {
      pageKey: "stores-sellers-directories",
      pageLabel: "Store & Seller Directories",
      href: "/stores",
      cases: [
        { key: "store-directory", label: "The store directory page loads correctly", href: "/stores" },
        { key: "store-detail-tabs", label: "A store detail page's listing-type dropdown (Products/Auctions/Pre-Orders/Prize Draws/Bundles/Classifieds/Digital Codes/Live Items/Art & Stickers) switches correctly between listing types, and the separate Coupons/Reviews/About tabs next to it all load correctly", description: "The listing-type dropdown is always a dropdown (not just on narrow/mobile widths, unlike category/brand/product/event tabs) since a store can have up to 9 listing types — Coupons, Reviews, and About stay as standalone tabs beside it, never folded into the dropdown." },
        {
          key: "category-tabs-every-type-renders",
          label: "On a category page, EVERY listing-type tab that is offered renders real content when opened — none show a blank panel",
          description: "Fixed 2026-08-21 — the Classifieds, Digital Codes, Live Items and Art & Stickers tabs were clickable but had no content behind them, so selecting one highlighted the tab and showed nothing at all. Open every tab the page offers, one by one.",
          href: "/categories/category-beyblade-burst",
        },
        {
          key: "brand-tabs-every-type-offered",
          label: "A brand page offers the same listing-type tabs a category page does (minus Stores) — Classifieds, Digital Codes, Live Items and Art & Stickers are not silently missing",
          description: "Fixed 2026-08-21 — the brand page dropped those four tabs entirely rather than rendering them, so those listing types were unreachable from any brand. Compare the tab row on a brand page against the same brand's category page.",
          href: "/brands/brand-beyblade",
        },
        {
          key: "category-brand-tab-counts-match",
          label: "Each category/brand tab's count badge matches the number of items the tab actually shows",
          href: "/categories/category-beyblade-burst",
        },
        {
          key: "empty-tabs-hidden",
          label: "A store/category/brand detail page never shows a tab for a listing type it has zero items of — e.g. a store with no products doesn't show a \"Products\" tab at all, not an empty products page",
          description: "Fixed 2026-08-20 — tab visibility now checks the already-fetched per-type count and omits the tab entirely when it's zero, instead of always rendering all tabs regardless of whether they'd show anything. \"About\" always stays visible on store pages (no item-count concept). Verify on a real store/category/brand that's genuinely missing at least one listing type.",
          href: "/stores",
        },
        {
          key: "store-art-stickers-tab-shows-items",
          label: "A store's \"Art & Stickers\" tab opens a real page with art and sticker items on it — not an empty grid or a page full of ordinary products",
          description: "Fixed 2026-08-21 — the tab showed a genuine non-zero count but linked to the store's Products tab, which filters to standard products only, so it always landed on a page containing none of the items it had just counted. It now has its own /stores/{slug}/art page.",
          href: "/stores/store-beyblade-arena/art",
        },
        {
          key: "store-tab-counts-match-contents",
          label: "Every store tab's count badge matches what the tab actually contains — open each of Products, Auctions, Pre-Orders, Prize Draws, Classifieds, Digital Codes, Live Items, Art & Stickers and Bundles in turn",
          description: "A tab showing \"5\" and then rendering an empty grid (or somebody else's items) is the bug class this checks for. Any mismatch is a failure.",
          href: "/stores/store-beyblade-arena",
        },
        {
          key: "store-tab-sort-survives-reload",
          label: "Changing the sort on a store tab and reloading the page keeps that sort applied — the first paint matches what the Sort dropdown shows",
          description: "Fixed 2026-08-21 — store tab pages ignored the URL when rendering server-side, so a reload always painted page 1 in the default order while the toolbar still displayed the sort you had picked. Set a non-default sort, reload, and confirm the item order matches the dropdown.",
          href: "/stores/store-beyblade-arena/auctions",
        },
        {
          key: "store-preorders-tab-default-sort",
          label: "A store's Pre-Orders tab opens in the same default order as the public /pre-orders page (earliest delivery first)",
          description: "Fixed 2026-08-21 — the store tab had its own drifted copy of the sort list and opened Newest-first while /pre-orders opened Earliest-Delivery-first for the same items. Compare the two side by side; the first item should match.",
          href: "/stores/store-beyblade-arena/pre-orders",
        },
        {
          key: "store-classified-live-facets-filter",
          label: "The type-specific filters on a store's Classifieds and Live Items tabs actually narrow the results (city / negotiable / accepts shipping, and species / sex / jurisdiction)",
          description: "Fixed 2026-08-21 — these were rendered and counted toward the Filters badge but never sent to the server, so they changed nothing. Apply one and confirm the grid genuinely shrinks.",
          href: "/stores/store-beyblade-arena/classified",
        },
        {
          key: "store-tab-empty-state-not-error",
          label: "A store tab with genuinely no items shows a friendly empty state — never a blank white area, a spinner that never stops, or an error toast about a missing index",
          href: "/stores/store-tester-qa-seller",
        },
        { key: "sellers-directory", label: "The sellers directory page loads correctly", href: "/sellers" },
        { key: "seller-detail-page", label: "An individual seller's public detail page loads correctly" },
        { key: "scams-registry", label: "The scams registry page and an individual scam detail page load correctly", href: "/scams" },
        {
          key: "scam-related-profiles-sections",
          label: "A scammer profile page shows a \"Related Profiles\" section (explicit same-person cross-links) and a separately-labeled \"Similar Scam Reports\" section (same scam type, with a note that it does not imply the same person)",
          description: "Verify against \"MetalFusion_PreorderAgent\" (scammer-fake-metal-fusion-preorder-agent) — Related Profiles should show \"MF_Backup_Store\" (confirmed same operator), and Similar Scam Reports should separately show \"Bey_King_India\" (a different person using the same advance-payment-ghost pattern). Confirm the two sections are visually distinct and the Similar Scam Reports caption is present.",
          href: "/scams",
        },
      ],
    },
    {
      pageKey: "help-how-it-works",
      pageLabel: "Help & How-It-Works Pages",
      href: "/help",
      cases: [
        { key: "contact-page", label: "The contact page loads and the form submits correctly", href: "/contact" },
        { key: "help-page", label: "The help page loads correctly", href: "/help" },
        { key: "how-it-works-pages", label: "All 7 how-it-works pages (auctions, checkout, offers, orders, payouts, pre-orders, reviews) load correctly" },
        { key: "fees-page", label: "The fees page loads correctly", href: "/fees" },
      ],
    },
    {
      pageKey: "legal-policy-pages",
      pageLabel: "Legal & Policy Pages",
      href: "/help",
      cases: [
        { key: "shipping-refund-policy", label: "Shipping-policy and refund-policy pages load correctly" },
        {
          key: "refund-policy-not-raw-json",
          label: "The Refund Policy page shows readable policy text — NOT a wall of raw JSON starting with {\"type\":\"doc\"",
          description: "Fixed 2026-08-24. The seeded siteSettings.legalPages.refundPolicy held a TipTap JSON document, but PolicyPageView injects that field as raw HTML — so the page rendered the JSON source as visible text. The seeded overrides are now empty strings, which makes the page fall back to its proper i18n copy. Re-seed before testing this one.",
          href: "/refund-policy",
        },
        { key: "privacy-cookies-security", label: "Privacy, cookies, and security pages load correctly" },
        {
          key: "ethics-page-loads",
          label: "The Our Ethics page loads, and its live-animal section describes vendor verification, a lawful-destination check, CITES paperwork, and specialist transport",
          description: "Added 2026-08-24. Reachable from the footer under Support, and from the Values section on the About page.",
          href: "/ethics",
        },
        {
          key: "code-of-conduct-loads",
          label: "The Code of Conduct page loads and covers listing honestly, bidding in good faith, review integrity, and the enforcement/appeal ladder",
          description: "Added 2026-08-24. Reachable from the footer under Legal.",
          href: "/code-of-conduct",
        },
        {
          key: "policy-related-links-exclude-self",
          label: "On EVERY policy page, the \"Related Policies\" footer lists the other five policies and never links to the page you are already on",
          description: "All six pages (Terms, Privacy, Cookies, Refund, Ethics, Code of Conduct) share one renderer whose related-links list is derived from a single registry. Open each and confirm you see exactly five links and that none of them is the current page.",
          href: "/ethics",
        },
        {
          key: "policy-admin-html-override",
          label: "As an admin: pasting HTML into Site Settings → Legal → \"Our Ethics\" and saving replaces the default Ethics page content immediately (no waiting)",
          description: "Added 2026-08-24. Exercises the full chain — admin textarea → legalPages.ethics → PolicyPageView read → cache bust. These pages are cached for an hour, so saving now also revalidates them; if the change only appears after a long wait, the revalidation step regressed. Clear the textarea and save again to restore the default copy.",
          href: "/admin/site",
        },
      ],
    },
    {
      pageKey: "auth-error-pages",
      pageLabel: "Remaining Auth & Error Pages",
      href: "/auth/login",
      cases: [
        { key: "register-page", label: "The register page loads and account creation works", href: "/auth/register" },
        { key: "forgot-reset-password-pages", label: "Forgot-password and reset-password pages both work" },
        { key: "verify-email-page", label: "The verify-email page correctly confirms a pending verification" },
        { key: "oauth-loading-redirect", label: "The OAuth-loading redirect page transitions correctly after a Google sign-in" },
        { key: "checkout-success-page", label: "The checkout-success page shows correct order details after payment", href: "/checkout/success" },
        { key: "unauthorized-404-pages", label: "Unauthorized and 404 error pages render correctly instead of crashing" },
      ],
    },
    {
      pageKey: "bug-hunters",
      pageLabel: "Bug Hunters Leaderboard",
      href: "/bug-hunters",
      cases: [
        {
          key: "leaderboard-loads",
          label: "The public Bug Hunters leaderboard (/bug-hunters) loads and lists testers ranked by confirmed-bug count, most bugs first",
          description: "Verify against the seeded demo fixture — \"Mock User 18\" should appear on the leaderboard with 1 confirmed bug (from the \"Demo fixture\" case under Admin (Testing) → Bug Hunter Rewards).",
          href: "/bug-hunters",
        },
        { key: "leaderboard-empty-state", label: "If no bugs have been confirmed yet, the leaderboard shows a clear \"No confirmed bugs yet\" empty state instead of a blank page or error" },
        { key: "leaderboard-footer-link", label: "A \"Bug Hunters\" link is present in the site footer's Support column and navigates to /bug-hunters" },
      ],
    },
  ]),

  ...group(
    "admin",
    ADMIN_TESTING_GROUP_LABEL,
    [
      {
        pageKey: "catalog-listings",
        pageLabel: "Catalog & Listings",
        href: "/admin/products",
        cases: [
          { key: "brands-crud", label: "Admin can create, edit, and list brands", href: "/admin/brands" },
          { key: "categories-crud", label: "Admin can create, edit, and list categories", href: "/admin/categories" },
          { key: "products-crud", label: "Admin can create, edit, and list products", href: "/admin/products" },
          {
            key: "products-default-listing-not-empty",
            label: "The admin Products list loads real products by default (not empty), and the \"Show sold\" toggle + Auctions/Prize Draws type tabs each load correctly with their own \"Show ended\"/\"Show closed\" toggle",
            description: "A 2026-08-19 index-shape bug broke the default isSold==false query (and its listingType/auctionEndDate/prizeRevealWindowEnd variants) — now fixed. Confirm the list isn't blank on first load and each Type tab + toggle combination returns results.",
            href: "/admin/products",
          },
          {
            key: "categories-toggle-filters",
            label: "The admin Categories \"Active\" and \"Featured\" toggle filters both show results in either state",
            description: "Verify against the seeded \"Test Inactive Category\" fixture (isActive:false) — it should only appear when the Active filter is switched to show inactive categories.",
            href: "/admin/categories",
          },
          {
            key: "admin-products-type-chips-all-types",
            label: "The admin Products \"Type\" filter lists all nine listing types including Art and Stickers, and does NOT offer \"Bundles\"",
            description: "Fixed 2026-08-21 — the chips used display labels as the underlying filter values, and had no entry at all for art or stickers, so admin could never filter to either. Bundles are a category type, not a listing type; a Bundles chip here would always return zero rows.",
            href: "/admin/products",
          },
          {
            key: "admin-products-type-chips-multi-select",
            label: "The admin Products \"Type\" chips are multi-select — ticking Auctions AND Prize Draws lists both, and every single chip on its own returns rows (never zero)",
            description: "Tick each of the nine chips one at a time and confirm each returns results (given seeded data exists for that type). A chip that always returns nothing means its value no longer matches what the database stores.",
            href: "/admin/products",
          },
          {
            key: "admin-products-featured-promoted-sorts",
            label: "The admin Products \"Featured first\" and \"Promoted first\" sorts actually reorder the list — featured/promoted items move to the top",
            description: "Fixed 2026-08-21 — both options existed in the code but targeted fields that were not sortable, so the sort was silently discarded and the list never changed order. Toggle a couple of items' Featured flags first so there is something to sort, then pick the sort and confirm they rise to the top.",
            href: "/admin/products",
          },
          {
            key: "admin-per-type-pages-have-filters",
            label: "The admin Art, Stickers, Classified, Digital Codes and Live Items pages each have a working Status filter and a sort dropdown, and clicking a row opens the product editor",
            description: "Fixed 2026-08-21 — all five pages were near-identical copies with no filter drawer at all. They now share one config. Check each page: a Status filter exists, sorting works, and a row click lands on the real product edit page.",
            href: "/admin/art",
          },
          {
            key: "admin-listing-reset-restores-defaults",
            label: "The \"Reset\" button on an admin listing returns it to exactly what a fresh page load shows — not to a wider, unfiltered list",
            description: "Fixed 2026-08-21 — Reset cleared every filter to empty instead of restoring each view's configured default, so Reset could show MORE rows than opening the page fresh. Compare: load the page, note the row count, apply some filters, hit Reset, and the count should return to the original.",
            href: "/admin/tester-checklist",
          },
          {
            key: "admin-address-payment-status-chips-in-url",
            label: "The status chips on Admin > Addresses and Admin > Payment Methods are reflected in the URL and survive a reload and the Back button",
            description: "Fixed 2026-08-21 — these chips were held in local component state only, so the selection vanished on reload, could not be shared as a link, and the browser Back button skipped past it. Pick a status, reload, and confirm it is still selected.",
            href: "/admin/addresses",
          },
          {
            key: "admin-listing-sort-dropdown-preselected",
            label: "Every admin listing opens with its Sort dropdown showing a selected option — never blank",
            description: "Fixed 2026-08-21 on Addresses and Payment Methods, whose default sort was not among the options they offered, so the dropdown opened with nothing selected. Spot-check several admin listings.",
            href: "/admin/addresses",
          },
          { key: "sublisting-categories-crud", label: "Admin can create, edit, and list sublisting categories", href: "/admin/sublisting-categories" },
          { key: "carousel-crud", label: "Admin can create, edit, and reorder carousel slides", href: "/admin/carousel" },
          { key: "sections-crud", label: "Admin can create, edit, and reorder homepage sections", href: "/admin/sections" },
          { key: "art-stickers-crud", label: "Admin can create, edit, and list art and sticker listings" },
          { key: "deals-featured-crud", label: "Admin can create, edit, and list deals and featured listings" },
        ],
      },
      {
        pageKey: "coupons",
        pageLabel: "Coupons",
        href: "/admin/coupons",
        cases: [
          { key: "coupon-create-percentage", label: "Admin can create a percentage-type coupon", href: "/admin/coupons/new" },
          { key: "coupon-create-fixed-freeship-bxgy", label: "Admin can create fixed, free_shipping, and buy_x_get_y coupon types" },
          { key: "coupon-per-user-limit-enforced", label: "A coupon's perUserLimit is correctly enforced at checkout after being set by admin" },
          { key: "coupon-min-max-discount", label: "Admin-set minPurchase and maxDiscount are correctly enforced at checkout" },
          { key: "coupon-scope-admin-vs-seller", label: "Admin-scope and seller-scope coupons both apply correctly, respecting scope rules" },
          { key: "coupon-expire-reject", label: "Expiring a coupon from the admin editor causes checkout to reject it immediately" },
          {
            key: "coupon-admin-is-platform-wide",
            label: "An admin-created coupon applies across every store in the cart, not just one",
            href: "/admin/coupons/new",
            description: "Admin coupons have no store field — they are platform-wide by design. Create one, then as a buyer apply it to a cart holding items from two different stores and confirm the discount is spread across both stores' items.",
          },
          {
            key: "coupon-admin-no-stacking-toggle",
            label: "The admin coupon form no longer has an \"Allow stacking with seller coupons\" toggle",
            href: "/admin/coupons/new",
            description: "Stacking is now unconditional (one per store + one platform-wide), so that toggle was removed. Its presence — or any saved coupon still blocking a seller coupon from stacking — is a bug.",
          },
          {
            key: "coupon-admin-category-restriction-enforced",
            label: "Restricting an admin coupon to categories actually limits which items it discounts",
            href: "/admin/coupons/new",
            description: "Create a platform-wide coupon restricted to one category. A cart with none of that category must have the code refused; a cart with some must discount only those items. Leaving the category list empty must keep the coupon applicable to everything.",
          },
          {
            key: "coupon-admin-edit-actually-saves",
            label: "Editing a coupon's name, discount, limits or dates actually persists after reload",
            description: "Change several fields at once, save, then hard-reload the edit page. Every change must still be there. A save that returns success but shows the old values after reload is a bug.",
          },
          {
            key: "coupon-admin-usage-visible",
            label: "The admin coupon list shows usage counts that go up after a buyer redeems the coupon",
            description: "Note the current usage, have a buyer complete an order with the coupon, then refresh the admin list. Check this for BOTH a cash/UPI order and (if Razorpay is enabled) an online-payment order — online payments previously did not record usage at all.",
          },
        ],
      },
      {
        pageKey: "events-raffles-spin",
        pageLabel: "Events, Raffles & Spin Wheel",
        href: "/admin/events",
        cases: [
          { key: "raffle-create-open", label: "Admin can create an open_raffle event", href: "/admin/events/new" },
          { key: "raffle-create-top-n-scorers", label: "Admin can create a top_n_scorers raffle event" },
          { key: "raffle-create-top-n-participants", label: "Admin can create a top_n_participants raffle event" },
          { key: "raffle-draw-winner", label: "Drawing a raffle winner correctly populates raffleWinnerUserId and raffleTriggeredAt" },
          { key: "spin-wheel-create", label: "Admin can create a spin_wheel event with weighted prizes" },
          { key: "spin-wheel-limits-enforced", label: "spinMaxPerUser and spinWindowStart/End are correctly enforced once configured by admin" },
          { key: "event-entries-admin-view", label: "Admin event-entries list shows accurate entries", href: "/admin/event-entries" },
          {
            key: "event-entries-view-before-deciding",
            label: "Admin → Event Entries rows have a \"View details\" action (and are click-openable) showing the entrant's email, points and submitted responses before Confirm / Waitlist / Cancel is used",
            description: "Fixed 2026-08-21 — the row offered only Confirm/Waitlist/Cancel, so an admin decided an entry's fate without ever seeing what the entrant actually submitted. Open an entry on a poll or survey event and confirm its responses payload is visible in the detail modal.",
            href: "/admin/event-entries",
          },
        ],
      },
      {
        pageKey: "prize-draws-lotteries",
        pageLabel: "Prize Draws / Lotteries",
        href: "/admin/prize-draws",
        cases: [
          { key: "prizedraw-create", label: "Admin can create a prize-draw listing, choosing instant or scheduled reveal mode and a 1–15 day duration", href: "/admin/prize-draws" },
          { key: "prizedraw-reveal-winner", label: "Winners are assigned automatically via crypto.randomInt (on payment confirmation for instant mode, or at expiry/sellout for scheduled mode) — never by a manual admin click" },
          { key: "prizedraw-scam-guard", label: "A prize draw with active entries cannot be unpublished, archived, or deleted, and an already-won item's details cannot be edited" },
          { key: "prizedraw-lock-on-reveal", label: "Lock-on-reveal correctly blocks further entries after the draw" },
          { key: "prizedraw-entries-view", label: "Admin and the owning seller can view the prize-draw winner mapping (which item went to which order), but it's never shown publicly", href: "/admin/lotteries" },
        ],
      },
      {
        pageKey: "bundles",
        pageLabel: "Bundles / Grouped Listings",
        href: "/admin/bundles",
        cases: [
          { key: "bundle-create", label: "Admin can create a bundle from existing products", href: "/admin/bundles" },
          { key: "bundle-stock-sync", label: "Bundle stock correctly syncs when a component product's stock changes" },
          { key: "bundle-edit-delete", label: "Admin can edit and delete a bundle" },
          {
            key: "bundle-brand-picker",
            label: "The bundle editor has a \"Brand\" select (Takara-Tomy / Beyblade / No specific brand) that saves to the bundle's own brandSlug field, and that bundle then appears under the matching brand's page",
            description: "Added 2026-08-21 — bundle→brand association used to be a fragile heuristic (checking the brand name against seo.keywords), replaced with a real brandSlug field. Edit an existing bundle (e.g. \"Original Series Collector's Set\"), confirm the Brand select shows its current brand, change it, save, and verify it now appears on the new brand's page instead of the old one.",
            href: "/admin/bundles",
          },
        ],
      },
      {
        pageKey: "classifieds-digitalcodes-live",
        pageLabel: "Classifieds, Digital Codes & Live Listings",
        href: "/admin/classified",
        cases: [
          { key: "classified-create-moderate", label: "Admin can create and moderate classified listings", href: "/admin/classified" },
          { key: "digitalcode-create-moderate", label: "Admin can create and moderate digital-code listings", href: "/admin/digital-codes" },
          { key: "live-create-moderate", label: "Admin can create and moderate live-item listings", href: "/admin/live" },
        ],
      },
      {
        pageKey: "blog-faqs",
        pageLabel: "Blog & FAQs",
        href: "/admin/blog",
        cases: [
          { key: "blog-create-edit-publish", label: "Admin can create, edit, and publish a blog post", href: "/admin/blog" },
          { key: "blog-media-step-save", label: "On the blog editor's Media step, setting a Cover Image and/or a YouTube Video ID and saving succeeds (no validation error) and both persist correctly when reopening the post for edit" },
          { key: "faq-create-edit-category", label: "Admin can create and edit an FAQ, including category assignment", href: "/admin/faqs" },
        ],
      },
      {
        pageKey: "orders-fulfillment",
        pageLabel: "Orders & Fulfillment",
        href: "/admin/orders",
        cases: [
          { key: "orders-status-change", label: "Admin orders list shows accurate orders and status changes save correctly", href: "/admin/orders" },
          {
            key: "admin-emi-order-reviewable",
            label: "Opening an EMI order in admin shows the full Payment Proof panel — screenshot, UTR, expected-vs-reported UPI, and the Verify / Request re-upload / Reject-as-fraud buttons",
            description: "Fixed 2026-08-21. The panel used to check only for cash and UPI orders and omitted EMI entirely, so an admin could see an EMI order sitting in the queue labelled \"Awaiting verification\" and have literally no way to action it. Check BOTH the row drawer and the full /admin/orders/[id]/view page — they must behave identically.",
            href: "/admin/orders",
          },
          {
            key: "admin-decided-order-no-live-buttons",
            label: "An order already rejected as fraud, or already sent back for re-upload, shows that state instead of offering live Verify / Reject buttons again — on BOTH the row drawer and the full /admin/orders/[id]/view page",
            description: "Previously only the payment status was consulted, so a decided order still rendered as a fresh \"please verify\" and could be actioned a second time. Reject one order as fraud, reopen it, and confirm it now reads as rejected with no action buttons. Check both surfaces separately: as of 2026-08-21 the full-page variant did not receive paymentReviewOutcome at all, so it kept offering live Verify/Reject on an already-decided order even once the drawer had been fixed — a double-action risk visible only if you open the standalone page rather than the drawer.",
            href: "/admin/orders",
          },
          {
            key: "admin-orders-payment-review-filters",
            label: "The Admin Orders filter drawer has a \"Manual payment\" chip group with \"Awaiting payment\" and \"Awaiting verification\" — and each one actually returns the right orders",
            description: "Added 2026-08-21 — before this there was no way to find manual-payment orders needing action; they were indistinguishable from any other pending order. \"Awaiting payment\" = buyer hasn't uploaded a screenshot yet. \"Awaiting verification\" = proof submitted, nobody has approved/rejected it. Place a UPI/Cash order and check it appears under \"Awaiting payment\"; upload proof and confirm it moves to \"Awaiting verification\". Picking a Manual-payment chip clears the Status chip (and vice versa) on purpose — the queue is always status=pending, so combining them could only ever return nothing.",
            href: "/admin/orders",
          },
          {
            key: "admin-orders-payment-state-on-row",
            label: "Each manual-payment order's row in the Admin Orders list shows its payment state inline (\"Awaiting payment\" / \"Awaiting verification\" / \"Payment verified\" / \"Re-upload requested\" / \"Payment rejected\") — you don't have to open the drawer to tell which ones need action",
            href: "/admin/orders",
          },
          {
            key: "admin-orders-view-payment-proof",
            label: "Opening a manual-payment order shows the buyer's payment screenshot, the UTR, the expected-vs-reported UPI IDs, and a red \"UPI mismatch\" warning when they disagree",
            href: "/admin/orders",
          },
          {
            key: "admin-orders-verify-payment",
            label: "\"Verify payment\" on an order with submitted proof marks it paid and moves it to Processing — and it then disappears from the \"Awaiting verification\" queue",
            href: "/admin/orders",
          },
          {
            key: "admin-orders-request-reupload",
            label: "\"Request re-upload\" (requires a review note) clears the buyer's proof, gives them another 15 minutes, and sends them a notification containing the note",
            description: "Pair with the buyer-side case `manual-payment-reupload-note-visible-to-buyer`. Critically, verify the buyer CAN actually re-submit afterwards, and that the re-submitted proof shows up again under admin \"Awaiting verification\" — a 2026-08-21 fix; previously the re-upload left a stale review outcome on the order, so the corrected proof was invisible to both the admin queue and the 2-hour auto-approve sweep, and the order just silently stalled.",
            href: "/admin/orders",
          },
          {
            key: "admin-orders-reject-fraud",
            label: "\"Reject as fraud\" (requires a review note) cancels the order, returns the item to stock, and suspends the buyer's account for 7 days",
            description: "Use a throwaway buyer account — this really does ban it. Confirm the stock actually goes back up on the product page, and that the banned account can't sign in.",
            href: "/admin/orders",
          },
          {
            key: "admin-orders-payment-actions-hidden-when-paid",
            label: "Once a payment is verified, the Verify / Request re-upload / Reject buttons are replaced by a \"Payment verified\" badge — an already-paid order can't be re-verified or rejected",
            href: "/admin/orders",
          },
          { key: "bids-admin-view", label: "Admin bids view shows accurate bid data", href: "/admin/bids" },
          { key: "return-requests-triage", label: "Admin can triage return requests", href: "/admin/return-requests" },
          { key: "fulfillment-queue-admin", label: "Admin fulfillment queue shows accurate pending items", href: "/admin/fulfillment" },
          { key: "shipments-crud", label: "Admin can create/edit shipments, including lots/items and projections", href: "/admin/shipments" },
          { key: "print-center-admin", label: "Admin print-center generates labels/invoices correctly", href: "/admin/print-center" },
          { key: "payouts-export-admin", label: "Admin can export payouts", href: "/admin/payouts" },
          { key: "bulk-action-realtime-progress", label: "A bulk admin action (e.g. bulk order status update) shows live progress via the bulk_events realtime channel and resolves without polling" },
          {
            key: "admin-order-list-item-and-detail",
            label: "Admin order list rows show the order's item (thumbnail + title), not a raw order id, and clicking through (or \"Open full page\") shows the full items list on the order detail",
            description: "Fixed 2026-08-21 — AdminOrdersView.mapRows built \"Order {id}\" from a nonexistent orderNumber field, and AdminOrderEditorView showed zero items even when opened. Both now read the order's already-denormalized items[] (Root Cause #52).",
            href: "/admin/orders",
          },
          {
            key: "admin-order-detail-standalone-page",
            label: "An admin order's \"Open full page\" action lands on a real bookmarkable /admin/orders/[id]/view page — not just the side drawer",
            description: "Added 2026-08-21 — the standalone admin order page had no case of its own; it was only tested indirectly through the list-row check. Open an order's row menu, choose \"Open full page\", and confirm: (a) the URL changes to a real per-order path you can copy and reopen in a fresh tab; (b) the page shows the full items list with thumbnails, the shipping address, and the payment breakdown; (c) reloading that URL directly still works rather than bouncing you back to the list.",
            href: "/admin/orders",
          },
          {
            key: "admin-payout-detail-view",
            label: "Every admin payout row has an \"Open full page\" action + a working \"Mark as paid\" action, landing on a real /admin/payouts/[id]/view page with a full gross/platform-fee/gateway-fee/GST/refund-deduction/net breakdown and linked order ids — not just a bare \"transaction ID\" modal",
            description: "Added 2026-08-21 — admin payouts previously had no detail view of any kind. Open any payout from /admin/payouts and confirm the breakdown numbers add up (gross − fees − deductions = net).",
            href: "/admin/payouts",
          },
        ],
      },
      {
        pageKey: "users-trust",
        pageLabel: "Users & Trust",
        href: "/admin/users",
        cases: [
          { key: "users-role-change", label: "Admin can change a user's role and toggle isTester/canTestAdmin", href: "/admin/users" },
          {
            key: "admin-user-detail-enriched",
            label: "An admin user's own detail page (/admin/users/[id]) shows an avatar, stat tiles (orders/auctions won/items sold/reviews/rating), the user's public profile (bio/location/website/social links), last-sign-in + login count, and a small inline address list — not just 3 plain text lines",
            description: "Fixed 2026-08-21 — the page fetched the full UserDocument but rendered almost none of it. Open any real user (e.g. a tester or seller persona) from /admin/users and confirm the header/stats/profile/addresses sections are populated, not blank.",
            href: "/admin/users",
          },
          {
            key: "admin-delete-user-complete",
            label: "Deleting a user from the admin Users editor removes their Firestore profile, their active sessions, AND their Firebase Auth record — not just the Firestore doc",
            description: "Verify the deleted account can no longer log in at all (Auth record gone), not just that it's missing from the admin list.",
            href: "/admin/users",
          },
          { key: "roles-crud", label: "Admin can create and edit custom roles", href: "/admin/roles" },
          { key: "sessions-revoke", label: "Admin can revoke a user's active sessions", href: "/admin/sessions" },
          { key: "scammers-registry-admin", label: "Admin can manage the scammer registry", href: "/admin/scammers" },
          { key: "banned-addresses-admin", label: "Admin can manage banned addresses", href: "/admin/banned-addresses" },
          { key: "address-clusters-admin", label: "Admin can view address clusters", href: "/admin/address-clusters" },
          { key: "moderation-queue-admin", label: "Admin moderation queue works correctly", href: "/admin/moderation" },
          { key: "support-tickets-triage-admin", label: "Admin can triage support tickets", href: "/admin/support-tickets" },
          { key: "item-requests-admin", label: "Admin can manage item requests", href: "/admin/item-requests" },
          { key: "reports-admin", label: "Admin reports queue works correctly", href: "/admin/reports" },
          {
            key: "moderation-reject-requires-reason",
            label: "Rejecting media in the moderation queue REFUSES an empty reason, with the error shown on the Reason field itself",
            description: "Fixed 2026-08-24 — all four review surfaces (the queue page's inline Reject and the detail page's Reject, on both moderation and reports) submitted an empty note happily, so media could be blocked with no record of why. Press Reject with the box empty: it must refuse inline, not toast, and not save. Check BOTH /admin/moderation and a single item's detail page — they used to be two separate copies of the same modal.",
            href: "/admin/moderation",
          },
          {
            key: "moderation-reject-keeps-note-on-failure",
            label: "If a reject fails to save, the modal STAYS OPEN with the typed reason intact",
            description: "The modal closed on any outcome before. A decision that did not save must not look like one that did — expect an error toast and the reason still in the box, not a closed modal.",
            href: "/admin/moderation",
          },
          {
            key: "report-dismiss-asks-why",
            label: "Dismissing a report ASKS for a reason instead of silently recording the word \"Dismissed\"",
            description: "Fixed 2026-08-24 — Dismiss used to send a hardcoded resolution of \"Dismissed\", which is the status restated rather than a reason, so a dismissed report carried no explanation for the reporter or the next admin. It now opens the same required-note modal that Action does.",
            href: "/admin/reports",
          },
          {
            key: "report-close-stores-a-real-date",
            label: "Actioning or dismissing a report records a resolved date that renders as a DATE, not as raw text",
            description: "Fixed 2026-08-24 — both report surfaces sent `resolvedAt: new Date()`, which JSON turns into a string, and the route spread it straight into a field the document declares as a Date. Seeded reports held real timestamps, so the collection carried two shapes for one field. The server stamps it now and the client cannot send it. Close a report, then confirm via the admin detail page that the resolved date is present and well-formed.",
            href: "/admin/reports",
          },
          {
            key: "report-status-rejects-unknown-values",
            label: "A report or moderation item cannot be moved to a status outside its real set",
            description: "Both PATCH routes previously spread the raw request body into Firestore with no schema, so any key and any status string could be written. Confirm the normal Take / Action / Dismiss and Approve / Reject flows still all work — that is what the tightening must not have broken.",
            href: "/admin/reports",
          },
          {
            key: "listing-form-every-section-reachable",
            label: "Creating a listing shows ALL sections at once — you can open Pricing before finishing Basic, and nothing blocks you",
            description: "The last step wizard was removed 2026-08-26. It gated Next on the current step's validate, so a seller who could not satisfy step 2 could not reach step 5 to find out what else was needed. Open /store/products/new, expand a later section immediately, and confirm it opens. The required section (Basic) stays open and cannot be collapsed.",
            href: "/store/products/new",
          },
          {
            key: "listing-form-errors-land-on-fields",
            label: "Publishing an incomplete listing puts each error on ITS OWN FIELD, and the summary links jump to that section",
            description: "The per-step validate callbacks returned a single string rendered as one banner over the whole step. They are per-section Zod schemas now, so a missing auction start bid reports on the start-bid field. Press Publish with several sections incomplete and confirm each message appears beside its input, and that clicking an entry in the summary opens the right section.",
            href: "/store/products/new",
          },
          {
            key: "listing-form-save-draft-anywhere",
            label: "\"Save as draft & finish later\" is available from any section, not only the first",
            description: "It used to be gated on `currentStep === 0`, which was a wizard artefact — a draft is a draft whichever section you are looking at. Fill in a title, scroll to a later section, and confirm the button is still there and still saves.",
            href: "/store/products/new",
          },
          {
            key: "seller-shipping-storefront-sections",
            label: "Shipping Configuration and Storefront Settings are collapsible sections with one Save at the bottom — no Next/Back",
            description: "Both were 3- and 4-step wizards until 2026-08-26. Check that every section is reachable immediately, that the error summary jumps to the right one, and that a single Save covers whichever sections you edited.",
            href: "/store/shipping",
          },
          {
            key: "admin-tables-render-badges-not-text",
            label: "Admin list tables show a coloured STATUS BADGE, a thumbnail and formatted money — not raw text",
            description: "Fixed 2026-08-25 — `column-renderers.tsx` was promised by its own sibling's docstring and never written (it could not be: a .ts and .tsx of the same name both emit the same .js). Every column without a hand-written renderer fell back to String(value), so a price read `1499` and a date read as a raw ISO string. Check a few different admin lists.",
            href: "/admin/products",
          },
          {
            key: "admin-table-readable-on-phone",
            label: "An admin list is readable at phone width — it switches to the card/list view instead of squeezing a table",
            description: "Fixed 2026-08-25 — no column-level responsive behaviour existed at all (`TableColumn.hidden` was documented but no DataTable ever read it). Below md the table view is now suppressed entirely; from md up, low-priority columns (created/updated dates, ids, view counts) drop out progressively. Resize from 320px to 1400px and confirm columns reappear rather than the row wrapping.",
            href: "/admin/orders",
          },
          {
            key: "action-buttons-have-icons",
            label: "Buttons driven by the action registry show an icon beside their label",
            description: "Fixed 2026-08-25 — `ActionDef.iconKey` existed on the type, was set on 2 of 220 actions, and was rendered by nothing. All 220 now carry one and `<Button action={…}>` renders it. Spot-check a row action menu and a bulk action bar.",
            href: "/admin/products",
          },
          {
            key: "sold-flag-badge-readable",
            label: "The \"Sold\" flag chip on an admin product card is legible in BOTH light and dark themes",
            description: "Fixed 2026-08-25 — the flag list gave `isSold` two backgrounds and two inks on one element, so the painted colour was decided by stylesheet order rather than by the list. The identical bug was found on the scammer status badge the day before. Also check \"Promoted\", which was raw dual-theme purple.",
            href: "/admin/products",
          },
          {
            key: "homepage-section-all-types-creatable",
            label: "EVERY section type in the New Section dropdown can actually be created — especially Featured Bundles, Prize Draws, Event Raffles and Collection Cards",
            description: "Fixed 2026-08-24 — the create route validated `type` against a hand-written list of 21 values while the union (and the dropdown) had 25. Those four types could be chosen, configured in full through their own builders, and then failed with a 400 on Save. Walk the dropdown and create one of each of the four named types.",
            href: "/admin/sections",
          },
          {
            key: "analytics-alert-threshold-is-numeric",
            label: "An analytics alert refuses a non-numeric threshold and a zero/blank time window",
            description: "Fixed 2026-08-24 — the create route spread the raw body into Firestore, so a threshold typed as text was stored as text and the rule then compared strings (\"9\" > \"10\"). The alert saved, listed, and looked configured while never firing correctly. Confirm a normal numeric alert still saves.",
            href: "/store/analytics/alerts",
          },
          {
            key: "item-request-requires-title-and-description",
            label: "An item request cannot be submitted with an empty title or description",
            description: "Fixed 2026-08-24 — this route spread the raw body into Firestore, and its list GET is PUBLIC (unauthenticated), so an unvalidated write here was an unvalidated publish. Confirm a normal request still submits and appears in the open list.",
            href: "/item-requests",
          },
          {
            key: "report-submit-requires-detail",
            label: "Reporting a listing or store refuses an empty description and still files a normal report correctly",
            description: "Fixed 2026-08-24 — the submit route accepted any body, so a report naming nothing and describing nothing could reach the moderation queue, and a caller could set reviewer-owned fields (`assignedTo`, `resolution`, `resolvedAt`) on their own report.",
            href: "/admin/reports",
          },
          {
            key: "scammer-removed-badge-readable",
            label: "A scammer profile with status \"Removed\" shows a readable grey badge in BOTH the list and the detail drawer, in light and dark themes",
            description: "Fixed 2026-08-24 — two separate copies of the status-colour map both gave `removed` two backgrounds and two inks on the same element. Tailwind emits all four and stylesheet order decides the winner, so the painted colour was not what either map said. Both copies now come from one module. Check the badge reads \"Removed\" (not \"removed\") and is legible in both themes.",
            href: "/admin/scammers",
          },
          { key: "payment-methods-clusters-admin", label: "Admin can manage payment methods and payment-method clusters", href: "/admin/payment-methods" },
          { key: "catalogue-approvals-admin", label: "Admin can approve/reject personal catalogue submissions", href: "/admin/catalogue-approvals" },
          {
            key: "catalogue-approvals-view-before-deciding",
            label: "Admin → Catalogue Approvals rows have a \"View\" action (and are click-openable) showing the submitted item's PHOTOS, description, estimated price, quantity and condition — with Approve and Reject available from inside that detail view",
            description: "Fixed 2026-08-21 — the row previously offered only Approve/Reject buttons, so an admin accepted or refused a user's submission with none of its content rendered anywhere: no photos, no description, no price. This was the most severe finding of the dead-end-listing sweep. Confirm you can see the item's images before deciding, and that approving/rejecting from inside the modal behaves the same as the row buttons (reject still prompts for a reason the owner will see).",
            href: "/admin/catalogue-approvals",
          },
        ],
      },
      {
        pageKey: "content-marketing",
        pageLabel: "Content & Marketing",
        href: "/admin/ads",
        cases: [
          { key: "ads-crud-preview", label: "Admin can create, edit, and preview ads", href: "/admin/ads" },
          { key: "newsletter-export-admin", label: "Admin can export the newsletter subscriber list", href: "/admin/newsletter" },
          { key: "contact-submissions-admin", label: "Admin can view contact form submissions", href: "/admin/contact" },
          { key: "media-library-admin", label: "Admin media library works correctly", href: "/admin/media" },
          { key: "navigation-editor-admin", label: "Admin can edit site navigation", href: "/admin/navigation" },
          { key: "settings-navigation-actions", label: "Admin settings/navigation and settings/actions pages save correctly" },
          { key: "features-feature-flags-admin", label: "Admin can manage product features and feature flags" },
        ],
      },
      {
        pageKey: "site-system",
        pageLabel: "Site & System",
        href: "/admin/site",
        cases: [
          { key: "site-settings-admin", label: "Admin site settings page saves correctly", href: "/admin/site" },
          {
            key: "whatsapp-credentials-persist",
            label: "Site Settings → WhatsApp saves the Phone Number ID, Cloud API token, admin notify numbers, template language and all 6 template names — and they survive a reload",
            description: "The token field is masked on reload (shows dots, not the raw value) — that is correct. Confirm by changing an unrelated field, saving again, and verifying the token still works rather than being overwritten with the mask.",
            href: "/admin/site",
          },
          {
            key: "whatsapp-channel-toggle-persists",
            label: "Site Settings → Notifications: the WhatsApp channel enable toggle, minimum priority, and the checkout OTP switch all persist after save + reload",
            href: "/admin/site",
          },
          {
            key: "whatsapp-order-announcement-fires",
            label: "Placing an order sends the WhatsApp announcement to the configured admin numbers using credentials saved in Site Settings — no env var required",
            description: "Fixed 2026-08-22 — the order-placed announcement previously read environment variables ONLY, so credentials entered in Site Settings were ignored and it silently did nothing. Needs real Meta credentials configured to verify.",
            href: "/admin/site",
          },
          {
            key: "auction-bid-tiers-admin",
            label: "Admin can add, edit, and remove bid-increment tiers in Site Settings → Auction Config, and the changes persist after saving and reloading the page",
            description: "Each tier row has an editable \"up to (₹)\" amount and \"increment (₹)\" amount; the last row is fixed as \"and above\" (open-ended) and can't have its threshold edited. Add a new tier, edit an existing increment, remove a tier, save, then reload the Site Settings page and confirm the tier list matches what was saved — not reverted to the old defaults.",
            href: "/admin/site",
          },
          {
            key: "daily-digest-recipients-save",
            label: "Site Settings → Notifications → \"Daily status digest\" saves its recipient and CC lists (one address per line) and they survive a page reload",
            description: "Added 2026-08-21. Toggle the digest on, enter a couple of addresses in Recipients (one per line) and one in CC, save, then reload Site Settings and confirm both lists come back exactly as entered. Also confirm the whole recipients/CC block is hidden when the toggle is off.",
            href: "/admin/site",
          },
          {
            key: "daily-digest-on-deploy",
            label: "A digest email arrives once after a new version is deployed — exactly once per deployment, not repeatedly as the site gets traffic",
            description: "Added 2026-08-21. The deploy digest fires from server startup, which on Vercel happens on every serverless cold start — so it's guarded by a stored version marker and only the first cold start of a given deployment sends. After a deploy, confirm: (a) one digest arrives whose body opens with \"Deployment <version> is live.\"; (b) browsing the site for a while (forcing more cold starts) does NOT produce further copies; (c) the next deploy produces exactly one new email again.",
            href: "/admin/site",
          },
          {
            key: "daily-digest-email-content",
            label: "The daily status digest email arrives with subject exactly \"Daily Status\" and shows the last 24h order count, revenue, active listings, pending-over-24h count, and a per-status breakdown",
            // audit-hardcoded-api-routes-ok: prose in a tester-facing description (a copy-pasteable console snippet), not a call site — nothing to route through the registry.
            description: "Added 2026-08-21. The digest runs automatically at 10:00 IST, but you don't need to wait — an admin can trigger it on demand by POSTing to /api/admin/daily-digest/trigger (e.g. from the browser console while logged in as admin: fetch('/api/admin/daily-digest/trigger',{method:'POST'})). Confirm the email reaches every configured recipient AND any CC addresses, and that the numbers match what the admin orders list actually shows for the last 24 hours. Note: this requires the Firebase Functions deploy to have happened for the scheduled 10:00 run — the manual trigger works regardless.",
            href: "/admin/site",
          },
          {
            key: "site-settings-credentials-save",
            label: "Site Settings → Integrations: saving a real API key succeeds, shows back masked after reload, and never throws an error toast",
            description: "Added 2026-08-21 — this path was BROKEN in production and nothing caught it. Every key here is AES-encrypted before storage, and the encrypt call throws outright when the server's encryption key is unset, so \"Save\" failed for every integration. Enter any non-empty value in one field (a throwaway value is fine — do NOT paste a real production secret just to test), hit Save, and confirm: (a) you get a success toast, NOT an error; (b) after a full page reload the field shows a MASKED value (e.g. \"re_abc...wxyz\"), not blank and not the raw value you typed; (c) the page doesn't show a red error banner anywhere.",
            href: "/admin/site",
          },
          {
            key: "site-settings-credentials-partial-save-keeps-others",
            label: "Site Settings → Integrations: saving one API key does NOT wipe the other keys that were already saved",
            description: "Added 2026-08-21. Fields left blank are meant to keep whatever was stored before, not overwrite it with empty. Save a value into ONE integration field, reload, then save a value into a DIFFERENT field while leaving the first one showing its masked value untouched. Reload again and confirm BOTH fields still show masked values — if the first one came back blank, that's the bug.",
            href: "/admin/site",
          },
          {
            key: "site-settings-themes-tab",
            label: "Site Settings → Themes: a theme can be duplicated, edited, previewed and set as the light/dark default, and the site actually restyles",
            description: "Added 2026-08-21 — this tab had no test case at all. Duplicate one of the two built-in themes, change a colour or gradient on the copy, confirm the live preview updates, then set it as the default for light mode and save. Reload the public homepage and confirm the new colour is actually in use. Also confirm the two built-in themes (default-light / default-dark) cannot be deleted.",
            href: "/admin/site",
          },
          {
            key: "site-settings-notifications-non-digest",
            label: "Site Settings → Notifications: the non-digest settings (sender name, from address, reply-to, per-channel toggles) save and survive a reload",
            description: "Added 2026-08-21 — only the digest recipient lists on this tab had a test case. Change the sender display name and reply-to address, toggle a notification channel, save, then reload Site Settings and confirm every value came back as entered. Then trigger any real notification (e.g. place a test order) and confirm the email that arrives actually uses the sender name / from address you just set, rather than an older hardcoded one.",
            href: "/admin/site",
          },
          { key: "admin-dashboard-widgets", label: "Admin dashboard widgets show accurate data", href: "/admin/dashboard" },
          {
            key: "analytics-admin",
            label: "Admin analytics dashboard shows accurate data",
            href: "/admin/analytics",
          },
          {
            key: "analytics-traffic-card-has-numbers",
            label: "The \"Traffic today\" card shows a real number, and it MATCHES the Page Views tab beside it",
            description:
              "Fixed 2026-08-29. BEFORE: the card showed an em-dash forever — never even a 0. It subscribed to two Realtime Database paths written by a presence hook whose writes had been denied since the day it shipped (the RTDB rules are backend-write-only), and both subscriptions passed no error callback, so a permission denial fired nothing at all and the tiles simply never left their initial state. AFTER: the card reads the same Firestore pageview counter that backs the Page Views tab in the same tab strip, so the two figures must agree — compare them. If the card errors it now SAYS so instead of showing a dash.",
          },
          {
            key: "analytics-no-permission-denied",
            label: "Opening /admin/analytics logs no PERMISSION_DENIED in the browser console",
            description:
              "Fixed 2026-08-29. BEFORE: every admin page load produced two Firebase permission_denied warnings from the dead presence/analytics subscriptions. AFTER: none — those subscriptions are gone entirely. Open devtools, hard-reload the page, and confirm the console is clean of Firebase permission errors.",
            href: "/admin/analytics",
          },
          {
            key: "pageviews-report-listing-standard",
            label: "The \"Page Views\" tab in Admin Analytics is a full standard listing — a search box (by entity id or URL), an entity-type filter drawer, a \"Most views\"/\"Fewest views\" sort dropdown, and real pagination — not a bare unsearchable table",
            description: "Converted 2026-08-21 off a hand-rolled two-table layout onto the standard DataListingView scaffold. Switch to the Page Views tab, confirm the search box and filter drawer are present and actually narrow the rows, the sort dropdown reorders by view count, and clicking a row's entity/URL navigates to that real page.",
            href: "/admin/analytics",
          },
          {
            key: "pageviews-tracks-all-listing-types",
            label: "Visiting a blog post, event, pre-order, prize draw, classified, digital-code, live item, or bundle detail page records a page view that shows up in Admin Analytics → Page Views, filtered to that entity type",
            description: "Added 2026-08-21 — these 8 detail-page types previously recorded nothing at all (only products/auctions/categories/homepage/stores/reviews/profiles were tracked). Visit a few of the following, then filter the Page Views report to the matching entity type and confirm a row appears: /blog/spot-genuine-takara-tomy-beyblade (blog), /events/event-original-series-clearance (event), /pre-orders/preorder-tester-sandbox-1 (pre-order), /prize-draws/prizedraw-tester-sandbox-1 (prize-draw), /classified/classified-tester-sandbox-1 (classified), /digital-codes/digitalcode-tester-sandbox-1 (digital-code), /live/live-tester-sandbox-1 (live), /bundles/bundle-tester-sandbox (bundle).",
            href: "/blog/spot-genuine-takara-tomy-beyblade",
          },
          { key: "maintenance-pages-admin", label: "The maintenance pages (analysis, client-errors, cloud-logs, function-errors, payment-rollbacks, server-errors + detail) all load correctly", href: "/admin/maintenance" },
          { key: "copilot-admin", label: "Admin copilot page works correctly", href: "/admin/copilot" },
          { key: "team-admin", label: "Admin team page works correctly", href: "/admin/team" },
          {
            key: "team-permission-group-filter",
            label: "The permission-group filter on /admin/team actually narrows the employee list",
            description: "Fixed 2026-08-21. The filter emitted a field the database layer was never told to accept, so the clause was discarded silently and every group showed the complete employee list. Pick a group and confirm the rows genuinely change.",
            href: "/admin/team",
          },
          {
            key: "audit-log-actor-search",
            label: "The \"Search by actor uid\" box on /admin/audit-log narrows results to that actor",
            description: "Fixed 2026-08-21 — the box was inert, the endpoint never read it. Paste a full actor uid from a visible row and confirm only that actor's entries remain.",
            href: "/admin/audit-log",
          },
          {
            key: "notifications-user-search",
            label: "The search box on /admin/notifications narrows results to one user, and its placeholder reads \"Search by user ID\"",
            description: "Fixed 2026-08-21 — the box was inert. Its placeholder also used to promise title search, which is not possible against this collection, so the wording was corrected rather than left as a promise the search cannot keep. Paste a user ID from a visible row and confirm only that user's notifications remain.",
            href: "/admin/notifications",
          },
          {
            key: "carousel-edit-and-delete",
            label: "A named carousel can be renamed, switched between draft and active, and deleted after it has been created",
            description: "Fixed 2026-08-21 — the editor could only CREATE. There was no way to load an existing carousel back, so a typo'd or draft carousel was stuck permanently. Create one, reopen it, rename it, publish it, then delete it.",
            href: "/admin/carousels",
          },
          { key: "guide-pages-admin", label: "The 8 admin guide pages all load correctly", href: "/admin/guide" },
          { key: "tester-checklist-crud-admin", label: "Admin can create, edit, and toggle adminOnly on tester checklist items", href: "/admin/tester-checklist" },
          { key: "tester-feedback-report-export", label: "Admin tester-feedback report shows Yes/No analytics grouped correctly and the Download Report export works", href: "/admin/tester-feedback" },
          {
            key: "tester-feedback-view-before-confirming-bug",
            label: "Admin → Tester Feedback rows have a \"View details\" action (and are click-openable) showing the tester's full comment and screenshot before \"Confirm bug\" is used",
            description: "Fixed 2026-08-21 — the row truncated the comment into a one-line secondary and never surfaced the screenshot at all, yet offered \"Mark reviewed\" and \"Confirm bug\" (which credits the reporting tester and disables the checklist item). Answer a checklist item \"No\" with a comment + screenshot as a tester, then confirm an admin can read both in the detail modal.",
            href: "/admin/tester-feedback",
          },
          {
            key: "admin-audit-log-page",
            label: "The new /admin/audit-log page (Finance nav group) lists real entries — actor, action, target, date — with working Action and Actor UID filters, and clicking a row opens a detail modal with the full reason + metadata payload",
            description: "Added 2026-08-21 — no admin action audit trail existed anywhere before this (the only prior \"logs\" surface was raw Cloud Logging infra output, not actor/action semantics). Perform any instrumented action — hard-ban/soft-ban/unban a test user, mark a payout paid, edit a coupon, change a store's status, change a user's role, or use admin checkout bypass — then confirm a matching entry appears here within a few seconds.",
            href: "/admin/audit-log",
          },
          {
            key: "admin-notification-detail-modal",
            label: "Admin Notifications rows have a \"View details\" action (and the row itself is clickable) opening a modal with the full title/message/image/related-entity/action-link — not list-only with just Resend/Delete",
            description: "Added 2026-08-21 — admin/notifications was list-only before, with no way to see a notification's full body/payload/link.",
            href: "/admin/notifications",
          },
          {
            key: "admin-sidebar-logout-button",
            label: "The admin dashboard sidebar has a visible \"Log out\" action at the bottom (not just the header profile dropdown), and clicking it signs out and redirects to login",
            href: "/admin/dashboard",
          },
          {
            key: "dashboard-tables-colors-avatars-icons",
            label: "Admin/store/user dashboard tables and list/grid cards show color-coded status badges (green/amber/red/blue by meaning, not one flat color for every status) and a circular avatar/icon per row (a real photo when the item has one — user avatar, store logo, product image — otherwise a resource-type icon), instead of plain black-on-white text rows",
            description: "Spot-check a few different dashboards — Users (avatar photos), Stores (logos), Products (thumbnails), and a resource with no natural photo like Orders/Payouts/Coupons (should still show a resource icon, not a blank row).",
            href: "/admin/users",
          },
        ],
      },
      {
        pageKey: "buyer-data-admin",
        pageLabel: "Buyer-Data Admin Views",
        href: "/admin/carts",
        cases: [
          { key: "carts-admin-view", label: "Admin carts view shows accurate data", href: "/admin/carts" },
          {
            key: "carts-admin-row-opens-items",
            label: "Clicking a row on Admin → Carts opens a detail modal listing the actual items in that cart (thumbnail, title, quantity, line total) — not just the \"N items\" count the row already showed",
            description: "Fixed 2026-08-21 — the list response always contained the cart's items[] array, but mapRows only ever read `.length` for the row subtitle and discarded the rest, with no surface to show it (Root Cause #52). Open a cart that has at least one item and confirm each item renders with a thumbnail; a guest cart should show its session id, an authenticated one its user id.",
            href: "/admin/carts",
          },
          { key: "wishlists-admin-view", label: "Admin wishlists view shows accurate data", href: "/admin/wishlists" },
          {
            key: "wishlists-history-admin-row-opens-user",
            label: "Clicking a row on Admin → Wishlists or Admin → History navigates to that user's admin detail page",
            description: "Added 2026-08-21 — both rows were previously inert. Their list APIs deliberately return only a per-user summary (userId / itemCount / cap state), never the items themselves, since pulling every user's items into one payload would breach the Vercel Hobby response ceiling (Rule #6) — so the row already shows its whole record and the useful destination is the owning user. Confirm the click lands on /admin/users/{that user's id} and that page loads their real profile.",
            href: "/admin/wishlists",
          },
          { key: "history-admin-view", label: "Admin history view shows accurate data", href: "/admin/history" },
          { key: "notifications-admin-view", label: "Admin notifications and admin-notifications views show accurate data" },
          { key: "reviews-admin-view", label: "Admin reviews view shows accurate data", href: "/admin/reviews" },
          { key: "store-addresses-admin", label: "Admin store-addresses view shows accurate data", href: "/admin/store-addresses" },
          {
            key: "store-addresses-admin-row-opens-detail",
            label: "Clicking a row on Admin → Store Addresses opens a detail modal with the full address (contact name, phone, both address lines, landmark, city, state, postal code, country) and a \"Default pickup location\" badge where applicable",
            description: "Added 2026-08-21 — the row was completely inert (no click, no row actions, no editor) and truncated the address to label/city/state, so the phone and street lines were unreachable anywhere in the admin UI.",
            href: "/admin/store-addresses",
          },
          { key: "addresses-crud-admin", label: "Admin can create and edit addresses", href: "/admin/addresses" },
          { key: "stores-admin-view", label: "Admin stores view shows accurate data", href: "/admin/stores" },
          {
            key: "admin-store-detail-page",
            label: "Every admin store row's row menu has a \"View full page\" action landing on a real dedicated /admin/stores/[id]/view page — logo, status/verified/featured badges, an owner link to that owner's (now-enriched) user page, stats (products/items sold/reviews/rating), capabilities, and a \"Manage\" button opening the existing edit drawer",
            description: "Added 2026-08-21 — admin previously had no dedicated store detail page at all, only the edit drawer (no logo, no owner link, no stats). From /admin/stores, open the seeded \"Tester Sandbox Store\" (store-tester-sandbox) and confirm every section renders real data, and the owner link lands on that seller's admin user page.",
            href: "/admin/stores",
          },
        ],
      },
      {
        pageKey: "media-watermark",
        pageLabel: "Media Watermark Settings",
        href: "/admin/site",
        cases: [
          { key: "watermark-size-opacity-controls", label: "Adjusting the watermark Size and Opacity sliders in Site Settings → Watermark visibly changes how prominent the watermark is on newly-loaded product images", href: "/admin/site" },
          { key: "watermark-position-presets", label: "Each of the 5 watermark Position presets (Center, Top left, Top right, Bottom left, Bottom right) correctly repositions the watermark on newly-loaded images" },
          { key: "watermark-custom-offset", label: "Enabling \"Use a custom X/Y offset instead\" and entering positive/negative X/Y values moves the watermark the correct direction and distance from center" },
          { key: "watermark-theme-recolor", label: "The default bundled watermark mark recolors to match the active site theme's brand gradient rather than a fixed hardcoded color" },
          { key: "watermark-video-overlay-parity", label: "A product video's live watermark overlay appears at the same position, size, and opacity as the image watermark pipeline" },
        ],
      },
      {
        pageKey: "bug-hunter-rewards",
        pageLabel: BUG_HUNTER_REWARDS_PAGE_LABEL,
        href: "/admin/tester-feedback",
        cases: [
          {
            key: "confirm-bug",
            label: "Admin can mark a tester's \"No\" answer as a confirmed bug from the Main Issues tab (or the All Submissions tab) — the reporting tester is credited as the bug hunter and the case is disabled so no other tester can answer it",
            description: "From /admin/tester-feedback → Main Issues, click \"Mark as Bug\" on any open issue. Confirm: (1) the confirmation dialog appears before it commits, (2) the issue's card now shows a \"🐛 Confirmed — credited to [tester name]\" badge, (3) re-opening the Tester Hub as any other tester no longer shows that case at all.",
            href: "/admin/tester-feedback",
          },
          {
            key: "confirm-bug-idempotent",
            label: "Attempting to mark the same case as a bug a second time (e.g. from a duplicate \"No\" report on the same case) is rejected rather than silently re-crediting a different tester",
          },
          {
            key: "reopen-case",
            label: "Admin can reopen a bug-confirmed case as a new version for retest — the new version is active and answerable again, while the old case stays disabled in the catalog with its bug-hunter credit intact",
            description: "Verify against the seeded \"Demo fixture — reported bug, already confirmed and reopened\" pair under this page: the v1 case should show Status \"Bug Confirmed\" and be hidden from the catalog's default (Active-only) view, while its v2 case shows Status \"Active\" and is answerable from the Tester Hub. From /admin/tester-checklist, switch the Status filter to \"Inactive\" or \"Bug status → Bug Confirmed\" to find v1, then use its \"Reopen as New Test Case\" row action on any other bug-confirmed case to try the flow live.",
            href: "/admin/tester-checklist",
          },
          {
            key: "catalog-default-active-filter",
            label: "The Tester Checklist catalog (/admin/tester-checklist) shows only Active cases by default — bug-confirmed and reopened-away cases are hidden unless the Status filter is switched to \"Inactive\"/\"All\" or the \"Bug status\" filter is set to \"Bug Confirmed\"",
            href: "/admin/tester-checklist",
          },
        ],
      },
    ],
    { adminOnly: true },
  ),

  // Demo fixture pair — deliberately outside group() since these two items
  // exercise the confirm-bug → reopen-as-new-version lifecycle directly
  // (bugConfirmed/bugHunterId/version/previousVersionId/supersededByItemId
  // are not part of the CaseInput shape group() builds). Lets an admin/
  // tester see the full state machine immediately after a fresh reseed,
  // and gives the /bug-hunters leaderboard a non-empty first entry.
  {
    id: "checklist-admin-bug-hunter-rewards-demo-fixture",
    groupKey: "admin",
    groupLabel: ADMIN_TESTING_GROUP_LABEL,
    pageKey: "bug-hunter-rewards",
    pageLabel: BUG_HUNTER_REWARDS_PAGE_LABEL,
    label: "Demo fixture — reported bug, already confirmed and reopened (v1, disabled)",
    description: "Seed-only fixture demonstrating a confirmed bug: this v1 case is disabled (isActive:false) and credited to \"Mock User 18\". Its retest is \"Demo fixture — reported bug, already confirmed and reopened (v2, active)\" in this same page.",
    href: "/admin/tester-checklist",
    order: 100,
    isActive: false,
    adminOnly: true,
    bugConfirmed: true,
    bugHunterId: "user-tester-qa",
    bugHunterName: "Mock User 18",
    bugConfirmedAt: new Date("2026-08-18T10:00:00.000Z"),
    version: 1,
    supersededByItemId: "checklist-admin-bug-hunter-rewards-demo-fixture-v2",
  },
  {
    id: "checklist-admin-bug-hunter-rewards-demo-fixture-v2",
    groupKey: "admin",
    groupLabel: ADMIN_TESTING_GROUP_LABEL,
    pageKey: "bug-hunter-rewards",
    pageLabel: BUG_HUNTER_REWARDS_PAGE_LABEL,
    label: "Demo fixture — reported bug, already confirmed and reopened (v2, active)",
    description: "Seed-only fixture — the retest version reopened from the disabled v1 case in this same page. Active and answerable again; a fresh \"No\" answer here can be used to try Mark as Bug end-to-end.",
    href: "/admin/tester-checklist",
    order: 101,
    isActive: true,
    adminOnly: true,
    version: 2,
    previousVersionId: "checklist-admin-bug-hunter-rewards-demo-fixture",
  },
  ...group("page-wiring", "Page Wiring & Reachability", [
    {
      pageKey: "drawer-pages",
      pageLabel: "Editors that are also pages",
      href: "/admin/team",
      cases: [
        {
          key: "page-drawer-opens-already-open",
          label: "Opening an editor page directly shows the panel ALREADY OPEN",
          description:
            "Go to /admin/team/new by URL. The invite panel must already be open — not a blank page you have to click into. Close it and you should land back on /admin/team, not on a dead route. Same for /admin/navigation/new and /admin/tester-checklist/new.",
        },
        {
          key: "page-drawer-deep-link-survives-reload",
          label: "A deep link to an editor survives a reload",
          description:
            "Open a team member's edit page, then reload. The panel is still open, on the same record. This is the whole reason these pages exist — a drawer alone cannot be bookmarked, shared with a colleague, or reopened after a crash.",
        },
      ],
    },
    {
      pageKey: "detail-pages",
      pageLabel: "Record detail pages",
      href: "/admin/bids",
      cases: [
        {
          key: "detail-page-matches-list-modal",
          label: "A bid's detail PAGE shows the same fields as the list's modal",
          description:
            "Open a bid from /admin/bids (a modal opens) and note the fields. Now open /admin/bids/{id}/view directly. The fields must be identical — both are built by one buildBidDetailFields, so any difference means a second copy has appeared and the two will drift.",
        },
        {
          key: "detail-page-hides-identity-per-portal",
          label: "The buyer's own bid page does NOT reveal other bidders",
          description:
            "Open the same bid at /admin/bids/{id}/view and at /user/bids/{id}/view. The buyer view must not show the other bidder's identity. One `viewer` argument decides this, in one place — if the buyer view leaks a name, that argument is being ignored somewhere.",
        },
      ],
    },
    {
      pageKey: "data-loss",
      pageLabel: "Saves that used to destroy data",
      href: "/admin/lotteries",
      cases: [
        {
          key: "lottery-edit-preserves-bookings",
          label: "🛑 Editing a lottery does NOT wipe slots people already pulled",
          description:
            "On a seeded lottery, pull/book a slot first. Then open the admin lottery editor, change something unrelated (rename a different slot), and save. Reopen: the booked slot must STILL be booked, with the same buyer name and lottery number. Before this wave the editor sent isBooked:false for every slot and the event PATCH let it through, so the first save erased every purchased slot — with a success message and no error anywhere.",
        },
        {
          key: "lottery-booked-slot-cannot-be-deleted",
          label: "Removing a slot somebody already pulled is refused, by number",
          description:
            "In the same editor, try to delete the slot that has been booked. The save must fail and name that slot number. It is a conflict, not a form error — the correct next action is to reopen the pull, not to fix a field.",
        },
        {
          key: "admin-grouped-listing-title-actually-saves",
          label: "🛑 An admin renaming a grouped listing actually persists it",
          description:
            "Edit a grouped listing's title at /admin/grouped-listings/{id}/edit, save, then RELOAD. The new title must still be there. Reloading is the only way to tell: the old admin PATCH accepted productIds only and silently dropped everything else, so it returned a perfectly normal 200 and wrote nothing.",
          href: "/admin/grouped-listings",
        },
        {
          key: "store-address-landmark-survives-edit",
          label: "🛑 A store address keeps its landmark through an edit",
          description:
            "Create a store pickup address from the /store/addresses drawer WITH a landmark filled in. Now edit that address at /store/addresses/{id}/edit, change anything else, and save. The landmark must still be set. The shared address form had no landmark field, so it sent undefined and dropped it on every edit.",
          href: "/store/addresses",
        },
      ],
    },
    {
      pageKey: "reachability",
      pageLabel: "Everything built is reachable",
      href: "/admin",
      cases: [
        {
          key: "lottery-can-be-created-without-seeding",
          label: "An admin can create a lottery end to end, with no seed script",
          description:
            "Create an event of type Lottery from /admin/events/new (the type must be offered — it was missing from the picker entirely), then configure its slots from /admin/lotteries/{id}/edit, then pull a slot as a buyer. Until this wave lottery events could ONLY come from `npm run seed`.",
          href: "/admin/events/new",
        },
        {
          key: "carousel-can-be-renamed",
          label: "A named carousel can be renamed after it is created",
          description:
            "Open /admin/carousels, pick a carousel, use Edit carousel, change its name and status, save. There was no edit path at all: the group editor was create-only, so a carousel's name was fixed for its whole life.",
          href: "/admin/carousels",
        },
        {
          key: "grouped-listing-members-editable-from-its-own-page",
          label: "A grouped listing's MEMBERS can be picked while creating it",
          description:
            "Create a group at /store/grouped-listings/new and add products in the same form. Previously productIds was hardcoded to an empty array, so a group could only ever be created empty and filled in from somewhere else. Check the minimum-active-members and cover-image fields are present too — neither had an input anywhere.",
          href: "/store/grouped-listings/new",
        },
        {
          key: "public-nav-and-footer-resolve",
          label: "Every header, sidebar-support and footer link opens a real page",
          description:
            "Walk the public header nav, the sidebar support links and every footer column. All 55 hrefs must land on a real page. No audit checked ANY of them until this wave — the nav audit only ever looked at the three portal sidebars.",
          href: "/",
        },
        {
          key: "user-tester-hub-reachable-from-user-sidebar",
          label: "A tester reaches the Tester Hub from their OWN sidebar",
          description:
            "As a user with the tester flag, open /user and find Tester Hub in the sidebar under Testing. The group is injected at runtime and is empty for non-testers — confirm a NON-tester account does not see it.",
          href: "/user",
        },
      ],
    },
  ]),
];

const defaultPhases = assignDefaultPhases(
  rawTesterChecklistItems as { groupKey: string; pageKey: string }[],
);

export const testerChecklistSeedData: Partial<TesterChecklistItemDocument>[] =
  rawTesterChecklistItems.map((item, index) => ({
    ...item,
    phase: defaultPhases[index],
  }));
