"use client";

import React from "react";
import {
  Button,
  Div,
  Input,
  ListingViewShell,
  Span,
  Text,
  type ListingViewShellProps,
} from "../../../ui";
import type { AdminTableColumn } from "../types";
import { AdminPageHeader } from "./AdminPageHeader";
import { DataTable } from "./DataTable";

export interface AdminListingScaffoldRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

interface AdminListingScaffoldProps extends ListingViewShellProps {
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionHref?: string;
  columns?: AdminTableColumn<AdminListingScaffoldRow>[];
  getRowHref?: (row: AdminListingScaffoldRow) => string;
  searchPlaceholder: string;
  rows: AdminListingScaffoldRow[];
  isLoading?: boolean;
  errorMessage?: string;
  emptyLabel?: string;
  filterGroups?: ReadonlyArray<{
    title: string;
    options: ReadonlyArray<string>;
    active?: string;
    onSelect?: (option: string) => void;
  }>;
  activeFilters?: string[];
  resultSummary?: string;
  onSearch?: (query: string) => void;
  searchValue?: string;
  onClearFilters?: () => void;
}

const DEFAULT_FILTER_GROUPS = [
  {
    title: "Status",
    options: ["Active", "Draft", "Archived"],
  },
  {
    title: "Updated",
    options: ["Last 7 days", "This month", "Needs review"],
  },
] as const;

function buildColumns(): AdminTableColumn<AdminListingScaffoldRow>[] {
  return [
    {
      key: "primary",
      header: "Item",
      sortable: true,
      render: (row) => (
        <Div className="space-y-1">
          <Text className="font-semibold text-zinc-900 dark:text-zinc-100">
            {row.primary}
          </Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            {row.secondary}
          </Text>
        </Div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "w-40",
      render: (row) => (
        <Span className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800 dark:bg-secondary-900/30 dark:text-secondary-300">
          {row.status}
        </Span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      sortable: true,
      className: "w-40",
      render: (row) => (
        <Text className="text-sm text-zinc-600 dark:text-zinc-300">
          {row.updatedAt}
        </Text>
      ),
    },
  ];
}

function renderFilterContent(
  groups: AdminListingScaffoldProps["filterGroups"] = DEFAULT_FILTER_GROUPS,
) {
  return (
    <Div className="space-y-5">
      {groups.map((group) => (
        <Div key={group.title} className="space-y-2">
          <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            {group.title}
          </Text>
          <Div className="flex flex-wrap gap-2">
            {group.options.map((option) => (
              <Button
                key={`${group.title}-${option}`}
                type="button"
                variant={group.active === option ? "primary" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => group.onSelect?.(option)}
              >
                {option}
              </Button>
            ))}
          </Div>
        </Div>
      ))}
    </Div>
  );
}

function renderActiveFilters(activeFilters?: string[]) {
  if (!activeFilters || activeFilters.length === 0) {
    return null;
  }

  return (
    <Div className="mb-4 flex flex-wrap gap-2">
      {activeFilters.map((filter) => (
        <Span
          key={filter}
          className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-300"
        >
          {filter}
        </Span>
      ))}
    </Div>
  );
}

export function AdminListingScaffold({
  title,
  subtitle,
  actionLabel,
  actionHref,
  columns,
  getRowHref,
  searchPlaceholder,
  rows,
  isLoading,
  errorMessage,
  emptyLabel,
  filterGroups,
  activeFilters,
  resultSummary,
  onSearch,
  searchValue,
  onClearFilters,
  children,
  headerSlot,
  filterContent,
  activeFiltersSlot,
  resultCountSlot,
  searchSlot,
  sortSlot,
  actionsSlot,
  ...props
}: AdminListingScaffoldProps) {
  const [localSearch, setLocalSearch] = React.useState(searchValue ?? "");
  const hasChildren = React.Children.count(children) > 0;

  return (
    <ListingViewShell
      {...props}
      portal="admin"
      headerSlot={
        headerSlot ?? (
          <AdminPageHeader
            title={title}
            subtitle={subtitle}
            actionLabel={actionLabel}
            onAction={() => undefined}
            themeConfig={{
              gradient:
                "rounded-3xl border border-zinc-200 bg-gradient-to-r from-white to-zinc-50 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900",
              titleClass: "text-3xl font-bold text-zinc-950 dark:text-zinc-50",
              subtitleClass: "text-sm text-zinc-600 dark:text-zinc-300",
              spacingClass: "space-y-1.5",
            }}
          />
        )
      }
      filterContent={filterContent ?? renderFilterContent(filterGroups)}
      activeFiltersSlot={activeFiltersSlot ?? renderActiveFilters(activeFilters)}
      resultCountSlot={
        resultCountSlot ?? (
          <Text className="text-sm text-zinc-600 dark:text-zinc-300">
            {resultSummary ?? `Showing ${rows.length} items`}
          </Text>
        )
      }
      searchSlot={
        searchSlot ?? (
          <Input
            value={localSearch}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="min-w-[240px]"
            onChange={(e) => {
              setLocalSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSearch?.(localSearch);
              }
            }}
          />
        )
      }
      sortSlot={
        sortSlot ?? (
          <Button type="button" variant="outline" size="sm">
            Newest first
          </Button>
        )
      }
      actionsSlot={
        actionsSlot ??
        (actionLabel ? (
          actionHref ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                window.location.href = actionHref;
              }}
            >
              {actionLabel}
            </Button>
          ) : (
            <Button type="button" variant="primary" size="sm">
              {actionLabel}
            </Button>
          )
        ) : undefined)
      }
      filterActiveCount={activeFilters?.length ?? 0}
      filterPendingCount={0}
      errorSlot={
        errorMessage ? (
          <Div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </Div>
        ) : undefined
      }
    >
      {hasChildren ? (
        children
      ) : (
        <DataTable
          columns={columns ?? buildColumns()}
          rows={rows}
          isLoading={isLoading}
          emptyLabel={emptyLabel}
          getRowHref={getRowHref}
        />
      )}
    </ListingViewShell>
  );
}