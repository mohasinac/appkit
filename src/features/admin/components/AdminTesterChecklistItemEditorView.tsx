"use client";

/**
 * AdminTesterChecklistItemEditorView — sectionised 2026-08-30.
 *
 * ## What changed, and why it was invisible
 *
 * The schema used to be a five-field `.passthrough()` stub declared in this
 * file, handed to `<Form schema>`, and never parsed — a hand-rolled `canSave`
 * ran instead. Two of the five fields (`groupKey`, `pageKey`) were raw
 * `<Input>` with no `name`, so an error could not have reached them anyway,
 * and `href` — the "Go test this →" deep link — was accepted unchecked while
 * `audit-tester-checklist-hrefs` guards the seeded ones.
 *
 * `canSave` is gone with it. It tested three of eleven fields and disabled the
 * button with no way to tell which one it was waiting on; the schema now
 * reports what is wrong, on the field.
 */

import type { JsonValue } from "@mohasinac/appkit/client";
import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ConfirmDeleteModal, Div, StackedViewShell, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { FieldInput, FormErrorSummary } from "../../../ui/forms";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { buildSectionsFromSchema, visibleValues } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { checklistItemFormSchema } from "../../tester/schemas/checklist-item-form";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

export interface AdminTesterChecklistItemEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  itemId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
  embedded?: boolean;
}

/** The draft this form edits — flat, matching the schema's shape. */
interface Values {
  [key: string]: unknown;
  label: string;
  description: string;
  href: string;
  groupLabel: string;
  groupKey: string;
  pageLabel: string;
  pageKey: string;
  order: number;
  phase: number;
  isActive: boolean;
  adminOnly: boolean;
}

const EMPTY_FORM: Values = {
  label: "",
  description: "",
  href: "",
  groupLabel: "",
  groupKey: "",
  pageLabel: "",
  pageKey: "",
  order: 0,
  phase: 1,
  isActive: true,
  adminOnly: false,
};

/** What the API returns for one checklist item. */
interface ChecklistItemRecord {
  label?: string;
  description?: string;
  href?: string;
  groupLabel?: string;
  groupKey?: string;
  pageLabel?: string;
  pageKey?: string;
  order?: number;
  phase?: number;
  isActive?: boolean;
  adminOnly?: boolean;
}

function slugifyKey(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminTesterChecklistItemEditorView({
  itemId,
  onSaved,
  onDeleted,
  embedded,
  ...rest
}: AdminTesterChecklistItemEditorViewProps) {
  const isEdit = Boolean(itemId);

  const [form, setForm] = React.useState<Values>(EMPTY_FORM);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const patch = (partial: Partial<Values>) =>
    setForm((prev) => Object.assign({}, prev, partial));

  const { showToast } = useToast();

  const itemQuery = useQuery({
    queryKey: ["admin", "tester-checklist-items", itemId],
    queryFn: async () => {
      const res = await apiClient.get(
        ADMIN_ENDPOINTS.TESTER_CHECKLIST_ITEM_BY_ID(itemId!),
      );
      return ((res as { data?: ChecklistItemRecord })?.data ??
        res) as ChecklistItemRecord;
    },
    enabled: isEdit,
  });

  React.useEffect(() => {
    const item = itemQuery.data;
    if (!item) return;
    patch({
      label: item.label ?? "",
      description: item.description ?? "",
      href: item.href ?? "",
      groupLabel: item.groupLabel ?? "",
      groupKey: item.groupKey ?? "",
      pageLabel: item.pageLabel ?? "",
      pageKey: item.pageKey ?? "",
      order: typeof item.order === "number" ? item.order : 0,
      phase: typeof item.phase === "number" ? item.phase : 1,
      isActive: item.isActive ?? true,
      adminOnly: item.adminOnly ?? false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemQuery.data]);

  const saveMutation = useApiMutation({
    errorMessage: "Failed to save checklist item.",
    mutationFn: async () => {
      const draft = visibleValues(checklistItemFormSchema, form) as Values;
      const payload: Record<string, JsonValue> = {
        groupKey: draft.groupKey,
        groupLabel: draft.groupLabel,
        pageKey: draft.pageKey,
        pageLabel: draft.pageLabel,
        label: draft.label,
        description: draft.description,
        href: draft.href,
        order: draft.order,
        phase: draft.phase,
        isActive: draft.isActive,
        adminOnly: draft.adminOnly,
      };
      if (isEdit) {
        return apiClient.put(
          ADMIN_ENDPOINTS.TESTER_CHECKLIST_ITEM_BY_ID(itemId!),
          payload,
        );
      }
      return apiClient.post(ADMIN_ENDPOINTS.TESTER_CHECKLIST_ITEMS, payload);
    },
    onSuccess: (res: JsonValue) => {
      const created = (res as { data?: { id?: string }; id?: string })?.data?.id;
      const id = itemId ?? created;
      showToast(
        isEdit ? "Checklist item updated." : "Checklist item created.",
        "success",
      );
      if (onSaved && id) onSaved(id);
    },
  });

  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete checklist item.",
    mutationFn: () =>
      apiClient.delete(ADMIN_ENDPOINTS.TESTER_CHECKLIST_ITEM_BY_ID(itemId!)),
    onSuccess: () => {
      showToast("Checklist item deleted.", "success");
      if (onDeleted) onDeleted();
    },
  });

  const isSubmitting = saveMutation.isPending || itemQuery.isLoading;

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<Values>(checklistItemFormSchema, {
        renderers: {
          /*
           * The two keys stay editable, and typing a LABEL fills the matching
           * key until the item exists — after that a key is what responses are
           * grouped by, so an edit would orphan them.
           */
          groupLabel: ({ values, onChange, errors }) => (
            <FieldInput
              name="groupLabel"
              label="Group"
              required
              hint="Top-level accordion section on the Tester Hub."
              value={values.groupLabel}
              error={errors.groupLabel}
              onChange={(v) =>
                onChange(
                  isEdit
                    ? { groupLabel: v }
                    : { groupLabel: v, groupKey: slugifyKey(v) },
                )
              }
            />
          ),
          pageLabel: ({ values, onChange, errors }) => (
            <FieldInput
              name="pageLabel"
              label="Page"
              required
              hint="Sub-accordion within the group."
              value={values.pageLabel}
              error={errors.pageLabel}
              onChange={(v) =>
                onChange(
                  isEdit
                    ? { pageLabel: v }
                    : { pageLabel: v, pageKey: slugifyKey(v) },
                )
              }
            />
          ),
        },
      }),
    [isEdit],
  );

  const nav = useSectionFormNav(sections, form, {
    scope: "admin:tester-checklist-item-editor",
  });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(
    checklistItemFormSchema,
    {
      sections: nav.sectionMeta,
      onGoToSection: nav.goToSection,
      fieldToSectionIndex: nav.fieldToSectionIndex,
    },
  );

  const onSubmit = () => {
    clearErrors();
    const parsed = checklistItemFormSchema.safeParse(
      visibleValues(checklistItemFormSchema, form),
    );
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    saveMutation.mutate();
  };

  const formSection = (
    <>
      <FormShellContext.Provider value={shellCtx}>
        <FormErrorSummary />
        <SectionForm<Values>
          sections={sections}
          values={form}
          onChange={patch}
          onSubmit={onSubmit}
          schema={checklistItemFormSchema}
          openIds={nav.openIds}
          onOpenChange={nav.setOpenIds}
          isLoading={isSubmitting}
          submitLabel={isEdit ? "Save changes" : "Create checklist item"}
          destructiveAction={
            isEdit
              ? {
                  label: "Delete checklist item",
                  onClick: () => setDeleteConfirmOpen(true),
                }
              : undefined
          }
        />
      </FormShellContext.Provider>
      {deleteConfirmOpen && (
        <ConfirmDeleteModal
          isOpen
          title={
            ACTIONS.ADMIN["delete-checklist-item"].confirmation?.title ??
            "Delete checklist item"
          }
          message={
            ACTIONS.ADMIN["delete-checklist-item"].confirmation?.body ??
            "Delete this checklist item? This cannot be undone."
          }
          onConfirm={() => {
            deleteMutation.mutate();
            setDeleteConfirmOpen(false);
          }}
          onClose={() => setDeleteConfirmOpen(false)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </>
  );

  if (embedded) {
    return <Div className={`${__O.yAuto} ${__P.p4}`}>{formSection}</Div>;
  }

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit checklist item" : "New checklist item"}
      sections={[formSection]}
    />
  );
}
