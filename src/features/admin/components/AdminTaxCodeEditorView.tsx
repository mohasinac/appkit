"use client";

import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ConfirmDeleteModal, Div, StackedViewShell, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { FormErrorSummary, applyZodIssues } from "../../../ui/forms";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { buildSectionsFromSchema, visibleValues } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import {
  taxCodeFormSchema,
  GST_RATE_OPTIONS,
  HSN_CHAPTER_OPTIONS,
} from "../../tax-codes/schemas/tax-code-form";

const __P = { p4: "p-[var(--appkit-space-4)]" } as const;
const __O = { yAuto: "overflow-y-auto" } as const;

/**
 * 🛑 The delete copy says what the server will actually do.
 *
 * `DELETE /api/admin/tax-codes/[id]` REFUSES with a 409 while any category
 * still points here, and names the referrers. Promising an unconditional
 * delete and then showing a 409 is how a confirmation dialog loses its
 * meaning — and the honest alternative (deactivate) is the one an admin
 * usually wants anyway, since an inactive code is already skipped by
 * `findResolvable` and gone from every picker.
 */
const DELETE_CONFIRM_TEXT =
  "Delete this tax code? This is refused while any category still points at it — " +
  "set it inactive instead to retire it without breaking those categories.";

const TOAST = {
  CREATED: "Tax code created.",
  UPDATED: "Tax code updated.",
  DELETED: "Tax code deleted.",
} as const;

interface Values {
  [key: string]: unknown;
  label: string;
  hsnCode: string;
  gstRate: string;
  chapter: string;
  description: string;
  notes: string;
  isActive: boolean;
}

interface TaxCodePayload {
  id?: string;
  label: string;
  hsnCode?: string;
  gstRate: number;
  chapter?: string;
  description?: string;
  notes?: string;
  isActive: boolean;
}

export interface AdminTaxCodeEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  taxCodeId?: string;
  /** When true, omit the StackedViewShell wrapper (SideDrawer body). */
  embedded?: boolean;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}

export function AdminTaxCodeEditorView({
  taxCodeId,
  embedded,
  onSaved,
  onDeleted,
  ...rest
}: AdminTaxCodeEditorViewProps) {
  const isEdit = Boolean(taxCodeId);
  const { showToast } = useToast();

  const [form, setForm] = React.useState<Values>({
    label: "",
    hsnCode: "",
    // The default rate is the one 70 of this catalogue's products need.
    gstRate: "5",
    chapter: "9503",
    description: "",
    notes: "",
    isActive: true,
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const patch = (partial: Partial<Values>) =>
    setForm((prev) => Object.assign({}, prev, partial));

  const codeQuery = useQuery({
    queryKey: ["admin", "tax-code", taxCodeId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.TAX_CODE_BY_ID(taxCodeId!));
      return (res as { data?: JsonValue })?.data ?? res;
    },
    enabled: isEdit,
  });

  React.useEffect(() => {
    const t = codeQuery.data as TaxCodePayload | undefined;
    if (!t) return;
    patch({
      label: t.label ?? "",
      hsnCode: t.hsnCode ?? "",
      /*
       * `?? 5` would be wrong here and the distinction is the whole point of
       * this field: rate 0 is a DELIBERATE exemption, and `t.gstRate ?? 5`
       * would silently re-rate an exempt row to 5% the moment an admin opened
       * it and saved anything. Test for null, not falsiness.
       */
      gstRate: t.gstRate == null ? "5" : String(t.gstRate),
      chapter: t.chapter ?? "",
      description: t.description ?? "",
      notes: t.notes ?? "",
      isActive: t.isActive ?? true,
    });
  }, [codeQuery.data]);

  const saveMutation = useApiMutation({
    errorMessage: "Failed to save tax code.",
    mutationFn: async () => {
      const payload: TaxCodePayload = {
        label: form.label,
        hsnCode: form.hsnCode.trim() || undefined,
        gstRate: Number(form.gstRate),
        chapter: form.chapter || undefined,
        description: form.description || undefined,
        notes: form.notes || undefined,
        isActive: form.isActive,
      };
      /*
       * PATCH, not PUT — the route is `.strict()` and partial by design, so a
       * PUT would 404. (`AdminFeatureEditorView` uses PUT because ITS route
       * declares PUT; copying the verb rather than reading the route is how
       * that kind of mismatch ships.)
       */
      if (isEdit) {
        return apiClient.patch(ADMIN_ENDPOINTS.TAX_CODE_BY_ID(taxCodeId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.TAX_CODES, payload);
    },
    onSuccess: (res: JsonValue) => {
      const id =
        (res as { data?: { id?: string } })?.data?.id ??
        (res as { id?: string })?.id ??
        taxCodeId;
      showToast(isEdit ? TOAST.UPDATED : TOAST.CREATED, "success");
      if (onSaved && id) onSaved(String(id));
    },
  });

  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete tax code.",
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.TAX_CODE_BY_ID(taxCodeId!)),
    onSuccess: () => {
      showToast(TOAST.DELETED, "success");
      if (onDeleted) onDeleted();
    },
  });

  const isSubmitting = saveMutation.isPending || codeQuery.isLoading;

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<Values>(taxCodeFormSchema, {
        // `FieldUiMeta` has no `options` key — a select's VALUES are schema and
        // its option LIST is supplied here. Same split as the bundle editor.
        options: {
          gstRate: [...GST_RATE_OPTIONS],
          chapter: [{ value: "", label: "No chapter" }, ...HSN_CHAPTER_OPTIONS],
        },
      }),
    [],
  );

  const nav = useSectionFormNav(sections, form, { scope: "admin:tax-code-editor" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(taxCodeFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const onSubmit = () => {
    clearErrors();
    const draft = visibleValues(taxCodeFormSchema, form) as Partial<Values>;
    const parsed = taxCodeFormSchema.safeParse({
      ...draft,
      hsnCode: form.hsnCode.trim() || undefined,
      gstRate: Number(form.gstRate),
      chapter: form.chapter || undefined,
      description: form.description || undefined,
      notes: form.notes || undefined,
    });
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    saveMutation.mutate();
  };

  const formSection = (
    <FormShellContext.Provider value={shellCtx}>
      <FormErrorSummary />
      <SectionForm<Values>
        sections={sections}
        values={form}
        onChange={patch}
        onSubmit={onSubmit}
        schema={taxCodeFormSchema}
        openIds={nav.openIds}
        onOpenChange={nav.setOpenIds}
        isLoading={isSubmitting}
        submitLabel={isEdit ? "Save changes" : "Create tax code"}
        destructiveAction={
          isEdit
            ? { label: "Delete", onClick: () => setDeleteConfirmOpen(true) }
            : undefined
        }
      />
    </FormShellContext.Provider>
  );

  const deleteModal = deleteConfirmOpen && (
    <ConfirmDeleteModal
      isOpen
      title="Delete Tax Code"
      message={DELETE_CONFIRM_TEXT}
      onConfirm={() => {
        deleteMutation.mutate();
        setDeleteConfirmOpen(false);
      }}
      onClose={() => setDeleteConfirmOpen(false)}
      isDeleting={deleteMutation.isPending}
    />
  );

  if (embedded) {
    return (
      <Div className={`${__O.yAuto} ${__P.p4}`}>
        {formSection}
        {deleteModal}
      </Div>
    );
  }

  return (
    <>
      <StackedViewShell
        portal="admin"
        {...rest}
        title={isEdit ? "Edit Tax Code" : "New Tax Code"}
        sections={[formSection]}
      />
      {deleteModal}
    </>
  );
}
