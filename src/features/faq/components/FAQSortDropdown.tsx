import { Select, Span } from "../../../ui";

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
    <div className="flex items-center gap-3" data-section="faqsortdropdown-div-294">
      <Span className="text-sm text-zinc-600 dark:text-zinc-400">
        {labels?.label ?? "Sort"}
      </Span>
      <div className="min-w-44" data-section="faqsortdropdown-div-295">
        <Select
          value={selectedSort}
          onValueChange={(value) => onSortChange(value as FAQSortOption)}
          options={sortOptions}
        />
      </div>
    </div>
  );
}
