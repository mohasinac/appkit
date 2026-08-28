import React from "react";
import { Div, Grid, Heading, Stack } from "../../../ui";
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
      <Grid cols="cards" gap="md" className="animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <Div key={i} className="aspect-square" surface="subtle" rounded="xl" />
        ))}
      </Grid>
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
