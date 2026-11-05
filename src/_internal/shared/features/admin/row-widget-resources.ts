/**
 * Phase 10 ("widget descriptors") — resolves an `adminRow` RecentEntry's
 * `{resource, rowId}` into a real URL at render time, never stored on the
 * entry itself. Storing a frozen href would go stale the first time a route
 * is restructured — the Root Cause #42 mirror-drift pattern. This map is
 * itself a second hand-maintained mirror one level up (of each view's own
 * `rowHrefTemplate` literal), which is why `audit-widget-descriptor-sync.mjs`
 * R1/R5 exist: R1 checks every key here is a real `ACTIONS` bucket, R5
 * checks every resource's `Admin*View.tsx` still declares `rowHrefTemplate`.
 *
 * Only five resources are eligible — see the `AdminRowResource` doc comment
 * in `recent-entry.ts` for which admin views were checked and excluded.
 */
import { ROUTES } from "../../../../next/routing/route-map";
import type { AdminRowResource } from "../dashboard/recent-entry";

export const ADMIN_ROW_HREF_BY_RESOURCE: Record<AdminRowResource, (rowId: string) => string> = {
  BUNDLE: (rowId) => String(ROUTES.ADMIN.BUNDLES_EDIT(rowId)),
  RANDOM_LOTS: (rowId) => String(ROUTES.ADMIN.RANDOM_LOTS_EDIT(rowId)),
  BEY: (rowId) => String(ROUTES.ADMIN.BEYS_EDIT(rowId)),
  PART: (rowId) => String(ROUTES.ADMIN.PARTS_EDIT(rowId)),
  SUBLISTING: (rowId) => String(ROUTES.ADMIN.SUBLISTING_CATEGORIES_EDIT(rowId)),
};

/** Display labels for the "Pin to dashboard" action's resource picker / card subtitle. */
export const ADMIN_ROW_RESOURCE_LABEL: Record<AdminRowResource, string> = {
  BUNDLE: "Bundle",
  RANDOM_LOTS: "Clearance listing",
  BEY: "Bey",
  PART: "Part",
  SUBLISTING: "Sublisting category",
};
