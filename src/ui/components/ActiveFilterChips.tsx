"use client";

import React from "react";

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

export interface ActiveFilterChipsProps {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
  clearAllLabel?: string;
}

export function ActiveFilterChips({
  filters,
  onRemove,
  onClearAll,
  className = "",
  clearAllLabel = "Clear all",
}: ActiveFilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="list"
      aria-label="Active filters"
    >
      {filters.map((filter) => (
        <span
          key={filter.key}
          role="listitem"
          className="inline-flex items-center gap-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-800 text-zinc-800 dark:text-zinc-200 py-1 pl-2 pr-1"
        >
          <span className="text-zinc-500 dark:text-zinc-400 mr-0.5">
            {filter.label}:
          </span>
          {filter.value}
          <button
            type="button"
            onClick={() => onRemove(filter.key)}
            aria-label={`Remove ${filter.label}: ${filter.value} filter`}
            className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            <svg
              className="w-2.5 h-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-primary hover:underline p-2"
      >
        {clearAllLabel}
      </button>
    </div>
  );
}
