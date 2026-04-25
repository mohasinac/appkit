export type RoutePath = string | ((...args: string[]) => string);

export interface RouteMap {
  HOME: string;
  PUBLIC: Record<string, RoutePath>;
  ERRORS: Record<string, string>;
  AUTH: Record<string, string>;
  USER: Record<string, RoutePath>;
  SELLER: Record<string, RoutePath>;
  ADMIN: Record<string, RoutePath>;
  DEMO: Record<string, RoutePath>;
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
    PRE_ORDER_DETAIL: (id: string) => `/pre-orders/${id}`,
    SELLERS: "/sellers",
    SELLER_DETAIL: (id: string) => `/sellers/${id}`,
    STORES: "/stores",
    STORE_DETAIL: (storeSlug: string) => `/stores/${storeSlug}`,
    STORE_PRODUCTS: (storeSlug: string) => `/stores/${storeSlug}/products`,
    STORE_AUCTIONS: (storeSlug: string) => `/stores/${storeSlug}/auctions`,
    STORE_REVIEWS: (storeSlug: string) => `/stores/${storeSlug}/reviews`,
    STORE_ABOUT: (storeSlug: string) => `/stores/${storeSlug}/about`,
    CATEGORIES: "/categories",
    CATEGORY_DETAIL: (slug: string) => `/categories/${slug}`,
    REVIEWS: "/reviews",
    SEARCH: "/search",
    PROMOTIONS: "/promotions",
    ABOUT: "/about",
    CONTACT: "/contact",
    BLOG: "/blog",
    HELP: "/help",
    TERMS: "/terms",
    PRIVACY: "/privacy",
    SECURITY: "/security",
    TRACK_ORDER: "/track",
    SELLER_GUIDE: "/seller-guide",
    COOKIE_POLICY: "/cookies",
    REFUND_POLICY: "/refund-policy",
    SHIPPING_POLICY: "/shipping-policy",
    HOW_AUCTIONS_WORK: "/how-auctions-work",
    HOW_PRE_ORDERS_WORK: "/how-pre-orders-work",
    HOW_OFFERS_WORK: "/how-offers-work",
    HOW_CHECKOUT_WORKS: "/how-checkout-works",
    HOW_ORDERS_WORK: "/how-orders-work",
    HOW_REVIEWS_WORK: "/how-reviews-work",
    HOW_PAYOUTS_WORK: "/how-payouts-work",
    FEES: "/fees",
    EVENTS: "/events",
    EVENT_DETAIL: (id: string) => `/events/${id}`,
    EVENT_PARTICIPATE: (id: string) => `/events/${id}/participate`,
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
    PROFILE: "/user/profile",
    SETTINGS: "/user/settings",
    ORDERS: "/user/orders",
    WISHLIST: "/user/wishlist",
    ADDRESSES: "/user/addresses",
    ADDRESSES_ADD: "/user/addresses/add",
    ADDRESSES_EDIT: (id: string) => `/user/addresses/edit/${id}`,
    ORDER_DETAIL: (id: string) => `/user/orders/view/${id}`,
    ORDER_TRACK: (id: string) => `/user/orders/${id}/track`,
    NOTIFICATIONS: "/user/notifications",
    MESSAGES: "/user/messages",
    BECOME_SELLER: "/user/become-seller",
    CART: "/cart",
    CHECKOUT: "/checkout",
    CHECKOUT_SUCCESS: "/checkout/success",
    OFFERS: "/user/offers",
  },
  SELLER: {
    DASHBOARD: "/seller",
    PRODUCTS: "/seller/products",
    PRODUCTS_NEW: "/seller/products/new",
    PRODUCTS_EDIT: (id: string) => `/seller/products/${id}/edit`,
    ORDERS: "/seller/orders",
    AUCTIONS: "/seller/auctions",
    PRE_ORDERS: "/seller/pre-orders",
    ANALYTICS: "/seller/analytics",
    PAYOUTS: "/seller/payouts",
    STORE: "/seller/store",
    SHIPPING: "/seller/shipping",
    PAYOUT_SETTINGS: "/seller/payout-settings",
    ADDRESSES: "/seller/addresses",
    COUPONS: "/seller/coupons",
    COUPONS_NEW: "/seller/coupons/new",
    OFFERS: "/seller/offers",
  },
  ADMIN: {
    DASHBOARD: "/admin/dashboard",
    USERS: "/admin/users",
    SITE: "/admin/site",
    CAROUSEL: "/admin/carousel",
    SECTIONS: "/admin/sections",
    NAVIGATION: "/admin/navigation",
    CATEGORIES: "/admin/categories",
    FAQS: "/admin/faqs",
    REVIEWS: "/admin/reviews",
    COUPONS: "/admin/coupons",
    MEDIA: "/admin/media",
    PRODUCTS: "/admin/products",
    ORDERS: "/admin/orders",
    BIDS: "/admin/bids",
    BLOG: "/admin/blog",
    ANALYTICS: "/admin/analytics",
    PAYOUTS: "/admin/payouts",
    EVENTS: "/admin/events",
    EVENT_ENTRIES: (id: string) => `/admin/events/${id}/entries`,
    STORES: "/admin/stores",
    FEATURE_FLAGS: "/admin/feature-flags",
    COPILOT: "/admin/copilot",
    ADS: "/admin/ads",
  },
  DEMO: {
    SEED: "/demo/seed",
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
    SELLER: {
      ...DEFAULT_ROUTE_MAP.SELLER,
      ...(overrides.SELLER ?? {}),
    },
    ADMIN: {
      ...DEFAULT_ROUTE_MAP.ADMIN,
      ...(overrides.ADMIN ?? {}),
    },
    DEMO: {
      ...DEFAULT_ROUTE_MAP.DEMO,
      ...(overrides.DEMO ?? {}),
    },
    BLOG: {
      ...DEFAULT_ROUTE_MAP.BLOG,
      ...(overrides.BLOG ?? {}),
    },
  };
}

export const ROUTES = DEFAULT_ROUTE_MAP;

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
  ROUTES.PUBLIC.BLOG as string,
  ROUTES.PUBLIC.HELP as string,
  ROUTES.PUBLIC.TERMS as string,
  ROUTES.PUBLIC.PRIVACY as string,
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
  ROUTES.USER.WISHLIST as string,
  ROUTES.USER.ADDRESSES as string,
  ROUTES.USER.ADDRESSES_ADD as string,
  ROUTES.USER.NOTIFICATIONS as string,
  ROUTES.USER.CART as string,
] as const;

export const AUTH_ROUTES = [ROUTES.AUTH.LOGIN, ROUTES.AUTH.REGISTER] as const;
