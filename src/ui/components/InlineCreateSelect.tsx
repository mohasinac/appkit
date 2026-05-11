"use client"
import React, { ReactNode, useState } from "react";
import type { DynamicSelectOption, DynamicSelectProps, AsyncPage } from "./DynamicSelect";
import { DynamicSelect } from "./DynamicSelect";
import { SideDrawer } from "./SideDrawer";
import { Button } from "./Button";
import { QuickFormDrawer } from "../../features/shell/QuickFormDrawer";
import type { QuickFieldDef } from "../../features/shell/QuickFormDrawer";

export interface InlineCreateSelectProps<V = string> extends DynamicSelectProps<V> {
  /** Label for the "+ Create new …" button shown at the bottom of the dropdown. */
  createLabel?: string;
  /** Title shown in the create-form drawer header. Defaults to `createLabel`. */
  drawerTitle?: string;
  /**
   * Render prop for the create form inside a SideDrawer.
   * Call `onCreated` with the new option to close the drawer and auto-select it.
   * Call `onCancel` to discard and close.
   * Mutually exclusive with `createFields` — if both are provided, `renderCreateForm` wins.
   */
  renderCreateForm?: (props: {
    onCreated: (option: DynamicSelectOption<V>) => void;
    onCancel: () => void;
  }) => ReactNode;
  /**
   * Auto-generates a QuickFormDrawer from FieldDef[].
   * Used when the create form is simple (≤ 5 fields with no custom logic).
   * `onCreateSubmit` is called on submit — must return the newly created option.
   */
  createFields?: QuickFieldDef[];
  onCreateSubmit?: (values: Record<string, unknown>) => Promise<DynamicSelectOption<V>>;
  createSubmitLabel?: string;
}

/**
 * InlineCreateSelect — extends DynamicSelect with a "+ Create new" button
 * that opens a SideDrawer containing an inline create form.
 *
 * @example
 * ```tsx
 * <InlineCreateSelect
 *   value={categoryId}
 *   onChange={(v) => setCategoryId(v)}
 *   loadOptions={loadCategoryOptions}
 *   createLabel="Category"
 *   renderCreateForm={({ onCreated, onCancel }) => (
 *     <CategoryForm
 *       onSuccess={(cat) => onCreated({ value: cat.id, label: cat.name })}
 *       onCancel={onCancel}
 *     />
 *   )}
 * />
 * ```
 */
export function InlineCreateSelect<V = string>({
  createLabel = "item",
  drawerTitle,
  renderCreateForm,
  createFields,
  onCreateSubmit,
  createSubmitLabel,
  onChange,
  options,
  loadOptions,
  ...selectProps
}: InlineCreateSelectProps<V>) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasCreate = Boolean(renderCreateForm ?? (createFields && onCreateSubmit));

  function handleCreated(option: DynamicSelectOption<V>) {
    setDrawerOpen(false);
    onChange?.(option.value, option);
  }

  function handleCancel() {
    setDrawerOpen(false);
  }

  // Inject a synthetic "+ Create new" sentinel option at the end of the static list.
  // For async (loadOptions) mode we append the action after the list via a wrapper.
  const CREATE_SENTINEL = "__inline_create__" as unknown as V;

  const augmentedOptions: DynamicSelectOption<V>[] | undefined = hasCreate
    ? [
        ...(options ?? []),
        {
          value: CREATE_SENTINEL,
          label: `+ Create new ${createLabel}`,
        },
      ]
    : options;

  // For async mode, wrap loadOptions to append the sentinel after each page.
  const augmentedLoadOptions = hasCreate && loadOptions
    ? async (query: string, page: number): Promise<AsyncPage<DynamicSelectOption<V>>> => {
        const result = await loadOptions(query, page);
        const sentinel: DynamicSelectOption<V> = {
          value: CREATE_SENTINEL,
          label: `+ Create new ${createLabel}`,
        };
        return {
          ...result,
          items: [...result.items, sentinel],
        };
      }
    : loadOptions;

  function handleChange(value: V | null, option: DynamicSelectOption<V> | null) {
    if (value === CREATE_SENTINEL) {
      setDrawerOpen(true);
      return;
    }
    onChange?.(value, option);
  }

  return (
    <>
      <DynamicSelect<V>
        {...selectProps}
        options={augmentedOptions}
        loadOptions={augmentedLoadOptions}
        onChange={handleChange}
      />

      {renderCreateForm ? (
        <SideDrawer
          isOpen={drawerOpen}
          onClose={handleCancel}
          title={drawerTitle ?? `Create ${createLabel}`}
          mode="create"
          footer={
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
          }
        >
          {renderCreateForm({ onCreated: handleCreated, onCancel: handleCancel })}
        </SideDrawer>
      ) : createFields && onCreateSubmit ? (
        <QuickFormDrawer
          isOpen={drawerOpen}
          onClose={handleCancel}
          title={drawerTitle ?? `Create ${createLabel}`}
          fields={createFields}
          submitLabel={createSubmitLabel ?? `Create ${createLabel}`}
          onSubmit={async (values) => {
            const option = await onCreateSubmit(values);
            handleCreated(option);
          }}
        />
      ) : null}
    </>
  );
}
