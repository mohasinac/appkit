"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingViewShell } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import {
  ConfirmDeleteModal,
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
import { AdminContactEditorView } from "./AdminContactEditorView";
import { apiClient } from "../../../http";

export interface AdminContactViewProps extends ListingViewShellProps {}

interface AdminContactResponse {
  submissions?: unknown[];
  meta?: {
    filteredTotal?: number;
    total?: number;
  };
}

interface ContactRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export function AdminContactView({ children, ...props }: AdminContactViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<ContactRow | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const filterParts: string[] = [];
  if (statusFilter && statusFilter !== "All") filterParts.push(`status==${statusFilter}`);
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminContactResponse,
    ContactRow
  >({
    queryKey: ["admin", "contact", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.CONTACT_SUBMISSIONS,
    filters,
    q,
    mapRows: (response) =>
      toRecordArray(response.submissions).map((item, index) => ({
        id: toStringValue(item.id, `msg-${index}`),
        primary: toStringValue(item.subject, "No subject"),
        secondary: [
          toStringValue(item.name, "Unknown"),
          toStringValue(item.email, ""),
        ].filter(Boolean).join(" · ") || "—",
        status: toStringValue(item.status, "new"),
        updatedAt: toRelativeDate((item as any).createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.filteredTotal === "number") return response.meta.filteredTotal;
      if (typeof response.meta?.total === "number") return response.meta.total;
      return mappedRows.length;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "read" | "resolved" }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.CONTACT_SUBMISSION_BY_ID(id), { action });
    },
    onSuccess: (_data, { action }) => {
      const label = action === "read" ? "Marked as read" : "Archived";
      showToast(`${label}.`, "success");
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

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  return (
    <>
      <AdminListingScaffold
        portal="admin"
        {...props}
        title="Contact Submissions"
        subtitle="Review inbound contact form messages from users and visitors. Filter by status and search by subject or sender."
        searchPlaceholder="Search by subject, name, or email"
        onSearch={setQ}
        searchValue={q}
        rows={rows}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyLabel="No contact submissions found"
        resultSummary={`Showing ${rows.length} of ${total} submissions`}
        filterGroups={[
          {
            title: "Status",
            options: ["All", "new", "read", "resolved"],
            active: statusFilter || "All",
            onSelect: (opt) => setStatusFilter(opt === "All" ? "" : opt),
          },
        ]}
        renderRowActions={(row) => {
          const cr = row as ContactRow;
          return (
            <RowActionMenu
              actions={[
                {
                  label: "View",
                  onClick: () => {
                    setSelectedRow(cr);
                    setDrawerOpen(true);
                  },
                },
                {
                  label: "Mark read",
                  disabled: cr.status === "read" || cr.status === "resolved",
                  onClick: () => actionMutation.mutate({ id: cr.id, action: "read" }),
                },
                {
                  label: "Archive",
                  disabled: cr.status === "resolved",
                  onClick: () => actionMutation.mutate({ id: cr.id, action: "resolved" }),
                },
                { separator: true, label: "", onClick: () => {} },
                {
                  label: "Delete",
                  destructive: true,
                  onClick: () => {
                    setSelectedRow(cr);
                    setDeleteOpen(true);
                  },
                },
              ]}
            />
          );
        }}
      />

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
