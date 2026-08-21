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
        { key: "win-auction", label: "Winning an auction creates a payable order correctly", href: "/auctions/auction-tester-sandbox-won" },
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
          key: "bid-increment-live-tier-change",
          label: "The displayed \"min increment\" on an open auction updates live (without a page refresh) if another bidder's bid pushes the current bid across a tier boundary",
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
          href: "/cart",
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
      pageKey: "messaging",
      pageLabel: "Messaging a Seller",
      href: "/user/messages",
      cases: [
        { key: "start-conversation", label: "Starting a conversation with a seller works" },
        { key: "receive-reply", label: "Receiving and reading a seller's reply works" },
        { key: "message-realtime-update", label: "A new message appears in the recipient's thread without a manual page refresh (realtime ping-channel)", href: "/user/messages" },
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
        { key: "seller-quick-add-drawer-flips", label: "With Left-hand mode ON, the seller's quick-add-listing side drawer opens from the left instead of the right" },
      ],
    },
    {
      pageKey: "seller-orders",
      pageLabel: "Seller Order Management & Shipping/Tracking",
      href: "/store/orders",
      cases: [
        { key: "view-orders", label: "Seller order list shows accurate incoming orders", href: "/store/orders" },
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
        { key: "seller-coupons-crud", label: "Seller can create, edit, and list their own coupons", href: "/store/coupons" },
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
        { key: "section-cta-buttons-visible", label: "Homepage section \"View all →\" / \"Go to…\" buttons use a solid primary-colored fill so they're clearly identifiable as clickable CTAs, not a plain white/outline box that blends into the page" },
        {
          key: "mobile-search-bar-proportions",
          label: "On mobile, the global header search bar's resource-type dropdown (Products/Auctions/etc.) is a compact, capped width and the text input takes up most of the remaining space — not an oversized dropdown squeezing the input down to a sliver",
          href: "/",
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
        { key: "hand-mode-no-fouc", label: "On a hard page reload with Left-hand mode already ON, panels/sidebars render on the left immediately — there is no visible flash of them briefly appearing on the right before snapping left" },
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
      ],
    },
    {
      pageKey: "homepage-carousels",
      pageLabel: "Homepage Carousels",
      href: "/",
      cases: [
        { key: "carousel-loops", label: "Homepage carousels (Shop by Category, Top Brands, Featured Products, Live Auctions, Reserve Before It Ships, Verified Stores, Tournaments & Events, Collector Reviews) loop back to the first item after reaching the last instead of getting stuck at the end", href: "/" },
        { key: "carousel-no-flicker", label: "Homepage carousel auto-scroll does not flash/flicker when looping back to the first item" },
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
  ]),

  ...group("public-pages", "Public & Marketing Pages", [
    {
      pageKey: "core-listing-pages",
      pageLabel: "Homepage & Core Listing Pages",
      href: "/",
      cases: [
        { key: "homepage-loads", label: "The homepage loads without errors on both desktop and mobile", href: "/" },
        { key: "about-us-in-main-nav", label: "\"About Us\" appears as an item in the main public top navigation, not just the footer", href: "/about" },
        {
          key: "about-team-real-founder",
          label: "The About page's \"Who's Behind LetItRip\" team section shows the real founder's name (not a placeholder persona) and a working \"GitHub ↗\" link on their card",
          description: "Updated 2026-08-20 — the founder card previously used a fictional placeholder name with no GitHub link. Confirm the founder card's name matches the real developer and the GitHub link opens their actual profile.",
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
          key: "empty-tabs-hidden",
          label: "A store/category/brand detail page never shows a tab for a listing type it has zero items of — e.g. a store with no products doesn't show a \"Products\" tab at all, not an empty products page",
          description: "Fixed 2026-08-20 — tab visibility now checks the already-fetched per-type count and omits the tab entirely when it's zero, instead of always rendering all tabs regardless of whether they'd show anything. \"About\" always stays visible on store pages (no item-count concept). Verify on a real store/category/brand that's genuinely missing at least one listing type.",
          href: "/stores",
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
        { key: "privacy-cookies-security", label: "Privacy, cookies, and security pages load correctly" },
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
          { key: "payment-methods-clusters-admin", label: "Admin can manage payment methods and payment-method clusters", href: "/admin/payment-methods" },
          { key: "catalogue-approvals-admin", label: "Admin can approve/reject personal catalogue submissions", href: "/admin/catalogue-approvals" },
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
            description: "Added 2026-08-21. The digest runs automatically at 10:00 IST, but you don't need to wait — an admin can trigger it on demand by POSTing to /api/admin/daily-digest/trigger (e.g. from the browser console while logged in as admin: fetch('/api/admin/daily-digest/trigger',{method:'POST'})). Confirm the email reaches every configured recipient AND any CC addresses, and that the numbers match what the admin orders list actually shows for the last 24 hours. Note: this requires the Firebase Functions deploy to have happened for the scheduled 10:00 run — the manual trigger works regardless.",
            href: "/admin/site",
          },
          { key: "admin-dashboard-widgets", label: "Admin dashboard widgets show accurate data", href: "/admin/dashboard" },
          { key: "analytics-admin", label: "Admin analytics dashboard shows accurate data", href: "/admin/analytics" },
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
          { key: "guide-pages-admin", label: "The 8 admin guide pages all load correctly", href: "/admin/guide" },
          { key: "tester-checklist-crud-admin", label: "Admin can create, edit, and toggle adminOnly on tester checklist items", href: "/admin/tester-checklist" },
          { key: "tester-feedback-report-export", label: "Admin tester-feedback report shows Yes/No analytics grouped correctly and the Download Report export works", href: "/admin/tester-feedback" },
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
          { key: "wishlists-admin-view", label: "Admin wishlists view shows accurate data", href: "/admin/wishlists" },
          { key: "history-admin-view", label: "Admin history view shows accurate data", href: "/admin/history" },
          { key: "notifications-admin-view", label: "Admin notifications and admin-notifications views show accurate data" },
          { key: "reviews-admin-view", label: "Admin reviews view shows accurate data", href: "/admin/reviews" },
          { key: "store-addresses-admin", label: "Admin store-addresses view shows accurate data", href: "/admin/store-addresses" },
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
];

const defaultPhases = assignDefaultPhases(
  rawTesterChecklistItems as { groupKey: string; pageKey: string }[],
);

export const testerChecklistSeedData: Partial<TesterChecklistItemDocument>[] =
  rawTesterChecklistItems.map((item, index) => ({
    ...item,
    phase: defaultPhases[index],
  }));
