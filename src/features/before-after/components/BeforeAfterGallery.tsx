import type { BeforeAfterItem } from "../types";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { Div, Stack, Text } from "../../../ui";
interface BeforeAfterGalleryProps {
  items: BeforeAfterItem[];
  className?: string;
}

export function BeforeAfterGallery({
  items,
  className = "",
}: BeforeAfterGalleryProps) {
  if (items.length === 0) return null;

  return (
    <Div
      className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {items.map((item) => (
        <Stack key={item.id} gap="sm">
          <BeforeAfterSlider item={item} />
          {(item.title || item.description) && (
            <Div className="text-center">
              {item.title && (
                <Text className="text-zinc-900 dark:text-zinc-100" size="sm" weight="semibold">
                  {item.title}
                </Text>
              )}
              {item.description && (
                <Text className="mt-0.5 text-zinc-500 dark:text-zinc-400" size="xs">
                  {item.description}
                </Text>
              )}
            </Div>
          )}
        </Stack>
      ))}
    </Div>
  );
}
