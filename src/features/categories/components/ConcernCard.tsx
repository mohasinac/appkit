import React from "react";
import type { CategoryItem } from "../types";
import { Button, Div, Heading, Text } from "@mohasinac/ui";

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
      className={`group flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-sm transition hover:border-primary hover:shadow-md ${className}`}
    >
      {concern.display?.coverImage && (
        <Div
          role="img"
          aria-label={concern.name}
          className="h-16 w-16 rounded-full bg-center bg-cover"
          style={{ backgroundImage: `url(${concern.display.coverImage})` }}
        />
      )}
      <Div>
        <Heading
          level={3}
          className="text-sm font-semibold text-neutral-900 group-hover:text-primary"
        >
          {concern.name}
        </Heading>
        {concern.description && (
          <Text className="mt-1 text-xs text-neutral-500 line-clamp-2">
            {concern.description}
          </Text>
        )}
      </Div>
    </Button>
  );
}
