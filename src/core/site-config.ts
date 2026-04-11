import { ROUTES } from "../next/routing/route-map";

export interface RuntimeSiteConfig {
  brand: {
    name: string;
    shortName: string;
    logoUrl: string;
    logoAlt: string;
    tagline: string;
  };
  nav: Record<string, string>;
  social: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
  };
  account: Record<string, string>;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
}

export const SITE_CONFIG: RuntimeSiteConfig = {
  brand: {
    name: "App",
    shortName: "APP",
    logoUrl: "/logo.png",
    logoAlt: "Application Logo",
    tagline: "Built with AppKit",
  },
  nav: {
    home: ROUTES.HOME,
    products: ROUTES.PUBLIC.PRODUCTS as string,
    auctions: ROUTES.PUBLIC.AUCTIONS as string,
    preOrders: ROUTES.PUBLIC.PRE_ORDERS as string,
    sellers: ROUTES.PUBLIC.SELLERS as string,
    stores: ROUTES.PUBLIC.STORES as string,
    events: ROUTES.PUBLIC.EVENTS as string,
    blog: ROUTES.PUBLIC.BLOG as string,
    categories: ROUTES.PUBLIC.CATEGORIES as string,
    promotions: ROUTES.PUBLIC.PROMOTIONS as string,
    reviews: ROUTES.PUBLIC.REVIEWS as string,
    about: ROUTES.PUBLIC.ABOUT as string,
    contact: ROUTES.PUBLIC.CONTACT as string,
  },
  social: {
    facebook: "https://facebook.com",
    twitter: "https://twitter.com",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
  },
  account: {
    profile: ROUTES.USER.PROFILE as string,
    settings: ROUTES.USER.SETTINGS as string,
    orders: ROUTES.USER.ORDERS as string,
    wishlist: ROUTES.USER.WISHLIST as string,
    addresses: ROUTES.USER.ADDRESSES as string,
    cart: ROUTES.USER.CART as string,
    login: ROUTES.AUTH.LOGIN,
    register: ROUTES.AUTH.REGISTER,
    forgotPassword: ROUTES.AUTH.FORGOT_PASSWORD,
    verifyEmail: ROUTES.AUTH.VERIFY_EMAIL,
  },
  contact: {
    email: "hello@example.com",
    phone: "+1 000 000 0000",
    address: "Remote",
  },
  seo: {
    title: "App - Powered by AppKit",
    description: "A configurable SSR application foundation.",
    keywords: "ssr, appkit, webapp",
  },
};

export const FEATURE_FLAGS = {
  CHAT_ENABLED: false,
} as const;

export function createSiteConfig(
  overrides: Partial<RuntimeSiteConfig>,
): RuntimeSiteConfig {
  return {
    ...SITE_CONFIG,
    ...overrides,
    brand: { ...SITE_CONFIG.brand, ...overrides.brand },
    nav: { ...SITE_CONFIG.nav, ...overrides.nav },
    social: { ...SITE_CONFIG.social, ...overrides.social },
    account: { ...SITE_CONFIG.account, ...overrides.account },
    contact: { ...SITE_CONFIG.contact, ...overrides.contact },
    seo: { ...SITE_CONFIG.seo, ...overrides.seo },
  };
}

export async function resolveSiteConfig(
  resolver?: () => Promise<Partial<RuntimeSiteConfig>>,
): Promise<RuntimeSiteConfig> {
  if (!resolver) return SITE_CONFIG;
  const dynamicConfig = await resolver();
  return createSiteConfig(dynamicConfig);
}
