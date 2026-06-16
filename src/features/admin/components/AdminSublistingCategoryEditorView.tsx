"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Button,
  ConfirmDeleteModal,
  Div,
  Form,
  Input,
  StackedViewShell,
  useToast,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { FieldInput, FormShellContext, useFormShellState } from "../../../ui/forms";

const sublistingCategoryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Lowercase letters, digits and hyphens only").optional().or(z.literal("")),
  parentId: z.string().nullable().optional(),
}).passthrough();
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

  const [name, setName] = React.useState("");
  const [itemCode, setItemCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [coverImage, setCoverImage] = React.useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

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
    setName(cat.name ?? "");
    setItemCode(cat.itemCode ?? "");
    setDescription(cat.description ?? "");
    setCoverImage(cat.coverImage ?? "");
  }, [categoryQuery.data]);

  const saveMutation = useApiMutation({
    mutationFn: async () => {
      const payload: CategoryPayload = {
        name,
        itemCode: itemCode || undefined,
        description: description || undefined,
        coverImage: coverImage || undefined,
      };
      if (isEdit) {
        return apiClient.put(ADMIN_ENDPOINTS.SUBLISTING_CATEGORY_BY_ID(categoryId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.SUBLISTING_CATEGORIES, payload);
    },
    onSuccess: (res: unknown) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? categoryId;
      showToast(isEdit ? "Category updated." : "Category created.", "success");
      if (onSaved && id) onSaved(String(id));
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to save category.", "error");
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: () =>
      apiClient.delete(ADMIN_ENDPOINTS.SUBLISTING_CATEGORY_BY_ID(categoryId!)),
    onSuccess: () => {
      showToast("Category deleted. All linked listings were unlinked.", "success");
      if (onDeleted) onDeleted();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to delete category.", "error");
    },
  });

  const { upload } = useMediaUpload();
  const isSubmitting = saveMutation.isPending || categoryQuery.isLoading;
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(sublistingCategoryFormSchema);

  return (
    <>
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Sub-listing Category" : "New Sub-listing Category"}
      sections={[
        <FormShellContext.Provider key="sc-ctx" value={shellCtx}>
        <Form
          key="sc-editor-form"
          onSubmit={(e) => {
            e.preventDefault();
            clearErrors();
            if (!name.trim()) { setFieldError("name", "Category name is required"); return; }
            saveMutation.mutate();
          }} spacing="md">
          <Div className="grid sm:grid-cols-2 gap-4">
            <FieldInput
              name="name"
              label="Category name"
              value={name}
              onChange={(v) => setName(v)}
              required
              placeholder="e.g. Base Set Charizard 108/120"
            />
            <Input
              label="Item code"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              placeholder="e.g. PSA 10, 108/120, STH"
              helperText="Grade, card number, or series code. Optional."
            />
          </Div>

          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description shown on the public category page"
          />

          <ImageUpload
            label="Cover image"
            currentImage={coverImage}
            onUpload={(file) =>
              upload(file, "sublisting-categories", true, {
                type: "category-image",
                name: name || "sublisting",
              })
            }
            onChange={setCoverImage}
          />

          <Div className="flex gap-3" padding="t-xs">
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!name || isSubmitting}
            >
              {isEdit ? "Save changes" : "Create category"}
            </Button>
            {isEdit && (
              <Button
                type="button"
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete
              </Button>
            )}
          </Div>
        </Form>
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
