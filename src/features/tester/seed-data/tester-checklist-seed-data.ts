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

interface CaseInput {
  key: string;
  label: string;
  description?: string;
  href?: string;
}

function group(
  groupKey: string,
  groupLabel: string,
  pages: { pageKey: string; pageLabel: string; cases: CaseInput[] }[],
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
        href: c.href,
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
      cases: [
        { key: "email-signup", label: "Sign up with email works", href: "/auth/register" },
        { key: "google-oauth", label: "Sign up / log in with Google works", href: "/auth/login" },
        { key: "google-link-existing", label: "Linking Google sign-in to an existing email/password account works" },
        { key: "google-popup-blocked-fallback", label: "If the Google sign-in popup is blocked, the fallback (RTDB signal + postMessage) still completes sign-in" },
        { key: "login", label: "Log in with email + password works", href: "/auth/login" },
        { key: "logout", label: "Log out works and clears the session" },
        { key: "email-verify", label: "Email verification link works" },
        { key: "password-reset", label: "Forgot-password / reset-password flow works" },
      ],
    },
    {
      pageKey: "profile-settings",
      pageLabel: "Profile & Settings",
      cases: [
        { key: "edit-profile", label: "Editing display name / bio saves correctly", href: "/user/profile" },
        { key: "avatar-upload", label: "Uploading a profile avatar works" },
        { key: "notification-prefs", label: "Notification preferences save correctly" },
        { key: "public-profile-toggle", label: "Public profile visibility toggle works" },
        {
          key: "own-public-profile-quick-links",
          label: "\"View public profile\" is easy to find and works from three places: the My Account dashboard header, the My Account quick-links grid (\"My Public Profile\" tile), and the /user/profile page (next to \"Manage Addresses\")",
          description: "Each of the three links should open your own public-facing profile page (/profile/[your uid]) — not the edit-profile page. If your profile visibility is set to Private, confirm the page still loads for you (the owner) even though other users would get a 404.",
          href: "/user",
        },
      ],
    },
    {
      pageKey: "testing-program",
      pageLabel: "Tester Hub",
      cases: [
        { key: "tester-hub-loads", label: "Tester Hub loads the full checklist grouped by section", href: "/user/tester" },
        { key: "tester-hub-search", label: "Tester Hub search finds test cases by typing part of the title or the route (e.g. \"/store/payouts\")", href: "/user/tester" },
        { key: "tester-hub-answer-saves", label: "Answering Yes/No and adding a comment on a test case saves without reloading" },
        { key: "admin-tester-access", label: "Signed-in admin accounts can open the Tester Hub and see the same checklist as testers", href: "/user/tester" },
        { key: "admin-testing-section", label: "Admin dashboard's Testing section shows both the Tester Checklist and Tester Feedback (results) links", href: "/admin/tester-feedback" },
      ],
    },
  ]),

  ...group("buying", "Buying", [
    {
      pageKey: "browsing-search",
      pageLabel: "Browsing & Search",
      cases: [
        { key: "browse-categories", label: "Browsing categories shows relevant products", href: "/categories" },
        { key: "search", label: "Search returns relevant results", href: "/search" },
        { key: "filters", label: "Search/listing filters (price, brand, condition) work correctly" },
        { key: "pagination", label: "Pagination / infinite scroll works on listing pages" },
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
      ],
    },
    {
      pageKey: "product-detail",
      pageLabel: "Product / Auction / Pre-order Detail",
      cases: [
        { key: "standard-detail", label: "Standard product detail page loads correctly" },
        { key: "auction-detail", label: "Auction detail page shows current bid + countdown correctly" },
        { key: "preorder-detail", label: "Pre-order detail page shows expected ship date correctly" },
        {
          key: "image-gallery",
          label: "Product image gallery thumbnails load reliably (no broken-image icons) and click-to-zoom/rotate works in the lightbox",
          description: "The thumbnail strip occasionally showed a broken-image icon instead of the photo (transient 3rd-party fetch failures with no retry, fixed 2026-08-19). Reload an auction or product detail page a few times and confirm every thumbnail — not just the main image — renders correctly each time.",
        },
        {
          key: "video-playback",
          label: "A product's video slide opens in theater mode with playback, zoom, and rotate controls",
          description: "Product video is no longer a YouTube embed — when a product has a video, it appears as a trailing gallery slide (poster image + play badge) alongside the photos. Clicking it opens the full-screen lightbox in theater mode, plays the video with native controls, and the zoom (+/-) and rotate (R) buttons in the top bar still apply. Test on the two seeded fixtures: \"Beyblade Original — Dragoon F (Video Demo)\" and \"Beyblade X BX-02 Dran Sword (Video Demo)\".",
        },
        {
          key: "related-listings-sections",
          label: "A standard product's detail page shows up to 4 \"related\" carousels below the main content — More in [category], More by [brand], You might also like (shared tags), and More from [store] — each populated with real items, not empty",
          description: "Verify against \"Beyblade Burst B-01 Valkyrie\" (product-beyblade-burst-valkyrie) — all 4 sections should show real items: other Beyblade Burst products, other \"Beyblade\"-brand products, other attack-type/starter-set tagged products, and other Beyblade Arena store listings.",
          href: "/products",
        },
        { key: "prizedraw-buy-reveal", label: "Buying a prize-draw entry, then the reveal, correctly shows win/lose and auto-refunds non-winners" },
        {
          key: "bundle-purchase",
          label: "Purchasing a bundle works and shows all included items in the order",
          description: "Verify against \"Test Bundle\" (bundle-tester-sandbox, findable from the bundles listing page) — after checkout, the order should show a single \"Test Bundle\" line item, not two separate product lines.",
          href: "/bundles",
        },
        {
          key: "product-group-set-widget",
          label: "A product's detail page shows a collapsible \"Part of / Parts in this group\" panel with a working thumbnail strip and a \"View whole group\" table when the product belongs to a product-group (\"Set\")",
          description: "Verify against \"Test Product Set — Standard #1 + Standard #2\" (group-tester-sandbox-bundle) and either of its two children (product-tester-standard-1 / product-tester-standard-2), findable from the products listing page — all three should show the panel with each other listed, the arrow/triangle expand icons should render as real glyphs (not garbled text), and \"View whole group\" should open a working modal/drawer.",
          href: "/products",
        },
        { key: "classified-contact-flow", label: "A classified listing shows a contact-seller flow with deliberately no checkout/buy button" },
        { key: "digitalcode-delivery", label: "Purchasing a digital-code listing delivers the code to the buyer post-purchase" },
        { key: "live-item-detail", label: "A live-item listing's detail page shows the livestream link correctly" },
      ],
    },
    {
      pageKey: "buying-checkout",
      pageLabel: "Buying & Checkout",
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
        { key: "checkout-otp-highvalue", label: "Carts ≥ the admin-configured high-value OTP threshold (Site Settings → Shipping → \"High-value checkout OTP threshold\") prompt a \"Verify this order\" email OTP right before payment (except COD)" },
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
      ],
    },
    {
      pageKey: "my-orders",
      pageLabel: "My Orders — List & Dashboard",
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
      ],
    },
    {
      pageKey: "bidding",
      pageLabel: "Bidding",
      cases: [
        { key: "place-bid", label: "Placing a bid on an auction works", href: "/user/bids" },
        { key: "place-bid-live-self", label: "After placing a bid, the current bid amount and bid count update immediately on the auction page for the bidder — no manual page refresh needed" },
        { key: "place-bid-live-other-viewer", label: "Opening the same auction in two browser tabs (or two accounts) and placing a bid in one updates the current bid and bid count in the other within a few seconds, without a manual refresh (realtime SSE)" },
        { key: "outbid-notification", label: "Getting outbid triggers a notification" },
        { key: "win-auction", label: "Winning an auction creates a payable order correctly" },
        { key: "bid-history", label: "My Bids page shows accurate bid history, paginated with the most recent bid first", href: "/user/bids" },
        { key: "bid-history-auction-detail-pagination", label: "An auction detail page's Bid History section shows the most recent bid first and paginates once there are more bids than fit on one page (try the L-Drago auction — 13 seeded bids)" },
      ],
    },
    {
      pageKey: "wishlist-history",
      pageLabel: "Wishlist & History",
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
        { key: "view-history", label: "Recently viewed history shows accurate items in most-recent-first order", href: "/user/history" },
        { key: "history-revisit-reorders", label: "Re-visiting a product already in history removes the old entry and moves it to the front, rather than duplicating it" },
        { key: "history-fifo-cap", label: "History silently evicts the oldest entry once more than 50 items have been viewed (no error shown to the user)" },
        { key: "history-guest-merge-on-login", label: "Guest browsing history (localStorage) merges correctly with the account's history after login, deduplicated by product" },
      ],
    },
    {
      pageKey: "cart",
      pageLabel: "Cart",
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
      ],
    },
    {
      pageKey: "reviews",
      pageLabel: "Reviews",
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
      ],
    },
    {
      pageKey: "messaging",
      pageLabel: "Messaging a Seller",
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
      ],
    },
    {
      pageKey: "user-dashboard-navigation",
      pageLabel: "User Dashboard Navigation",
      cases: [
        { key: "sidebar-all-links-work", label: "Every item in the user dashboard sidebar navigates to its page without a 404 or broken layout", href: "/user" },
        { key: "sidebar-active-highlight", label: "The sidebar correctly highlights the currently active section as you navigate between pages" },
        { key: "sidebar-mobile-collapse", label: "The user dashboard sidebar collapses into a mobile-friendly menu/bottom bar on small screens" },
        { key: "deep-link-direct-load", label: "Directly loading a deep user dashboard URL (e.g. /user/orders/view/[id]) works without first visiting the dashboard home" },
        { key: "become-seller-crossnav", label: "\"Become a Seller\" (buyer) vs \"Go to my Store\" (seller) shows the correct one based on account state and navigates correctly" },
        { key: "browser-back-forward", label: "Browser back/forward buttons move correctly between dashboard sub-pages without breaking the layout" },
        { key: "logged-out-redirect", label: "Opening a user dashboard URL while logged out redirects to login, then returns to the originally requested page after signing in" },
        { key: "breadcrumbs-accurate", label: "Breadcrumbs (where present) on nested user dashboard pages accurately reflect the current location" },
      ],
    },
  ]),

  ...group("selling", "Selling", [
    {
      pageKey: "become-seller",
      pageLabel: "Become a Seller & Store Setup",
      cases: [
        { key: "apply-seller", label: "Applying to become a seller works", href: "/user/become-seller" },
        { key: "store-setup", label: "Setting up store name/description/logo works" },
        { key: "store-address", label: "Adding a pickup address for the store works" },
      ],
    },
    {
      pageKey: "listing-a-product",
      pageLabel: "Listing a Product",
      cases: [
        { key: "list-standard", label: "Listing a standard product works" },
        { key: "list-auction", label: "Listing an auction works" },
        { key: "list-preorder", label: "Listing a pre-order works" },
        { key: "edit-listing", label: "Editing an existing listing works" },
        { key: "media-upload", label: "Uploading product images/video during listing works" },
      ],
    },
    {
      pageKey: "seller-orders",
      pageLabel: "Seller Order Management & Shipping/Tracking",
      cases: [
        { key: "view-orders", label: "Seller order list shows accurate incoming orders", href: "/store/orders" },
        { key: "confirm-payment", label: "Approving a buyer's manual payment proof works" },
        { key: "request-reupload", label: "Requesting a proof re-upload (honest-mistake tier) clears the proof and extends the buyer's deadline" },
        { key: "reject-fraud", label: "Rejecting a proof as fraudulent cancels the order, restores stock, and bans the buyer's account for 7 days" },
        { key: "whatsapp-admin-share", label: "Uploading payment proof pings the admin WhatsApp numbers, and the buyer's \"Share for review\" link opens with a pre-filled message" },
        { key: "mark-shipped", label: "Marking an order shipped with tracking info works" },
        { key: "tracking-visible", label: "Buyer sees updated tracking status after seller ships" },
      ],
    },
    {
      pageKey: "seller-analytics-payouts",
      pageLabel: "Seller Analytics & Payouts",
      cases: [
        { key: "view-analytics", label: "Seller analytics dashboard shows accurate sales data", href: "/store/analytics" },
        { key: "view-payouts", label: "Seller payouts list shows accurate payout history", href: "/store/payouts" },
        { key: "payouts-checkbox-select", label: "Selecting payouts with the row checkboxes shows a working bulk action bar (Export Selected)", href: "/store/payouts" },
        { key: "payouts-detail-panel", label: "Opening \"View Details\" on a payout shows a side panel with status progress, transaction ID, and expected payout date" },
        { key: "payouts-reminder-toggle", label: "Toggling the payout reminder flag in the detail panel saves correctly" },
      ],
    },
    {
      pageKey: "seller-shipping-payouts-setup",
      pageLabel: "Seller Shipping & Payout Setup",
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
      ],
    },
    {
      pageKey: "seller-catalog-org",
      pageLabel: "Seller Categories, Sublisting Categories & Listing Templates",
      cases: [
        { key: "seller-categories-crud", label: "Seller can create and edit their own categories", href: "/store/categories" },
        { key: "seller-sublisting-categories-crud", label: "Seller can create and edit sublisting categories", href: "/store/sublisting-categories" },
        { key: "seller-listing-templates-crud", label: "Seller can create, edit, and reuse listing templates when creating a new product", href: "/store/listing-templates" },
      ],
    },
    {
      pageKey: "seller-ops-comms",
      pageLabel: "Seller Addresses, Messages, Fulfillment & Print",
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
      cases: [
        { key: "seller-guide-pages", label: "The 5 seller guide pages (overview, capabilities, finance, listings, orders, settings) all load correctly", href: "/store/guide" },
      ],
    },
    {
      pageKey: "store-dashboard-navigation",
      pageLabel: "Store Dashboard Navigation",
      cases: [
        { key: "store-sidebar-all-links-work", label: "Every item in the store/seller dashboard sidebar navigates to its page without a 404 or broken layout", href: "/store" },
        { key: "store-sidebar-active-highlight", label: "The store sidebar correctly highlights the currently active section as you navigate between pages" },
        { key: "store-sidebar-mobile-collapse", label: "The store dashboard sidebar collapses into a mobile-friendly menu/bottom bar on small screens" },
        { key: "store-deep-link-direct-load", label: "Directly loading a deep store dashboard URL (e.g. /store/products/[id]/edit) works without first visiting the dashboard home" },
        { key: "store-user-crossnav", label: "The store dashboard's cross-nav link back to the buyer dashboard works and lands on the correct page" },
        { key: "store-browser-back-forward", label: "Browser back/forward buttons move correctly between store dashboard sub-pages without breaking the layout" },
        { key: "store-logged-out-redirect", label: "Opening a store dashboard URL while logged out (or as a non-seller) redirects appropriately instead of erroring" },
        { key: "store-nav-listing-type-groups", label: "The seller nav correctly groups/labels each listing-type management area (standard, auctions, pre-orders, prize draws, bundles, classifieds, digital codes, live, art, stickers)" },
      ],
    },
  ]),

  ...group("content-discovery", "Content & Discovery", [
    {
      pageKey: "blog",
      pageLabel: "Blog",
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
        { key: "survey-feedback-submit", label: "Submitting a survey or feedback event's Participate form works, enforces required fields, and shows a success confirmation" },
        { key: "offer-coupon-display-copy", label: "An offer event shows its coupon code prominently on the Overview tab, and the \"Copy code\" button copies it to the clipboard with visible confirmation" },
        { key: "raffle-entry", label: "Entering an open_raffle event works and the Participate tab shows the prize hero, eligibility copy, and optional message field (not a blank form)" },
        { key: "raffle-entry-top-n-scorers", label: "Entering a top_n_scorers raffle event works and the leaderboard reflects entries" },
        { key: "raffle-entry-top-n-participants", label: "Entering a top_n_participants raffle event works" },
        { key: "spin-wheel", label: "Spinning the spin-wheel event works and shows the prize immediately (realtime)" },
        { key: "spin-wheel-window-blocked", label: "A second spin attempt within the same spinWindow is blocked with a clear message" },
        { key: "leaderboard-live-refresh", label: "After voting/entering an event, navigating to its Leaderboard tab shows the updated standings immediately rather than a stale cached ranking" },
      ],
    },
    {
      pageKey: "coupons",
      pageLabel: "Coupons",
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
      cases: [
        { key: "create-ticket", label: "Creating a support ticket works", href: "/user/support" },
        { key: "reply-ticket", label: "Replying to an open support ticket works" },
      ],
    },
    {
      pageKey: "public-profile",
      pageLabel: "Public Profiles & Stores",
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
      ],
    },
    {
      pageKey: "dashboard-layout",
      pageLabel: "Dashboards — Collapsible Sections & Mobile Tables",
      cases: [
        { key: "collapsible-admin", label: "Admin dashboard sections expand/collapse and remember their state on reload", href: "/admin/dashboard" },
        { key: "collapsible-store", label: "Store dashboard sections expand/collapse and remember their state on reload", href: "/store" },
        { key: "collapsible-user", label: "User profile dashboard sections expand/collapse and remember their state on reload", href: "/user/profile" },
        { key: "mobile-table-cards", label: "Admin/seller listing tables show full-row cards by default on mobile, with a working switch back to table view" },
        { key: "view-mode-persist", label: "Switching the dashboard table/card view mode is remembered on your next visit (filters/search/sort are not)" },
      ],
    },
    {
      pageKey: "footer-theme",
      pageLabel: "Footer & Dark Mode",
      cases: [
        { key: "footer-dark-mode", label: "Footer background and all link/text colors switch correctly between light and dark mode", href: "/" },
      ],
    },
    {
      pageKey: "homepage-carousels",
      pageLabel: "Homepage Carousels",
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
      ],
    },
  ]),

  ...group("public-pages", "Public & Marketing Pages", [
    {
      pageKey: "core-listing-pages",
      pageLabel: "Homepage & Core Listing Pages",
      cases: [
        { key: "homepage-loads", label: "The homepage loads without errors on both desktop and mobile", href: "/" },
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
          key: "category-brand-related-sections",
          label: "A category detail page shows a \"Related Categories\" section (other categories sharing the same root) and a brand detail page shows a \"Related Brands\" section, each with real items",
          description: "Verify against \"Beyblade Burst\" (category-beyblade-burst) — Related Categories should show Beyblade Original, Metal Fight, and Beyblade X (siblings under the \"Spinning Tops\" root).",
          href: "/categories",
        },
      ],
    },
    {
      pageKey: "stores-sellers-directories",
      pageLabel: "Store & Seller Directories",
      cases: [
        { key: "store-directory", label: "The store directory page loads correctly", href: "/stores" },
        { key: "store-detail-tabs", label: "A store detail page's listing-type dropdown (Products/Auctions/Pre-Orders/Prize Draws/Bundles/Classifieds/Digital Codes/Live Items/Art & Stickers) switches correctly between listing types, and the separate Coupons/Reviews/About tabs next to it all load correctly", description: "The listing-type dropdown is always a dropdown (not just on narrow/mobile widths, unlike category/brand/product/event tabs) since a store can have up to 9 listing types — Coupons, Reviews, and About stay as standalone tabs beside it, never folded into the dropdown." },
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
      cases: [
        { key: "shipping-refund-policy", label: "Shipping-policy and refund-policy pages load correctly" },
        { key: "privacy-cookies-security", label: "Privacy, cookies, and security pages load correctly" },
      ],
    },
    {
      pageKey: "auth-error-pages",
      pageLabel: "Remaining Auth & Error Pages",
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
    "Admin (Testing)",
    [
      {
        pageKey: "catalog-listings",
        pageLabel: "Catalog & Listings",
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
        cases: [
          { key: "prizedraw-create", label: "Admin can create a prize-draw listing", href: "/admin/prize-draws" },
          { key: "prizedraw-reveal-winner", label: "Admin can reveal a prize-draw winner via the crypto.randomInt reveal flow" },
          { key: "prizedraw-auto-refund", label: "Non-winning entries are auto-refunded correctly after a reveal" },
          { key: "prizedraw-lock-on-reveal", label: "Lock-on-reveal correctly blocks further entries after the draw" },
          { key: "prizedraw-entries-view", label: "Admin can view prize-draw / lottery entries", href: "/admin/lotteries" },
        ],
      },
      {
        pageKey: "bundles",
        pageLabel: "Bundles / Grouped Listings",
        cases: [
          { key: "bundle-create", label: "Admin can create a bundle from existing products", href: "/admin/bundles" },
          { key: "bundle-stock-sync", label: "Bundle stock correctly syncs when a component product's stock changes" },
          { key: "bundle-edit-delete", label: "Admin can edit and delete a bundle" },
        ],
      },
      {
        pageKey: "classifieds-digitalcodes-live",
        pageLabel: "Classifieds, Digital Codes & Live Listings",
        cases: [
          { key: "classified-create-moderate", label: "Admin can create and moderate classified listings", href: "/admin/classified" },
          { key: "digitalcode-create-moderate", label: "Admin can create and moderate digital-code listings", href: "/admin/digital-codes" },
          { key: "live-create-moderate", label: "Admin can create and moderate live-item listings", href: "/admin/live" },
        ],
      },
      {
        pageKey: "blog-faqs",
        pageLabel: "Blog & FAQs",
        cases: [
          { key: "blog-create-edit-publish", label: "Admin can create, edit, and publish a blog post", href: "/admin/blog" },
          { key: "blog-media-step-save", label: "On the blog editor's Media step, setting a Cover Image and/or a YouTube Video ID and saving succeeds (no validation error) and both persist correctly when reopening the post for edit" },
          { key: "faq-create-edit-category", label: "Admin can create and edit an FAQ, including category assignment", href: "/admin/faqs" },
        ],
      },
      {
        pageKey: "orders-fulfillment",
        pageLabel: "Orders & Fulfillment",
        cases: [
          { key: "orders-status-change", label: "Admin orders list shows accurate orders and status changes save correctly", href: "/admin/orders" },
          { key: "bids-admin-view", label: "Admin bids view shows accurate bid data", href: "/admin/bids" },
          { key: "return-requests-triage", label: "Admin can triage return requests", href: "/admin/return-requests" },
          { key: "fulfillment-queue-admin", label: "Admin fulfillment queue shows accurate pending items", href: "/admin/fulfillment" },
          { key: "shipments-crud", label: "Admin can create/edit shipments, including lots/items and projections", href: "/admin/shipments" },
          { key: "print-center-admin", label: "Admin print-center generates labels/invoices correctly", href: "/admin/print-center" },
          { key: "payouts-export-admin", label: "Admin can export payouts", href: "/admin/payouts" },
          { key: "bulk-action-realtime-progress", label: "A bulk admin action (e.g. bulk order status update) shows live progress via the bulk_events realtime channel and resolves without polling" },
        ],
      },
      {
        pageKey: "users-trust",
        pageLabel: "Users & Trust",
        cases: [
          { key: "users-role-change", label: "Admin can change a user's role and toggle isTester/canTestAdmin", href: "/admin/users" },
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
        cases: [
          { key: "site-settings-admin", label: "Admin site settings page saves correctly", href: "/admin/site" },
          { key: "admin-dashboard-widgets", label: "Admin dashboard widgets show accurate data", href: "/admin/dashboard" },
          { key: "analytics-admin", label: "Admin analytics dashboard shows accurate data", href: "/admin/analytics" },
          { key: "maintenance-pages-admin", label: "The maintenance pages (analysis, client-errors, cloud-logs, function-errors, payment-rollbacks, server-errors + detail) all load correctly", href: "/admin/maintenance" },
          { key: "copilot-admin", label: "Admin copilot page works correctly", href: "/admin/copilot" },
          { key: "team-admin", label: "Admin team page works correctly", href: "/admin/team" },
          { key: "guide-pages-admin", label: "The 8 admin guide pages all load correctly", href: "/admin/guide" },
          { key: "tester-checklist-crud-admin", label: "Admin can create, edit, and toggle adminOnly on tester checklist items", href: "/admin/tester-checklist" },
          { key: "tester-feedback-report-export", label: "Admin tester-feedback report shows Yes/No analytics grouped correctly and the Download Report export works", href: "/admin/tester-feedback" },
        ],
      },
      {
        pageKey: "buyer-data-admin",
        pageLabel: "Buyer-Data Admin Views",
        cases: [
          { key: "carts-admin-view", label: "Admin carts view shows accurate data", href: "/admin/carts" },
          { key: "wishlists-admin-view", label: "Admin wishlists view shows accurate data", href: "/admin/wishlists" },
          { key: "history-admin-view", label: "Admin history view shows accurate data", href: "/admin/history" },
          { key: "notifications-admin-view", label: "Admin notifications and admin-notifications views show accurate data" },
          { key: "reviews-admin-view", label: "Admin reviews view shows accurate data", href: "/admin/reviews" },
          { key: "store-addresses-admin", label: "Admin store-addresses view shows accurate data", href: "/admin/store-addresses" },
          { key: "addresses-crud-admin", label: "Admin can create and edit addresses", href: "/admin/addresses" },
          { key: "stores-admin-view", label: "Admin stores view shows accurate data", href: "/admin/stores" },
        ],
      },
      {
        pageKey: "media-watermark",
        pageLabel: "Media Watermark Settings",
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
        pageLabel: "Bug Hunter Rewards",
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
    groupLabel: "Admin (Testing)",
    pageKey: "bug-hunter-rewards",
    pageLabel: "Bug Hunter Rewards",
    label: "Demo fixture — reported bug, already confirmed and reopened (v1, disabled)",
    description: "Seed-only fixture demonstrating a confirmed bug: this v1 case is disabled (isActive:false) and credited to \"Mock User 18\". Its retest is \"Demo fixture — reported bug, already confirmed and reopened (v2, active)\" in this same page.",
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
    groupLabel: "Admin (Testing)",
    pageKey: "bug-hunter-rewards",
    pageLabel: "Bug Hunter Rewards",
    label: "Demo fixture — reported bug, already confirmed and reopened (v2, active)",
    description: "Seed-only fixture — the retest version reopened from the disabled v1 case in this same page. Active and answerable again; a fresh \"No\" answer here can be used to try Mark as Bug end-to-end.",
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
