"use client";

import React from "react";
import { ListingViewShell, RowActionMenu } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { AdminListingScaffold } from "./AdminListingScaffold";
import { AdminUserEditorView } from "./AdminUserEditorView";

export interface AdminUsersViewProps extends ListingViewShellProps {}

interface AdminUsersResponse {
  users?: unknown[];
  total?: number;
  meta?: {
    total?: number;
  };
}

interface UserRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export function AdminUsersView({ children, ...props }: AdminUsersViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<UserRow | null>(null);

  const filterParts: string[] = [];
  if (statusFilter && statusFilter !== "All") {
    filterParts.push(statusFilter === "Active" ? "disabled==false" : "disabled==true");
  }
  if (roleFilter && roleFilter !== "All") filterParts.push(`role==${roleFilter}`);
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminUsersResponse,
    UserRow
  >({
    queryKey: ["admin", "users", "listing", q, filters ?? ""],
    endpoint: ADMIN_ENDPOINTS.USERS,
    filters,
    q,
    mapRows: (response) =>
      toRecordArray(response.users).map((item, index) => ({
        id: toStringValue(item.id ?? item.uid, `user-${index}`),
        primary: toStringValue(item.displayName, "Unnamed user"),
        secondary: [
          toStringValue(item.email, "No email"),
          toStringValue(item.role, "Unknown role"),
        ].join(" · "),
        status:
          typeof item.disabled === "boolean"
            ? item.disabled
              ? "Disabled"
              : "Active"
            : "Active",
        updatedAt: toRelativeDate(item.lastLoginAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.total === "number") {
        return response.meta.total;
      }
      if (typeof response.total === "number") {
        return response.total;
      }
      return mappedRows.length;
    },
  });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  const rowActions = (row: UserRow) => [
    {
      label: "Manage",
      onClick: () => {
        setSelectedRow(row);
        setDrawerOpen(true);
      },
    },
  ];

  return (
    <>
      <AdminListingScaffold
        portal="admin"
        {...props}
        title="User Management"
        subtitle="Audit onboarding, verification, and role changes without leaving the admin listing shell."
        actionLabel="Invite user"
        searchPlaceholder="Search users, email, or seller handles"
        onSearch={setQ}
        searchValue={q}
        rows={rows}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyLabel="No users found"
        resultSummary={`Showing ${rows.length} of ${total} users`}
        filterGroups={[
          {
            title: "Status",
            options: ["All", "Active", "Disabled"],
            active: statusFilter || "All",
            onSelect: (opt) => setStatusFilter(opt === "All" ? "" : opt),
          },
          {
            title: "Role",
            options: ["All", "admin", "seller", "buyer", "moderator"],
            active: roleFilter || "All",
            onSelect: (opt) => setRoleFilter(opt === "All" ? "" : opt),
          },
        ]}
        renderRowActions={(row) => (
          <RowActionMenu actions={rowActions(row as UserRow)} />
        )}
      />

      <AdminUserEditorView
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userId={selectedRow?.id}
        displayName={selectedRow?.primary}
        currentRole={toStringValue(selectedRow?._raw?.role, "user")}
        currentIsDisabled={selectedRow?.status === "Disabled"}
        currentEmailVerified={Boolean(selectedRow?._raw?.emailVerified)}
      />
    </>
  );
}
