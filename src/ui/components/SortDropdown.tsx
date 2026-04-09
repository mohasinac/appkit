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
    <Row gap="sm" className={className}>
      {label && (
        <Span variant="secondary" size="sm" className="whitespace-nowrap">
          {label}
        </Span>
      )}
      <Select
        value={value ?? ""}
        onChange={onChange}
        options={options}
        className="h-9 min-h-9"
      />
    </Row>
  );
}
