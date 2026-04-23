"use client"
import { Select, Label, Button, SideDrawer } from "../../../ui";
import { useState, useCallback } from "react";
import { useCategories, useCreateCategory } from "../hooks/useCategorySelector";
import { useMessage } from "../../../react";
import { flattenCategories, type Category } from "../types";
import { DrawerFormFooter } from "../../admin/components/DrawerFormFooter";
import { CategoryForm } from "./CategoryForm";
import type { CategoryFormLabels } from "./CategoryForm";

export interface CategorySelectorCreateLabels {
  selectPlaceholder?: string;
  addCategory?: string;
  successCreated?: string;
  form?: CategoryFormLabels;
}

export interface CategorySelectorCreateProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  label?: string;
  labels?: CategorySelectorCreateLabels;
  /** Tailwind spacing class for the inline create form stack */
  stackClassName?: string;
}

const DEFAULT_LABELS: Required<CategorySelectorCreateLabels> = {
  selectPlaceholder: "Select category…",
  addCategory: "+ Add category",
  successCreated: "Category created",
  form: {},
};

function CreateCategoryContent({
  allCategories,
  onSuccess,
  onCancel,
  labels,
  stackClassName,
}: {
  allCategories: Category[];
  onSuccess: (id: string) => void;
  onCancel: () => void;
  labels: Required<CategorySelectorCreateLabels>;
  stackClassName: string;
}) {
  const { showSuccess, showError } = useMessage();
  const [draft, setDraft] = useState<Partial<Category>>({
    isActive: true,
    showOnHomepage: false,
    parentId: null,
    order: 0,
  });

  const { mutate, isPending: isLoading } = useCreateCategory({
    onSuccess: (res: unknown) => {
      showSuccess(labels.successCreated);
      onSuccess((res as { id?: string })?.id ?? "");
    },
    onError: (err: Error) => showError(err.message),
  });

  const handleSave = useCallback(() => {
    if (!draft.name) return;
    mutate(draft);
  }, [draft, mutate]);

  return (
    <div className={stackClassName} data-section="categoryselectorcreate-div-266">
      <CategoryForm
        category={draft}
        allCategories={allCategories}
        onChange={setDraft}
        labels={labels.form}
        stackClassName={stackClassName}
      />
      <DrawerFormFooter
        variant="inline"
        isLoading={isLoading}
        onSubmit={handleSave}
        onCancel={onCancel}
        isSubmitDisabled={!draft.name}
      />
    </div>
  );
}

export function CategorySelectorCreate({
  value,
  onChange,
  disabled = false,
  label,
  labels = {},
  stackClassName = "space-y-4",
}: CategorySelectorCreateProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const L = { ...DEFAULT_LABELS, ...labels };

  const { categories: rawCategories, isLoading, refetch } = useCategories();
  const categories = rawCategories as unknown as Category[];
  const flat = flattenCategories(categories);

  const handleSuccess = useCallback(
    (newId: string) => {
      setDrawerOpen(false);
      refetch();
      if (newId) onChange(newId);
    },
    [onChange, refetch],
  );

  return (
    <>
      <div data-section="categoryselectorcreate-div-267">
        {label && <Label className="mb-1.5">{label}</Label>}
        <div className="flex gap-2 items-center" data-section="categoryselectorcreate-div-268">
          <div className="flex-1" data-section="categoryselectorcreate-div-269">
            <Select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled || isLoading}
              aria-label={label ?? "Category"}
              options={[
                { value: "", label: L.selectPlaceholder },
                ...flat.map((cat) => ({
                  value: cat.id,
                  label: "\u00a0\u00a0".repeat(cat.tier) + cat.name,
                })),
              ]}
            />
          </div>

          {!disabled && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-haspopup="dialog"
            >
              {L.addCategory}
            </Button>
          )}
        </div>
      </div>

      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={L.addCategory}
        mode="create"
      >
        <CreateCategoryContent
          allCategories={categories}
          onSuccess={handleSuccess}
          onCancel={() => setDrawerOpen(false)}
          labels={L}
          stackClassName={stackClassName}
        />
      </SideDrawer>
    </>
  );
}
