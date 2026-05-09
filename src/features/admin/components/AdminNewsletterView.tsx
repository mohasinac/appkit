"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import {
  Button,
  ConfirmDeleteModal,
  Div,
  RowActionMenu,
  useToast,
} from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";
import { apiClient } from "../../../http";

export interface AdminNewsletterViewProps extends ListingViewShellProps {}

interface AdminNewsletterResponse {
  subscribers?: unknown[];
  meta?: {
    filteredTotal?: number;
    total?: number;
  };
}

interface NewsletterRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export function AdminNewsletterView({ children, ...props }: AdminNewsletterViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [unsubscribeOpen, setUnsubscribeOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<NewsletterRow | null>(null);

  const filterParts: string[] = [];
  if (statusFilter && statusFilter !== "All") filterParts.push(`status==${statusFilter}`);
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminNewsletterResponse,
    NewsletterRow
  >({
    queryKey: ["admin", "newsletter", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.NEWSLETTER,
    filters,
    q,
    mapRows: (response) =>
      toRecordArray(response.subscribers).map((item, index) => ({
        id: toStringValue(item.id, `sub-${index}`),
        primary: toStringValue(item.email, "Unknown email"),
        secondary: [
          toStringValue(item.source, ""),
          item.ipAddress ? "IP logged" : "",
        ].filter(Boolean).join(" · ") || "—",
        status: toStringValue(item.status, "unknown"),
        updatedAt: toRelativeDate((item as any).subscribedAt ?? (item as any).createdAt),
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.filteredTotal === "number") return response.meta.filteredTotal;
      if (typeof response.meta?.total === "number") return response.meta.total;
      return mappedRows.length;
    },
  });

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

  const handleExportCsv = React.useCallback(async () => {
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

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  return (
    <>
      <AdminListingScaffold
        portal="admin"
        {...props}
        title="Newsletter Subscribers"
        subtitle="View and manage email subscribers. Filter by status, search by email, and track subscription sources."
        searchPlaceholder="Search by email or source"
        onSearch={setQ}
        searchValue={q}
        rows={rows}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyLabel="No subscribers found"
        resultSummary={`Showing ${rows.length} of ${total} subscribers`}
        filterGroups={[
          {
            title: "Status",
            options: ["All", "active", "unsubscribed"],
            active: statusFilter || "All",
            onSelect: (opt) => setStatusFilter(opt === "All" ? "" : opt),
          },
        ]}
        actionsSlot={
          <Div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleExportCsv}>
              Export CSV
            </Button>
          </Div>
        }
        renderRowActions={(row) => {
          const nr = row as NewsletterRow;
          const isUnsubscribed = nr.status === "unsubscribed";
          return (
            <RowActionMenu
              actions={[
                {
                  label: "Unsubscribe",
                  destructive: true,
                  disabled: isUnsubscribed,
                  onClick: () => {
                    setSelectedRow(nr);
                    setUnsubscribeOpen(true);
                  },
                },
              ]}
            />
          );
        }}
      />

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
