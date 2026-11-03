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
 *       fields)` over the `fieldVisibility` collection — widened 2026-11-03
 *       (3B item 1b, Universal Template System pilot) to also carry
 *       `fieldOrder`/`customFields` on the SAME document. This is
 *       deliberately NOT a second mechanism or a second store: the plan's
 *       own words are "`hiddenFields` IS `fieldVisibility/{surfaceId}`'s
 *       existing `fields` map, same storage… `fieldOrder`/`customFields`
 *       are new, additive fields on the SAME document shape, not a
 *       parallel store." `getFieldVisibility`'s own signature and return
 *       type are UNCHANGED — every existing caller (`SectionVisibilityGate`,
 *       7 PDP views) keeps reading a bare `Record<string, boolean>` and
 *       never has to learn about the wider doc. `getSurfaceFieldConfig` is
 *       the new, wider reader for the one caller that needs fieldOrder and
 *       customFields too (the field-visibility API route, for
 *       `useFieldVisibility`).
 *
 * EXPORTS: getFieldVisibility, getSurfaceFieldConfig, setFieldVisibility
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
import type { CustomFieldDef } from "../../../../features/shell/field-ui-meta";

const FIELD_VISIBILITY_COLLECTION = "fieldVisibility";

/**
 * The document AS STORED, local to this file — same split
 * `page-regions.ts`'s own `PageRegionDoc` uses: `updatedAt` is a real
 * Firestore `Timestamp` once written, which is a different type than any
 * JSON wire shape would carry. Nothing outside this file reads this
 * document directly, so there is no shared type to keep it in sync with.
 */
interface FieldVisibilityStoredDoc {
  surfaceId: string;
  fields: Record<string, boolean>;
  /** Field names, in the order an admin wants them rendered. Additive. */
  fieldOrder?: string[];
  /** Admin-defined fields with no presence in the owning schema. Additive. */
  customFields?: CustomFieldDef[];
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface SurfaceFieldConfig {
  fields: Record<string, boolean>;
  fieldOrder: string[];
  customFields: CustomFieldDef[];
}

const EMPTY_SURFACE_CONFIG: SurfaceFieldConfig = { fields: {}, fieldOrder: [], customFields: [] };

/**
 * The wide read — everything an admin has customized on this surface.
 * Cached and degraded the same way `getFieldVisibility` is; a read failure
 * here must fall back to "nothing customized", never block the surface.
 */
export const getSurfaceFieldConfig = cache(async (surfaceId: string): Promise<SurfaceFieldConfig> => {
  return safeRead(
    async () => {
      const snap = await getAdminDb().collection(FIELD_VISIBILITY_COLLECTION).doc(surfaceId).get();
      if (!snap.exists) return EMPTY_SURFACE_CONFIG;
      const data = snap.data() as FieldVisibilityStoredDoc;
      return {
        fields: data.fields && typeof data.fields === "object" ? data.fields : {},
        fieldOrder: Array.isArray(data.fieldOrder) ? data.fieldOrder : [],
        customFields: Array.isArray(data.customFields) ? data.customFields : [],
      };
    },
    {
      route: "field-visibility",
      key: `surface-field-config:${surfaceId}`,
      fallback: EMPTY_SURFACE_CONFIG,
    },
  );
});

/**
 * Cached on `surfaceId` alone — the narrowest shared argument, same
 * reasoning as `getPageRegion`. Degrades to `{}` (= "show everything") on
 * a missing doc or any read failure, so a field-visibility outage never
 * blocks a form or a display page from rendering.
 *
 * Unchanged signature/return type — see this file's header. Built on
 * `getSurfaceFieldConfig` rather than reading Firestore a second time.
 */
export const getFieldVisibility = cache(async (surfaceId: string): Promise<Record<string, boolean>> => {
  const config = await getSurfaceFieldConfig(surfaceId);
  return config.fields;
});

/**
 * Whole-map replace per key the caller actually passes — `fields` alone
 * (the pre-existing shape) leaves `fieldOrder`/`customFields` untouched via
 * `merge: true`, so the original single-param call shape still works
 * byte-for-byte; the new keys are additive, never required.
 */
export async function setFieldVisibility(
  surfaceId: string,
  patch: {
    fields?: Record<string, boolean>;
    fieldOrder?: string[];
    customFields?: CustomFieldDef[];
  },
): Promise<void> {
  await getAdminDb()
    .collection(FIELD_VISIBILITY_COLLECTION)
    .doc(surfaceId)
    .set({ surfaceId, ...patch, updatedAt: new Date() }, { merge: true });
}
