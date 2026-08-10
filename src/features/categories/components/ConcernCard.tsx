import type { CategoryItem } from "../types";
import { Button, Div, Heading, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";

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
      className={`group flex flex-col items-center gap-[var(--appkit-space-3)] rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] p-[var(--appkit-space-4)] text-center shadow-sm transition hover:border-primary dark:hover:border-primary-400 hover:shadow-md ${className}`}
    >
      {concern.display?.coverImage && (
        <Div className="relative h-16 w-16" rounded="full" overflow="hidden">
          <MediaImage src={concern.display.coverImage} alt={concern.name} size="thumbnail" />
        </Div>
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
