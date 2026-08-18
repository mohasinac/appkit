/*
 * WHY: Seeds the initial tester QA checklist catalog — DB-backed, admin-manageable (mirrors faq-seed-data.ts).
 * WHAT: ~65 default test cases across 6 groups (Account & Auth, Buying, Selling, Content & Discovery,
 *       Community & Support, Design & UX). Admins add/edit further cases via /admin/tester-checklist —
 *       this array is a starting point, not the source of truth. Every case is searchable by title or
 *       route in the Tester Hub (/user/tester), which any isTester account OR admin can open.
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

export const testerChecklistSeedData: Partial<TesterChecklistItemDocument>[] = [
  ...group("account-auth", "Account & Auth", [
    {
      pageKey: "signup-login",
      pageLabel: "Signup & Login",
      cases: [
        { key: "email-signup", label: "Sign up with email works", href: "/register" },
        { key: "google-oauth", label: "Sign up / log in with Google works", href: "/login" },
        { key: "login", label: "Log in with email + password works", href: "/login" },
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
      ],
    },
    {
      pageKey: "product-detail",
      pageLabel: "Product / Auction / Pre-order Detail",
      cases: [
        { key: "standard-detail", label: "Standard product detail page loads correctly" },
        { key: "auction-detail", label: "Auction detail page shows current bid + countdown correctly" },
        { key: "preorder-detail", label: "Pre-order detail page shows expected ship date correctly" },
        { key: "image-gallery", label: "Product image gallery / zoom works" },
        { key: "video-playback", label: "Product video (YouTube embed) plays correctly" },
        { key: "prizedraw-buy-reveal", label: "Buying a prize-draw entry, then the reveal, correctly shows win/lose and auto-refunds non-winners" },
        { key: "bundle-purchase", label: "Purchasing a bundle/grouped-listing works and shows all included items in the order" },
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
        { key: "checkout-flow", label: "Checkout flow completes without errors", href: "/cart" },
        { key: "shipping-address", label: "Selecting/adding a shipping address works" },
        { key: "checkout-otp-highvalue", label: "Carts ≥ the OTP threshold prompt for email verification before placing the order (except COD)" },
        { key: "payment-window-countdown", label: "Manual-payment orders show a 15-minute countdown timer on the payment page" },
        { key: "payment-proof-upload", label: "Uploading manual payment proof (screenshot, UTR, mark-as-paid + agreement checkboxes) works" },
        { key: "payment-window-expiry", label: "An order whose 15-minute payment window expires with no proof auto-cancels and the item returns to stock" },
        { key: "order-confirmation", label: "Order confirmation page/email shows correct order details" },
        { key: "payment-auto-approve-dispute", label: "An auto-approved order (2h, no admin review) shows the badge, and \"Raise a dispute\" submits successfully" },
      ],
    },
    {
      pageKey: "bidding",
      pageLabel: "Bidding",
      cases: [
        { key: "place-bid", label: "Placing a bid on an auction works", href: "/user/bids" },
        { key: "outbid-notification", label: "Getting outbid triggers a notification" },
        { key: "win-auction", label: "Winning an auction creates a payable order correctly" },
        { key: "bid-history", label: "My Bids page shows accurate bid history" },
      ],
    },
    {
      pageKey: "wishlist-history",
      pageLabel: "Wishlist & History",
      cases: [
        { key: "add-wishlist", label: "Adding a product to the wishlist works", href: "/user/wishlist" },
        { key: "remove-wishlist", label: "Removing a product from the wishlist works" },
        { key: "view-history", label: "Recently viewed history shows accurate items", href: "/user/history" },
      ],
    },
    {
      pageKey: "cart",
      pageLabel: "Cart",
      cases: [
        { key: "update-qty", label: "Updating item quantity in cart recalculates the total" },
        { key: "apply-coupon", label: "Applying a coupon code at checkout works" },
        { key: "remove-item", label: "Removing an item from the cart works" },
      ],
    },
    {
      pageKey: "reviews",
      pageLabel: "Reviews",
      cases: [
        { key: "leave-review", label: "Leaving a review with rating + photo works" },
        { key: "view-seller-reviews", label: "Viewing a seller's reviews on their store page works" },
        { key: "seller-response", label: "Seller responding to a review works" },
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
        { key: "my-returns", label: "Requesting and viewing a return works", href: "/user/returns" },
        { key: "my-reviews", label: "\"My Reviews\" shows reviews the user has left", href: "/user/reviews" },
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
  ]),

  ...group("content-discovery", "Content & Discovery", [
    {
      pageKey: "blog",
      pageLabel: "Blog",
      cases: [
        { key: "read-post", label: "Reading a blog post renders correctly (images, formatting)" },
        { key: "blog-listing", label: "Blog listing page shows all published posts" },
      ],
    },
    {
      pageKey: "events",
      pageLabel: "Events, Raffles & Spin Wheel",
      cases: [
        { key: "view-event", label: "Viewing an event detail page works", href: "/user/events" },
        { key: "raffle-entry", label: "Entering a raffle event works" },
        { key: "spin-wheel", label: "Spinning the spin-wheel event works and shows the prize" },
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
      ],
    },
  ]),
];
