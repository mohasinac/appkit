"use client";

/*
 * WHY: There were TWO hand-rolled grouped-listing forms (the seller's `new` and
 *      `[id]/edit` pages), between them covering 5 of the entity's 8 fields —
 *      `productIds` was hardcoded to `[]` on create, and `minActiveMembers` and
 *      `coverImage` could not be set anywhere at all. Admin had no form.
 * WHAT: One editor for both portals, deriving its sections from
 *       `groupedListingFormSchema` so a field added to the schema appears here
 *       without a second edit.
 *
 * ## The admin API was the blocker, not this component
 *
 * Pointing an editor at the admin endpoints used to give: create → 405 (there
 * was no admin POST), and every save of `title`/`groupTheme`/`isActive` → a
 * 200 that wrote nothing, because the admin PATCH schema was
 * `z.object({ productIds })` and `z.object()` strips unknown keys. That is
 * Root Cause #40's exact shape — a success response is what the broken version
 * returns, so only a reload reveals it. Both were fixed alongside this file;
 * an `endpointOverride` on the seller form could never have worked.
 *
 * ## Two fields are overridden, the other six are derived
 *
 * `productIds` needs the real product search (`ProductInlineSelect`), and admin
 * create needs a store picker — a grouped listing is store-owned and the seller
 * route takes `storeId` from the session, which an admin has no equivalent of.
 * Everything else comes from `buildSectionsFromSchema`.
 *
 * EXPORTS: GroupedListingEditorView, type GroupedListingEditorViewProps
 *
 * @tag domain:grouped
 * @tag layer:feature
 * @tag pattern:slot-shell
 * @tag access:client
 * @tag consumers:admin/grouped-listings pages,store/grouped-listings pages
 * @tag sideEffects:network
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Stack, Text, useToast } from "../../../ui";
import {
  FieldSelect,
  FormShellContext,
  FormErrorSummary,
  applyZodIssues,
  useFormShellState,
} from "../../../ui/forms";
import { SectionForm, useSectionFormNav } from "../../shell";
import { buildSectionsFromSchema } from "../../shell/build-sections";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS, SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
import type { JsonValue } from "../../../schemas/types";
import { ProductInlineSelect } from "../../seller/components/ProductInlineSelect";
import {
  groupedListingFormSchema,
  type GroupedListingFormValues,
} from "../schemas/grouped-listing-form";

type Scope = "admin" | "store";

export interface GroupedListingEditorViewProps {
  scope: Scope;
  /** Present → edit that group; absent → create a new one. */
  groupId?: string;
  /**
   * Store the group belongs to. Required for admin CREATE (an admin owns no
   * store, so there is nothing to derive it from); ignored on the seller side,
   * where the route reads it from the session and a body value would let a
   * seller file a group under someone else's store.
   */
  fixedStoreId?: string;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
}

interface StoreOption {
  id: string;
  storeName?: string;
}

const EMPTY: GroupedListingFormValues = {
  title: "",
  description: "",
  groupTheme: "generic",
  productIds: [],
  minActiveMembers: 1,
  coverImage: "",
  isActive: true,
  isFeatured: false,
};

export function GroupedListingEditorView({
  scope,
  groupId,
  fixedStoreId,
  onSaved,
  onCancel,
}: GroupedListingEditorViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = Boolean(groupId);
  const isAdmin = scope === "admin";

  const listEndpoint = isAdmin ? ADMIN_ENDPOINTS.GROUPED_LISTINGS : SELLER_ENDPOINTS.GROUPED_LISTINGS;
  const byIdEndpoint = isAdmin
    ? ADMIN_ENDPOINTS.GROUPED_LISTING_BY_ID
    : SELLER_ENDPOINTS.GROUPED_LISTING_BY_ID;

  const [values, setValues] = React.useState<GroupedListingFormValues>(EMPTY);
  const [storeId, setStoreId] = React.useState(fixedStoreId ?? "");
  const [saving, setSaving] = React.useState(false);

  /*
   * Seeded from the single-item GET, never from a cached list row — a list
   * projection is narrower than the document, and an editor seeded from one
   * re-sends the fields it never received as their defaults (Root Cause #38).
   */
  const existing = useQuery({
    queryKey: [scope, "grouped-listing", groupId],
    queryFn: async () => {
      const res = await apiClient.get(byIdEndpoint(groupId!));
      const body = (res as { data?: JsonValue })?.data ?? res;
      // The admin GET wraps in `{ item }`; the seller GET returns the doc.
      return ((body as { item?: JsonValue })?.item ?? body) as Record<string, JsonValue>;
    },
    enabled: isEdit,
  });

  // Admin create only: an admin has no session store to derive the owner from.
  const stores = useQuery({
    queryKey: ["admin", "grouped-listing-editor", "stores"],
    queryFn: async () => {
      const res = await apiClient.get(`${ADMIN_ENDPOINTS.STORES}?pageSize=200&sorts=storeName`);
      const body = (res as { data?: JsonValue })?.data ?? res;
      return ((body as { items?: StoreOption[] })?.items ?? []) as StoreOption[];
    },
    enabled: isAdmin && !isEdit && !fixedStoreId,
  });

  React.useEffect(() => {
    const doc = existing.data;
    if (!doc) return;
    setValues({
      title: String(doc.title ?? ""),
      description: String(doc.description ?? ""),
      groupTheme: (doc.groupTheme as GroupedListingFormValues["groupTheme"]) ?? "generic",
      productIds: Array.isArray(doc.productIds) ? doc.productIds.map(String) : [],
      minActiveMembers: Number(doc.minActiveMembers ?? 1),
      coverImage: String(doc.coverImage ?? ""),
      isActive: doc.isActive !== false,
      isFeatured: doc.isFeatured === true,
    });
    if (doc.storeId) setStoreId(String(doc.storeId));
  }, [existing.data]);

  const update = React.useCallback((partial: Partial<GroupedListingFormValues>) => {
    setValues((prev) => ({ ...prev, ...partial }));
  }, []);

  const needsStorePicker = isAdmin && !isEdit && !fixedStoreId;

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<GroupedListingFormValues>(groupedListingFormSchema, {
        renderers: {
          productIds: ({ values: v, onChange }) => (
            <Stack gap="xs">
              <ProductInlineSelect
                scope={scope}
                multiple
                value={v.productIds ?? []}
                onChange={(ids) => onChange({ productIds: ids })}
                placeholder="Search products to add…"
              />
              <Text size="xs" color="muted">
                {(v.productIds ?? []).length} product
                {(v.productIds ?? []).length === 1 ? "" : "s"} in this group.
              </Text>
            </Stack>
          ),
        },
      }),
    [scope],
  );

  /*
   * The nav seam — without it `FormErrorSummary`'s "jump to section" resolves
   * to undefined, which is what it did for every form before W0.
   */
  const { openIds, setOpenIds, goToSection, fieldToSectionIndex, sectionMeta } =
    useSectionFormNav(sections, values);

  const { shellCtx, setFieldError, validate } = useFormShellState(groupedListingFormSchema, {
    sections: sectionMeta,
    onGoToSection: goToSection,
    fieldToSectionIndex,
  });

  React.useEffect(() => {
    validate(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, validate]);

  const handleSubmit = async () => {
    const parsed = groupedListingFormSchema.safeParse(values);
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    if (needsStorePicker && !storeId) {
      showToast("Pick the store this group belongs to.", "error");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await apiClient.patch(byIdEndpoint(groupId!), parsed.data as unknown as JsonValue);
      } else {
        /*
         * `storeId` is sent ONLY by admin. The seller route derives it from the
         * session and rejects it in the body, which is what stops a seller
         * filing a group under another store.
         */
        const payload = isAdmin ? { ...parsed.data, storeId } : parsed.data;
        const res = await apiClient.post(listEndpoint, payload as unknown as JsonValue);
        const created = (res as { data?: { id?: string } })?.data?.id;
        if (created && onSaved) {
          showToast("Group created.", "success");
          onSaved(created);
          return;
        }
      }
      showToast(isEdit ? "Group updated." : "Group created.", "success");
      if (onSaved) onSaved(groupId ?? "");
      else
        router.push(
          String(isAdmin ? ROUTES.ADMIN.GROUPED_LISTINGS : ROUTES.STORE.GROUPED_LISTINGS),
        );
    } catch (err) {
      const e = normalizeError(err);
      showToast(toUserMessage(e.code, undefined, { fallback: "Failed to save the group." }), "error");
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && existing.isLoading) {
    return <Text color="muted">Loading…</Text>;
  }

  return (
    <Stack gap="md">
      {needsStorePicker ? (
        <FieldSelect
          name="storeId"
          label="Store"
          required
          value={storeId}
          onChange={setStoreId}
          options={[
            { value: "", label: "Select a store…" },
            ...(stores.data ?? []).map((s) => ({
              value: s.id,
              label: s.storeName ?? s.id,
            })),
          ]}
        />
      ) : null}

      <FormShellContext.Provider value={shellCtx}>
        <FormErrorSummary />
        <SectionForm<GroupedListingFormValues>
          sections={sections}
          values={values}
          onChange={update}
          onSubmit={handleSubmit}
          schema={groupedListingFormSchema}
          openIds={openIds}
          onOpenChange={setOpenIds}
          submitLabel={isEdit ? "Save changes" : "Create group"}
          isLoading={saving}
          onCancel={onCancel}
        />
      </FormShellContext.Provider>
    </Stack>
  );
}
