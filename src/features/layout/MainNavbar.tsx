"use client"
import { usePathname } from "next/navigation";
import { NavbarLayout } from "./NavbarLayout";
import type { NavbarLayoutItem } from "./NavbarLayout";

export interface MainNavbarItem {
  /** Unique key used for filtering */
  key: string;
  /** Route href */
  href: string;
  /** Translated label */
  label: string;
  icon?: React.ReactNode;
  highlighted?: boolean;
}

export interface MainNavbarProps {
  /** Pre-translated nav items to display */
  navItems: MainNavbarItem[];
  /** Keys of items to hide (e.g. when shown in a sub-layout) */
  hiddenNavItems?: string[];
  /** When true, renders the navbar inline instead of sticky */
  inline?: boolean;
}

/**
 * MainNavbar — horizontal desktop navigation bar.
 *
 * Accepts pre-translated nav items from the consumer config and delegates
 * rendering to the generic NavbarLayout primitive.
 *
 * @example
 * ```tsx
 * const t = useTranslations("nav");
 * const items = MAIN_NAV_ITEMS.map(item => ({ ...item, label: t(item.key) }));
 * <MainNavbar navItems={items} />
 * ```
 */
export function MainNavbar({
  navItems,
  hiddenNavItems = [],
  inline = false,
}: MainNavbarProps) {
  const pathname = usePathname();

  const items: NavbarLayoutItem[] = navItems
    .filter((item) => !hiddenNavItems.includes(item.key))
    .map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
      highlighted: item.highlighted,
    }));

  return <NavbarLayout items={items} activeHref={pathname} inline={inline} />;
}
