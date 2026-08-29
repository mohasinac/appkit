"use client";

import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardBody, ConfirmDeleteModal, Div, Input, PaginatedSelect, Stack, StackedViewShell, Text, Toggle, useToast, Show, StickyToolbar } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { CategoryQuickCreateForm } from "./CategoryQuickCreateForm";
import { FieldInput, FormErrorSummary, FormShellContext, useFormShellState } from "../../../ui/forms";
import { SectionForm, useSectionFormNav, type SectionDef } from "../../shell";

/**
 * Covers every field the form actually edits.
 *
 * It previously declared four of seven and carried `.passthrough()`, so
 * `description`, `order` and `showInMenu` were unvalidated — and `order` is
 * typed by hand into a text input and sent through `Number()`.
 */
const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required").max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits and hyphens only")
    .optional()
    .or(z.literal("")),
  description: z.string().max(500, "Keep the description under 500 characters").optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
  order: z
    .string()
    .regex(/^\d*$/, "Display order must be a whole number")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().optional(),
  showInMenu: z.boolean().optional(),
});

/**
 * Declared rather than `z.infer`d: the schema marks most fields optional (an
 * empty string is a legitimate value), but the DRAFT always holds a concrete
 * one. Inferring would give every field `| undefined`, which no longer satisfies
 * `Record<string, JsonValue>` and would push a `?? ""` into every render.
 */
interface CategoryFormValues {
  [key: string]: JsonValue;
  name: string;
  slug: string;
  description: string;
  parentId: string;
  order: string;
  isActive: boolean;
  showInMenu: boolean;
}

const EMPTY_VALUES: CategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  parentId: "",
  order: "",
  isActive: true,
  showInMenu: true,
};

const __P = {
  p4: "p-[var(--appkit-space-4)]",
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

  const [values, setValues] = React.useState<CategoryFormValues>(EMPTY_VALUES);
  /* UI state, not a form value — whether the user has taken the slug over. */
  const [slugManual, setSlugManual] = React.useState(false);
  const { showToast } = useToast();

  const handleChange = React.useCallback((partial: Partial<CategoryFormValues>) => {
    setValues((prev) => {
      // Object.assign, not a spread: spreading a `Partial<T>` widens every
      // property to `| undefined`, which no longer satisfies the index
      // signature. The intersection Object.assign returns does.
      const next: CategoryFormValues = Object.assign({}, prev, partial);
      // Slug tracks the name until the user edits it, and `slugManual` is what
      // stops it snapping back afterwards.
      if (partial.name !== undefined && !slugManual) next.slug = toCategorySlug(String(partial.name));
      return next;
    });
  }, [slugManual]);

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
    setSlugManual(true);
    setValues({
      name: cat.name ?? "",
      slug: cat.slug ?? "",
      description: cat.description ?? "",
      parentId:
        (cat as any).parentId ??
        (cat as any).parentIds?.[(cat as any).parentIds?.length - 1] ??
        "",
      order: cat.order !== undefined ? String(cat.order) : "",
      isActive: cat.isActive ?? true,
      showInMenu: cat.display?.showInMenu ?? true,
    });
  }, [categoryQuery.data]);

  const saveMutation = useApiMutation({
    errorMessage: "Failed to save category.",
    mutationFn: async () => {
      const name = String(values.name ?? "");
      const payload: CategoryPayload = {
        name,
        slug: String(values.slug ?? "") || toCategorySlug(name),
        description: String(values.description ?? "") || undefined,
        parentId: String(values.parentId ?? "") || undefined,
        order: values.order !== "" && values.order !== undefined ? Number(values.order) : undefined,
        isActive: values.isActive ?? true,
        display: { showInMenu: values.showInMenu ?? true },
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
  });

  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete category.",
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.CATEGORY_BY_ID(categoryId!)),
    onSuccess: () => {
      showToast("Category deleted.", "success");
      if (onDeleted) onDeleted();
    },
  });

  const isSubmitting = saveMutation.isPending || categoryQuery.isLoading;

  /*
   * The sections. Order comes from `required` first, then the group band
   * (`basics` -> required, `visibility` -> visibility), so "mandatory first,
   * least important last" needs no per-form sectionOrder.
   *
   * `fields` is what makes the error summary's jump links and the per-section
   * error badge work — it is the map from a Zod path back to the panel holding
   * that control.
   */
  const sections = React.useMemo<SectionDef<CategoryFormValues>[]>(() => [
    {
      id: "basics",
      label: "Identity",
      required: true,
      fields: ["name", "slug", "description", "parentId"],
      render: ({ values: v, onChange, errors }) => (
        <Stack gap="md">
          <Div layout="grid" gap="4" className="sm:grid-cols-2">
            <FieldInput
              name="name"
              label="Category name"
              value={String(v.name ?? "")}
              onChange={(val) => onChange({ name: val })}
              required
              placeholder="e.g. Toys & Games"
              error={errors.name}
            />
            <Input
              label="Slug"
              value={String(v.slug ?? "")}
              onChange={(e) => {
                setSlugManual(true);
                onChange({ slug: e.target.value });
              }}
              placeholder="toys-and-games"
              helperText="Auto-generated from the name until you edit it. Used in URLs."
              error={errors.slug}
            />
          </Div>
          <Input
            label="Description"
            value={String(v.description ?? "")}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Brief description of the category"
            error={errors.description}
          />
          <Stack gap="xs">
            <Text size="sm" weight="medium" color="muted">
              Parent category
            </Text>
            <PaginatedSelect
              value={String(v.parentId ?? "") || null}
              onChange={(val) => onChange({ parentId: val ?? "" })}
              loadOptions={loadCategoryOptions}
              placeholder="Search categories… (leave empty for root)"
              searchPlaceholder="Type category name…"
              noResultsText="No categories found"
              ariaLabel="Parent category"
              createLabel="Category"
              renderCreateForm={({ onCreated, onCancel }) => (
                <CategoryQuickCreateForm
                  onSaved={(id, n) => {
                    onChange({ parentId: id });
                    onCreated({ value: id, label: n });
                  }}
                  onCancel={onCancel}
                />
              )}
            />
            <Text size="xs" color="muted">
              Leave empty to create a root category.
            </Text>
          </Stack>
        </Stack>
      ),
    },
    {
      id: "visibility",
      label: "Display",
      fields: ["order", "isActive", "showInMenu"],
      render: ({ values: v, onChange, errors }) => (
        <Stack gap="md">
          <Input
            label="Display order"
            value={String(v.order ?? "")}
            onChange={(e) => onChange({ order: e.target.value })}
            type="number"
            min={0}
            placeholder="0"
            error={errors.order}
          />
          <Toggle
            label="Active"
            checked={v.isActive ?? true}
            onChange={(checked) => onChange({ isActive: checked })}
          />
          <Toggle
            label="Show in menu"
            checked={v.showInMenu ?? true}
            onChange={(checked) => onChange({ showInMenu: checked })}
          />
        </Stack>
      ),
    },
  ], []);

  const nav = useSectionFormNav(sections, values);
  const { shellCtx } = useFormShellState(categoryFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  /*
   * The sidebar is STATUS ONLY now.
   *
   * It used to carry its own Save and Delete, and the Save was dead: it was
   * `type="submit"` against a `<Form onSubmit={(e) => e.preventDefault()}>`
   * with no onClick of its own, while the only call to `saveMutation.mutate()`
   * lived in a second, `lg:hidden` button row. The two were mutually exclusive
   * by breakpoint, so on any desktop viewport the admin category editor could
   * not save at all. One action list rendered twice is what makes that
   * unrepresentable.
   */
  const actionSidebar = (
    <FormShellContext.Provider value={shellCtx}>
      <Card variant="outlined" padding="md" spacing="sm">
        <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">
          Status
        </Text>
        <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
          {isEdit ? (values.isActive ? "Active" : "Inactive") : "New"}
        </Text>
        <FormErrorSummary />
      </Card>
    </FormShellContext.Provider>
  );

  const formContent = (
    <FormShellContext.Provider value={shellCtx}>
      <SectionForm<CategoryFormValues>
        sections={sections}
        values={values}
        onChange={handleChange}
        onSubmit={() => saveMutation.mutate()}
        schema={categoryFormSchema}
        openIds={nav.openIds}
        onOpenChange={nav.setOpenIds}
        isLoading={isSubmitting}
        submitLabel={isEdit ? "Save changes" : "Create category"}
        destructiveAction={
          isEdit
            ? {
                label: "Delete category",
                onClick: () => setDeleteOpen(true),
                disabled: deleteMutation.isPending,
              }
            : undefined
        }
      />
    </FormShellContext.Provider>
  );


  if (embedded) {
    return <Div className={`${__O.yAuto} ${__P.p4}`}>{formContent}</Div>;
  }

  const twoPanel = (
    <Div layout="grid" gap="6" lgAlign="start" className="lg:grid-cols-[1fr_280px]">
      <CardBody className="min-w-0 space-y-6 p-[var(--appkit-space-0)]">{formContent}</CardBody>
      <Show above="lg">
        <StickyToolbar offset="header" tone="default" border={false} padding="none">
          {actionSidebar}
        </StickyToolbar>
      </Show>
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
