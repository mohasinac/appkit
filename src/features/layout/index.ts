// @mohasinac/feat-layout
// Generic layout shell components for any Next.js project.

export { NavbarLayout } from "./NavbarLayout";
export type { NavbarLayoutProps, NavbarLayoutItem } from "./NavbarLayout";

export { FooterLayout } from "./FooterLayout";
export type {
  FooterLayoutProps,
  FooterLinkGroup,
  FooterSocialLink,
  TrustBarItem,
} from "./FooterLayout";

export { SidebarLayout } from "./SidebarLayout";
export type { SidebarLayoutProps } from "./SidebarLayout";

export { BottomNavLayout } from "./BottomNavLayout";
export type { BottomNavLayoutProps } from "./BottomNavLayout";

export { BottomNavItem } from "./BottomNavItem";
export type { BottomNavItemProps } from "./BottomNavItem";

export { NavItem } from "./NavItem";
export type { NavItemProps } from "./NavItem";

export { BottomSheet } from "./BottomSheet";
export type { BottomSheetProps } from "./BottomSheet";

export { TitleBarLayout } from "./TitleBarLayout";
export type { TitleBarLayoutProps, TitleBarUser } from "./TitleBarLayout";

export { AutoBreadcrumbs } from "./AutoBreadcrumbs";
export type { AutoBreadcrumbsProps } from "./AutoBreadcrumbs";

export { Breadcrumbs, BreadcrumbItem } from "./Breadcrumbs";
export type { BreadcrumbsProps, BreadcrumbItemProps } from "./Breadcrumbs";

export { LocaleSwitcher } from "./LocaleSwitcher";
export type {
  LocaleSwitcherProps,
  LocaleSwitcherOption,
} from "./LocaleSwitcher";

export { BackToTop, SkipToMain } from "./BackToTop";
export type { BackToTopProps } from "./BackToTop";

export { ListingLayout } from "./ListingLayout";
export type { ListingLayoutProps, ListingLayoutLabels } from "./ListingLayout";

export { LayoutClient } from "./LayoutClient";
export type { LayoutClientProps, LayoutProvider } from "./LayoutClient";

export {
  BottomActionsProvider,
  useBottomActionsContext,
} from "./BottomActionsContext";
export type {
  BottomAction,
  BottomBulkConfig,
  BottomActionsState,
} from "./BottomActionsContext";
export { useBottomActions } from "./hooks/useBottomActions";
export type { UseBottomActionsOptions } from "./hooks/useBottomActions";

export { default as BottomActions } from "./BottomActions";
