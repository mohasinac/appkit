"use client"
import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Input } from "./Input";
import { SideDrawer } from "./SideDrawer";
import { Button } from "./Button";
import { QuickFormDrawer } from "../../features/shell/QuickFormDrawer";
import type { QuickFieldDef } from "../../features/shell/QuickFormDrawer";
import type { DynamicSelectOption, AsyncPage } from "./DynamicSelect";

export type { DynamicSelectOption, AsyncPage };

export interface PaginatedMultiSelectProps {
  value: string[];
  onChange: (values: string[], options: DynamicSelectOption[]) => void;
  loadOptions?: (query: string, page: number) => Promise<AsyncPage<DynamicSelectOption>>;
  options?: DynamicSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  maxChipsVisible?: number;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  /** "+ Create new" support — same pattern as InlineCreateSelect */
  createLabel?: string;
  drawerTitle?: string;
  renderCreateForm?: (props: {
    onCreated: (option: DynamicSelectOption) => void;
    onCancel: () => void;
  }) => ReactNode;
  createFields?: QuickFieldDef[];
  onCreateSubmit?: (values: Record<string, unknown>) => Promise<DynamicSelectOption>;
  createSubmitLabel?: string;
}

const C = {
  root: "appkit-pms",
  chips: "appkit-pms__chips",
  chip: "appkit-pms__chip",
  chipLabel: "appkit-pms__chip-label",
  chipRemove: "appkit-pms__chip-remove",
  overflowChip: "appkit-pms__overflow-chip",
  trigger: "appkit-pms__trigger",
  triggerDisabled: "appkit-pms__trigger--disabled",
  placeholder: "appkit-pms__placeholder",
  triggerLeft: "appkit-pms__trigger-left",
  triggerCount: "appkit-pms__trigger-count",
  dropdown: "appkit-pms__dropdown",
  search: "appkit-pms__search",
  list: "appkit-pms__list",
  option: "appkit-pms__option",
  optionSelected: "appkit-pms__option--selected",
  checkbox: "appkit-pms__checkbox",
  checkmark: "appkit-pms__checkmark",
  optionLabel: "appkit-pms__option-label",
  empty: "appkit-pms__empty",
  loading: "appkit-pms__loading",
  loadMore: "appkit-pms__load-more",
  createBtn: "appkit-pms__create-btn",
} as const;

const CREATE_SENTINEL = "__pms_create__";

export function PaginatedMultiSelect({
  value,
  onChange,
  loadOptions,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  noResultsText = "No results",
  maxChipsVisible = 3,
  disabled,
  className = "",
  ariaLabel,
  createLabel,
  drawerTitle,
  renderCreateForm,
  createFields,
  onCreateSubmit,
  createSubmitLabel,
}: PaginatedMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [asyncOptions, setAsyncOptions] = useState<DynamicSelectOption[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasCreate = Boolean(createLabel && (renderCreateForm ?? (createFields && onCreateSubmit)));

  const resolvedOptions = options ?? asyncOptions;

  const selectedOptions = resolvedOptions.filter((o) => value.includes(o.value));
  // Build a label map from whatever is loaded so chips show labels even when not in current page
  const labelMap = useRef<Map<string, string>>(new Map());
  selectedOptions.forEach((o) => labelMap.current.set(o.value, o.label));

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
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : resolvedOptions;

  function toggle(opt: DynamicSelectOption) {
    if (opt.value === CREATE_SENTINEL) {
      setOpen(false);
      setDrawerOpen(true);
      return;
    }
    const isSelected = value.includes(opt.value);
    const nextValues = isSelected
      ? value.filter((v) => v !== opt.value)
      : [...value, opt.value];
    const nextOptions = nextValues.map((v) => {
      const found = resolvedOptions.find((o) => o.value === v);
      return found ?? { value: v, label: labelMap.current.get(v) ?? v };
    });
    onChange(nextValues, nextOptions);
  }

  function removeChip(v: string) {
    const nextValues = value.filter((x) => x !== v);
    const nextOptions = nextValues.map((x) => {
      const found = resolvedOptions.find((o) => o.value === x);
      return found ?? { value: x, label: labelMap.current.get(x) ?? x };
    });
    onChange(nextValues, nextOptions);
  }

  function handleCreated(option: DynamicSelectOption) {
    setDrawerOpen(false);
    labelMap.current.set(option.value, option.label);
    const nextValues = [...value, option.value];
    const nextOptions = nextValues.map((v) => {
      const found = resolvedOptions.find((o) => o.value === v);
      return found ?? { value: v, label: labelMap.current.get(v) ?? v };
    });
    onChange(nextValues, nextOptions);
  }

  const visibleChips = value.slice(0, maxChipsVisible);
  const overflowCount = value.length - maxChipsVisible;

  const displayOptions = hasCreate
    ? [...filtered, { value: CREATE_SENTINEL, label: `+ Create new ${createLabel}` }]
    : filtered;

  return (
    <>
      <div
        ref={containerRef}
        className={[C.root, className].filter(Boolean).join(" ")}
        aria-label={ariaLabel}
      >
        {/* chips row */}
        {value.length > 0 && (
          <div className={C.chips}>
            {visibleChips.map((v) => (
              <span key={v} className={C.chip}>
                <span className={C.chipLabel}>
                  {labelMap.current.get(v) ?? v}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    aria-label="Remove"
                    className={C.chipRemove}
                    onClick={(e) => { e.stopPropagation(); removeChip(v); }}
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
          className={[C.trigger, disabled ? C.triggerDisabled : ""].filter(Boolean).join(" ")}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className={C.triggerLeft}>
            <span className={value.length === 0 ? C.placeholder : ""}>
              {value.length === 0 ? placeholder : `${value.length} selected`}
            </span>
          </span>
          <span aria-hidden="true">▾</span>
        </button>

        {/* dropdown */}
        {open && (
          <div className={C.dropdown} role="listbox" aria-multiselectable="true">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={C.search}
            />
            <ul className={C.list}>
              {displayOptions.map((opt, idx) => {
                const isCreate = opt.value === CREATE_SENTINEL;
                const isSelected = !isCreate && value.includes(opt.value);

                if (isCreate) {
                  return (
                    <li key="__create__">
                      <button
                        type="button"
                        className={C.createBtn}
                        onClick={() => toggle(opt)}
                      >
                        {opt.label}
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={`${opt.value}-${idx}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={[C.option, isSelected ? C.optionSelected : ""].filter(Boolean).join(" ")}
                      onClick={() => toggle(opt)}
                    >
                      <span className={C.checkbox} aria-hidden="true">
                        <span className={C.checkmark}>✓</span>
                      </span>
                      <span className={C.optionLabel}>{opt.label}</span>
                    </button>
                  </li>
                );
              })}

              {displayOptions.filter((o) => o.value !== CREATE_SENTINEL).length === 0 && !loading && (
                <li className={C.empty}>{noResultsText}</li>
              )}

              {loading && <li className={C.loading}>Loading…</li>}

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
            </ul>
          </div>
        )}
      </div>

      {/* create drawer */}
      {renderCreateForm ? (
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
          {renderCreateForm({ onCreated: handleCreated, onCancel: () => setDrawerOpen(false) })}
        </SideDrawer>
      ) : createFields && onCreateSubmit ? (
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
