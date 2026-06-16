import type { CategoryItem } from "../types";
import { Button, Div, Heading, Text } from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";

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
      className={`group flex flex-col items-center gap-3 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-center shadow-sm transition hover:border-primary dark:hover:border-primary-400 hover:shadow-md ${className}`}
    >
      {concern.display?.coverImage && (
        <Div
          role="img"
          aria-label={concern.name}
          className="h-16 w-16 bg-center bg-cover" rounded="full"
          // audit-inline-style-ok: dynamic image URL
          style={{ backgroundImage: `url(${concern.display.coverImage})` }}
        />
      )}
      <Div>
        <Heading
          level={3}
          className="text-neutral-900 group-hover:text-primary dark:group-hover:text-primary-400" size="sm" weight="semibold"
        >
          {concern.name}
        </Heading>
        {concern.description && (
          <Text className={`mt-1 text-neutral-500 dark:text-zinc-400`} truncate={2} size="xs">
            {concern.description}
          </Text>
        )}
      </Div>
    </Button>
  );
}
