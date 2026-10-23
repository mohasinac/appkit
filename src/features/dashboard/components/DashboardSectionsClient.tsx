"use client";

import React, { useMemo } from "react";
import { useSiteSettings } from "../../../core/hooks/useSiteSettings";
import { filterNavGroups } from "../../../_internal/client/features/layout/filterNavItems";
import { hubSections } from "../../../_internal/shared/features/dashboard/hub-sections";
import type { NavPortal, SidebarNavGroup } from "../../../_internal/shared/features/layout/types";
import { ROUTES } from "../../../next/routing/route-map";
import { DashboardHubView } from "./DashboardHubView";

/**
 * The sectioned index of a dashboard, for a landing page that is already a
 * CLIENT component.
 *
 * ## Why a client variant exists at all
 *
 * `/store/page.tsx` and `/user/page.tsx` are `"use client"` and carry live stat
 * tiles (`useStoreDashboard`, `useNotifications`, an avatar uploader). Turning
 * either into a server component to fetch hub data would mean moving a working
 * 250–360 line page into a sibling file for the sake of a card grid — a large
 * diff over a working feature, which is the shape of Root Cause #60.
 *
 * So the DATA source differs and the RENDERER does not: this resolves sections
 * from the same `useSiteSettings` navConfig the sidebar reads, and hands them to
 * the same `<DashboardHubView>` the admin landing renders server-side. One card
 * grid, two ways in — not two card grids.
 *
 * ## 🛑 No attention counts here, and that is honest rather than lazy
 *
 * Counts need Firestore, which a client component can only reach through an
 * endpoint — a second billed invocation per landing visit for numbers the page
 * did not previously show (Root Cause #94). The admin landing, which is a
 * server component under a session-reading layout, gets them for free in its
 * own render. A seller's one countable figure (pending orders) is already a
 * live stat tile on `/store`, so the badge would be the second place for it.
 *
 * `counts={{}}` means every card renders without a badge — never with a `0`,
 * which is the one answer that would wrongly read as "nothing waiting"
 * (Root Cause #72).
 */

/**
 * 🛑 `Record<NavPortal, …>` so a fourth portal is a COMPILE error here rather
 * than a landing page whose section cards all link to `""`. An object keyed on
 * `string` would accept the omission silently (Root Cause #61).
 */
const SECTION_ROUTE: Record<NavPortal, (slug: string) => string> = {
  admin: (slug) => String(ROUTES.ADMIN.SECTION(slug)),
  store: (slug) => String(ROUTES.STORE.SECTION(slug)),
  user: (slug) => String(ROUTES.USER.SECTION(slug)),
};

export interface DashboardSectionsClientProps {
  portal: NavPortal;
  /**
   * The portal's nav groups.
   *
   * 🛑 Pass the groups the SIDEBAR was given, already put through any
   * portal-specific filter (`filterStoreNavGroups` for `/store`). This applies
   * only the navConfig/permission filter; a section the store is not entitled
   * to would otherwise appear here and nowhere else.
   */
  groups: readonly SidebarNavGroup[];
  /** `null` means admin; `undefined` means "no permission gating applies". */
  permissions?: string[] | null;
  /** Omit when embedding in a page that already has a heading. */
  title?: string;
  description?: string;
  /** Live stat tiles and anything else that belongs above the cards. */
  above?: React.ReactNode;
  emptyMessage?: string;
}

export function DashboardSectionsClient({
  portal,
  groups,
  permissions,
  title,
  description,
  above,
  emptyMessage,
}: DashboardSectionsClientProps) {
  const { data: settings } = useSiteSettings<{
    navConfig?: Record<string, { enabled: boolean }>;
  }>();

  /*
   * Derived, never copied into state — the settings query can resolve after
   * first paint, and a `useState` seeded from it would freeze the pre-settings
   * answer. Same reasoning as `AdminIntegrationsView`.
   */
  const sections = useMemo(
    () => hubSections(filterNavGroups([...groups], settings?.navConfig, permissions)),
    [groups, settings?.navConfig, permissions],
  );

  const sectionHrefs = useMemo(
    () => Object.fromEntries(sections.map((s) => [s.slug, SECTION_ROUTE[portal](s.slug)])),
    [sections, portal],
  );

  return (
    <DashboardHubView
      title={title}
      description={description}
      mode="sections"
      sections={sections}
      sectionHrefs={sectionHrefs}
      counts={{}}
      above={above}
      emptyMessage={emptyMessage}
      /*
       * 🛑 Withheld deliberately. `/store`'s entitlement filter lives in the
       * layout and on the hub pages, not here, so a count rendered from these
       * groups would over-promise on the Listings card. See the prop's own
       * header — the section is right, the number would not be.
       */
      showScreenCount={false}
    />
  );
}
