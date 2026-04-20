// --- Site Config -------------------------------------------------------------

/**
 * Brand configuration injected into layout/nav shell components.
 * Passed as the `config` prop to NavbarLayout, FooterLayout, etc.
 */
export interface SiteConfig {
  name: string;
  tagline?: string;
  description: string;
  /** Canonical base URL, e.g. "https://example.com" */
  url: string;
  logoUrl: string;
  logoAlt?: string;
  email: {
    /** Address used as the "from" field in transactional emails */
    fromAddress: string;
    supportAddress: string;
  };
  phone?: string;
  address?: string;
  social?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    linkedin?: string;
    whatsapp?: string;
  };
  /** ISO 4217 currency code used site-wide, e.g. "INR" */
  currency?: string;
  /** BCP 47 locale tag for default locale, e.g. "en" */
  defaultLocale?: string;
  /** Supported locales */
  locales?: string[];
}

// --- Navigation ---------------------------------------------------------------

/**
 * A single nav item passed to NavbarLayout / Sidebar / BottomNavbar.
 */
export interface NavItem {
  /** Display label (translation key or literal string) */
  label: string;
  /** Route href */
  href: string;
  /** Icon name / component key */
  icon?: string;
  /** Nested items for dropdown / accordion menus */
  children?: NavItem[];
  /** If true, item is only shown to admin users */
  adminOnly?: boolean;
  /** If true, item is only shown when the user is authenticated */
  authOnly?: boolean;
  /** Open link in a new tab */
  external?: boolean;
}
