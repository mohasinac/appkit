"use client";

import { Row } from "@mohasinac/appkit/ui";
import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button, Card, CardBody, ConfirmDeleteModal, Div, Form, Input, PaginatedSelect, Stack, StackedViewShell, Text, Toggle, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { CategoryQuickCreateForm } from "./CategoryQuickCreateForm";
import { FieldInput } from "../../../ui/forms";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required").max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Lowercase letters, digits and hyphens only").optional().or(z.literal("")),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
}).passthrough();

const __P = {
  p4: "p-4",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

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

  const saveMutation = useApiMutation({
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
    onSuccess: (res: JsonValue) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? categoryId;
      showToast(isEdit ? "Category updated." : "Category created.", "success");
      if (onSaved && id) onSaved(id);
    },
    onError: (err: Error) => {
      showToast((err as Error)?.message ?? "Failed to save category.", "error");
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.CATEGORY_BY_ID(categoryId!)),
    onSuccess: () => {
      showToast("Category deleted.", "success");
      if (onDeleted) onDeleted();
    },
    onError: (err: Error) =>
      showToast((err as Error)?.message ?? "Failed to delete category.", "error"),
  });

  const isSubmitting = saveMutation.isPending || categoryQuery.isLoading;

  const actionSidebar = (
    <Card variant="outlined" padding="md" spacing="sm">
      <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">
        Status
      </Text>
      <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
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
    <Form
      id="category-editor-form"
      key="cat-form"
      schema={categoryFormSchema}
      onSubmit={(e) => e.preventDefault()}
      spacing="lg"
    >{({ setFieldError, clearErrors }) => (
      <>
      {/* ── Identity ── */}
      <Card variant="outlined" padding="lg">
        <Text className="tracking-widest mb-4" color="muted" size="xs" weight="semibold" transform="uppercase">
          Identity
        </Text>
        <Stack gap="md">
          <Div layout="grid" gap="4" className="sm:grid-cols-2">
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
          <Stack gap="xs">
            <Text size="sm" weight="medium" color="muted">
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
            <Text size="xs" color="muted">
              Leave empty to create a root category.
            </Text>
          </Stack>
        </Stack>
      </Card>

      {/* ── Display ── */}
      <Card variant="outlined" padding="lg">
        <Text className="tracking-widest mb-4" color="muted" size="xs" weight="semibold" transform="uppercase">
          Display
        </Text>
        <Stack gap="md">
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
        </Stack>
      </Card>

      {/* Mobile-only action buttons */}
      <Row gap="3" className="lg:hidden">
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={!name || isSubmitting}
          onClick={() => {
            clearErrors();
            if (!name.trim()) { setFieldError("name", "Category name is required"); return; }
            saveMutation.mutate();
          }}
        >
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
      </Row>
      </>
    )}</Form>
  );

  if (embedded) {
    return <Div className={`${__O.yAuto} ${__P.p4}`}>{formContent}</Div>;
  }

  const twoPanel = (
    <Div layout="grid" gap="6" lgAlign="start" className="lg:grid-cols-[1fr_280px]">
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
