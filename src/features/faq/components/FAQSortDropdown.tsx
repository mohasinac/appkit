import { Div, Select, Span } from "../../../ui";

export type FAQSortOption = "helpful" | "newest" | "alphabetical";

interface FAQSortDropdownProps {
  selectedSort: FAQSortOption;
  onSortChange: (sort: FAQSortOption) => void;
  labels?: {
    label?: string;
    helpful?: string;
    newest?: string;
    alphabetical?: string;
  };
}

export function FAQSortDropdown({
  selectedSort,
  onSortChange,
  labels,
}: FAQSortDropdownProps) {
  const sortOptions: { value: FAQSortOption; label: string }[] = [
    { value: "helpful", label: labels?.helpful ?? "Most Helpful" },
    { value: "newest", label: labels?.newest ?? "Newest" },
    { value: "alphabetical", label: labels?.alphabetical ?? "Alphabetical" },
  ];

  return (
    <Div className="flex items-center gap-3">
      <Span size="sm" className="text-zinc-600 dark:text-zinc-400">
        {labels?.label ?? "Sort"}
      </Span>
      <Div className="min-w-44">
        <Select
          value={selectedSort}
          onValueChange={(value) => onSortChange(value as FAQSortOption)}
          options={sortOptions}
        />
      </Div>
    </Div>
  );
}
