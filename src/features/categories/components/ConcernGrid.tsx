import { Grid } from "../../../ui";
import type { CategoryItem } from "../types";
import { ConcernCard } from "./ConcernCard";

interface ConcernGridProps {
  concerns: CategoryItem[];
  onSelect?: (concern: CategoryItem) => void;
  className?: string;
}

export function ConcernGrid({
  concerns,
  onSelect,
  className = "",
}: ConcernGridProps) {
  if (concerns.length === 0) return null;

  return (
    <Grid cols="categoryCards" className={className}>
      {concerns.map((concern) => (
        <ConcernCard key={concern.id} concern={concern} onClick={onSelect} />
      ))}
    </Grid>
  );
}
