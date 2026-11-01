"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useRecentlyVisited } from "../hooks/useRecentlyVisited";

export interface RecentVisitTrackerGroup {
  title: string;
  items: { href: string; label: string }[];
}

export interface RecentVisitTrackerProps {
  /** `"{portal}:hub"` — same scope convention as `useHiddenHubCards` / `DashboardQuickJump`. */
  scope: string;
  /** The portal's full nav — used only to confirm the current path IS a tagged screen. */
  groups: RecentVisitTrackerGroup[];
  /**
   * The portal's OWN dashboard-landing href (`/admin`, `/store`, `/user`) —
   * never recorded, even though it is also a real nav item (admin's "All
   * sections" points at `/admin`). Landing on the search page is not a
   * deliberate "jump to X"; recording it anyway meant a completely fresh
   * profile's first-ever visit silently overrode the curated cold-start
   * defaults with a single, circular "All sections → /admin" card instead
   * of the intended starting set. Found live, 2026-11-01.
   */
  excludeHref: string;
}

/**
 * Render-nothing. Mounted once per portal layout (beside `CommandPaletteMount`
 * / `AdminCommandPaletteMount`), it records a `kind: "page"` entry whenever
 * the pathname EXACTLY matches a tagged nav item's `href` — Phase 9, overhaul
 * brief.
 *
 * 🛑 An exact match only, on purpose. A dynamic detail page (`/admin/users/abc123`,
 * `/store/products/xyz`) is not itself a nav item — recording every one of
 * those would flood the ten-card cap with one-off visits instead of the
 * screens the owner actually meant: *"save the last visited as a card…"*.
 */
export function RecentVisitTracker({ scope, groups, excludeHref }: RecentVisitTrackerProps) {
  const pathname = usePathname();
  const { recordVisit } = useRecentlyVisited(scope);
  const lastRecorded = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastRecorded.current || pathname === excludeHref) return;
    for (const group of groups) {
      const match = group.items.find((item) => item.href === pathname);
      if (match) {
        recordVisit({ kind: "page", href: match.href, label: match.label });
        lastRecorded.current = pathname;
        return;
      }
    }
  }, [pathname, groups, excludeHref, recordVisit]);

  return null;
}
