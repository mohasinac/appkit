"use client";

import { useApiMutation, type JsonArray } from "@mohasinac/appkit/client";
import { SIEVE_OP, sieveFilter } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDeleteModal, FilterChipGroup, ListingLayout, RowActionMenu, useToast } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import { useBulkAction } from "../../../react";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { apiClient } from "../../../http";
import { NOTIFICATION_TYPES } from "../../../constants/notification-types";

// W1-33 — sourced from shared NOTIFICATION_TYPES registry, prefixed with "All".
const NOTIF_TYPES = ["All", ...NOTIFICATION_TYPES] as const;

interface AdminNotificationsResponse {
  items?: JsonArray;
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

export type AdminNotificationsViewProps = ListingLayoutProps;

export function AdminNotificationsView({ children, ...props }: AdminNotificationsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<NotifRow | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);

  const bulkNotifs = useBulkAction<{ action: string; ids: string[] }, unknown>({
    mutationFn: (payload) => apiClient.post(ADMIN_ENDPOINTS.ADMIN_NOTIFICATIONS_BULK, payload),
    onSuccess: (result) => {
      showToast(
        `${result.summary.succeeded}/${result.summary.total} notifications updated.`,
        result.summary.failed > 0 ? "warning" : "success",
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
    onError: () => {
      showToast("Bulk action failed.", "error");
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.ADMIN_NOTIFICATION_BY_ID(id));
    },
    onSuccess: () => {
      showToast("Notification deleted.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      showToast((err as Error)?.message ?? "Failed to delete notification.", "error");
    },
  });

  const resendMutation = useApiMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(ADMIN_ENDPOINTS.ADMIN_NOTIFICATION_RESEND(id), {});
    },
    onSuccess: () => {
      showToast("Notification resent.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
    onError: (err: Error) => {
      showToast((err as Error)?.message ?? "Failed to resend notification.", "error");
    },
  });

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminNotificationsResponse, NotifRow> = {
    portal: "admin",
    title: "Notifications",
    searchPlaceholder: "Search by title or user ID",
    emptyLabel: "No notifications found",
    filterKeys: ["type"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "notifications", "listing"],
    endpoint: ADMIN_ENDPOINTS.ADMIN_NOTIFICATIONS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `notif-${index}`),
        primary: toStringValue(item.title, "Notification"),
        secondary:
          [toStringValue(item.userId, ""), toStringValue(item.type, "")]
            .filter(Boolean)
            .join(" · "),
        status: Boolean(item.isRead) ? "Read" : "Unread",
        updatedAt: toRelativeDate(item.createdAt),
        type: toStringValue(item.type, ""),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) =>
      state.type && state.type !== "All" ? sieveFilter("type", SIEVE_OP.EQ, state.type) : undefined,
    buildBulkActions: (selection): BulkActionItem[] => [
      {
        id: ROW_ACTION_ID.MARK_READ,
        label: ACTIONS.ADMIN["mark-read"].label,
        variant: "primary",
        loading: bulkNotifs.isLoading,
        onClick: () => {
          void bulkNotifs.execute({ action: "mark_read", ids: selection.selectedIds });
          selection.clearSelection();
        },
      },
      {
        id: ROW_ACTION_ID.DELETE,
        label: ACTIONS.ADMIN["delete-notification"].label,
        variant: "secondary",
        onClick: () => setBulkDeleteIds(selection.selectedIds),
      },
    ],
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ACTIONS.ADMIN["resend-notification"].label,
            onClick: () => resendMutation.mutate(row.id),
          },
          {
            label: ROW_ACTION_META[ROW_ACTION_ID.DELETE].label,
            destructive: ROW_ACTION_META[ROW_ACTION_ID.DELETE].destructive,
            onClick: () => setDeleteTarget(row),
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Type"
        tabs={NOTIF_TYPES.map((opt) => ({ id: opt, label: opt }))}
        value={pendingFilters.type || "All"}
        onChange={(v) => setPendingFilters((p) => ({ ...p, type: v }))}
      />
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget) || Boolean(bulkDeleteIds)}
        onClose={() => {
          setDeleteTarget(null);
          setBulkDeleteIds(null);
        }}
        onConfirm={() => {
          if (bulkDeleteIds) {
            void bulkNotifs.execute({ action: "delete", ids: bulkDeleteIds }).then(() => setBulkDeleteIds(null));
          } else if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
        isDeleting={deleteMutation.isPending || bulkNotifs.isLoading}
        title={bulkDeleteIds ? "Delete these notifications?" : "Delete notification?"}
        message={
          bulkDeleteIds
            ? `${bulkDeleteIds.length} notification(s) will be permanently removed.`
            : "This notification will be permanently removed."
        }
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
