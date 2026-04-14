"use client";

import React from "react";
import { Row } from "./Layout";
import { Select } from "./Select";
import { Span } from "./Typography";

export interface SortOption {
  label: string;
  value: string;
}

export interface SortDropdownProps {
  value?: string;
  onChange: (value: string) => void;
  options: SortOption[];
  label?: string;
  className?: string;
  /** Optional text shown before the sort selector (e.g. "Showing 12 of 45") */
  countText?: React.ReactNode;
}

export function SortDropdown({
  value,
  onChange,
  options,
  label,
  className = "",
  countText,
}: SortDropdownProps) {
  return (
    <Row
      gap="sm"
      className={["appkit-sort-dropdown", className].filter(Boolean).join(" ")}
    >
      {countText && (
        <Span
          variant="secondary"
          size="sm"
          className="appkit-sort-dropdown__count"
        >
          {countText}
        </Span>
      )}
      {label && (
        <Span
          variant="secondary"
          size="sm"
          className="appkit-sort-dropdown__label"
        >
          {label}
        </Span>
      )}
      <Select
        value={value ?? ""}
        onValueChange={onChange}
        options={options}
        className="appkit-sort-dropdown__select"
      />
    </Row>
  );
}
