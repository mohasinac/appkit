"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmDeleteModal, FilterChipGroup, ListingLayout, RowActionMenu, useToast } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../../features/products/constants/action-defs";
import { ADMIN_CONTACT_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminContactEditorView } from "./AdminContactEditorView";
import { apiClient } from "../../../http";

interface AdminContactResponse {
  submissions?: unknown[];
  meta?: { filteredTotal?: number; total?: number };
}

interface ContactRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export interface AdminContactViewProps extends ListingLayoutProps {
  onBulkMarkRead?: (ids: string[]) => Promise<void>;
  onBulkArchive?: (ids: string[]) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

export function AdminContactView({
  children,
  onBulkMarkRead,
  onBulkArchive,
  onBulkDelete,
  ...props
}: AdminContactViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ContactRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "read" | "resolved" }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.CONTACT_SUBMISSION_BY_ID(id), { action });
    },
    onSuccess: (_data, { action }) => {
      showToast(`${action === "read" ? "Marked as read" : "Archived"}.`, "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "contact"] });
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Action failed.", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.CONTACT_SUBMISSION_BY_ID(id));
    },
    onSuccess: () => {
      showToast("Submission deleted.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "contact"] });
      setDeleteOpen(false);
      setSelectedRow(null);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to delete.", "error");
    },
  });

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminContactResponse, ContactRow> = {
    portal: "admin",
    title: "Contact Submissions",
    searchPlaceholder: "Search by subject, name, or email",
    emptyLabel: "No contact submissions found",
    filterKeys: ["status"],
    defaultSort: "-createdAt",
    queryKey: ["admin", "contact", "listing"],
    endpoint: ADMIN_ENDPOINTS.CONTACT_SUBMISSIONS,
    sortOptions: [
      { value: "-createdAt", label: "Newest" },
      { value: "createdAt", label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.submissions).map((item, index) => ({
        id: toStringValue(item.id, `msg-${index}`),
        primary: toStringValue(item.subject, "No subject"),
        secondary:
          [toStringValue(item.name, "Unknown"), toStringValue(item.email, "")]
            .filter(Boolean)
            .join(" · ") || "—",
        status: toStringValue(item.status, "new"),
        updatedAt: toRelativeDate((item as Record<string, unknown>).createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.filteredTotal === "number") return response.meta.filteredTotal;
      if (typeof response.meta?.total === "number") return response.meta.total;
      return mappedRows.length;
    },
    buildFilters: (f) => (f.status && f.status !== "All" ? `status==${f.status}` : undefined),
    buildBulkActions: (selection): BulkActionItem[] => [
      ...(onBulkMarkRead
        ? [
            buildBulkAction(ACTIONS.ADMIN["mark-contact-read"], async () => {
              await onBulkMarkRead(selection.selectedIds);
              selection.clearSelection();
            }),
          ]
        : []),
      ...(onBulkArchive
        ? [
            buildBulkAction(ACTIONS.ADMIN["archive-contact"], async () => {
              await onBulkArchive(selection.selectedIds);
              selection.clearSelection();
            }),
          ]
        : []),
      ...(onBulkDelete
        ? [
            buildBulkAction(ACTIONS.ADMIN["delete-contact"], async () => {
              await onBulkDelete(selection.selectedIds);
              selection.clearSelection();
            }),
          ]
        : []),
    ],
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ROW_ACTION_META[ROW_ACTION_ID.VIEW].label,
            onClick: () => {
              setSelectedRow(row);
              setDrawerOpen(true);
            },
          },
          {
            label: ACTIONS.ADMIN["mark-contact-read"].label,
            disabled: row.status === "read" || row.status === "resolved",
            onClick: () => actionMutation.mutate({ id: row.id, action: "read" }),
          },
          {
            label: ACTIONS.ADMIN["archive-contact"].label,
            disabled: row.status === "resolved",
            onClick: () => actionMutation.mutate({ id: row.id, action: "resolved" }),
          },
          { separator: true, label: "", onClick: () => {} },
          {
            label: ACTIONS.ADMIN["delete-contact"].label,
            destructive: true,
            onClick: () => {
              setSelectedRow(row);
              setDeleteOpen(true);
            },
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={ADMIN_CONTACT_STATUS_TABS}
        value={pendingFilters.status ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
      />
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <AdminContactEditorView
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedRow(null);
        }}
        submissionId={selectedRow?.id}
        subject={toStringValue(selectedRow?._raw?.subject, "No subject")}
        name={toStringValue(selectedRow?._raw?.name, "")}
        email={toStringValue(selectedRow?._raw?.email, "")}
        message={toStringValue(selectedRow?._raw?.message ?? selectedRow?._raw?.body, "")}
        currentStatus={selectedRow?.status}
      />
      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setSelectedRow(null);
        }}
        onConfirm={() => {
          if (selectedRow) deleteMutation.mutate(selectedRow.id);
        }}
        isDeleting={deleteMutation.isPending}
        title="Delete submission?"
        message="This contact submission will be permanently removed."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
