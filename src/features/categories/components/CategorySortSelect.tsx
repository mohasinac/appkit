"use client";

import { Div, Row, Select, Span } from "../../../ui";
import {
  getCategorySortOptions,
  type CategoryFilterVariant,
} from "./CategoryFilters";

export interface CategorySortSelectProps {
  value: string;
  onChange: (value: string) => void;
  variant?: CategoryFilterVariant;
  label?: string;
  className?: string;
}

export function CategorySortSelect({
  value,
  onChange,
  variant = "public",
  label = "Sort",
  className = "",
}: CategorySortSelectProps) {
  const options = [...getCategorySortOptions(variant)];

  return (
    <Row
      className={["items-center gap-3", className].filter(Boolean).join(" ")}
    >
      <Span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</Span>
      <Div className="min-w-44">
        <Select
          value={value}
          onValueChange={(next) => onChange(next)}
          options={options}
        />
      </Div>
    </Row>
  );
}
