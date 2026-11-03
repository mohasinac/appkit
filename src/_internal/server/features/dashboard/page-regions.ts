/**
 * Admin-composable page regions (Phase 3B, overhaul brief — first slice).
 *
 * A page region is a `DashboardCard[]` — the SAME type Phase 9-ii's
 * `DashboardQuickJump` already proved out for a user's own dashboard landing
 * — but SHARED rather than per-user: one admin edits it, every admin viewing
 * that page sees the same cards. This is the distinction that matters and is
 * why it is a NEW small collection rather than another `uiPreferences`
 * field: `uiPreferences.savedCards` is explicitly private, "each user will
 * have their own custom profiles... not shared" (the owner's own words for
 * Phase 9-ii) — a page region is closer to a CMS content block an admin
 * curates for every other admin to see.
 *
 * Additive only. A page with no stored region renders exactly as it did
 * before this existed — `getPageRegion` returns `[]` on a missing doc or any
 * read failure, never throws, so a page's own template is never blocked on
 * this read.
 */

import { cache } from "react";
import { getAdminDb } from "../../../../providers/db-firebase";
import { safeRead } from "../../../../errors/safe-read";
import type { DashboardCard } from "../../../shared/features/dashboard/recent-entry";

const PAGE_REGIONS_COLLECTION = "pageRegions";

interface PageRegionDoc {
  pageId: string;
  cards: DashboardCard[];
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * One read per page per request, `React.cache`-wrapped per the SSR
 * Architecture rules (§ "`React.cache` discipline") — cached on `pageId`
 * alone, the narrowest shared argument.
 */
export const getPageRegion = cache(async (pageId: string): Promise<DashboardCard[]> => {
  return safeRead(
    async () => {
      const snap = await getAdminDb().collection(PAGE_REGIONS_COLLECTION).doc(pageId).get();
      if (!snap.exists) return [];
      const data = snap.data() as PageRegionDoc;
      return Array.isArray(data.cards) ? data.cards : [];
    },
    {
      route: "page-region",
      key: `page-regions:${pageId}`,
      fallback: [],
    },
  );
});

/**
 * Admin-only write — called from the API route, never directly from a
 * client component. Whole-array replace, not a per-card patch: the editor
 * UI always holds the full current array client-side (same shape
 * `useSavedCards` already uses), so there is no partial-update case to
 * support and no risk of two concurrent editors racing a merge.
 */
export async function setPageRegion(pageId: string, cards: DashboardCard[]): Promise<void> {
  await getAdminDb()
    .collection(PAGE_REGIONS_COLLECTION)
    .doc(pageId)
    .set({ pageId, cards, updatedAt: new Date() }, { merge: true });
}
