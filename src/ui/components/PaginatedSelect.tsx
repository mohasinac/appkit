"use client";
import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Input } from "./Input";
import { SideDrawer } from "./SideDrawer";
import { Button } from "./Button";
import { QuickFormDrawer } from "../../features/shell/QuickFormDrawer";
import type { QuickFieldDef } from "../../features/shell/QuickFormDrawer";

export interface PaginatedSelectOption<V = string> {
  value: V;
  label: string;
  meta?: Record<string, unknown>;
}

export interface AsyncPage<T> {
  items: T[];
  hasMore: boolean;
  nextPage?: number;
}

interface BaseProps<V> {
  options?: PaginatedSelectOption<V>[];
  loadOptions?: (
    query: string,
    page: number,
  ) => Promise<AsyncPage<PaginatedSelectOption<V>>>;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  /** "+ Create new …" button. Provide `renderCreateForm` OR (`createFields` + `onCreateSubmit`). */
  createLabel?: string;
  drawerTitle?: string;
  renderCreateForm?: (props: {
    onCreated: (option: PaginatedSelectOption<V>) => void;
    onCancel: () => void;
  }) => ReactNode;
  createFields?: QuickFieldDef[];
  onCreateSubmit?: (
    values: Record<string, unknown>,
  ) => Promise<PaginatedSelectOption<V>>;
  createSubmitLabel?: string;
}

interface SingleProps<V> extends BaseProps<V> {
  multiple?: false;
  value?: V | null;
  onChange?: (value: V | null, option: PaginatedSelectOption<V> | null) => void;
}

interface MultiProps<V> extends BaseProps<V> {
  multiple: true;
  value: V[];
  onChange: (values: V[], options: PaginatedSelectOption<V>[]) => void;
  maxChipsVisible?: number;
}

export type PaginatedSelectProps<V = string> = SingleProps<V> | MultiProps<V>;

const C = {
  root: "appkit-ps",
  chips: "appkit-ps__chips",
  chip: "appkit-ps__chip",
  chipLabel: "appkit-ps__chip-label",
  chipRemove: "appkit-ps__chip-remove",
  overflowChip: "appkit-ps__overflow-chip",
  trigger: "appkit-ps__trigger",
  triggerDisabled: "appkit-ps__trigger--disabled",
  placeholder: "appkit-ps__placeholder",
  triggerLeft: "appkit-ps__trigger-left",
  dropdown: "appkit-ps__dropdown",
  search: "appkit-ps__search",
  list: "appkit-ps__list",
  option: "appkit-ps__option",
  optionSelected: "appkit-ps__option--selected",
  checkbox: "appkit-ps__checkbox",
  checkmark: "appkit-ps__checkmark",
  optionLabel: "appkit-ps__option-label",
  empty: "appkit-ps__empty",
  loading: "appkit-ps__loading",
  loadMore: "appkit-ps__load-more",
  createBtn: "appkit-ps__create-btn",
} as const;

const CREATE_SENTINEL = "__paginated_select_create__";

/**
 * PaginatedSelect — searchable, async-paginated select with optional multi-mode
 * and optional inline create-new drawer.
 *
 * @example single-select
 * <PaginatedSelect value={storeId} onChange={setStoreId} loadOptions={loadStores} />
 *
 * @example single-select with inline create
 * <PaginatedSelect
 *   value={categoryId}
 *   onChange={(v) => setCategoryId(v ?? "")}
 *   loadOptions={loadCategories}
 *   createLabel="Category"
 *   renderCreateForm={({ onCreated, onCancel }) => <CategoryForm ... />}
 * />
 *
 * @example multi-select
 * <PaginatedSelect multiple value={tagIds} onChange={setTagIds} loadOptions={loadTags} />
 */
export function PaginatedSelect<V = string>(props: PaginatedSelectProps<V>) {
  const {
    options,
    loadOptions,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    noResultsText = "No results",
    disabled,
    className = "",
    ariaLabel,
    createLabel,
    drawerTitle,
    renderCreateForm,
    createFields,
    onCreateSubmit,
    createSubmitLabel,
  } = props;
  const isMulti = props.multiple === true;
  const maxChipsVisible = isMulti ? (props as MultiProps<V>).maxChipsVisible ?? 3 : 0;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [asyncOptions, setAsyncOptions] = useState<PaginatedSelectOption<V>[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelMap = useRef<Map<V, string>>(new Map());

  const hasCreate = Boolean(
    createLabel && (renderCreateForm ?? (createFields && onCreateSubmit)),
  );
  const resolvedOptions = options ?? asyncOptions;

  resolvedOptions.forEach((o) => labelMap.current.set(o.value, o.label));

  const load = useCallback(
    async (search: string, nextPage: number, reset = false) => {
      if (!loadOptions) return;
      setLoading(true);
      try {
        const response = await loadOptions(search, nextPage);
        setAsyncOptions((prev) => {
          const merged = reset ? response.items : [...prev, ...response.items];
          merged.forEach((o) => labelMap.current.set(o.value, o.label));
          return merged;
        });
        setPage(nextPage);
        setHasMore(response.hasMore);
      } finally {
        setLoading(false);
      }
    },
    [loadOptions],
  );

  useEffect(() => {
    if (!open || !loadOptions) return;
    void load(query, 1, true);
  }, [open, query, load, loadOptions]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeydown);
    };
  }, []);

  const filtered = options
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()),
      )
    : resolvedOptions;

  function isSelected(value: V): boolean {
    if (isMulti) return (props as MultiProps<V>).value.includes(value);
    return (props as SingleProps<V>).value === value;
  }

  function handleSelect(opt: PaginatedSelectOption<V>) {
    if (isMulti) {
      const mp = props as MultiProps<V>;
      const selected = mp.value.includes(opt.value);
      const nextValues = selected
        ? mp.value.filter((v) => v !== opt.value)
        : [...mp.value, opt.value];
      const nextOptions = nextValues.map((v) => {
        const found = resolvedOptions.find((o) => o.value === v);
        return found ?? { value: v, label: labelMap.current.get(v) ?? String(v) };
      });
      mp.onChange(nextValues, nextOptions);
    } else {
      const sp = props as SingleProps<V>;
      sp.onChange?.(opt.value, opt);
      setOpen(false);
    }
  }

  function removeChip(v: V) {
    if (!isMulti) return;
    const mp = props as MultiProps<V>;
    const nextValues = mp.value.filter((x) => x !== v);
    const nextOptions = nextValues.map((x) => {
      const found = resolvedOptions.find((o) => o.value === x);
      return found ?? { value: x, label: labelMap.current.get(x) ?? String(x) };
    });
    mp.onChange(nextValues, nextOptions);
  }

  function handleCreated(option: PaginatedSelectOption<V>) {
    setDrawerOpen(false);
    labelMap.current.set(option.value, option.label);
    if (isMulti) {
      const mp = props as MultiProps<V>;
      const nextValues = [...mp.value, option.value];
      const nextOptions = nextValues.map((v) => {
        const found = resolvedOptions.find((o) => o.value === v);
        return found ?? { value: v, label: labelMap.current.get(v) ?? String(v) };
      });
      mp.onChange(nextValues, nextOptions);
    } else {
      const sp = props as SingleProps<V>;
      sp.onChange?.(option.value, option);
    }
  }

  const triggerLabel = (() => {
    if (isMulti) {
      const mp = props as MultiProps<V>;
      return mp.value.length === 0 ? placeholder : `${mp.value.length} selected`;
    }
    const sp = props as SingleProps<V>;
    if (sp.value == null) return placeholder;
    return (
      resolvedOptions.find((o) => o.value === sp.value)?.label ??
      labelMap.current.get(sp.value) ??
      String(sp.value)
    );
  })();

  const triggerEmpty = isMulti
    ? (props as MultiProps<V>).value.length === 0
    : (props as SingleProps<V>).value == null;

  const multiValue = isMulti ? (props as MultiProps<V>).value : [];
  const visibleChips = multiValue.slice(0, maxChipsVisible);
  const overflowCount = multiValue.length - maxChipsVisible;

  return (
    <>
      <div
        ref={containerRef}
        className={[C.root, className].filter(Boolean).join(" ")}
        aria-label={ariaLabel}
      >
        {/* chips row (multi only) */}
        {isMulti && multiValue.length > 0 && (
          <div className={C.chips}>
            {visibleChips.map((v) => (
              <span key={String(v)} className={C.chip}>
                <span className={C.chipLabel}>
                  {labelMap.current.get(v) ?? String(v)}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    aria-label="Remove"
                    className={C.chipRemove}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChip(v);
                    }}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
            {overflowCount > 0 && (
              <span className={C.overflowChip}>+{overflowCount} more</span>
            )}
          </div>
        )}

        {/* trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={[C.trigger, disabled ? C.triggerDisabled : ""]
            .filter(Boolean)
            .join(" ")}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className={C.triggerLeft}>
            <span className={triggerEmpty ? C.placeholder : ""}>
              {triggerLabel}
            </span>
          </span>
          <span aria-hidden="true">▾</span>
        </button>

        {/* dropdown */}
        {open && (
          <div
            className={C.dropdown}
            role="listbox"
            aria-multiselectable={isMulti || undefined}
          >
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={C.search}
            />
            <ul className={C.list}>
              {filtered.map((opt, idx) => {
                const selected = isSelected(opt.value);
                return (
                  <li key={`${String(opt.value)}-${idx}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={[C.option, selected ? C.optionSelected : ""]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => handleSelect(opt)}
                    >
                      {isMulti && (
                        <span className={C.checkbox} aria-hidden="true">
                          <span className={C.checkmark}>✓</span>
                        </span>
                      )}
                      <span className={C.optionLabel}>{opt.label}</span>
                    </button>
                  </li>
                );
              })}

              {filtered.length === 0 && !loading && (
                <li className={C.empty}>{noResultsText}</li>
              )}

              {loading && <li className={C.loading}>Loading…</li>}{/* audit-spinner-defaults-ok — paginated-select dropdown loader, inline by design */}

              {hasMore && !loading && (
                <li>
                  <button
                    type="button"
                    className={C.loadMore}
                    onClick={() => void load(query, page + 1)}
                  >
                    Load more
                  </button>
                </li>
              )}

              {hasCreate && (
                <li key={CREATE_SENTINEL}>
                  <button
                    type="button"
                    className={C.createBtn}
                    onClick={() => {
                      setOpen(false);
                      setDrawerOpen(true);
                    }}
                  >
                    + Create new {createLabel}
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* create drawer */}
      {hasCreate && renderCreateForm ? (
        <SideDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={drawerTitle ?? `Create ${createLabel}`}
          mode="create"
          footer={
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
          }
        >
          {renderCreateForm({
            onCreated: handleCreated,
            onCancel: () => setDrawerOpen(false),
          })}
        </SideDrawer>
      ) : hasCreate && createFields && onCreateSubmit ? (
        <QuickFormDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
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
