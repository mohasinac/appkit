export type RoutePath = string | ((...args: string[]) => string);

export interface RouteMap {
  HOME: string;
  PUBLIC: Record<string, RoutePath>;
  ERRORS: Record<string, string>;
  AUTH: Record<string, string>;
  USER: Record<string, RoutePath>;
  /** Store management dashboard (requires seller role). Replaces the old SELLER section. */
  STORE: Record<string, RoutePath>;
  ADMIN: Record<string, RoutePath>;
  BLOG: Record<string, RoutePath>;
}

export const DEFAULT_ROUTE_MAP = {
  HOME: "/",
  PUBLIC: {
    FAQS: "/faqs",
    FAQ_CATEGORY: (category: string) => `/faqs/${category}`,
    PROFILE: (userId: string) => `/profile/${userId}`,
    PRODUCTS: "/products",
    PRODUCT_DETAIL: (slugOrId: string) => `/products/${slugOrId}`,
    AUCTIONS: "/auctions",
    AUCTION_DETAIL: (id: string) => `/auctions/${id}`,
    PRE_ORDERS: "/pre-orders",
    /** D56 — the public rate card + self-serve booking form. */
    ADVERTISE: "/advertise",
    PRE_ORDER_DETAIL: (id: string) => `/pre-orders/${id}`,
    // SB1-J — bundles + prize draws (additive, pages not yet built)
    BUNDLES: "/bundles",
    BUNDLE_DETAIL: (slug: string) => `/bundles/${slug}`,
    /**
     * A `groupedListings` document's public page. Distinct from a product
     * GROUP (`product.groupId`), whose canonical page is its parent product's
     * detail page — see § "Bundles vs Product Groups vs Grouped Listings".
     */
    GROUP_DETAIL: (slug: string) => `/groups/${slug}`,
    PRIZE_DRAWS: "/prize-draws",
    PRIZE_DRAW_DETAIL: (slug: string) => `/prize-draws/${slug}`,
    SELLER_GUIDE_BUNDLES: "/seller-guide/bundles",
    SELLER_GUIDE_PRIZE_DRAWS: "/seller-guide/prize-draws",
    SELLERS: "/sellers",
    SELLER_DETAIL: (id: string) => `/sellers/${id}`,
    STORES: "/stores",
    STORE_DETAIL: (storeSlug: string) => `/stores/${storeSlug}`,
    STORE_PRODUCTS: (storeSlug: string) => `/stores/${storeSlug}/products`,
    STORE_AUCTIONS: (storeSlug: string) => `/stores/${storeSlug}/auctions`,
    STORE_PRE_ORDERS: (storeSlug: string) => `/stores/${storeSlug}/pre-orders`,
    STORE_PRIZE_DRAWS: (storeSlug: string) => `/stores/${storeSlug}/prize-draws`,
    STORE_BUNDLES: (storeSlug: string) => `/stores/${storeSlug}/bundles`,
    STORE_REVIEWS: (storeSlug: string) => `/stores/${storeSlug}/reviews`,
    STORE_ABOUT: (storeSlug: string) => `/stores/${storeSlug}/about`,
    STORE_COUPONS: (storeSlug: string) => `/stores/${storeSlug}/coupons`,
    STORE_CLASSIFIEDS: (storeSlug: string) => `/stores/${storeSlug}/classified`,
    STORE_DIGITAL_CODES: (storeSlug: string) => `/stores/${storeSlug}/digital-codes`,
    STORE_LIVE: (storeSlug: string) => `/stores/${storeSlug}/live`,
    // Combined art + stickers, mirroring the public /art page. The store's
    // "Art & Stickers" tab used to point at STORE_PRODUCTS, which filters to
    // `standard` — so the tab showed a real non-zero count and then landed on
    // a page containing none of those items.
    STORE_ART: (storeSlug: string) => `/stores/${storeSlug}/art`,
    /*
     * 🛑 `STORE_PAGE_TABS` is DERIVED from the plugin registry, so this tab
     * appears the moment the plugin exists — and a missing
     * `stores/[storeSlug]/spares/page.tsx` is then a clickable 404 that no
     * audit covers. The folder lands in the same commit as this key.
     */
    STORE_SPARES: (storeSlug: string) => `/stores/${storeSlug}/spares`,
    CATEGORIES: "/categories",
    CATEGORY_DETAIL: (slug: string) => `/categories/${slug}`,
    BRANDS: "/brands",
    BRAND_DETAIL: (slug: string) => `/brands/${slug}`,
    /*
     * FRANCHISE — what a collectible is FROM, where a brand is who MADE it.
     * Singular in the path because `CharacterHotspot` already ships eighteen
     * `/franchise/<slug>` links; matching them is what turns those 404s into
     * real pages, and changing the segment to `/franchises` would just move
     * the breakage.
     */
    FRANCHISE: "/franchise",
    FRANCHISE_DETAIL: (slug: string) => `/franchise/${slug}`,
    REVIEWS: "/reviews",
    REVIEW_DETAIL: (id: string) => `/reviews/${id}`,
    SEARCH: "/search",
    PROMOTIONS: "/promotions",
    ABOUT: "/about",
    DEVELOPER: "/developer",
    CONTACT: "/contact",
    /*
     * 🛑 No `PUBLIC.BLOG`. `BLOG.LIST` is the one key for "/blog", and it sits
     * beside `BLOG.ARTICLE` — which is the ONLY blog detail key, so `BLOG` was
     * always the canonical section and `PUBLIC.BLOG` was an alias of its index.
     * Two keys for one path is Root Cause #61's family: the duplicate was
     * reported by `audit-dead-route-key` on every run, and nine call sites had
     * drifted onto the alias while one used the real key.
     */
    HELP: "/help",
    HELP_SHOPPING: "/help/shopping",
    HELP_AUCTIONS: "/help/auctions",
    HELP_ORDERS: "/help/orders",
    HELP_ACCOUNT: "/help/account",
    /*
     * 🛑 A LICENCE OBLIGATION, not a vanity page — which is why it is a route
     * key and sits in PUBLIC_ROUTES. The facts across ~5,500 rows (parts, beys,
     * products, characters) come from a CC-BY-SA community wiki; taking facts
     * only and linking back is what keeps us clear of share-alike, and a
     * link-back nobody can reach discharges nothing.
     */
    CREDITS: "/credits",
    TERMS: "/terms",
    PRIVACY: "/privacy",
    ETHICS: "/ethics",
    CODE_OF_CONDUCT: "/code-of-conduct",
    SECURITY: "/security",
    TRACK_ORDER: "/track",
    SELLER_GUIDE: "/seller-guide",
    COOKIE_POLICY: "/cookies",
    REFUND_POLICY: "/refund-policy",
    SHIPPING_POLICY: "/shipping-policy",
    /**
     * Cancellation policy. Distinct from the refund policy, which already
     * covers cancellation in passing — PhonePe's merchant review asks for it
     * by name, and so does the Consumer Protection (E-Commerce) Rules 2020
     * disclosure list.
     */
    CANCELLATION_POLICY: "/cancellation-policy",
    /**
     * Grievance officer. A MANDATORY published disclosure under the Consumer
     * Protection (E-Commerce) Rules 2020 and the IT Rules 2021 — name,
     * designation, contact and a response commitment.
     */
    GRIEVANCE: "/grievance",
    HOW_AUCTIONS_WORK: "/how-auctions-work",
    HOW_PRE_ORDERS_WORK: "/how-pre-orders-work",
    HOW_OFFERS_WORK: "/how-offers-work",
    HOW_CHECKOUT_WORKS: "/how-checkout-works",
    HOW_EMI_WORKS: "/how-emi-works",
    HOW_ORDERS_WORK: "/how-orders-work",
    HOW_REVIEWS_WORK: "/how-reviews-work",
    HOW_PAYOUTS_WORK: "/how-payouts-work",
    FEES: "/fees",
    /*
     * D6b — the GST explainer. A differentiator rather than table stakes:
     * exactly ONE of the seventeen crawled Indian collectibles sites states
     * tax-inclusive pricing to the buyer in words, and sixteen say nothing.
     */
    GST: "/gst",
    /*
     * D6 — the anti-counterfeit guide. Framed on what the crawl actually
     * measured: the biggest copy-seller in this market makes no authenticity
     * claim at all, so the signals are silence + price, then code, then weight.
     */
    SPOT_A_FAKE: "/spot-a-fake",
    /* D6 — the content hub. Fourteen explainers whose only entry point was the
     * footer; a footer link is reachable but it is not a destination, so it
     * cannot rank and gives a crawler no page establishing the cluster. */
    GUIDES: "/guides",
    /*
     * D5 — local SEO, one page per city a classified listing actually names.
     * 🛑 STATIC (`generateStaticParams`): a city page that awaited
     * `searchParams` would be dynamic, and this is the surface most likely to
     * be crawled widely (Root Cause #94).
     */
    CITY_COLLECTIBLES: (city: string) => `/collectibles/${city}`,
    EVENTS: "/events",
    EVENT_DETAIL: (id: string) => `/events/${id}`,
    EVENT_PARTICIPATE: (id: string) => `/events/${id}/participate`,
    EVENT_LEADERBOARD: (id: string) => `/events/${id}/leaderboard`,
    EVENT_WINNER: (id: string) => `/events/${id}/winner`,
    EVENT_SPIN_RESULTS: (id: string) => `/events/${id}/spin-results`,
    LOTTERIES: "/lottery",
    LOTTERY_DETAIL: (id: string) => `/lottery/${id}`,
    /*
      * 🛑 There is deliberately NO public `SUBLISTING_CATEGORIES` index key.
      * `src/app/[locale]/sublisting-categories/` holds only `[slug]/`, so the
      * index has never existed; the key promised a route with no page behind
      * it, had zero references anywhere, and `audit-dead-route-key` carried it
      * as its one grandfathered entry. A sub-listing is reached from the
      * category or product it belongs to, not from a top-level list.
      */
    SUBLISTING_CATEGORY: (slug: string) => `/sublisting-categories/${slug}`,
    SUPPORT: "/support",
    SCAMS: "/scams",
    SCAM_DETAIL: (id: string) => `/scams/${id}`,
    SCAM_REPORT: "/scams/report",
    REPORT_ENTITY: "/report",
    ITEM_REQUESTS: "/item-requests",
    ITEM_REQUEST_DETAIL: (id: string) => `/item-requests/${id}`,
    ITEM_REQUESTS_NEW: "/item-requests/new",
    /*
     * The TOOLS group — surfaces that answer a question rather than sell
     * something. `/tools` itself is a real index page, not a `#` placeholder:
     * the navbar dropdown's trigger is a link, so anyone without a hovering
     * pointer has to land somewhere, and `audit-nav-page-wiring` checks that
     * every nav href resolves to a real page.
     */
    TOOLS: "/tools",
    TOOL_PRICE_INDEX: "/tools/price-index",
    /*
     * Admin-only, and under a PUBLIC prefix on purpose — it is a tool, and
     * /tools is where tools live. The guard is the layout, not the path: a
     * non-admin is redirected server-side before any HTML is produced, so
     * there is nothing indexable at this URL regardless of robots.txt.
     */
    TOOL_STICKER_TRACER: "/tools/sticker-tracer",
    TOOL_STICKER_SHEET: (sheetId: string) => `/tools/sticker-tracer/${sheetId}`,
    /*
     * The PARTS database. A reference surface, so it lives beside the other
     * two things that answer a question rather than sell you something.
     *
     * 🛑 `/parts/{classification}/{code}` — the classification is REQUIRED in
     * the path, because a code alone is ambiguous: `105` is a Metal Fight
     * spin-track height, a bare number in Burst is a disc, and `1-60` is a
     * Beyblade X ratchet. The two segments together are the document id
     * (`${slot}--${tail}`), so the page is a direct doc read with no query
     * and no index.
     */
    PARTS: "/parts",
    PART_CLASSIFICATION: (classification: string) => `/parts/${classification}`,
    PART_DETAIL: (classification: string, code: string) =>
      `/parts/${classification}/${code}`,
    /*
     * The BEY database. A reference surface like `/parts`, and a ONE-segment
     * URL unlike it — a bey's id IS its slug, so the page is a direct doc read
     * with no query and no index. Parts need the classification in the path
     * because a code alone is ambiguous (`105` is a spin-track height in Metal
     * Fight and a disc in Burst); a bey name is not.
     */
    BEY_DETAIL: (slug: string) => `/beys/${slug}`,
    SCAM_TYPES: "/scams/types",
    SCAM_FAQS: "/scams/faqs",
    CLASSIFIED: "/classified",
    CLASSIFIED_DETAIL: (slug: string) => `/classified/${slug}`,
    DIGITAL_CODES: "/digital-codes",
    DIGITAL_CODE_DETAIL: (slug: string) => `/digital-codes/${slug}`,
    LIVE: "/live",
    LIVE_DETAIL: (slug: string) => `/live/${slug}`,
    // Combined art + stickers browse page (Workstream 1c) — one page for both
    // listing types. No dedicated detail route: art/stickers use the standard
    // checkout flow (not classified's contact-seller/meetup flow), so their
    // detail page stays PRODUCT_DETAIL (`/products/{slug}`), already wired in
    // `_internal/shared/listing-types/{art,stickers}/config.ts`.
    ART: "/art",
    /*
     * Part Two — loose components off disassembled items.
     *
     * 🛑 A REAL page, not a redirect shim like `/live`. Its plugin sets
     * `inGeneralCatalogue: false`, and the rule for that flag is nav
     * reachability: a type kept out of `/products` must own a page that
     * `MAIN_NAV_ITEMS` links, or it is reachable from nowhere at all (Root
     * Cause #61). A shim pointing back at `/products` would re-open exactly
     * that hole while looking like it had closed it.
     *
     * Detail route stays `PRODUCT_DETAIL` — a spare checks out like any
     * standard item, so it needs no bespoke detail page, same reasoning as
     * art/stickers above.
     */
    SPARES: "/spares",
    // Personal catalogue (Feature B) — a user's own photo inventory of owned
    // items, distinct from marketplace listings. Public when the owner sets
    // an item's visibility to "public". The owner's full catalogue listing
    // already exists at PROFILE(userId)/catalogue (PublicProfileView's
    // "Catalogue" tab) — this is only the per-item detail route, which had
    // no page at all before this.
    CATALOGUE_ITEM_DETAIL: (ownerSlug: string, itemId: string) => `/catalogue/${ownerSlug}/${itemId}`,
  },
  ERRORS: {
    UNAUTHORIZED: "/unauthorized",
  },
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
    VERIFY_EMAIL: "/auth/verify-email",
    OAUTH_LOADING: "/auth/oauth-loading",
    CLOSE: "/auth/close",
  },
  USER: {
    DASHBOARD: "/user",
    /**
     * A dashboard SECTION hub — the screens of one sidebar group, each with a
     * sentence on what it is for.
     *
     * One parametric route serves every section of the portal; the slug is
     * `hubSectionSlug(group.title)` and is DERIVED, so there is no list of
     * section keys here to drift from the nav. `audit-dashboard-hub-coverage`
     * cross-checks the two.
     */
    SECTION: (slug: string) => `/user/sections/${slug}`,
    PROFILE: "/user/profile",
    SETTINGS: "/user/settings",
    ORDERS: "/user/orders",
    WISHLIST: "/wishlist",
    HISTORY: "/user/history",
    ADDRESSES: "/user/addresses",
    /**
     * Canonical shapes. `/add` and `/edit/[id]` were the only two
     * non-standard route shapes in the codebase — every other entity uses
     * `/new` and `/[id]/edit`. Both old paths still resolve, as redirects.
     */
    ADDRESSES_NEW: "/user/addresses/new",
    ADDRESSES_EDIT: (id: string) => `/user/addresses/${id}/edit`,
    /*
     * 🛑 `/user/orders/{id}`, not `/user/orders/view/{id}`.
     *
     * The same order used to present two unrelated-looking URL shapes: the
     * detail page at `view/{id}` while every action on it — cancel, invoice,
     * payment, return, track — sat at `{id}/…`. A buyer who shortened the URL
     * by dropping a trailing segment landed on a 404.
     *
     * The old path still resolves: `view/[id]/page.tsx` is a redirect, kept
     * because order confirmation and shipping emails carry it.
     */
    ORDER_DETAIL: (id: string) => `/user/orders/${id}`,
    ORDER_CANCEL: (id: string) => `/user/orders/${id}/cancel`,
    ORDER_TRACK: (id: string) => `/user/orders/${id}/track`,
    ORDER_RETURN: (id: string) => `/user/orders/${id}/return`,
    /*
     * The buyer's protection claim. Its own route rather than a tab on the
     * order page: the form is a decision with a required account of what
     * happened, and the order page is already the densest surface in the app.
     */
    ORDER_CLAIM: (id: string) => `/user/orders/${id}/claim`,
    ORDER_INVOICE: (id: string) => `/user/orders/${id}/invoice`,
    ORDER_PAYMENT: (id: string) => `/user/orders/${id}/payment`,
    /**
     * Raise a dispute on one order.
     *
     * Deep-linkable on purpose: a notification `actionUrl` points here, and
     * `/user/orders/view/{id}` carries a "Report a problem" button to the same
     * place. One surface, two ways in — an email link that works only while
     * the buyer still has the email is the shape Root Cause #57 records,
     * where `ORDER_PAYMENT` had exactly ONE caller and a buyer who navigated
     * away could not get back.
     */
    ORDER_DISPUTE: (id: string) => `/user/orders/${id}/dispute`,
    NOTIFICATIONS: "/user/notifications",
    /** Plan §10 — claimed-coupons wallet (Active / Expired / Used tabs). */
    CLAIMED_COUPONS: "/user/coupons",
    /** Points balance + ledger. 1 point = ₹1, spendable at checkout. */
    POINTS: "/user/points",
    /*
     * 🛑 Both of these had a COMPLETE API and no page. `GET /api/user/sessions`
     * + `DELETE [id]`, and `GET/POST /api/user/payment-methods` + `DELETE
     * [id]`, were all live with zero consumers — and `BuyerAccountGuideView`
     * already told buyers to "view all devices signed in at My Account →
     * Sessions", pointing at a security control that did not exist.
     */
    SESSIONS: "/user/sessions",
    PAYMENT_METHODS: "/user/payment-methods",
    BECOME_SELLER: "/user/become-seller",
    CART: "/cart",
    CHECKOUT: "/checkout",
    CHECKOUT_SUCCESS: "/checkout/success",
    OFFERS: "/user/offers",
    REVIEWS: "/user/reviews",
    /*
     * The buyer's own review editor. There was no edit route for a review in
     * EITHER portal — the user index was list-only and the admin side had just
     * /admin/reviews — so a reviewer had no way to change what they had
     * written. Added with its page and its nav entry in the same change
     * (Root Cause #37: a route with no page, or a page with no nav, ships as
     * half done).
     */
    REVIEW_EDIT: (id: string) => `/user/reviews/${id}/edit`,
    BIDS: "/user/bids",
    BID_DETAIL: (id: string) => `/user/bids/${id}/view`,
    RETURNS: "/user/returns",
    SUPPORT: "/user/support",
    SUPPORT_NEW: "/user/support/new",
    SUPPORT_TICKET: (id: string) => `/user/support/${id}`,
    PRE_ORDERS: "/user/pre-orders",
    /** D56 — the advertiser's own bookings and their moderation state. */
    AD_BOOKINGS: "/user/ad-bookings",
    DIGITAL_CODES: "/user/digital-codes",
    PRIZE_DRAWS: "/user/prize-draws",
    EVENTS: "/user/events",
    CATALOGUE: "/user/catalogue",
    CATALOGUE_NEW: "/user/catalogue/new",
    CATALOGUE_EDIT: (id: string) => `/user/catalogue/${id}/edit`,
    /** D9 — one universal inbox, same real-top-level-path precedent as WISHLIST/CART. */
    MESSAGES: "/messages",
    MESSAGE_THREAD: (conversationId: string) => `/messages/${conversationId}`,
  },
  STORE: {
    DASHBOARD: "/store",
    /** A dashboard SECTION hub — see `USER.SECTION` for the derivation. */
    SECTION: (slug: string) => `/store/sections/${slug}`,
    PRODUCTS: "/store/products",
    PRODUCTS_NEW: "/store/products/new",
    PRODUCTS_EDIT: (id: string) => `/store/products/${id}/edit`,
    ORDERS: "/store/orders",
    ORDER_DETAIL: (id: string) => `/store/orders/${id}/view`,
    AUCTIONS: "/store/auctions",
    AUCTIONS_NEW: "/store/auctions/new",
    AUCTIONS_EDIT: (id: string) => `/store/auctions/${id}/edit`,
    PRE_ORDERS: "/store/pre-orders",
    PRE_ORDERS_NEW: "/store/pre-orders/new",
    PRE_ORDERS_EDIT: (id: string) => `/store/pre-orders/${id}/edit`,
    COUPONS: "/store/coupons",
    COUPONS_NEW: "/store/coupons/new",
    COUPONS_EDIT: (id: string) => `/store/coupons/${id}/edit`,
    ANALYTICS: "/store/analytics",
    PAYOUTS: "/store/payouts",
    PAYOUT_DETAIL: (id: string) => `/store/payouts/${id}/view`,
    STOREFRONT: "/store/storefront",
    SHIPPING: "/store/shipping",
    PAYOUT_SETTINGS: "/store/payout-settings",
    ADDRESSES: "/store/addresses",
    ADDRESSES_NEW: "/store/addresses/new",
    ADDRESSES_EDIT: (id: string) => `/store/addresses/${id}/edit`,
    OFFERS: "/store/offers",
    WHATSAPP: "/store/whatsapp",
    REVIEWS: "/store/reviews",
    BIDS: "/store/bids",
    BID_DETAIL: (id: string) => `/store/bids/${id}/view`,
    SUBLISTING_CATEGORIES: "/store/sublisting-categories",
    SUBLISTING_CATEGORIES_NEW: "/store/sublisting-categories/new",
    SUBLISTING_CATEGORIES_EDIT: (id: string) => `/store/sublisting-categories/${id}/edit`,
    FEATURES: "/store/features",
    FEATURES_NEW: "/store/features/new",
    FEATURES_EDIT: (id: string) => `/store/features/${id}/edit`,
    SLUG: "/store/slug",
    /** Tickets raised ABOUT this store (W11). Read-only for the seller. */
    SUPPORT: "/store/support",
    // SB1-J — bundles + prize draws
    BUNDLES: "/store/bundles",
    BUNDLES_NEW: "/store/bundles/new",
    BUNDLES_EDIT: (id: string) => `/store/bundles/${id}/edit`,
    PRIZE_DRAWS: "/store/prize-draws",
    PRIZE_DRAWS_NEW: "/store/prize-draws/new",
    PRIZE_DRAWS_EDIT: (id: string) => `/store/prize-draws/${id}/edit`,
    PRIZE_DRAW_ENTRIES: (id: string) => `/store/prize-draws/${id}/entries`,
    // SB-UNI-R — classified / digital-code / live
    CLASSIFIED: "/store/classified",
    CLASSIFIED_NEW: "/store/classified/new",
    CLASSIFIED_EDIT: (id: string) => `/store/classified/${id}/edit`,
    DIGITAL_CODES: "/store/digital-codes",
    DIGITAL_CODES_NEW: "/store/digital-codes/new",
    DIGITAL_CODES_EDIT: (id: string) => `/store/digital-codes/${id}/edit`,
    LIVE_ITEMS: "/store/live",
    LIVE_ITEMS_NEW: "/store/live/new",
    LIVE_ITEMS_EDIT: (id: string) => `/store/live/${id}/edit`,
    // EMI/art-stickers session — art / stickers
    ART: "/store/art",
    ART_NEW: "/store/art/new",
    ART_EDIT: (id: string) => `/store/art/${id}/edit`,
    STICKERS: "/store/stickers",
    STICKERS_NEW: "/store/stickers/new",
    STICKERS_EDIT: (id: string) => `/store/stickers/${id}/edit`,
    // Part Two — spares
    SPARES: "/store/spares",
    SPARES_NEW: "/store/spares/new",
    SPARES_EDIT: (id: string) => `/store/spares/${id}/edit`,
    PRINT_CENTER: "/store/print-center",
    FULFILLMENT: "/store/fulfillment",
    // S-STORE Tier — new extension routes
    PAYOUT_METHODS: "/store/payout-methods",
    PAYOUT_METHODS_NEW: "/store/payout-methods/new",
    PAYOUT_METHODS_EDIT: (id: string) => `/store/payout-methods/${id}/edit`,
    SHIPPING_CONFIGS: "/store/shipping-configs",
    SHIPPING_CONFIGS_NEW: "/store/shipping-configs/new",
    SHIPPING_CONFIGS_EDIT: (id: string) => `/store/shipping-configs/${id}/edit`,
    ANALYTICS_CARDS: "/store/analytics/cards",
    ANALYTICS_ALERTS: "/store/analytics/alerts",
    GROUPED_LISTINGS: "/store/grouped-listings",
    GROUPED_LISTINGS_NEW: "/store/grouped-listings/new",
    GROUPED_LISTINGS_EDIT: (id: string) => `/store/grouped-listings/${id}/edit`,
    STORE_CATEGORIES: "/store/categories",
    STORE_CATEGORIES_NEW: "/store/categories/new",
    STORE_CATEGORIES_EDIT: (id: string) => `/store/categories/${id}/edit`,
    LISTING_TEMPLATES: "/store/listing-templates",
    LISTING_TEMPLATES_NEW: "/store/listing-templates/new",
    LISTING_TEMPLATES_EDIT: (id: string) => `/store/listing-templates/${id}/edit`,
    GOOGLE_REVIEWS: "/store/google-reviews",
    // GD1–GD6 — Store Guide Hub + sub-pages
    GUIDE: "/store/guide",
    GUIDE_LISTINGS: "/store/guide/listings",
    GUIDE_ORDERS: "/store/guide/orders",
    GUIDE_FINANCE: "/store/guide/finance",
    GUIDE_CAPABILITIES: "/store/guide/capabilities",
    GUIDE_SETTINGS: "/store/guide/settings",
    GUIDE_WHATSAPP: "/store/guide/whatsapp",
  },
  ADMIN: {
    DASHBOARD: "/admin/dashboard",
    /**
     * The sectioned landing at `/admin` — what used to `redirect()` to
     * `DASHBOARD`.
     *
     * 🛑 `DASHBOARD` is `/admin/dashboard` and stays a separate page: it is the
     * metrics screen, and the sidebar's "Dashboard" entry points at it. This
     * key is the index that lists the twelve sections. Collapsing the two would
     * either bury the metrics or make the index unreachable.
     */
    HOME: "/admin",
    /** A dashboard SECTION hub — see `USER.SECTION` for the derivation. */
    SECTION: (slug: string) => `/admin/sections/${slug}`,
    SHIPMENTS: "/admin/shipments",
    /*
     * 🛑 There is deliberately NO `INVENTORY: "/admin/inventory"` key.
     *
     * I added one and never built the page behind it, and nothing ever
     * referenced it — `audit-dead-route-key` caught it. A ROUTES key is a
     * promise, and the two real surfaces (`INVENTORY_BOXES`,
     * `INVENTORY_MOVEMENTS`) each carry their own nav entry, so an index page
     * would be a third place to list the same two links. Build it only when
     * there is a third child worth grouping.
     */
    INVENTORY_BOXES: "/admin/inventory/boxes",
    INVENTORY_BOX_DETAIL: (id: string) => `/admin/inventory/boxes/${id}`,
    /*
     * 🛑 Must sit BEFORE nothing and resolve independently of
     * `INVENTORY_BOX_DETAIL` — `/admin/inventory/boxes/labels` and
     * `/admin/inventory/boxes/{id}` share a segment, so Next's static-beats-
     * dynamic precedence is what keeps `labels` from being read as a box id.
     * That precedence is the framework's, not ours, but it means a box may
     * never be registered with the code `labels`: its id would be
     * `storagebox-labels`, so there is no collision in practice, and this note
     * exists so nobody "fixes" the route by renaming it.
     */
    INVENTORY_BOX_LABELS: "/admin/inventory/boxes/labels",
    INVENTORY_MOVEMENTS: "/admin/inventory/movements",
    SHIPMENT_RECEIVE: (id: string) => `/admin/shipments/${id}/receive`,
    SHIPMENTS_NEW: "/admin/shipments/new",
    SHIPMENTS_EDIT: (id: string) => `/admin/shipments/${id}/edit`,
    SHIPMENT_LOT_ITEMS: (id: string, lotId: string) => `/admin/shipments/${id}/lots/${lotId}/items`,
    SHIPMENTS_PROJECTIONS: "/admin/shipments/projections",
    CATALOGUE_APPROVALS: "/admin/catalogue-approvals",
    USERS: "/admin/users",
    USER_DETAIL: (id: string) => `/admin/users/${id}`,
    USER_EDIT: (id: string) => `/admin/users/${id}/edit`,
    SITE: "/admin/site",
    /*
     * The integration kill switches — its OWN page, not a Site Settings tab.
     *
     * A switch that stops money has to be findable without hunting a tab
     * strip, and this is the one surface where all four are visible together
     * (which matters, because their off-states are not comparable: three stop
     * something and one selects a working alternative).
     */
    INTEGRATIONS: "/admin/integrations",
    CAROUSEL: "/admin/carousel",
    CAROUSEL_NEW: "/admin/carousel/new",
    CAROUSEL_EDIT: (id: string) => `/admin/carousel/${id}/edit`,
    CAROUSELS: "/admin/carousels",
    CAROUSEL_DETAIL: (id: string) => `/admin/carousels/${id}`,
    /*
     * 🛑 PLURAL = the named carousel GROUP. Singular `CAROUSEL_NEW` /
     * `CAROUSEL_EDIT` above are `/admin/carousel/*` and mean a SLIDE.
     * Two different entities, one letter apart — do not merge them.
     */
    CAROUSELS_NEW: "/admin/carousels/new",
    CAROUSELS_EDIT: (id: string) => `/admin/carousels/${id}/edit`,
    SECTIONS: "/admin/sections",
    NAVIGATION: "/admin/navigation",
    /*
     * The action index (W7 / D7) — one control plane for every page, setting
     * and toggle a user can reach. It supersedes NAVIGATION and
     * SETTINGS_NAVIGATION, neither of whose data ever reached a sidebar:
     * `filterNavItems` short-circuits on a missing `id`, and no nav item had
     * one until W6.
     */
    ACTION_INDEX: "/admin/action-index",
    NAVIGATION_NEW: "/admin/navigation/new",
    NAVIGATION_EDIT: (id: string) => `/admin/navigation/${id}/edit`,
    CATEGORIES: "/admin/categories",
    CATEGORIES_NEW: "/admin/categories/new",
    CATEGORIES_EDIT: (id: string) => `/admin/categories/${id}/edit`,
    /*
     * The two GENERATED reference databases — 2,488 parts and 1,988 beys.
     *
     * 🛑 THERE IS NO `PARTS_NEW` / `BEYS_NEW`, and that absence is the
     * design. Both collections are produced by committed generators from a
     * crawled corpus; a row created by hand would have no source, would not
     * survive a regeneration, and would sit in a dataset whose whole value is
     * that it reproduces from `appkit/src/seed/` alone. Admin may CORRECT and
     * REMOVE a row — the two operations a wrong extraction needs — and adding
     * one is a change to the generator.
     *
     * `audit-nav-page-wiring` is strict-zero on a route key with no page, so
     * a key added here without its folder is a build failure, not a 404.
     */
    PARTS: "/admin/parts",
    PARTS_EDIT: (id: string) => `/admin/parts/${id}/edit`,
    BEYS: "/admin/beys",
    BEYS_EDIT: (id: string) => `/admin/beys/${id}/edit`,
    BRANDS: "/admin/brands",
    BRANDS_NEW: "/admin/brands/new",
    BRANDS_EDIT: (id: string) => `/admin/brands/${id}/edit`,
    FAQS: "/admin/faqs",
    FAQS_NEW: "/admin/faqs/new",
    FAQS_EDIT: (id: string) => `/admin/faqs/${id}/edit`,
    TESTER_CHECKLIST: "/admin/tester-checklist",
    TESTER_CHECKLIST_NEW: "/admin/tester-checklist/new",
    TESTER_CHECKLIST_EDIT: (id: string) => `/admin/tester-checklist/${id}/edit`,
    TESTER_FEEDBACK: "/admin/tester-feedback",
    REVIEWS: "/admin/reviews",
    COUPONS: "/admin/coupons",
    COUPONS_NEW: "/admin/coupons/new",
    COUPONS_EDIT: (id: string) => `/admin/coupons/${id}/edit`,
    MEDIA: "/admin/media",
    PRODUCTS: "/admin/products",
    PRODUCTS_NEW: "/admin/products/new",
    PRODUCTS_EDIT: (id: string) => `/admin/products/${id}/edit`,
    CLASSIFIED: "/admin/classified",
    DIGITAL_CODES: "/admin/digital-codes",
    LIVE: "/admin/live",
    // EMI/art-stickers session — art / stickers
    ART: "/admin/art",
    STICKERS: "/admin/stickers",
    // Part Two — spares
    SPARES: "/admin/spares",
    GROUPED_LISTINGS: "/admin/grouped-listings",
    GROUPED_LISTINGS_NEW: "/admin/grouped-listings/new",
    GROUPED_LISTINGS_EDIT: (id: string) => `/admin/grouped-listings/${id}/edit`,
    DEALS: "/admin/deals",
    FEATURED: "/admin/featured",
    ORDERS: "/admin/orders",
    ORDER_DETAIL: (id: string) => `/admin/orders/${id}/view`,
    BIDS: "/admin/bids",
    BID_DETAIL: (id: string) => `/admin/bids/${id}/view`,
    OFFERS: "/admin/offers",
    BLOG: "/admin/blog",
    BLOG_NEW: "/admin/blog/new",
    BLOG_EDIT: (id: string) => `/admin/blog/${id}/edit`,
    ANALYTICS: "/admin/analytics",
    PAYOUTS: "/admin/payouts",
    PAYOUT_DETAIL: (id: string) => `/admin/payouts/${id}/view`,
    PRICING: "/admin/pricing",
    AUDIT_LOG: "/admin/audit-log",
    /*
     * 🛑 MONEY_CASES is deliberately NOT under `/admin/maintenance/`.
     *
     * Maintenance means "something broke, look when you can" and is granted to
     * `maintenance_employee`. A payment case can carry a gateway's own
     * `respond_by`: miss it and the chargeback is lost by default whoever was
     * right. Burying that beside Cloud Logs is how a deadline is missed, so it
     * gets its own section and an admin-only permission.
     *
     * Gateway events and obligations DO belong under maintenance — they are
     * diagnostics with no external clock, and the cases they produce are what
     * carries urgency.
     */
    MONEY_CASES: "/admin/money-cases",
    MONEY_CASE_DETAIL: (id: string) => `/admin/money-cases/${id}`,
    /**
     * Phase 7 — the GSTR-1 draft export.
     *
     * 🛑 Under Finance for the same reason `MONEY_CASES` is, and the reason is
     * stronger here: the export contains the company's tax position for a
     * quarter plus every buyer's place of supply. That is not a maintenance
     * diagnostic, and it is admin-only — deliberately not granted to
     * `maintenance_employee`.
     */
    INVOICING: "/admin/invoicing",
    PROTECTION_CLAIMS: "/admin/protection-claims",
    MAINTENANCE_GATEWAY_EVENTS: "/admin/maintenance/gateway-events",
    MAINTENANCE_OBLIGATIONS: "/admin/maintenance/obligations",
    EVENTS: "/admin/events",
    EVENTS_NEW: "/admin/events/new",
    EVENTS_EDIT: (id: string) => `/admin/events/${id}/edit`,
    EVENT_ENTRIES: (id: string) => `/admin/events/${id}/entries`,
    STORES: "/admin/stores",
    STORE_DETAIL: (id: string) => `/admin/stores/${id}/view`,
    ADS: "/admin/ads",
    ADS_NEW: "/admin/ads/new",
    ADS_EDIT: (id: string) => `/admin/ads/${id}/edit`,
    /** D56 — the self-serve creative moderation queue. */
    AD_BOOKINGS: "/admin/ads/bookings",
    NEWSLETTER: "/admin/newsletter",
    CONTACT: "/admin/contact",
    SESSIONS: "/admin/sessions",
    ALL_EVENT_ENTRIES: "/admin/event-entries",
    EVENT_ENTRY_DETAIL: (id: string) => `/admin/event-entries/${id}/view`,
    NOTIFICATIONS: "/admin/notifications",
    CARTS: "/admin/carts",
    WISHLISTS: "/admin/wishlists",
    HISTORY: "/admin/history",
    RETURN_REQUESTS: "/admin/return-requests",
    STORE_ADDRESSES: "/admin/store-addresses",
    ADDRESSES: "/admin/addresses",
    ADDRESSES_NEW: "/admin/addresses/new",
    ADDRESSES_EDIT: (id: string) => `/admin/addresses/${id}/edit`,
    SUBLISTING_CATEGORIES: "/admin/sublisting-categories",
    SUBLISTING_CATEGORIES_NEW: "/admin/sublisting-categories/new",
    SUBLISTING_CATEGORIES_EDIT: (id: string) => `/admin/sublisting-categories/${id}/edit`,
    FEATURES: "/admin/features",
    TAX_CODES: "/admin/tax-codes",
    FEATURES_NEW: "/admin/features/new",
    FEATURES_EDIT: (id: string) => `/admin/features/${id}/edit`,
    // SB1-J — bundles + prize draws (admin moderation)
    // S-SBUNI-4 — BUNDLES_NEW added alongside BUNDLES_EDIT.
    BUNDLES: "/admin/bundles",
    BUNDLES_NEW: "/admin/bundles/new",
    BUNDLES_EDIT: (id: string) => `/admin/bundles/${id}/edit`,
    PRIZE_DRAWS: "/admin/prize-draws",
    PRIZE_DRAWS_EDIT: (id: string) => `/admin/prize-draws/${id}/edit`,
    PRIZE_DRAWS_ENTRIES: (id: string) => `/admin/prize-draws/${id}/entries`,
    LOTTERIES: "/admin/lotteries",
    /*
     * Slot configuration only. A lottery EVENT (title, dates, status, media)
     * is created through the ordinary event editor — `LotteryAdminEditView`
     * has no fields for any of those, so treating it as the whole create
     * flow would produce a lottery with no dates, and the draw window is
     * measured from them.
     */
    LOTTERY_CONFIG: (id: string) => `/admin/lotteries/${id}/edit`,
    LOTTERY_ENTRIES: (id: string) => `/admin/lotteries/${id}/entries`,
    TEAM: "/admin/team",
    TEAM_NEW: "/admin/team/new",
    TEAM_EDIT: (id: string) => `/admin/team/${id}/edit`,
    SUPPORT_TICKETS: "/admin/support-tickets",
    /** Staff curation of the reasons a buyer can pick when disputing. */
    DISPUTE_REASONS: "/admin/dispute-reasons",
    SUPPORT_TICKET_BY_ID: (id: string) => `/admin/support-tickets/${id}`,
    SCAMMERS: "/admin/scammers",
    SCAMMER_BY_ID: (id: string) => `/admin/scammers/${id}`,
    SETTINGS_ACTIONS: "/admin/settings/actions",
    SETTINGS_NAVIGATION: "/admin/settings/navigation",
    PRINT_CENTER: "/admin/print-center",
    MAINTENANCE: "/admin/maintenance",
    FULFILLMENT: "/admin/fulfillment",
    // S-STORE Tier — admin moderation + reports + item requests
    MODERATION: "/admin/moderation",
    MODERATION_DETAIL: (id: string) => `/admin/moderation/${id}`,
    REPORTS: "/admin/reports",
    REPORT_DETAIL: (id: string) => `/admin/reports/${id}`,
    ITEM_REQUESTS: "/admin/item-requests",
    ITEM_REQUEST_DETAIL: (id: string) => `/admin/item-requests/${id}`,
    ROLES: "/admin/roles",
    ROLES_NEW: "/admin/roles/new",
    ROLES_EDIT: (id: string) => `/admin/roles/${id}/edit`,
    PERMISSIONS: "/admin/permissions",
    ADMIN_NOTIFICATIONS: "/admin/admin-notifications",
    // GD13–GD22 — Admin Guide Hub + sub-pages
    GUIDE: "/admin/guide",
    GUIDE_USERS: "/admin/guide/users",
    GUIDE_CATALOG: "/admin/guide/catalog",
    GUIDE_STORES: "/admin/guide/stores",
    GUIDE_ORDERS: "/admin/guide/orders",
    GUIDE_CONTENT: "/admin/guide/content",
    GUIDE_SITE: "/admin/guide/site",
    GUIDE_TEAM: "/admin/guide/team",
    GUIDE_ANALYTICS: "/admin/guide/analytics",
    GUIDE_TRUST: "/admin/guide/trust",
    GUIDE_WHATSAPP: "/admin/guide/whatsapp",
    GUIDE_PAYMENTS: "/admin/guide/payments",
    BANNED_ADDRESSES: "/admin/banned-addresses",
    ADDRESS_CLUSTERS: "/admin/address-clusters",
    PAYMENT_METHODS: "/admin/payment-methods",
    PAYMENT_METHODS_CLUSTERS: "/admin/payment-methods/clusters",
  },
  BLOG: {
    LIST: "/blog",
    ARTICLE: (slug: string) => `/blog/${slug}`,
  },
} as const satisfies RouteMap;

export function createRouteMap(overrides: Partial<RouteMap> = {}): RouteMap {
  return {
    ...DEFAULT_ROUTE_MAP,
    ...overrides,
    PUBLIC: {
      ...DEFAULT_ROUTE_MAP.PUBLIC,
      ...(overrides.PUBLIC ?? {}),
    },
    ERRORS: {
      ...DEFAULT_ROUTE_MAP.ERRORS,
      ...(overrides.ERRORS ?? {}),
    },
    AUTH: {
      ...DEFAULT_ROUTE_MAP.AUTH,
      ...(overrides.AUTH ?? {}),
    },
    USER: {
      ...DEFAULT_ROUTE_MAP.USER,
      ...(overrides.USER ?? {}),
    },
    STORE: {
      ...DEFAULT_ROUTE_MAP.STORE,
      ...(overrides.STORE ?? {}),
    },
    ADMIN: {
      ...DEFAULT_ROUTE_MAP.ADMIN,
      ...(overrides.ADMIN ?? {}),
    },
    BLOG: {
      ...DEFAULT_ROUTE_MAP.BLOG,
      ...(overrides.BLOG ?? {}),
    },
  };
}

export const ROUTES = DEFAULT_ROUTE_MAP;

/** @deprecated Use ROUTES.STORE instead */
export const SELLER_ROUTES = ROUTES.STORE;

export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.PUBLIC.FAQS as string,
  ROUTES.PUBLIC.PRODUCTS as string,
  ROUTES.PUBLIC.AUCTIONS as string,
  ROUTES.PUBLIC.PRE_ORDERS as string,
  ROUTES.PUBLIC.SELLERS as string,
  ROUTES.PUBLIC.STORES as string,
  ROUTES.PUBLIC.CATEGORIES as string,
  ROUTES.PUBLIC.SEARCH as string,
  ROUTES.PUBLIC.PROMOTIONS as string,
  ROUTES.PUBLIC.ABOUT as string,
  ROUTES.PUBLIC.CONTACT as string,
  ROUTES.BLOG.LIST as string,
  ROUTES.PUBLIC.HELP as string,
  /* Unauthenticated BY NECESSITY: an attribution a reader must sign in to see
   * is not attribution. Same reasoning as the grievance-officer entry below. */
  ROUTES.PUBLIC.CREDITS as string,
  ROUTES.PUBLIC.TERMS as string,
  ROUTES.PUBLIC.PRIVACY as string,
  ROUTES.PUBLIC.ETHICS as string,
  ROUTES.PUBLIC.CODE_OF_CONDUCT as string,
  ROUTES.PUBLIC.CANCELLATION_POLICY as string,
  // Public by necessity: a grievance officer a complainant must sign in to
  // find is not a published disclosure.
  ROUTES.PUBLIC.GRIEVANCE as string,
  ROUTES.ERRORS.UNAUTHORIZED,
  ROUTES.AUTH.LOGIN,
  ROUTES.AUTH.REGISTER,
  ROUTES.AUTH.FORGOT_PASSWORD,
  ROUTES.AUTH.RESET_PASSWORD,
  ROUTES.AUTH.VERIFY_EMAIL,
] as const;

export const PROTECTED_ROUTES = [
  ROUTES.USER.PROFILE as string,
  ROUTES.USER.SETTINGS as string,
  ROUTES.USER.ORDERS as string,
  ROUTES.USER.ADDRESSES as string,
  // Was ADDRESSES_ADD, a deprecated alias resolving to the same path. Swapped
  // rather than dropped: deleting the alias without this would have removed
  // /user/addresses/new from the protected set entirely.
  ROUTES.USER.ADDRESSES_NEW as string,
  ROUTES.USER.NOTIFICATIONS as string,
  ROUTES.USER.CART as string,
] as const;

export const AUTH_ROUTES = [ROUTES.AUTH.LOGIN, ROUTES.AUTH.REGISTER] as const;
