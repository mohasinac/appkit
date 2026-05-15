/**
 * Layout feature — shared types.
 *
 * These types describe the pure-data configuration surfaces for every layout
 * section. They are framework-agnostic; consumers pass them into server or
 * client section components as props.
 *
 * Three-layer override contract (see CLAUDE.md SSR Architecture §Encapsulation):
 *  1. Config props (this file's types).
 *  2. render-prop slots on each section (defined on the section component itself).
 *  3. Section replacement via AppShell named slots.
 */

import type { ReactNode } from "react";

/** Tailwind breakpoint keys used by responsive visibility props. */
export type LayoutBreakpoint = "sm" | "md" | "lg" | "xl";

/** A discriminator for the three dashboard surfaces. Drives accent colour + sidebar component selection. */
export type DashboardVariant = "admin" | "store" | "user";

/** Role tokens recognised by RoleGuard (mirrors appkit's UserRole). */
export type LayoutRole = "admin" | "seller" | "moderator" | "employee" | "user";

/** Single sidebar/nav link. */
export interface SidebarNavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
  /**
   * Stable nav-* slug used as the key in siteSettings.navConfig.
   * If absent, item is always visible (no admin toggle, no permission check).
   */
  id?: string;
  /** RBAC permission key — item only shows to users with this permission. */
  requiredPermission?: string;
}

/** Sidebar group with title + items + default-open state. */
export interface SidebarNavGroup {
  title: string;
  items: SidebarNavItem[];
  defaultOpen?: boolean;
}

/** Top-level main-nav item (horizontal nav, ≥lg). */
export interface MainNavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  /** Translation key (consumer fills in `label` at render time via t(key)). */
  key?: string;
  /** Stable nav-* slug used as the key in siteSettings.navConfig. */
  id?: string;
  /** RBAC permission key — item only shows to users with this permission. */
  requiredPermission?: string;
}

/** Branding config — propagated to TitleBar / Footer / mobile chrome. */
export interface BrandingConfig {
  name: string;
  shortName?: string;
  description?: string;
  logoUrl?: string;
  logoHref?: string;
  copyrightText?: string;
  madeInText?: string;
}

/** Footer config (used by FooterServer + the existing FooterLayout). */
export interface FooterLinkGroup {
  title: string;
  links: { href: string; label: string }[];
}
export interface FooterTrustBarItem {
  icon?: ReactNode;
  label: string;
  description?: string;
}
export interface FooterSocialLink {
  href: string;
  label: string;
  icon?: ReactNode;
}
export interface FooterConfig {
  branding: Pick<BrandingConfig, "name" | "description" | "copyrightText" | "madeInText">;
  linkGroups: FooterLinkGroup[];
  trustBarItems?: FooterTrustBarItem[];
  socialLinks?: FooterSocialLink[];
  bottomLinks?: { href: string; label: string }[];
  showTrustBar?: boolean;
  tone?: "dark" | "light" | "match";
}

/** Section-level responsive controls — every section accepts these. */
export interface SectionResponsive {
  hideAt?: LayoutBreakpoint;
  showAt?: LayoutBreakpoint;
  compactAt?: LayoutBreakpoint;
}

/** Section-level theming knobs — every section accepts these. */
export interface SectionTheming {
  /** Surface variant. Each section interprets these in its own way. */
  variant?: "default" | "transparent" | "elevated" | "muted" | "subtle";
  /** Accent token override (resolves to --appkit-color-<accent>). */
  accent?: "primary" | "secondary" | "success" | "warning" | "danger";
  /** Background variant for shell-level backgrounds. */
  backgroundVariant?: "default" | "muted" | "subtle";
  /** Free-form className to merge with the section's root. */
  className?: string;
}

/** Top-level layout config (public surface). */
export interface LayoutConfig {
  branding: BrandingConfig;
  mainNav: { items: MainNavItem[]; hiddenAt?: LayoutBreakpoint };
  sideDrawer?: {
    title?: string;
    sections: SidebarNavGroup[];
    width?: "sm" | "md" | "lg";
    position?: "left" | "right";
  };
  footer: FooterConfig;
  bottomNav?: {
    items: SidebarNavItem[];
  };
  /** Admin-overridable theme tokens (CSS variables) — written to :root / .dark by the server scaffold. */
  theme?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    primaryDark?: string;
    secondaryDark?: string;
    accentDark?: string;
  };
}

/** Per-dashboard layout config. */
export interface DashboardLayoutConfig {
  variant: DashboardVariant;
  role: LayoutRole | LayoutRole[];
  groups: SidebarNavGroup[];
  /** Path resolution for active-link highlight. */
  activeHref?: string;
  /** Optional rail collapse behaviour. */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  responsive?: SectionResponsive;
  theming?: SectionTheming;
}
