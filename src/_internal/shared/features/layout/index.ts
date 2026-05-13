/** Layout feature — shared types + config barrel. */

export type {
  LayoutBreakpoint,
  DashboardVariant,
  LayoutRole,
  SidebarNavItem,
  SidebarNavGroup,
  MainNavItem,
  BrandingConfig,
  FooterLinkGroup,
  FooterTrustBarItem,
  FooterSocialLink,
  FooterConfig,
  SectionResponsive,
  SectionTheming,
  LayoutConfig,
  DashboardLayoutConfig,
} from "./types";

export {
  SIDE_DRAWER_WIDTH,
  DASHBOARD_SIDEBAR_WIDTH,
  DASHBOARD_ACCENT_CLASSES,
  hideAtClass,
  showAtClass,
  BOTTOM_NAV_CONTENT_PADDING,
  HEADER_HEIGHT_CSS_VAR,
  DASHBOARD_DESKTOP_BREAKPOINT_PX,
  DASHBOARD_DESKTOP_MEDIA_QUERY,
} from "./config";
