"use client";
import "client-only";

/**
 * SlottedListingView
 *
 * Lightweight slot-assembly view shell for listing pages that need manual
 * control over toolbar/filter/table composition (seller dashboards, admin
 * categories, etc.) without the full ListingLayout chrome.
 *
 * Provides optional managed `search` and `selectedIds` state — pass
 * `manageSearch` or `manageSelection` to opt in. Render-props receive
 * the managed state; callers that manage their own state can ignore these.
 *
 * Usage:
 *   <SlottedListingView
 *     title="Products"
 *     manageSearch
 *     manageSelection
 *     renderSearch={(search, setSearch) => <SearchInput value={search} onChange={setSearch} />}
 *     renderTable={(selectedIds, setSelectedIds) => <DataTable ... />}
 *     renderPagination={() => <Pagination ... />}
 *     overlays={<ConfirmModal />}
 *   />
 */

import React, { useState, type ReactNode } from "react";
import { Div } from "./Div";
import { Heading } from "./Typography";

export interface SlottedListingViewLabels {
  title?: string;
}

export interface SlottedListingViewProps {
  /** Page title — rendered as H1 unless `renderHeader` is provided. */
  title?: string;
  labels?: SlottedListingViewLabels;
  /** Custom header replacing the default title heading. */
  renderHeader?: () => ReactNode;
  renderTabs?: () => ReactNode;
  renderSearch?: (search: string, setSearch: (v: string) => void) => ReactNode;
  renderSort?: (sort: string, setSort: (v: string) => void) => ReactNode;
  renderFilters?: () => ReactNode;
  renderActiveFilters?: () => ReactNode;
  renderBulkActions?: (selectedIds: string[], onClear: () => void) => ReactNode;
  renderTable:
    | (() => ReactNode)
    | ((
        selectedIds: string[],
        setSelectedIds: (ids: string[]) => void,
        isLoading: boolean,
      ) => ReactNode);
  renderPagination?: ((total: number) => ReactNode) | (() => ReactNode);
  overlays?: ReactNode;
  /** Enable managed search state (default empty string). */
  manageSearch?: boolean;
  /** Enable managed selection state (default empty array). */
  manageSelection?: boolean;
  /** Enable managed sort state (default empty string). */
  manageSort?: boolean;
  /** Wrap search + sort slots in a flex row. */
  inlineToolbar?: boolean;
  total?: number;
  isLoading?: boolean;
  className?: string;
}

export function SlottedListingView({
  title,
  labels = {},
  renderHeader,
  renderTabs,
  renderSearch,
  renderSort,
  renderFilters,
  renderActiveFilters,
  renderBulkActions,
  renderTable,
  renderPagination,
  overlays,
  manageSearch = false,
  manageSelection = false,
  manageSort = false,
  inlineToolbar = false,
  total = 0,
  isLoading = false,
  className = "",
}: SlottedListingViewProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sort, setSort] = useState("");

  const displayTitle = title ?? labels?.title;

  return (
    <Div className={className}>
      {renderHeader ? (
        renderHeader()
      ) : displayTitle ? (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {displayTitle}
        </Heading>
      ) : null}
      {renderTabs?.()}
      {inlineToolbar && (renderSearch || renderSort) ? (
        <Div className="flex gap-2 mb-4">
          {renderSearch?.(search, setSearch)}
          {renderSort?.(sort, setSort)}
        </Div>
      ) : (
        <>
          {renderSearch?.(search, setSearch)}
          {renderSort?.(sort, setSort)}
        </>
      )}
      {renderFilters?.()}
      {renderActiveFilters?.()}
      {manageSelection && renderBulkActions
        ? renderBulkActions(selectedIds, () => setSelectedIds([]))
        : renderBulkActions?.(selectedIds, () => setSelectedIds([]))}
      {manageSelection
        ? (renderTable as Function)(selectedIds, setSelectedIds, isLoading)
        : (renderTable as Function)()}
      {renderPagination ? (renderPagination as Function)(total) : null}
      {overlays}
    </Div>
  );
}
