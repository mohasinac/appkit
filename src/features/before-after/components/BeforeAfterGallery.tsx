import type { BeforeAfterItem } from "../types";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { Div, Grid, Stack, Text } from "../../../ui";
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
    <Grid cols="cards" gap="lg" className={className}>
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
    </Grid>
  );
}
