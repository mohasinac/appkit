"use client";

import { useApiMutation, type JsonArray } from "@mohasinac/appkit/client";
import { SIEVE_OP, sieveFilter } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDeleteModal, FilterChipGroup, ListingLayout, RowActionMenu, useToast } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
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
import { ViewNotificationModal, type NotificationEntryDetail } from "./ViewNotificationModal";
import type { JsonValue } from "../../../schemas/types";

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
  _raw: Record<string, JsonValue>;
}

export type AdminNotificationsViewProps = ListingLayoutProps;

export function AdminNotificationsView({ children, ...props }: AdminNotificationsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<NotifRow | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [viewNotification, setViewNotification] = useState<NotificationEntryDetail | null>(null);

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

  const openNotification = (row: NotifRow) => {
    const raw = row._raw;
    setViewNotification({
      id: row.id,
      userId: toStringValue(raw.userId, ""),
      type: toStringValue(raw.type, ""),
      priority: toStringValue(raw.priority, "") || undefined,
      title: toStringValue(raw.title, "Notification"),
      message: toStringValue(raw.message, ""),
      imageUrl: toStringValue(raw.imageUrl, "") || undefined,
      actionUrl: toStringValue(raw.actionUrl, "") || undefined,
      actionLabel: toStringValue(raw.actionLabel, "") || undefined,
      isRead: Boolean(raw.isRead),
      relatedId: toStringValue(raw.relatedId, "") || undefined,
      relatedType: toStringValue(raw.relatedType, "") || undefined,
      createdAt: toStringValue(raw.createdAt, "") || undefined,
    });
  };

  const config: ListingViewConfig<AdminNotificationsResponse, NotifRow> = {
    portal: "admin",
    title: "Notifications",
    searchPlaceholder: "Search by title or user ID",
    emptyLabel: "No notifications found",
    filterKeys: ["type", "readState"],
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
        _raw: item,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) => {
      const parts: string[] = [];
      if (state.type && state.type !== "All") parts.push(sieveFilter("type", SIEVE_OP.EQ, state.type));
      if (state.readState === "unread") parts.push(sieveFilter("isRead", SIEVE_OP.EQ, false));
      else if (state.readState === "read") parts.push(sieveFilter("isRead", SIEVE_OP.EQ, true));
      return parts.join(",") || undefined;
    },
    onRowClick: (row) => openNotification(row),
    // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset.
    buildBulkActions: (selection): BulkActionItem[] =>
      ADMIN_BULK_ACTIONS.notifications.map((id) => ({
        id,
        label: ROW_ACTION_META[id].label,
        destructive: ROW_ACTION_META[id].destructive,
        variant: id === ROW_ACTION_ID.MARK_READ ? ("primary" as const) : ("secondary" as const),
        loading: id === ROW_ACTION_ID.MARK_READ ? bulkNotifs.isLoading : undefined,
        onClick: () => {
          if (id === ROW_ACTION_ID.MARK_READ) {
            void bulkNotifs.execute({ action: "mark_read", ids: selection.selectedIds });
            selection.clearSelection();
          } else {
            setBulkDeleteIds(selection.selectedIds);
          }
        },
      })),
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: "View details",
            onClick: () => openNotification(row),
          },
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
      <>
        <FilterChipGroup
          label="Type"
          tabs={NOTIF_TYPES.map((opt) => ({ id: opt, label: opt }))}
          value={pendingFilters.type || "All"}
          onChange={(v) => setPendingFilters((p) => ({ ...p, type: v }))}
        />
        <FilterChipGroup
          label="Read state"
          tabs={[
            { id: "", label: "All" },
            { id: "unread", label: "Unread" },
            { id: "read", label: "Read" },
          ]}
          value={pendingFilters.readState ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, readState: id }))}
          allId=""
        />
      </>
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
      <ViewNotificationModal
        notification={viewNotification}
        isOpen={Boolean(viewNotification)}
        onClose={() => setViewNotification(null)}
      />
    </>
  );
}
