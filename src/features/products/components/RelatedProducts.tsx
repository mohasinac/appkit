import React from "react";
import { Div, Heading } from "../../../ui";

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
      <Div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <Div key={i} className="aspect-square" surface="subtle" rounded="xl" />
        ))}
      </Div>
    );
  }

  if (isEmpty) return null;

  return (
    <Div className={`space-y-4 ${className}`}>
      {renderTitle ? (
        renderTitle()
      ) : labels.title ? (
        <Heading level={2} variant="none" size="xl" weight="bold">
          {labels.title}
        </Heading>
      ) : null}
      {renderGrid?.()}
    </Div>
  );
}
