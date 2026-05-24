"use client";

import { useCartCount } from "../cart/hooks/useCartCount";
import { useWishlistCount } from "../wishlist/hooks/useWishlistCount";
import { useNotifications } from "../account/hooks/useNotifications";
import { useDashboardNav } from "./DashboardNavContext";
import { TitleBarLayout } from "./TitleBarLayout";
import type { TitleBarLayoutProps } from "./TitleBarLayout";
import { ROUTES } from "../../next/routing/route-map";

export interface TitleBarProps
  extends Omit<
    TitleBarLayoutProps,
    | "cartCount"
    | "wishlistCount"
    | "unreadNotificationCount"
    | "hasDashboardNav"
    | "onToggleDashboardNav"
  > {
  /** Auth UID of the current user — used for wishlist merge-on-login and sync. */
  userId?: string | null;
  /**
   * When true, hides the dashboard nav PanelLeft button so that nested
   * admin/seller/user layouts can own their sidebar controls exclusively.
   */
  suppressDashboardNav?: boolean;
  /** Optional hook invoked immediately before toggling the dashboard nav drawer. */
  onBeforeToggleDashboardNav?: () => void;
}

/**
 * TitleBar � domain shell over TitleBarLayout.
 *
 * Reads `useCartCount` and `useDashboardNav` from appkit.
 * Pass `user` from your consumer`s auth context.
 *
 * Wrap with `DashboardNavProvider` at the app root to enable the
 * dashboard nav button in nested admin/seller/user routes.
 */
export function TitleBar({
  suppressDashboardNav,
  onBeforeToggleDashboardNav,
  userId,
  ...rest
}: TitleBarProps) {
  const cartCount = useCartCount(!!rest.user);
  const wishlistCount = useWishlistCount(userId);
  const { unreadCount } = useNotifications(1);
  const { hasNav: hasDashboardNav, toggleNav: toggleDashboardNav } =
    useDashboardNav();

  return (
    <TitleBarLayout
      {...rest}
      cartCount={cartCount}
      wishlistCount={wishlistCount}
      unreadNotificationCount={rest.user ? unreadCount : 0}
      // Default the bell to the user notifications page when the user is
      // authenticated — consumers can override by passing their own
      // `notificationsHref` through `...rest`.
      notificationsHref={
        rest.notificationsHref ??
        (rest.user ? String(ROUTES.USER.NOTIFICATIONS) : undefined)
      }
      hasDashboardNav={suppressDashboardNav ? false : hasDashboardNav}
      onToggleDashboardNav={
        suppressDashboardNav
          ? undefined
          : () => {
              onBeforeToggleDashboardNav?.();
              toggleDashboardNav();
            }
      }
      hideSidebarToggle={rest.hideSidebarToggle ?? suppressDashboardNav}
    />
  );
}
