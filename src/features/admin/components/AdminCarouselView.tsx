"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS, HOMEPAGE_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";
import { RowActionMenu } from "../../../ui/components/RowActionMenu";
import { apiClient } from "../../../http";

export interface AdminCarouselViewProps extends ListingViewShellProps {}

interface AdminCarouselResponse {
  data?: unknown;
  items?: unknown[];
  total?: number;
}

interface CarouselRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  order: number;
  thumbnailUrl: string;
}

export function AdminCarouselView({
  children,
  ...props
}: AdminCarouselViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [localRows, setLocalRows] = React.useState<CarouselRow[]>([]);
  const queryClient = useQueryClient();

  const filterParts: string[] = [];
  if (statusFilter && statusFilter !== "All") {
    filterParts.push(statusFilter === "Active" ? "active==true" : "active==false");
  }
  const filters = filterParts.join(",") || undefined;

  const { rows: fetchedRows, total, isLoading, errorMessage } = useAdminListingData<
    AdminCarouselResponse,
    CarouselRow
  >({
    queryKey: ["admin", "carousel", "listing", q, filters ?? ""],
    endpoint: `${HOMEPAGE_ENDPOINTS.CAROUSEL}?includeInactive=true`,
    filters,
    q,
    mapRows: (response) => {
      const sourceItems = Array.isArray(response.data) ? response.data : response.items;
      return toRecordArray(sourceItems)
        .sort((a, b) => ((a.order as number) ?? 0) - ((b.order as number) ?? 0))
        .map((item, index) => {
          const bg = item.background as Record<string, unknown> | undefined;
          const legacyMedia = item.media as Record<string, unknown> | undefined;
          const thumbnailUrl =
            toStringValue(bg?.url, "") ||
            toStringValue(legacyMedia?.url, "") ||
            "";
          const orderValue = typeof item.order === "number" ? item.order : index + 1;
          const height = toStringValue((item.settings as Record<string, unknown> | undefined)?.height, "—");
          return {
            id: toStringValue(item.id, `slide-${index}`),
            primary: toStringValue(item.title, `Carousel slide ${index + 1}`),
            secondary: `Order: ${orderValue} · Height: ${height} · ${item.active ? "Active" : "Inactive"}`,
            status: typeof item.active === "boolean" ? (item.active ? "Active" : "Inactive") : "Inactive",
            updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
            order: orderValue,
            thumbnailUrl,
          };
        });
    },
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  React.useEffect(() => {
    setLocalRows(fetchedRows as CarouselRow[]);
  }, [fetchedRows]);

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) =>
      apiClient.post(ADMIN_ENDPOINTS.CAROUSEL_REORDER, { slideIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "carousel", "listing"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(ADMIN_ENDPOINTS.CAROUSEL_BY_ID(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "carousel", "listing"] });
    },
  });

  const handleDragStart = (id: string) => setDraggingId(id);

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) { setDraggingId(null); return; }
    const from = localRows.findIndex((r) => r.id === draggingId);
    const to = localRows.findIndex((r) => r.id === targetId);
    if (from === -1 || to === -1) { setDraggingId(null); return; }
    const next = [...localRows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLocalRows(next);
    setDraggingId(null);
    reorderMutation.mutate(next.map((r) => r.id));
  };

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  const displayRows = (localRows.length > 0 ? localRows : fetchedRows as CarouselRow[]).map((row) => ({
    ...row,
    secondary: (
      <div className="flex items-center gap-3">
        {row.thumbnailUrl && (
          <img
            src={row.thumbnailUrl}
            alt=""
            className="w-14 h-9 object-cover rounded flex-shrink-0 bg-zinc-200 dark:bg-zinc-800"
          />
        )}
        <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{row.secondary}</span>
      </div>
    ) as unknown as string,
  }));

  return (
    <AdminListingScaffold
      portal="admin"
      {...props}
      title="Homepage Carousel"
      subtitle="Drag to reorder slides. Each active slide appears in the hero carousel."
      actionLabel="New slide"
      actionHref="/admin/carousel/new"
      searchPlaceholder="Search slide titles"
      onSearch={setQ}
      searchValue={q}
      rows={displayRows}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyLabel="No carousel slides — click 'New slide' to add one"
      resultSummary={`Showing ${localRows.length || fetchedRows.length} of ${total} slides`}
      filterGroups={[
        {
          title: "Status",
          options: ["All", "Active", "Inactive"],
          active: statusFilter || "All",
          onSelect: (opt) => setStatusFilter(opt === "All" ? "" : opt),
        },
      ]}
      getRowHref={(row) => `/admin/carousel/${row.id}/edit`}
      columns={[
        {
          key: "drag",
          header: "",
          render: (row) => (
            <div
              draggable
              onDragStart={() => handleDragStart(row.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(row.id)}
              className="cursor-grab active:cursor-grabbing text-zinc-400 px-1 select-none"
              title="Drag to reorder"
            >
              ⠿
            </div>
          ),
        },
        {
          key: "primary",
          header: "Title",
          render: (row) => (
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{row.primary}</span>
          ),
        },
        {
          key: "secondary",
          header: "Details",
          render: (row) => row.secondary as unknown as React.ReactNode,
        },
        {
          key: "status",
          header: "Status",
          render: (row) => (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                row.status === "Active"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {row.status}
            </span>
          ),
        },
        {
          key: "updatedAt",
          header: "Updated",
          render: (row) => <span className="text-sm text-zinc-500">{row.updatedAt}</span>,
        },
        {
          key: "actions",
          header: "",
          render: (row) => (
            <RowActionMenu
              actions={[
                {
                  label: "Edit",
                  onClick: () => { window.location.href = `/admin/carousel/${row.id}/edit`; },
                },
                {
                  label: "Delete",
                  destructive: true,
                  onClick: () => {
                    if (confirm("Delete this carousel slide? This cannot be undone.")) {
                      deleteMutation.mutate(row.id);
                    }
                  },
                },
              ]}
            />
          ),
        },
      ]}
    />
  );
}
