import type { CategoryItem } from "../types";
import { Button, Div, Heading, Text } from "../../../ui";

interface ConcernCardProps {
  concern: CategoryItem;
  onClick?: (concern: CategoryItem) => void;
  className?: string;
}

export function ConcernCard({
  concern,
  onClick,
  className = "",
}: ConcernCardProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => onClick?.(concern)}
      className={`group flex flex-col items-center gap-3 rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] p-4 text-center shadow-sm transition hover:border-primary dark:hover:border-primary-400 hover:shadow-md ${className}`}
    >
      {concern.display?.coverImage && (
        <img
          src={concern.display.coverImage}
          alt={concern.name}
          className="h-16 w-16 object-cover rounded-full"
        />
      )}
      <Div>
        <Heading
          level={3}
          className="text-[var(--appkit-color-text)] group-hover:text-primary dark:group-hover:text-primary-400" size="sm" weight="semibold"
        >
          {concern.name}
        </Heading>
        {concern.description && (
          <Text className={`mt-1`} color="muted" truncate={2} size="xs">
            {concern.description}
          </Text>
        )}
      </Div>
    </Button>
  );
}
