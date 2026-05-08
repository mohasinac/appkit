"use client";

import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  Form,
  Input,
  StackedViewShell,
  Toggle,
  useToast,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS, CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";

export interface AdminCategoryEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  categoryId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}

interface CategoryPayload {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  order?: number;
  isActive: boolean;
  display?: { showInMenu: boolean };
}

interface RootCategory {
  id: string;
  name: string;
  slug: string;
}

function toCategorySlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminCategoryEditorView({
  categoryId,
  onSaved,
  onDeleted,
  ...rest
}: AdminCategoryEditorViewProps) {
  const isEdit = Boolean(categoryId);

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugManual, setSlugManual] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [parentId, setParentId] = React.useState("");
  const [order, setOrder] = React.useState<string>("");
  const [isActive, setIsActive] = React.useState(true);
  const [showInMenu, setShowInMenu] = React.useState(true);
  const { showToast } = useToast();

  const categoryQuery = useQuery({
    queryKey: ["admin", "category", categoryId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.CATEGORY_BY_ID(categoryId!));
      return (res as any)?.data ?? res;
    },
    enabled: isEdit,
  });

  const rootCategoriesQuery = useQuery({
    queryKey: ["categories", "root"],
    queryFn: async () => {
      const res = await apiClient.get(CATEGORY_ENDPOINTS.ROOT(100));
      const data = (res as any)?.data ?? res;
      return (Array.isArray(data) ? data : data?.items ?? []) as RootCategory[];
    },
  });

  React.useEffect(() => {
    const cat = categoryQuery.data as CategoryPayload | undefined;
    if (!cat) return;
    setName(cat.name ?? "");
    setSlug(cat.slug ?? "");
    setSlugManual(true);
    setDescription(cat.description ?? "");
    setParentId((cat as any).parentId ?? (cat as any).parentIds?.[(cat as any).parentIds?.length - 1] ?? "");
    setOrder(cat.order !== undefined ? String(cat.order) : "");
    setIsActive(cat.isActive ?? true);
    setShowInMenu(cat.display?.showInMenu ?? true);
  }, [categoryQuery.data]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManual) setSlug(toCategorySlug(value));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: CategoryPayload = {
        name,
        slug: slug || toCategorySlug(name),
        description: description || undefined,
        parentId: parentId || undefined,
        order: order !== "" ? Number(order) : undefined,
        isActive,
        display: { showInMenu },
      };
      if (isEdit) {
        return apiClient.put(ADMIN_ENDPOINTS.CATEGORY_BY_ID(categoryId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.CATEGORIES, payload);
    },
    onSuccess: (res: unknown) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? categoryId;
      showToast(isEdit ? "Category updated." : "Category created.", "success");
      if (onSaved && id) onSaved(id);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to save category.", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.CATEGORY_BY_ID(categoryId!)),
    onSuccess: () => {
      showToast("Category deleted.", "success");
      if (onDeleted) onDeleted();
    },
    onError: (err: unknown) =>
      showToast((err as Error)?.message ?? "Failed to delete category.", "error"),
  });

  const isSubmitting = saveMutation.isPending || categoryQuery.isLoading;
  const rootCategories = rootCategoriesQuery.data ?? [];

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Category" : "Create Category"}
      sections={[
        <Form
          key="cat-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Category name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            placeholder="e.g. Toys & Games"
          />

          <Input
            label="Slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManual(true);
            }}
            placeholder="toys-and-games"
            helperText="Auto-generated from name. Used in URLs."
          />

          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the category"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Parent category</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">— Root (no parent) —</option>
              {rootCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500">
              Leave empty to create a root category.
            </p>
          </div>

          <Input
            label="Display order"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            type="number"
            min={0}
            placeholder="0"
          />

          <Toggle label="Active" checked={isActive} onChange={setIsActive} />

          <Toggle
            label="Show in menu"
            checked={showInMenu}
            onChange={setShowInMenu}
          />

          <div className="flex gap-3 pt-2">
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
                onClick={() => {
                  if (
                    confirm(
                      "Delete this category? Products in this category will become uncategorized.",
                    )
                  ) {
                    deleteMutation.mutate();
                  }
                }}
              >
                Delete category
              </Button>
            )}
          </div>
        </Form>,
      ]}
    />
  );
}
