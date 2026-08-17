/*
 * WHY: Seeds the initial tester QA checklist catalog — DB-backed, admin-manageable (mirrors faq-seed-data.ts).
 * WHAT: ~55 default test cases across 6 groups (Account & Auth, Buying, Selling, Content & Discovery,
 *       Community & Support, Design & UX). Admins add/edit further cases via /admin/tester-checklist —
 *       this array is a starting point, not the source of truth.
 *
 * EXPORTS:
 *   testerChecklistSeedData — Array of Partial<TesterChecklistItemDocument> for seed runner
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
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
        order: pageIdx * 10 + caseIdx,
        isActive: true,
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
      ],
    },
    {
      pageKey: "buying-checkout",
      pageLabel: "Buying & Checkout",
      cases: [
        { key: "add-to-cart", label: "Add to cart works from the product page" },
        { key: "checkout-flow", label: "Checkout flow completes without errors", href: "/cart" },
        { key: "shipping-address", label: "Selecting/adding a shipping address works" },
        { key: "payment-proof-upload", label: "Uploading manual payment proof (UTR + screenshot) works" },
        { key: "order-confirmation", label: "Order confirmation page/email shows correct order details" },
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
        { key: "confirm-payment", label: "Confirming a buyer's manual payment proof works" },
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
  ]),
];
