"use client";

import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  ConfirmDeleteModal,
  Div,
  Input,
  Stack,
  StackedViewShell,
  useToast,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { FieldInput, FormErrorSummary, FormShellContext, useFormShellState } from "../../../ui/forms";
import { SectionForm, useSectionFormNav, type SectionDef } from "../../shell";

/**
 * Describes the fields this form actually edits.
 *
 * It previously declared `slug` and `parentId` — neither of which the form has
 * a control for or ever sends — while omitting `itemCode`, `description` and
 * `coverImage`, which it does send. `.passthrough()` let the three real fields
 * through unvalidated, and the two phantom ones were `.optional()`, so the
 * mismatch never produced an error: validation was only ever checking `name`.
 */
const sublistingCategoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required").max(120),
  itemCode: z.string().max(60, "Keep the item code under 60 characters").optional().or(z.literal("")),
  description: z.string().max(500, "Keep the description under 500 characters").optional().or(z.literal("")),
  coverImage: z.string().optional().or(z.literal("")),
});

interface SublistingCategoryFormValues {
  [key: string]: JsonValue;
  name: string;
  itemCode: string;
  description: string;
  coverImage: string;
}

const EMPTY_VALUES: SublistingCategoryFormValues = {
  name: "",
  itemCode: "",
  description: "",
  coverImage: "",
};
import { ImageUpload } from "../../media/upload/ImageUpload";
import { useMediaUpload } from "../../media";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

export interface AdminSublistingCategoryEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  categoryId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}

interface CategoryPayload {
  name: string;
  itemCode?: string;
  description?: string;
  coverImage?: string;
}

export function AdminSublistingCategoryEditorView({
  categoryId,
  onSaved,
  onDeleted,
  ...rest
}: AdminSublistingCategoryEditorViewProps) {
  const isEdit = Boolean(categoryId);
  const { showToast } = useToast();

  const [values, setValues] = React.useState<SublistingCategoryFormValues>(EMPTY_VALUES);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const handleChange = React.useCallback(
    (partial: Partial<SublistingCategoryFormValues>) => {
      setValues((prev) => Object.assign({}, prev, partial));
    },
    [],
  );

  const categoryQuery = useQuery({
    queryKey: ["admin", "sublisting-category", categoryId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.SUBLISTING_CATEGORY_BY_ID(categoryId!));
      return (res as any)?.data ?? res;
    },
    enabled: isEdit,
  });

  React.useEffect(() => {
    const cat = categoryQuery.data as CategoryPayload & { id?: string } | undefined;
    if (!cat) return;
    setValues({
      name: cat.name ?? "",
      itemCode: cat.itemCode ?? "",
      description: cat.description ?? "",
      coverImage: cat.coverImage ?? "",
    });
  }, [categoryQuery.data]);

  const saveMutation = useApiMutation({
    errorMessage: "Failed to save category.",
    mutationFn: async () => {
      const payload: CategoryPayload = {
        name: values.name,
        itemCode: values.itemCode || undefined,
        description: values.description || undefined,
        coverImage: values.coverImage || undefined,
      };
      if (isEdit) {
        return apiClient.put(ADMIN_ENDPOINTS.SUBLISTING_CATEGORY_BY_ID(categoryId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.SUBLISTING_CATEGORIES, payload);
    },
    onSuccess: (res: JsonValue) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? categoryId;
      showToast(isEdit ? "Category updated." : "Category created.", "success");
      if (onSaved && id) onSaved(String(id));
    },
  });

  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete category.",
    mutationFn: () =>
      apiClient.delete(ADMIN_ENDPOINTS.SUBLISTING_CATEGORY_BY_ID(categoryId!)),
    onSuccess: () => {
      showToast("Category deleted. All linked listings were unlinked.", "success");
      if (onDeleted) onDeleted();
    },
  });

  const { upload } = useMediaUpload();
  const isSubmitting = saveMutation.isPending || categoryQuery.isLoading;

  const sections = React.useMemo<SectionDef<SublistingCategoryFormValues>[]>(() => [
    {
      id: "basics",
      label: "Details",
      required: true,
      fields: ["name", "itemCode", "description"],
      render: ({ values: v, onChange, errors }) => (
        <Stack gap="md">
          <Div layout="grid" gap="4" className="sm:grid-cols-2">
            <FieldInput
              name="name"
              label="Category name"
              value={String(v.name ?? "")}
              onChange={(val) => onChange({ name: val })}
              required
              placeholder="e.g. Base Set Charizard 108/120"
              error={errors.name}
            />
            <Input
              label="Item code"
              value={String(v.itemCode ?? "")}
              onChange={(e) => onChange({ itemCode: e.target.value })}
              placeholder="e.g. PSA 10, 108/120, STH"
              helperText="Grade, card number, or series code. Optional."
              error={errors.itemCode}
            />
          </Div>
          <Input
            label="Description"
            value={String(v.description ?? "")}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Brief description shown on the public category page"
            error={errors.description}
          />
        </Stack>
      ),
    },
    {
      id: "media",
      label: "Cover image",
      fields: ["coverImage"],
      // The upload holds uncommitted state while a file is in flight, so the
      // panel must survive being collapsed.
      keepMounted: true,
      render: ({ values: v, onChange }) => (
        <ImageUpload
          label="Cover image"
          currentImage={String(v.coverImage ?? "")}
          onUpload={(file) =>
            upload(file, "sublisting-categories", true, {
              type: "category-image",
              name: String(v.name ?? "") || "sublisting",
            })
          }
          onChange={(url) => onChange({ coverImage: url })}
        />
      ),
    },
  ], [upload]);

  const nav = useSectionFormNav(sections, values);
  const { shellCtx } = useFormShellState(sublistingCategoryFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  return (
    <>
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Sub-listing Category" : "New Sub-listing Category"}
      sections={[
        <FormShellContext.Provider key="sc-editor-form" value={shellCtx}>
          <FormErrorSummary />
          <SectionForm<SublistingCategoryFormValues>
            sections={sections}
            values={values}
            onChange={handleChange}
            onSubmit={() => saveMutation.mutate()}
            schema={sublistingCategoryFormSchema}
            openIds={nav.openIds}
            onOpenChange={nav.setOpenIds}
            isLoading={isSubmitting}
            submitLabel={isEdit ? "Save changes" : "Create category"}
            destructiveAction={
              isEdit
                ? {
                    label: "Delete",
                    onClick: () => setDeleteConfirmOpen(true),
                    disabled: deleteMutation.isPending,
                  }
                : undefined
            }
          />
        </FormShellContext.Provider>,
      ]}
    />
    {deleteConfirmOpen && (
      <ConfirmDeleteModal
        isOpen
        title="Delete Sublisting Category"
        message="Delete this category? All linked listings will be unlinked. This cannot be undone."
        onConfirm={() => { deleteMutation.mutate(); setDeleteConfirmOpen(false); }}
        onClose={() => setDeleteConfirmOpen(false)}
        isDeleting={deleteMutation.isPending}
      />
    )}
    </>
  );
}
