"use client";
import { normalizeError } from "../../../errors/normalize";

import { useApiMutation, useBulkEvent, RTDB_PATHS, type JsonArray } from "@mohasinac/appkit/client";
import type { JsonValue } from "@mohasinac/appkit/client";
import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, ConfirmDeleteModal, FilterChipGroup, ListingLayout, RowActionMenu, useToast } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import { ADMIN_NEWSLETTER_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { apiClient } from "../../../http";

interface AdminNewsletterResponse {
  subscribers?: JsonArray;
  meta?: { filteredTotal?: number; total?: number };
}

interface NewsletterRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export interface AdminNewsletterViewProps extends ListingLayoutProps {
  onBulkUnsubscribe?: (ids: string[]) => Promise<void>;
}

export function AdminNewsletterView({
  children,
  onBulkUnsubscribe,
  ...props
}: AdminNewsletterViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [unsubscribeOpen, setUnsubscribeOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<NewsletterRow | null>(null);

  const unsubscribeMutation = useApiMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.NEWSLETTER_BY_ID(id));
    },
    onSuccess: () => {
      showToast("Subscriber unsubscribed.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "newsletter"] });
      setUnsubscribeOpen(false);
      setSelectedRow(null);
    },
    onError: (err: Error) => {
      showToast((err as Error)?.message ?? "Failed to unsubscribe.", "error");
    },
  });

  // Export runs as an async `newsletterExport` job (Async Job Primitive) —
  // the route only enqueues; this subscribes to the same RTDB bulk-event
  // channel every other async job in the admin panel uses.
  const [exporting, setExporting] = useState(false);
  const exportEvent = useBulkEvent<{ csv?: string }>({ rtdbPath: RTDB_PATHS.BULK_EVENTS });
  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const response = await fetch(ADMIN_ENDPOINTS.NEWSLETTER_EXPORT);
      if (!response.ok) throw new Error("Export failed");
      const body = (await response.json()) as { data?: { jobId?: string; customToken?: string } };
      const { jobId, customToken } = body.data ?? {};
      if (jobId && customToken) {
        exportEvent.subscribe(jobId, customToken);
      } else {
        throw new Error("Export failed to start");
      }
    } catch (_err) {
      void normalizeError(_err);
      setExporting(false);
      showToast("Failed to export CSV.", "error");
    }
  }, [showToast, exportEvent]);

  useEffect(() => {
    if (exportEvent.status === "success") {
      setExporting(false);
      const csv = exportEvent.result?.data?.csv;
      if (csv) {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        showToast("Export finished with no data.", "error");
      }
    } else if (exportEvent.status === "failed" || exportEvent.status === "timeout") {
      setExporting(false);
      showToast(exportEvent.error ?? "Failed to export CSV.", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportEvent.status]);

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminNewsletterResponse, NewsletterRow> = {
    portal: "admin",
    title: "Newsletter",
    searchPlaceholder: "Search by email or source",
    emptyLabel: "No subscribers found",
    filterKeys: ["status"],
    defaultSort: sortBy("subscribedAt", "DESC"),
    queryKey: ["admin", "newsletter", "listing"],
    endpoint: ADMIN_ENDPOINTS.NEWSLETTER,
    sortOptions: [
      { value: sortBy("subscribedAt", "DESC"), label: "Newest" },
      { value: "subscribedAt", label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.subscribers).map((item, index) => ({
        id: toStringValue(item.id, `sub-${index}`),
        primary: toStringValue(item.email, "Unknown email"),
        secondary:
          [toStringValue(item.source, ""), item.ipAddress ? "IP logged" : ""]
            .filter(Boolean)
            .join(" · ") || "—",
        status: toStringValue(item.status, "unknown"),
        updatedAt: toRelativeDate(
          (item as Record<string, JsonValue>).subscribedAt ??
            (item as Record<string, JsonValue>).createdAt,
        ),
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.filteredTotal === "number") return response.meta.filteredTotal;
      if (typeof response.meta?.total === "number") return response.meta.total;
      return mappedRows.length;
    },
    buildFilters: (state) =>
      state.status && state.status !== "All" ? sieveFilter("status", SIEVE_OP.EQ, state.status) : undefined,
    toolbarExtra: (
      <Button type="button" variant="outline" size="sm" onClick={handleExportCsv} isLoading={exporting} disabled={exporting}>
        {ACTIONS.ADMIN["export-csv"].label}
      </Button>
    ),
    buildBulkActions: onBulkUnsubscribe
      ? (selection): BulkActionItem[] => [
          buildBulkAction(ACTIONS.ADMIN["unsubscribe-newsletter"], async () => {
            await onBulkUnsubscribe(selection.selectedIds);
            selection.clearSelection();
          }),
        ]
      : undefined,
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ACTIONS.ADMIN["unsubscribe-newsletter"].label,
            destructive: true,
            disabled: row.status === "unsubscribed",
            onClick: () => {
              setSelectedRow(row);
              setUnsubscribeOpen(true);
            },
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={ADMIN_NEWSLETTER_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <ConfirmDeleteModal
        isOpen={unsubscribeOpen}
        onClose={() => {
          setUnsubscribeOpen(false);
          setSelectedRow(null);
        }}
        onConfirm={() => {
          if (selectedRow) unsubscribeMutation.mutate(selectedRow.id);
        }}
        isDeleting={unsubscribeMutation.isPending}
        title={`Unsubscribe ${selectedRow?.primary ?? "subscriber"}?`}
        message="The subscriber will be marked as unsubscribed and will no longer receive newsletter emails."
        confirmText="Unsubscribe"
        variant="warning"
      />
    </>
  );
}
