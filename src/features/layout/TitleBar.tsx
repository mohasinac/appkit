import { useCartCount } from "../cart/hooks/useCartCount";
import { useDashboardNav } from "./DashboardNavContext";
import { TitleBarLayout } from "./TitleBarLayout";
import type { TitleBarLayoutProps } from "./TitleBarLayout";

export interface TitleBarProps
  extends Omit<
    TitleBarLayoutProps,
    | "cartCount"
    | "hasDashboardNav"
    | "onOpenDashboardNav"
  > {
  /**
   * When true, hides the dashboard nav PanelLeft button so that nested
   * admin/seller/user layouts can own their sidebar controls exclusively.
   */
  suppressDashboardNav?: boolean;
}

/**
 * TitleBar — domain shell over TitleBarLayout.
 *
 * Reads `useCartCount` and `useDashboardNav` from appkit.
 * Pass `user` from your consumer`s auth context.
 *
 * Wrap with `DashboardNavProvider` at the app root to enable the
 * dashboard nav button in nested admin/seller/user routes.
 */
export function TitleBar({ suppressDashboardNav, ...rest }: TitleBarProps) {
  const cartCount = useCartCount();
  const { hasNav: hasDashboardNav, openNav: openDashboardNav } =
    useDashboardNav();

  return (
    <TitleBarLayout
      {...rest}
      cartCount={cartCount}
      hasDashboardNav={suppressDashboardNav ? false : hasDashboardNav}
      onOpenDashboardNav={suppressDashboardNav ? undefined : openDashboardNav}
      hideSidebarToggle={rest.hideSidebarToggle ?? suppressDashboardNav}
    />
  );
}
