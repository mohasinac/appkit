"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingViewShell, RowActionMenu, ConfirmDeleteModal, useToast } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";
import { apiClient } from "../../../http";

export interface AdminNotificationsViewProps extends ListingViewShellProps {}

interface AdminNotificationsResponse {
  items?: unknown[];
  total?: number;
}

interface NotifRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  type?: string;
}

const NOTIF_TYPES = [
  "All", "order_placed", "order_shipped", "order_delivered", "order_cancelled",
  "bid_placed", "bid_outbid", "bid_won", "review_posted", "payout_processed",
];

export function AdminNotificationsView({ children, ...props }: AdminNotificationsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<NotifRow | null>(null);

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const filterParts: string[] = [];
  if (typeFilter && typeFilter !== "All") filterParts.push(`type==${typeFilter}`);
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminNotificationsResponse,
    NotifRow
  >({
    queryKey: ["admin", "notifications", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.ADMIN_NOTIFICATIONS,
    filters,
    q,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `notif-${index}`),
        primary: toStringValue(item.title, "Notification"),
        secondary: [
          toStringValue(item.userId, ""),
          toStringValue(item.type, ""),
        ].filter(Boolean).join(" · "),
        status: Boolean(item.isRead) ? "Read" : "Unread",
        updatedAt: toRelativeDate(item.createdAt),
        type: toStringValue(item.type, ""),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.ADMIN_NOTIFICATION_BY_ID(id));
    },
    onSuccess: () => {
      showToast("Notification deleted.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to delete notification.", "error");
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(ADMIN_ENDPOINTS.ADMIN_NOTIFICATION_RESEND(id), {});
    },
    onSuccess: () => {
      showToast("Notification resent.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to resend notification.", "error");
    },
  });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  const rowActions = (row: NotifRow) => [
    {
      label: "Resend",
      onClick: () => resendMutation.mutate(row.id),
    },
    {
      label: "Delete",
      destructive: true,
      onClick: () => setDeleteTarget(row),
    },
  ];

  return (
    <>
      <AdminListingScaffold
        portal="admin"
        {...props}
        title="Notifications"
        subtitle="View and manage platform notifications sent to users."
        searchPlaceholder="Search by title or user ID"
        onSearch={setQ}
        searchValue={q}
        rows={rows}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyLabel="No notifications found"
        resultSummary={`Showing ${rows.length} of ${total} notifications`}
        filterGroups={[
          {
            title: "Type",
            options: NOTIF_TYPES,
            active: typeFilter || "All",
            onSelect: (opt) => setTypeFilter(opt === "All" ? "" : opt),
          },
        ]}
        renderRowActions={(row) => (
          <RowActionMenu actions={rowActions(row as NotifRow)} />
        )}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.id)}
        isDeleting={deleteMutation.isPending}
        title="Delete notification?"
        message="This notification will be permanently removed."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
