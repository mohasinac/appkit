"use client";
/*
 * WHY: `Tabs` has no URL sync of its own, so every tabbed page has had to
 *      hand-roll one. `AdminSiteSettingsView` read `?tab=` once, in a
 *      `useState` initialiser guarded on `typeof window` — and never wrote it
 *      back, so the URL went stale the moment anyone clicked a tab. A deep
 *      link into a tab worked; sharing the page you were looking at did not.
 *
 *      W8's tab consolidations add five more tabbed pages, each of which needs
 *      the absorbed page's `?tab=` deep link to keep working, which is well
 *      past the Rule of Three.
 *
 * WHAT: Read `?tab=` (validated against the page's own union), and write it
 *       back on every change.
 *
 * ## Why `router.replace` and not `push`
 *
 * A tab is a view of one page, not a new destination. Pushing would make Back
 * walk the user through every tab they glanced at before leaving the page,
 * which is the behaviour `useUrlTable` already rejected for filters.
 *
 * ## Why not `useUrlTable().set(TABLE_KEYS.TAB, …)`
 *
 * That would work, and it also resets `page` to 1 — correct for a filter
 * change, meaningless here, and it puts a `page=1` in the URL of a settings
 * page that has no pagination.
 *
 * EXPORTS: useTabParam
 *
 * @tag domain:shared
 * @tag layer:hook
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:AdminSiteSettingsView,store payouts/shipping/fulfillment/storefront,admin roles/settings
 * @tag sideEffects:router
 */

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { TABLE_KEYS } from "../../constants/table-keys";

export interface UseTabParamOptions {
  /**
   * A locale-aware router, when the caller has one. Without it the plain
   * `next/navigation` router drops the locale prefix on replace.
   */
  router?: { replace: (url: string) => void };
  pathname?: string;
}

/**
 * The active tab, kept in `?tab=`.
 *
 * `isValid` is the page's own type guard — `isSiteSettingsTabId`,
 * `isPayoutsTabId`, and so on — so an unknown value in the URL is IGNORED
 * rather than written into state. That is what makes a stale bookmark open the
 * default tab instead of rendering an empty panel.
 */
export function useTabParam<T extends string>(
  isValid: (value: string | null | undefined) => value is T,
  fallback: T,
  options?: UseTabParamOptions,
): [T, (next: string) => void] {
  const nativeRouter = useRouter();
  const nativePathname = usePathname();
  const searchParams = useSearchParams();

  const router = options?.router ?? nativeRouter;
  const pathname = options?.pathname ?? nativePathname;

  const requested = searchParams.get(TABLE_KEYS.TAB);
  const active = isValid(requested) ? requested : fallback;

  const setTab = useCallback(
    (next: string) => {
      if (!isValid(next)) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set(TABLE_KEYS.TAB, next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [isValid, pathname, router, searchParams],
  );

  return [active, setTab];
}
