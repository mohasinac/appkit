/**
 * The one read a dashboard hub or landing page needs.
 *
 * ## 🛑 Read on the SERVER, not fetched from the client
 *
 * The plan named an endpoint — `/api/dashboard/attention` — and the shape it
 * asked for is "one read covering every section", which this is. It is read
 * here instead because every one of these pages is **already per-request**:
 * `admin/layout.tsx` and `store/layout.tsx` `await getServerSessionUser()`, so
 * the whole subtree is dynamic with or without an endpoint (§ "…a dynamic API
 * in a DASHBOARD layout is the correct lever").
 *
 * An endpoint would therefore have added a SECOND billed invocation per hub
 * visit to fetch data the page's own render could already have, which is
 * exactly the shape of Root Cause #94 — a client fetch that reads as free in
 * review and bills per mount. There is no endpoint, and one should not be added
 * unless something outside a dashboard page needs these numbers.
 *
 * ## Two reads, and both fail OPEN
 *
 * `navConfig` decides which nav entries an admin has switched off, and the hub
 * must agree with the sidebar about that — so it is read rather than ignored.
 * On failure it resolves to `undefined`, which means "nothing is disabled" and
 * shows MORE cards than it should. That is the right direction: a disabled nav
 * entry is a configuration choice rather than a permission, and the page behind
 * every card still enforces its own route guard. Hiding sections because a
 * settings read blipped would be the damaging failure.
 *
 * The counts fail to `null` per card — see `attention.ts`, which exists to
 * explain why `0` is the one answer a badge must never invent.
 */

import { cache } from "react";
import { safeRead } from "../../../../errors/safe-read";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import { filterNavGroups } from "../../../client/features/layout/filterNavItems";
import {
  hubSections,
  type DashboardHubSection,
} from "../../../shared/features/dashboard/hub-sections";
import type { SidebarNavGroup } from "../../../shared/features/layout/types";
import { collectAttentionCounts, type AttentionCounts } from "./attention";

/**
 * `navConfig` alone, cached per request.
 *
 * `React.cache` because a landing page renders the hub once but a hub page may
 * also want the section list for its own heading, and the narrowest shared call
 * is the one to cache (§ "`React.cache` discipline" — cache the repository
 * read, not the viewer-specific wrapper around it, or two call sites with
 * different arguments dedupe nothing).
 */
const getNavConfig = cache(
  async (): Promise<Record<string, { enabled: boolean }> | undefined> =>
    safeRead(
      async () => {
        const settings = (await siteSettingsRepository.getSingleton()) as
          | { navConfig?: Record<string, { enabled: boolean }> }
          | null;
        return settings?.navConfig;
      },
      {
        route: "dashboard-hub",
        key: "navConfig",
        fallback: undefined,
      },
    ),
);

export interface DashboardHubData {
  /** Permission- and toggle-filtered, in nav order. Never empty-group padded. */
  sections: DashboardHubSection[];
  counts: AttentionCounts;
}

/**
 * Resolve the sections a viewer may see, plus their attention counts.
 *
 * @param groups the portal's nav groups, unfiltered — this applies the filter
 * @param permissions `null` means admin (the convention `filterNavGroups` owns)
 * @param storeId the viewer's store SLUG, for seller-scoped counts
 */
export async function getDashboardHubData(
  groups: readonly SidebarNavGroup[],
  permissions: string[] | null | undefined,
  storeId?: string,
): Promise<DashboardHubData> {
  const navConfig = await getNavConfig();

  /*
   * Filter FIRST, then count — the visible ids are the scope (see
   * `collectAttentionCounts`). Doing it the other way round costs an employee
   * five queries to render one card, and computes figures from collections
   * their permission set does not cover.
   *
   * Sequential rather than parallel with the settings read for the same
   * reason: the second call's input is the first call's output. Two
   * round trips, inside Rule #6's ~3.
   */
  const sections = hubSections(filterNavGroups([...groups], navConfig, permissions));
  const visibleItemIds = sections.flatMap((s) => s.items.map((i) => i.id).filter(Boolean) as string[]);

  const counts = await safeRead(() => collectAttentionCounts(visibleItemIds, storeId), {
    route: "dashboard-hub",
    key: "attention",
    fallback: {} as AttentionCounts,
  });

  return { sections, counts };
}
