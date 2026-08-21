"use client";

import { useState } from "react";
import { SIEVE_OP, sieveFilter, sortBy } from "@mohasinac/appkit/client";
import { Label, Input, PaginatedSelect } from "../../../../ui";
import { DataListingView } from "../DataListingView";
import type { ListingViewConfig } from "../DataListingView";
import type { AdminTableColumn } from "../../types";
import { ADMIN_ENDPOINTS } from "../../../../constants/api-endpoints";
import { PAGE_VIEW_ENTITY_TYPES, type PageViewEntityType } from "../../../analytics/types";

interface PageViewsListResponse {
  startDate: string;
  endDate: string;
  total: number;
  totalViews: number;
  items: Array<{ entityType: string; entityId: string; url: string; count: number }>;
}

interface PageViewRow {
  id: string;
  entityType: string;
  entityId: string;
  url: string;
  count: number;
}

const ENTITY_TYPE_OPTIONS = PAGE_VIEW_ENTITY_TYPES.map((t) => ({ value: t, label: t }));

function today() {
  // eslint-disable-next-line lir/no-raw-date
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  // eslint-disable-next-line lir/no-raw-date
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const COLUMNS: AdminTableColumn<PageViewRow>[] = [
  { key: "entityType", header: "Type" },
  { key: "entityId", header: "Entity" },
  { key: "url", header: "URL" },
  { key: "count", header: "Views", sortable: true },
];

/** Admin analytics tab — page views for the requested date range, grouped by
 * entity (see PAGE_VIEW_ENTITY_TYPES for the full list), searchable by
 * entity/URL, filterable by entity type, sortable by view count, and
 * paginated. Backed by the day-bucketed pageViews collection. */
export function AdminPageViewsReportView() {
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(today());

  const config: ListingViewConfig<PageViewsListResponse, PageViewRow> = {
    portal: "admin",
    title: "Page Views",
    searchPlaceholder: "Search by entity or URL",
    emptyLabel: "No page views recorded for this range.",
    filterKeys: ["entityType"],
    defaultSort: sortBy("count", "DESC"),
    queryKey: ["admin", "analytics", "pageviews", "listing", startDate, endDate],
    endpoint: `${ADMIN_ENDPOINTS.ANALYTICS_PAGE_VIEWS}?startDate=${startDate}&endDate=${endDate}`,
    sortOptions: [
      { value: sortBy("count", "DESC"), label: "Most views" },
      { value: sortBy("count", "ASC"), label: "Fewest views" },
    ],
    columns: COLUMNS,
    mapRows: (response) =>
      response.items.map((item) => ({
        id: `${item.entityType}:${item.entityId}`,
        entityType: item.entityType,
        entityId: item.entityId,
        url: item.url,
        count: item.count,
      })),
    getTotal: (response) => response.total,
    buildFilters: (state) =>
      state.entityType ? sieveFilter("entityType", SIEVE_OP.EQ, state.entityType) : undefined,
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <PaginatedSelect
        value={pendingFilters.entityType || undefined}
        onChange={(v) => setPendingFilters((p) => ({ ...p, entityType: (v as PageViewEntityType) ?? "" }))}
        options={ENTITY_TYPE_OPTIONS}
      />
    ),
    rowHrefTemplate: (row) => row.url,
    renderAboveContent: () => (
      <Label layout="flex" gap="md" color="muted" size="sm" className="px-[var(--appkit-space-3)] pb-[var(--appkit-space-2)]">
        <Input
          type="date"
          value={startDate}
          max={endDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg border px-[var(--appkit-space-2-5)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-sm)] border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-elevated)] text-[var(--appkit-color-text)]"
        />
        to
        <Input
          type="date"
          value={endDate}
          min={startDate}
          max={today()}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg border px-[var(--appkit-space-2-5)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-sm)] border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-elevated)] text-[var(--appkit-color-text)]"
        />
      </Label>
    ),
  };

  return <DataListingView config={config} />;
}
