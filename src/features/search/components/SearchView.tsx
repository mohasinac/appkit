"use client";

import React from "react";
import { Div, Heading, Main, Row, Span, Text } from "../../../ui";

export interface SearchViewProps {
  /** Current search query string */
  query?: string;
  /** Total result count */
  total: number;
  /** Whether data is loading */
  isLoading: boolean;
  labels?: {
    searchTitle?: string;
    resultsCount?: (count: number, query: string) => string;
    noQuery?: string;
    noQueryDescription?: string;
  };
  /** Render the search input */
  renderSearchInput: () => React.ReactNode;
  /** Render the filters panel (drawer/sidebar) */
  renderFilters?: () => React.ReactNode;
  /** Render active filter chips */
  renderActiveFilters?: () => React.ReactNode;
  /** Render the sort + view-mode toolbar  */
  renderToolbar?: () => React.ReactNode;
  /** Render results grid / list */
  renderResults: () => React.ReactNode;
  /** Render pagination */
  renderPagination?: () => React.ReactNode;
  className?: string;
}

export function SearchView({
  query,
  total,
  isLoading,
  labels = {},
  renderSearchInput,
  renderFilters,
  renderActiveFilters,
  renderToolbar,
  renderResults,
  renderPagination,
  className = "",
}: SearchViewProps) {
  const hasQuery = !!query?.trim();

  return (
    <Main className={`min-h-screen ${className}`}>
      <Div className="py-6 space-y-4">
        {/* Search input */}
        <Div>{renderSearchInput()}</Div>

        {/* Query heading */}
        {hasQuery && (
          <Div>
            <Heading level={1} className="text-xl font-semibold">
              {labels.resultsCount
                ? labels.resultsCount(total, query!)
                : `${total} results for "${query}"`}
            </Heading>
          </Div>
        )}

        {!hasQuery && (
          <Div className="py-16 text-center">
            <Span className="text-4xl mb-4 block">🔍</Span>
            <Heading level={2} className="mb-2">
              {labels.searchTitle ?? "Search"}
            </Heading>
            <Text variant="secondary">
              {labels.noQueryDescription ?? "Start typing to find products"}
            </Text>
          </Div>
        )}

        {hasQuery && (
          <>
            {/* Filter chips */}
            {renderActiveFilters?.()}

            {/* Toolbar: sort + view mode + filter toggle */}
            <Row wrap justify="between" gap="3">
              {renderFilters?.()}
              {renderToolbar?.()}
            </Row>

            {/* Results */}
            {renderResults()}

            {/* Pagination */}
            {renderPagination?.()}
          </>
        )}
      </Div>
    </Main>
  );
}
