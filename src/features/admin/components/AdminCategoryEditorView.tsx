"use client";

import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, CardBody, ConfirmDeleteModal, Div, Form, PaginatedSelect, Input, StackedViewShell, Text, Toggle, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { CategoryQuickCreateForm } from "./CategoryQuickCreateForm";
import { FieldInput, FormShellContext, useFormShellState } from "../../../ui/forms";

export interface AdminCategoryEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  categoryId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
  embedded?: boolean;
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

async function loadCategoryOptions(query: string, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (query) params.set("q", query);
  const res = await apiClient.get(`${ADMIN_ENDPOINTS.CATEGORIES}?${params.toString()}`);
  // apiClient returns the full response; the route wraps items in successResponse({ data: [...] })
  const payload = (res as any)?.data ?? res;
  const items: { id: string; name: string }[] = payload?.data ?? payload?.items ?? [];
  return {
    items: items.map((c) => ({ value: c.id, label: c.name })),
    hasMore: payload?.hasMore ?? false,
  };
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
  embedded,
  ...rest
}: AdminCategoryEditorViewProps) {
  const isEdit = Boolean(categoryId);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugManual, setSlugManual] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [parentId, setParentId] = React.useState("");
  const [order, setOrder] = React.useState<string>("");
  const [isActive, setIsActive] = React.useState(true);
  const [showInMenu, setShowInMenu] = React.useState(true);
  const { showToast } = useToast();
  const { shellCtx, setFieldError, clearErrors } = useFormShellState();

  const categoryQuery = useQuery({
    queryKey: ["admin", "category", categoryId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.CATEGORY_BY_ID(categoryId!));
      return (res as any)?.data ?? res;
    },
    enabled: isEdit,
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

  const actionSidebar = (
    <Card variant="outlined" padding="md" className="space-y-3">
      <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        Status
      </Text>
      <Text className="text-sm text-[var(--appkit-color-text-muted)]">
        {isEdit ? (isActive ? "Active" : "Inactive") : "New"}
      </Text>
      <Button
        type="submit"
        form="category-editor-form"
        className="w-full"
        isLoading={isSubmitting}
        disabled={!name || isSubmitting}
      >
        {isEdit ? "Save changes" : "Create category"}
      </Button>
      {isEdit && (
        <Button
          type="button"
          variant="danger"
          className="w-full"
          isLoading={deleteMutation.isPending}
          onClick={() => setDeleteOpen(true)}
        >
          Delete category
        </Button>
      )}
    </Card>
  );

  const formContent = (
    <FormShellContext.Provider value={shellCtx}>
    <Form
      id="category-editor-form"
      key="cat-form"
      onSubmit={(e) => {
        e.preventDefault();
        clearErrors();
        if (!name.trim()) { setFieldError("name", "Category name is required"); return; }
        saveMutation.mutate();
      }}
      className="space-y-6"
    >
      {/* ── Identity ── */}
      <Card variant="outlined" padding="lg">
        <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">
          Identity
        </Text>
        <Div className="space-y-4">
          <Div className="grid sm:grid-cols-2 gap-4">
            <FieldInput
              name="name"
              label="Category name"
              value={name}
              onChange={(v) => handleNameChange(v)}
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
          </Div>
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the category"
          />
          <Div className="flex flex-col gap-1">
            <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Parent category
            </Text>
            <PaginatedSelect
              value={parentId || null}
              onChange={(v) => setParentId(v ?? "")}
              loadOptions={loadCategoryOptions}
              placeholder="Search categories… (leave empty for root)"
              searchPlaceholder="Type category name…"
              noResultsText="No categories found"
              ariaLabel="Parent category"
              createLabel="Category"
              renderCreateForm={({ onCreated, onCancel }) => (
                <CategoryQuickCreateForm
                  onSaved={(id, n) => { setParentId(id); onCreated({ value: id, label: n }); }}
                  onCancel={onCancel}
                />
              )}
            />
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">
              Leave empty to create a root category.
            </Text>
          </Div>
        </Div>
      </Card>

      {/* ── Display ── */}
      <Card variant="outlined" padding="lg">
        <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">
          Display
        </Text>
        <Div className="space-y-4">
          <Input
            label="Display order"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            type="number"
            min={0}
            placeholder="0"
          />
          <Toggle label="Active" checked={isActive} onChange={setIsActive} />
          <Toggle label="Show in menu" checked={showInMenu} onChange={setShowInMenu} />
        </Div>
      </Card>

      {/* Mobile-only action buttons */}
      <Div className="flex gap-3 lg:hidden">
        <Button type="submit" isLoading={isSubmitting} disabled={!name || isSubmitting}>
          {isEdit ? "Save changes" : "Create category"}
        </Button>
        {isEdit && (
          <Button
            type="button"
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => setDeleteOpen(true)}
          >
            Delete category
          </Button>
        )}
      </Div>
    </Form>
    </FormShellContext.Provider>
  );

  if (embedded) {
    return <Div className="overflow-y-auto p-4">{formContent}</Div>;
  }

  const twoPanel = (
    <Div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
      <CardBody className="min-w-0 space-y-6 p-0">{formContent}</CardBody>
      <Div className="hidden lg:block lg:sticky lg:top-[var(--header-height,0px)]">
        {actionSidebar}
      </Div>
    </Div>
  );

  return (
    <>
      <StackedViewShell
        portal="admin"
        {...rest}
        title={isEdit ? "Edit Category" : "Create Category"}
        sections={[twoPanel]}
      />
      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        isDeleting={deleteMutation.isPending}
        title="Delete this category?"
        message="Products in this category will become uncategorized. This action cannot be undone."
        confirmText="Delete category"
        variant="danger"
      />
    </>
  );
}
