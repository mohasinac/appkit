/*
 * WHY: Mirrors `_internal/server/features/dashboard/page-regions.ts`'s
 *      `getPageRegion`/`setPageRegion` shape exactly — same cache-wrapped
 *      safeRead-degrading read, same plain async write, same "surfaceId is
 *      a hand-chosen stable string the caller passes" identity rule. A
 *      field-visibility surface and a page region are a different
 *      collection holding a different document shape, not a different
 *      mechanism, so there is nothing to generalize between the two yet
 *      (Rule of Three — this is the second occurrence of the pattern, not
 *      the third).
 *
 * WHAT: `getFieldVisibility(surfaceId)` / `setFieldVisibility(surfaceId,
 *       fields)` over the `fieldVisibility` collection.
 *
 * EXPORTS: getFieldVisibility, setFieldVisibility
 *
 * @tag domain:forms
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:field-visibility-route,SectionForm-callers
 * @tag sideEffects:firestore-read,firestore-write
 */

import { cache } from "react";
import { getAdminDb } from "../../../../providers/db-firebase";
import { safeRead } from "../../../../errors/safe-read";
import type { FieldVisibilityDoc } from "../../../shared/features/forms/field-visibility";

const FIELD_VISIBILITY_COLLECTION = "fieldVisibility";

/**
 * Cached on `surfaceId` alone — the narrowest shared argument, same
 * reasoning as `getPageRegion`. Degrades to `{}` (= "show everything") on
 * a missing doc or any read failure, so a field-visibility outage never
 * blocks a form or a display page from rendering.
 */
export const getFieldVisibility = cache(async (surfaceId: string): Promise<Record<string, boolean>> => {
  return safeRead(
    async () => {
      const snap = await getAdminDb().collection(FIELD_VISIBILITY_COLLECTION).doc(surfaceId).get();
      if (!snap.exists) return {};
      const data = snap.data() as FieldVisibilityDoc;
      return data.fields && typeof data.fields === "object" ? data.fields : {};
    },
    {
      route: "field-visibility",
      key: `field-visibility:${surfaceId}`,
      fallback: {},
    },
  );
});

export async function setFieldVisibility(surfaceId: string, fields: Record<string, boolean>): Promise<void> {
  await getAdminDb()
    .collection(FIELD_VISIBILITY_COLLECTION)
    .doc(surfaceId)
    .set({ surfaceId, fields, updatedAt: new Date() }, { merge: true });
}
