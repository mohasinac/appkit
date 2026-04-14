"use client";

import React from "react";
import { Row } from "./Layout";
import { Span } from "./Typography";

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
    <Row
      wrap
      gap="sm"
      className={className}
      role="list"
      aria-label="Active filters"
    >
      {filters.map((filter) => (
        <span
          key={filter.key}
          role="listitem"
          className="appkit-active-filter-chips__chip"
        >
          <Span className="appkit-active-filter-chips__chip-label">
            {filter.label}:
          </Span>
          {filter.value}
          <button
            type="button"
            onClick={() => onRemove(filter.key)}
            aria-label={`Remove ${filter.label}: ${filter.value} filter`}
            className="appkit-active-filter-chips__chip-remove"
          >
            <svg
              className="appkit-active-filter-chips__chip-remove-icon"
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
        className="appkit-active-filter-chips__clear"
      >
        {clearAllLabel}
      </button>
    </Row>
  );
}
