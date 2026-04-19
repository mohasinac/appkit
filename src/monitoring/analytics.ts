import {
  getAnalytics,
  isSupported,
  logEvent,
  setUserId,
  setUserProperties,
  type Analytics,
} from "firebase/analytics";
import { logger } from "../core/Logger";

let analytics: Analytics | null = null;
let analyticsEnabled = false;
let ecommerceCurrency = "USD";

export const ANALYTICS_EVENTS = {
  PAGE_VIEW: "page_view",
  LOGIN: "login",
  SIGN_UP: "sign_up",
  LOGOUT: "logout",
  VIEW_ITEM: "view_item",
  ADD_TO_CART: "add_to_cart",
  PURCHASE: "purchase",
  PLACE_BID: "place_bid",
  WIN_AUCTION: "win_auction",
  SEARCH: "search",
  VIEW_FAQ: "view_faq",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export async function initializeAnalytics(params: {
  app: unknown;
  enabled?: boolean;
  currency?: string;
}): Promise<void> {
  analyticsEnabled = params.enabled ?? true;
  if (params.currency) {
    ecommerceCurrency = params.currency;
  }

  if (!analyticsEnabled) return;

  try {
    const supported = await isSupported();
    if (!supported) return;
    analytics = getAnalytics(params.app as never);
  } catch (error) {
    analytics = null;
    logger.warn("Firebase Analytics disabled", { error });
  }
}

export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, unknown>,
): void => {
  if (!analytics || !analyticsEnabled) return;

  try {
    logEvent(analytics, eventName, eventParams);
  } catch (error) {
    logger.error(`Failed to log event ${eventName}`, { error });
  }
};

export const setAnalyticsUserId = (userId: string | null): void => {
  if (!analytics || !analyticsEnabled) return;

  try {
    setUserId(analytics, userId);
  } catch (error) {
    logger.error("Failed to set user ID", { error });
  }
};

export const setAnalyticsUserProperties = (
  properties: Record<string, string | number | boolean>,
): void => {
  if (!analytics || !analyticsEnabled) return;

  try {
    setUserProperties(analytics, properties);
  } catch (error) {
    logger.error("Failed to set user properties", { error });
  }
};

export const trackPageView = (page_path: string, page_title: string): void => {
  trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
    page_path,
    page_title,
  });
};

export const trackAuth = {
  login: (method: "email" | "google" | "apple") => {
    trackEvent(ANALYTICS_EVENTS.LOGIN, { method });
  },

  register: (method: "email" | "google" | "apple") => {
    trackEvent(ANALYTICS_EVENTS.SIGN_UP, { method });
  },

  logout: () => {
    trackEvent(ANALYTICS_EVENTS.LOGOUT);
  },
};

export const trackEcommerce = {
  viewProduct: (product: {
    id: string;
    name: string;
    category: string;
    price: number;
    currency?: string;
  }) => {
    const currency = product.currency ?? ecommerceCurrency;
    trackEvent(ANALYTICS_EVENTS.VIEW_ITEM, {
      currency,
      value: product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
        },
      ] as Array<Record<string, unknown>>,
    });
  },

  addToCart: (product: {
    id: string;
    name: string;
    category: string;
    price: number;
    quantity: number;
    currency?: string;
  }) => {
    const currency = product.currency ?? ecommerceCurrency;
    trackEvent(ANALYTICS_EVENTS.ADD_TO_CART, {
      currency,
      value: product.price * product.quantity,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
          quantity: product.quantity,
        },
      ] as Array<Record<string, unknown>>,
    });
  },

  purchase: (order: {
    id: string;
    total: number;
    tax?: number;
    shipping?: number;
    currency?: string;
    items: Array<{
      id: string;
      name: string;
      category: string;
      price: number;
      quantity: number;
    }>;
  }) => {
    const currency = order.currency ?? ecommerceCurrency;
    trackEvent(ANALYTICS_EVENTS.PURCHASE, {
      transaction_id: order.id,
      currency,
      value: order.total,
      tax: order.tax || 0,
      shipping: order.shipping || 0,
      items: order.items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: item.quantity,
      })) as Array<Record<string, unknown>>,
    });
  },

  placeBid: (product: { id: string; name: string; bidAmount: number }) => {
    trackEvent(ANALYTICS_EVENTS.PLACE_BID, {
      product_id: product.id,
      product_name: product.name,
      bid_amount: product.bidAmount,
    });
  },

  winAuction: (product: { id: string; name: string; finalBid: number }) => {
    trackEvent(ANALYTICS_EVENTS.WIN_AUCTION, {
      product_id: product.id,
      product_name: product.name,
      final_bid: product.finalBid,
    });
  },
};

export const trackContent = {
  search: (searchTerm: string, resultsCount: number) => {
    trackEvent(ANALYTICS_EVENTS.SEARCH, {
      search_term: searchTerm,
      results_count: resultsCount,
    });
  },

  viewFaq: (faqId: string, question: string) => {
    trackEvent(ANALYTICS_EVENTS.VIEW_FAQ, {
      faq_id: faqId,
      question,
    });
  },
};

export const trackForm = {
  submit: (formName: string) => {
    trackEvent("form_submit", { form_name: formName });
  },
};

export const trackAdmin = {
  action: (action: string, target: string) => {
    trackEvent("admin_action", { action, target });
  },
};
