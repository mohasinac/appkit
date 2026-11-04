"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ADMIN_ENDPOINTS } from "../../constants/api-endpoints";
import { normalizeError } from "../../errors/normalize";
import type { CustomFieldDef, FormStep } from "./field-ui-meta";

const PERSIST_DEBOUNCE_MS = 600;

export interface UseFieldVisibilityResult {
  /** The raw map — pass directly as `BuildSectionsOptions.fieldVisibility`. */
  fields: Record<string, boolean>;
  isVisible: (fieldName: string) => boolean;
  setVisible: (fieldName: string, next: boolean) => void;
  /** Field names in admin-chosen render order. Pass to `BuildSectionsOptions.fieldOrder`. */
  fieldOrder: string[];
  setFieldOrder: (next: string[]) => void;
  /** Admin-defined fields with no schema presence. Pass to `BuildSectionsOptions.customFields`. */
  customFields: CustomFieldDef[];
  setCustomFields: (next: CustomFieldDef[]) => void;
  /** Wizard grouping. Pass to `<WizardFormSteps steps>`. Empty = single-page, unchanged. */
  steps: FormStep[];
  setSteps: (next: FormStep[]) => void;
  /** True while a debounced write is in flight. */
  saving: boolean;
}

/**
 * Admin field-visibility override (Phase 3B widget system) — the write-side
 * counterpart to `getFieldVisibility()` (appkit `server.ts`). Same
 * debounced-persist shape as `usePageRegion` for writes. Reads differ
 * deliberately: `usePageRegion`'s caller is always SSR (an admin dashboard
 * page), so it only ever needs `initialCards` server-rendered. This hook's
 * real first consumer (`StoreCreateForm`, mounted from a fully `"use
 * client"` page with no SSR data-fetch opportunity) has no such option, so
 * this hook fetches on mount via `GET /api/admin/field-visibility/{id}`
 * (open to any signed-in viewer — reading "what's hidden" is not
 * sensitive) whenever `initial` is omitted. An SSR caller that DOES have a
 * server-rendered value may still pass it as `initial` to skip the fetch
 * and avoid a loading flash, same as `usePageRegion`'s own contract.
 *
 * `surfaceId` identifies which `fieldVisibility/{surfaceId}` document this
 * hook reads and writes — a stable, hand-chosen id per form/display
 * surface (e.g. `"store-create"`, `"admin-site-settings"`), same
 * "not route-derived" rule `usePageRegion`'s own doc comment states.
 *
 * Consumed directly by `buildSectionsFromSchema`'s `fieldVisibility` option
 * (`features/shell/build-sections.tsx`) for FORM fields, and by any
 * read-only display surface that wants to hide a field row, via
 * `isVisible(fieldName)` directly.
 */
export function useFieldVisibility(surfaceId: string, initial?: Record<string, boolean>): UseFieldVisibilityResult {
  const [fields, setFields] = useState<Record<string, boolean>>(initial ?? {});
  const [fieldOrder, setFieldOrderState] = useState<string[]>([]);
  const [customFields, setCustomFieldsState] = useState<CustomFieldDef[]>([]);
  const [steps, setStepsState] = useState<FormStep[]>([]);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Same cleanup `usePageRegion` has — without it, a debounced write still
  // fires its `setTimeout` callback after the component unmounts (e.g. the
  // admin navigates away inside the 600ms window), calling `setSaving` on
  // state nobody reads any more. Harmless in practice (React tolerates a
  // state update on an unmounted hook; it just warns), but free to avoid.
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  useEffect(() => {
    if (initial !== undefined) return;
    let cancelled = false;
    fetch(ADMIN_ENDPOINTS.FIELD_VISIBILITY_BY_ID(encodeURIComponent(surfaceId)))
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            data?: {
              fields?: Record<string, boolean>;
              fieldOrder?: string[];
              customFields?: CustomFieldDef[];
              steps?: FormStep[];
            };
          } | null,
        ) => {
          if (cancelled) return;
          if (data?.data?.fields) setFields(data.data.fields);
          if (data?.data?.fieldOrder) setFieldOrderState(data.data.fieldOrder);
          if (data?.data?.customFields) setCustomFieldsState(data.data.customFields);
          if (data?.data?.steps) setStepsState(data.data.steps);
        },
      )
      .catch((err) => void normalizeError(err));
    return () => {
      cancelled = true;
    };
    // `initial`'s presence (not its value) decides whether this fetches at
    // all — re-running on every `surfaceId` change only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surfaceId]);

  /**
   * One debounced writer for all three keys — each setter below sends its
   * OWN field plus whatever the other two currently hold, so two fields
   * edited in quick succession (e.g. reordering, then adding a custom
   * field) don't race each other's debounce window and overwrite one
   * with a stale value. `merge: true` on the server side means sending
   * all three every time is always safe, never destructive.
   */
  const persist = useCallback(
    (next: {
      fields: Record<string, boolean>;
      fieldOrder: string[];
      customFields: CustomFieldDef[];
      steps: FormStep[];
    }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSaving(true);
        fetch(ADMIN_ENDPOINTS.FIELD_VISIBILITY_BY_ID(encodeURIComponent(surfaceId)), {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(next),
        })
          .catch((err) => void normalizeError(err))
          .finally(() => setSaving(false));
      }, PERSIST_DEBOUNCE_MS);
    },
    [surfaceId],
  );

  const setVisible = useCallback(
    (fieldName: string, next: boolean) => {
      setFields((prev) => {
        const updated = { ...prev, [fieldName]: next };
        persist({ fields: updated, fieldOrder, customFields, steps });
        return updated;
      });
    },
    [persist, fieldOrder, customFields, steps],
  );

  const setFieldOrder = useCallback(
    (next: string[]) => {
      setFieldOrderState(next);
      persist({ fields, fieldOrder: next, customFields, steps });
    },
    [persist, fields, customFields, steps],
  );

  const setCustomFields = useCallback(
    (next: CustomFieldDef[]) => {
      setCustomFieldsState(next);
      persist({ fields, fieldOrder, customFields: next, steps });
    },
    [persist, fields, fieldOrder, steps],
  );

  const setSteps = useCallback(
    (next: FormStep[]) => {
      setStepsState(next);
      persist({ fields, fieldOrder, customFields, steps: next });
    },
    [persist, fields, fieldOrder, customFields],
  );

  const isVisible = useCallback((fieldName: string) => fields[fieldName] !== false, [fields]);

  return {
    fields,
    isVisible,
    setVisible,
    fieldOrder,
    setFieldOrder,
    customFields,
    setCustomFields,
    steps,
    setSteps,
    saving,
  };
}
