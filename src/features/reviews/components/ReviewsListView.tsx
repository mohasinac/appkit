"use client"
import React from "react";
import { Container, Div, Heading, Row, Text } from "../../../ui";
import { useReviews } from "../hooks/useReviews";
import type { Review, ReviewListParams, ReviewListResponse } from "../types";

export interface ReviewsListViewProps {
  /** Optional initial SSR data */
  initialData?: ReviewListResponse;
  /** Query params passed to useReviews */
  params?: ReviewListParams;
  /** Rendered inside the page header */
  renderHeader?: (total: number) => React.ReactNode;
  /** Render search input */
  renderSearch?: (
    value: string,
    onChange: (v: string) => void,
  ) => React.ReactNode;
  /** Render sort dropdown */
  renderSort?: (
    value: string,
    onChange: (v: string) => void,
  ) => React.ReactNode;
  /** Render filter panel */
  renderFilters?: () => React.ReactNode;
  /** Render active filter chips */
  renderActiveFilters?: () => React.ReactNode;
  /** Render the data table / grid */
  renderResults: (items: Review[], isLoading: boolean) => React.ReactNode;
  /** Render pagination */
  renderPagination?: (total: number) => React.ReactNode;
  /** Render empty state */
  renderEmptyState?: () => React.ReactNode;
  labels?: {
    title?: string;
    subtitle?: string;
    subtitleWithCount?: (count: number) => string;
  };
  className?: string;
}

export function ReviewsListView({
  initialData,
  params = { status: "approved", perPage: 200 },
  renderHeader,
  renderSearch,
  renderSort,
  renderFilters,
  renderActiveFilters,
  renderResults,
  renderPagination,
  renderEmptyState,
  labels = {},
  className = "",
}: ReviewsListViewProps) {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("-rating");

  const { reviews, total, isLoading } = useReviews(params, { initialData });

  return (
    <Div className={`min-h-screen ${className}`}>
      <Container size="full" className="py-8">
        {/* Header */}
        {renderHeader ? (
          renderHeader(total)
        ) : (
          <Div className="mb-6">
            <Heading level={1}>{labels.title ?? "Reviews"}</Heading>
            <Text variant="secondary" className="mt-1">
              {total > 0
                ? (labels.subtitleWithCount?.(total) ??
                  `${total} reviews from our customers`)
                : (labels.subtitle ?? "See what our customers say")}
            </Text>
          </Div>
        )}

        {/* Search + Sort + Filters */}
        <Row wrap gap="3" className="mb-4">
          {renderSearch?.(search, setSearch)}
          {renderSort?.(sort, setSort)}
          {renderFilters?.()}
        </Row>

        {/* Active filter chips */}
        {renderActiveFilters?.()}

        {/* Results */}
        {!isLoading && total === 0 && renderEmptyState
          ? renderEmptyState()
          : renderResults(reviews, isLoading)}

        {/* Pagination */}
        {renderPagination?.(total)}
      </Container>
    </Div>
  );
}
