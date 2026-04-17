"use client";
import "client-only";

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
      className={["relative", className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={[
          "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm",
          "border-zinc-300 bg-white text-zinc-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
          disabled ? "cursor-not-allowed opacity-50" : "",
        ].join(" ")}
      >
        <span className={value == null ? "text-zinc-400" : ""}>
          {selectedLabel || placeholder}
        </span>
        <span aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="rounded-none border-x-0 border-t-0"
          />
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.map((option, index) => (
              <li key={`${String(option.value)}-${index}`}>
                <button
                  type="button"
                  onClick={() => {
                    onChange?.(option.value, option);
                    setOpen(false);
                  }}
                  className={[
                    "w-full px-3 py-2 text-left text-sm",
                    "hover:bg-zinc-100 dark:hover:bg-slate-800",
                    option.value === value ? "font-medium" : "",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              </li>
            ))}

            {filtered.length === 0 && !loading ? (
              <li className="px-3 py-2 text-xs text-zinc-400">
                {noResultsText}
              </li>
            ) : null}

            {loading ? (
              <li className="px-3 py-2 text-xs text-zinc-400">Loading...</li>
            ) : null}

            {hasMore && !loading ? (
              <li>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-xs text-primary hover:underline"
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
