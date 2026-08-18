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
        { key: "google-link-existing", label: "Linking Google sign-in to an existing email/password account works" },
        { key: "google-popup-blocked-fallback", label: "If the Google sign-in popup is blocked, the fallback (RTDB signal + postMessage) still completes sign-in" },
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
        { key: "seller-inventory-print", label: "Seller inventory print view works", href: "/store/inventory/print" },
      ],
    },
    {
      pageKey: "seller-marketing-extras",
      pageLabel: "Seller Offers, Features, Google Reviews & WhatsApp Catalog",
      cases: [
        { key: "seller-offers-list", label: "Seller offers list shows accurate buyer offers", href: "/store/offers" },
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
        { key: "raffle-entry", label: "Entering an open_raffle event works" },
        { key: "raffle-entry-top-n-scorers", label: "Entering a top_n_scorers raffle event works and the leaderboard reflects entries" },
        { key: "raffle-entry-top-n-participants", label: "Entering a top_n_participants raffle event works" },
        { key: "spin-wheel", label: "Spinning the spin-wheel event works and shows the prize immediately (realtime)" },
        { key: "spin-wheel-window-blocked", label: "A second spin attempt within the same spinWindow is blocked with a clear message" },
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
      ],
    },
    {
      pageKey: "stores-sellers-directories",
      pageLabel: "Store & Seller Directories",
      cases: [
        { key: "store-directory", label: "The store directory page loads correctly", href: "/stores" },
        { key: "store-detail-tabs", label: "A store detail page's auctions/bundles/coupons/pre-orders/prize-draws/reviews tabs all load correctly" },
        { key: "sellers-directory", label: "The sellers directory page loads correctly", href: "/sellers" },
        { key: "seller-detail-page", label: "An individual seller's public detail page loads correctly" },
        { key: "scams-registry", label: "The scams registry page and an individual scam detail page load correctly", href: "/scams" },
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
        { key: "register-page", label: "The register page loads and account creation works", href: "/register" },
        { key: "forgot-reset-password-pages", label: "Forgot-password and reset-password pages both work" },
        { key: "verify-email-page", label: "The verify-email page correctly confirms a pending verification" },
        { key: "oauth-loading-redirect", label: "The OAuth-loading redirect page transitions correctly after a Google sign-in" },
        { key: "checkout-success-page", label: "The checkout-success page shows correct order details after payment", href: "/checkout/success" },
        { key: "unauthorized-404-pages", label: "Unauthorized and 404 error pages render correctly instead of crashing" },
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
    ],
    { adminOnly: true },
  ),
];
