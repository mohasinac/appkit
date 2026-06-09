"use client";

import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  subscribers?: unknown[];
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

  const unsubscribeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.NEWSLETTER_BY_ID(id));
    },
    onSuccess: () => {
      showToast("Subscriber unsubscribed.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "newsletter"] });
      setUnsubscribeOpen(false);
      setSelectedRow(null);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to unsubscribe.", "error");
    },
  });

  const handleExportCsv = useCallback(async () => {
    try {
      const response = await fetch(ADMIN_ENDPOINTS.NEWSLETTER_EXPORT);
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "newsletter-subscribers.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Failed to export CSV.", "error");
    }
  }, [showToast]);

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
          (item as Record<string, unknown>).subscribedAt ??
            (item as Record<string, unknown>).createdAt,
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
      <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
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
