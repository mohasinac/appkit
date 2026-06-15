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
                <Text size="sm" weight="semibold" color="primary">
                  {item.title}
                </Text>
              )}
              {item.description && (
                <Text className="mt-0.5" color="muted" size="xs">
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
