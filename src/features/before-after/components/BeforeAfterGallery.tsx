import React from "react";
import type { BeforeAfterItem } from "../types";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { Text } from "@mohasinac/ui";

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
    <div
      className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-2">
          <BeforeAfterSlider item={item} />
          {(item.title || item.description) && (
            <div className="text-center">
              {item.title && (
                <Text className="text-sm font-semibold text-neutral-900">
                  {item.title}
                </Text>
              )}
              {item.description && (
                <Text className="mt-0.5 text-xs text-neutral-500">
                  {item.description}
                </Text>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
