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
      <Span size="sm" color="muted">{label}</Span>
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
