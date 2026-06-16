import React from "react";
import { Div, Heading, Stack } from "../../../ui";
export interface RelatedProductsProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  /** Render the product cards grid */
  renderGrid?: () => React.ReactNode;
  /** Render loading skeleton */
  renderSkeleton?: () => React.ReactNode;
  /** Section title — rendered above the grid when provided */
  renderTitle?: () => React.ReactNode;
  labels?: { title?: string };
  className?: string;
}

export function RelatedProducts({
  isLoading = false,
  isEmpty = false,
  renderGrid,
  renderSkeleton,
  renderTitle,
  labels = {},
  className = "",
}: RelatedProductsProps) {
  if (isLoading) {
    if (renderSkeleton) return <>{renderSkeleton()}</>;
    return (
      <Div layout="grid" gap="4" className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <Div key={i} className="aspect-square" surface="subtle" rounded="xl" />
        ))}
      </Div>
    );
  }

  if (isEmpty) return null;

  return (
    <Stack className={`${className}`} gap="md">
      {renderTitle ? (
        renderTitle()
      ) : labels.title ? (
        <Heading level={2} variant="none" size="xl" weight="bold">
          {labels.title}
        </Heading>
      ) : null}
      {renderGrid?.()}
    </Stack>
  );
}
