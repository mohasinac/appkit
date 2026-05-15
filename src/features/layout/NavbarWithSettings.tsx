"use client";

import { useSiteSettings } from "../../core/hooks/useSiteSettings";
import { filterNavItems } from "../../_internal/client/features/layout/filterNavItems";
import { MainNavbar, type MainNavbarItem } from "./MainNavbar";

export function NavbarWithSettings({
  navItems,
  hiddenNavItems,
  permissions,
}: {
  navItems: MainNavbarItem[];
  hiddenNavItems?: string[];
  permissions?: string[];
}) {
  const { data: siteSettingsData } = useSiteSettings<{ navConfig?: Record<string, { enabled: boolean }> }>();
  const navConfig = (siteSettingsData as { navConfig?: Record<string, { enabled: boolean }> } | undefined)?.navConfig;
  const visibleNavItems = filterNavItems(navItems, navConfig, permissions);
  return <MainNavbar navItems={visibleNavItems} hiddenNavItems={hiddenNavItems} />;
}
