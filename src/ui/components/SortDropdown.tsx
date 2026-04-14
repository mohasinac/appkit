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
}

export function SortDropdown({
  value,
  onChange,
  options,
  label,
  className = "",
}: SortDropdownProps) {
  return (
    <Row
      gap="sm"
      className={["appkit-sort-dropdown", className].filter(Boolean).join(" ")}
    >
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
