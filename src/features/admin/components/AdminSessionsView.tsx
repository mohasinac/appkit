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

export interface AdminSessionsViewProps extends ListingViewShellProps {}

interface AdminSessionsResponse {
  sessions?: unknown[];
  count?: number;
}

interface SessionRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

function maskIp(ip?: string): string {
  if (!ip) return "—";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  return ip.replace(/:\w+$/, ":*");
}

export function AdminSessionsView({ children, ...props }: AdminSessionsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [q, setQ] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState("");
  const [revokeTarget, setRevokeTarget] = React.useState<SessionRow | null>(null);

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminSessionsResponse,
    SessionRow
  >({
    queryKey: ["admin", "sessions", "listing", q, activeFilter],
    endpoint: ADMIN_ENDPOINTS.SESSIONS,
    q,
    mapRows: (response) =>
      toRecordArray(response.sessions).map((item, index) => {
        const deviceInfo = (item.deviceInfo ?? {}) as Record<string, unknown>;
        const isActive = Boolean(item.isActive);
        if (activeFilter === "active" && !isActive) return null as unknown as SessionRow;
        const userLabel = toStringValue(
          (item as Record<string, unknown>).user &&
          ((item as Record<string, unknown>).user as Record<string, unknown>)?.displayName,
          toStringValue(item.userId, `user-${index}`)
        );
        const ipMasked = maskIp(toStringValue(deviceInfo.ip, ""));
        return {
          id: toStringValue(item.id, `session-${index}`),
          primary: userLabel,
          secondary: [
            toStringValue(deviceInfo.browser, "Unknown browser"),
            toStringValue(deviceInfo.os, ""),
            toStringValue(deviceInfo.device, ""),
            ipMasked,
          ].filter(Boolean).join(" · "),
          status: isActive ? "Active" : "Expired",
          updatedAt: toRelativeDate(item.lastActivity ?? item.createdAt),
        };
      }).filter(Boolean) as SessionRow[],
    getTotal: (response, mappedRows) =>
      typeof response.count === "number" ? response.count : mappedRows.length,
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.SESSION_BY_ID(id));
    },
    onSuccess: () => {
      showToast("Session revoked.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
      setRevokeTarget(null);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to revoke session.", "error");
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
        title="User Sessions"
        subtitle="View and revoke active and expired authentication sessions across the platform."
        searchPlaceholder="Search by user or device"
        onSearch={setQ}
        searchValue={q}
        rows={rows}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyLabel="No sessions found"
        resultSummary={`Showing ${rows.length} of ${total} sessions`}
        filterGroups={[
          {
            title: "Status",
            options: ["All", "active"],
            active: activeFilter || "All",
            onSelect: (opt) => setActiveFilter(opt === "All" ? "" : opt),
          },
        ]}
        renderRowActions={(row) => (
          <RowActionMenu
            actions={[
              {
                label: "Revoke",
                destructive: true,
                onClick: () => setRevokeTarget(row as SessionRow),
              },
            ]}
          />
        )}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => revokeMutation.mutate(revokeTarget!.id)}
        isDeleting={revokeMutation.isPending}
        confirmText="Revoke"
        title="Revoke session?"
        message="This will sign the user out of this device immediately."
        variant="danger"
      />
    </>
  );
}
