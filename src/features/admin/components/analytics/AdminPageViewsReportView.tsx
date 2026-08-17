"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Div, Stack, Text } from "../../../../ui";
import { DataTable } from "../DataTable";
import { apiClient } from "../../../../http";
import { ADMIN_ENDPOINTS } from "../../../../constants/api-endpoints";

interface PageViewsByEntity {
  entityType: string;
  entityId: string;
  url: string;
  count: number;
}

interface PageViewsByUrl {
  url: string;
  count: number;
}

interface PageViewsReportData {
  startDate: string;
  endDate: string;
  total: number;
  byEntity: PageViewsByEntity[];
  byUrl: PageViewsByUrl[];
}

export interface AdminPageViewsReportViewProps {
  startDate: string;
  endDate: string;
}

/** Admin analytics tab — page views for the requested date range, grouped by
 * entity (product/store/category/homepage/auction/review/user-profile) and
 * by raw URL. Backed by the day-bucketed pageViews collection. */
export function AdminPageViewsReportView({ startDate, endDate }: AdminPageViewsReportViewProps) {
  const endpoint = `${ADMIN_ENDPOINTS.ANALYTICS_PAGE_VIEWS}?startDate=${startDate}&endDate=${endDate}`;
  const query = useQuery<PageViewsReportData>({
    queryKey: ["admin-page-views", endpoint],
    queryFn: () => apiClient.get<PageViewsReportData>(endpoint),
    staleTime: 60_000,
  });

  if (query.error) {
    return (
      <Alert variant="error" title="Could not load page views">
        {query.error instanceof Error ? query.error.message : "Unknown error"}
      </Alert>
    );
  }

  const data = query.data;

  return (
    <Stack gap="lg">
      <Text size="sm" color="muted">
        {data ? `${data.total.toLocaleString()} total views, ${startDate} – ${endDate}` : "Loading…"}
      </Text>

      <Div>
        <Text size="sm" weight="semibold" className="mb-2">By entity</Text>
        <DataTable
          columns={[
            { key: "entityType", header: "Type" },
            { key: "entityId", header: "Entity" },
            { key: "url", header: "URL" },
            { key: "count", header: "Views" },
          ]}
          rows={(data?.byEntity ?? []).map((row) => ({
            id: `${row.entityType}:${row.entityId}`,
            entityType: row.entityType,
            entityId: row.entityId,
            url: row.url,
            count: row.count.toLocaleString(),
          }))}
          isLoading={query.isLoading}
          emptyLabel="No page views recorded for this range."
        />
      </Div>

      <Div>
        <Text size="sm" weight="semibold" className="mb-2">By URL</Text>
        <DataTable
          columns={[
            { key: "url", header: "URL" },
            { key: "count", header: "Views" },
          ]}
          rows={(data?.byUrl ?? []).map((row) => ({
            id: row.url,
            url: row.url,
            count: row.count.toLocaleString(),
          }))}
          isLoading={query.isLoading}
          emptyLabel="No page views recorded for this range."
        />
      </Div>
    </Stack>
  );
}
