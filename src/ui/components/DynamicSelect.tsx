"use client"
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "./Input";

export interface DynamicSelectOption<V = string> {
  value: V;
  label: string;
  meta?: Record<string, unknown>;
}

export interface AsyncPage<T> {
  items: T[];
  hasMore: boolean;
  nextPage?: number;
}

export interface DynamicSelectProps<V = string> {
  value?: V | null;
  onChange?: (value: V | null, option: DynamicSelectOption<V> | null) => void;
  options?: DynamicSelectOption<V>[];
  loadOptions?: (
    query: string,
    page: number,
  ) => Promise<AsyncPage<DynamicSelectOption<V>>>;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

const UI_DYNAMIC_SELECT = {
  root: "appkit-dynamic-select",
  trigger: "appkit-dynamic-select__trigger",
  triggerDisabled: "appkit-dynamic-select__trigger--disabled",
  placeholder: "appkit-dynamic-select__placeholder",
  dropdown: "appkit-dynamic-select__dropdown",
  search: "appkit-dynamic-select__search",
  list: "appkit-dynamic-select__list",
  option: "appkit-dynamic-select__option",
  optionSelected: "appkit-dynamic-select__option--selected",
  empty: "appkit-dynamic-select__empty",
  loading: "appkit-dynamic-select__loading",
  loadMore: "appkit-dynamic-select__load-more",
} as const;

export function DynamicSelect<V = string>({
  value,
  onChange,
  options,
  loadOptions,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  noResultsText = "No results",
  disabled,
  className = "",
  ariaLabel,
}: DynamicSelectProps<V>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [asyncOptions, setAsyncOptions] = useState<DynamicSelectOption<V>[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const resolvedOptions = options ?? asyncOptions;

  const load = useCallback(
    async (search: string, nextPage: number, reset = false) => {
      if (!loadOptions) return;
      setLoading(true);
      try {
        const response = await loadOptions(search, nextPage);
        setAsyncOptions((prev) =>
          reset ? response.items : [...prev, ...response.items],
        );
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
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = options
    ? options.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase()),
      )
    : resolvedOptions;

  const selectedLabel =
    resolvedOptions.find((option) => option.value === value)?.label ??
    (value == null ? "" : String(value));

  return (
    <div
      ref={containerRef}
      className={[UI_DYNAMIC_SELECT.root, className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
     data-section="dynamicselect-div-490">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={[
          UI_DYNAMIC_SELECT.trigger,
          disabled ? UI_DYNAMIC_SELECT.triggerDisabled : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className={value == null ? UI_DYNAMIC_SELECT.placeholder : ""}>
          {selectedLabel || placeholder}
        </span>
        <span aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div className={UI_DYNAMIC_SELECT.dropdown} data-section="dynamicselect-div-491">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className={UI_DYNAMIC_SELECT.search}
          />
          <ul className={UI_DYNAMIC_SELECT.list}>
            {filtered.map((option, index) => (
              <li key={`${String(option.value)}-${index}`}>
                <button
                  type="button"
                  onClick={() => {
                    onChange?.(option.value, option);
                    setOpen(false);
                  }}
                  className={[
                    UI_DYNAMIC_SELECT.option,
                    option.value === value
                      ? UI_DYNAMIC_SELECT.optionSelected
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {option.label}
                </button>
              </li>
            ))}

            {filtered.length === 0 && !loading ? (
              <li className={UI_DYNAMIC_SELECT.empty}>{noResultsText}</li>
            ) : null}

            {loading ? (
              <li className={UI_DYNAMIC_SELECT.loading}>Loading...</li>
            ) : null}

            {hasMore && !loading ? (
              <li>
                <button
                  type="button"
                  className={UI_DYNAMIC_SELECT.loadMore}
                  onClick={() => void load(query, page + 1)}
                >
                  Load more
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
