"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import { Row, SIEVE_OP, Stack, sieveFilter } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import type { JsonValue } from "@mohasinac/appkit";
import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDeleteModal, Div, ListingLayout, RowActionMenu, Text, useToast } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { apiClient } from "../../../http";

function maskIp(ip?: string): string {
  if (!ip) return "—";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  return ip.replace(/:\w+$/, ":*");
}

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

export type AdminSessionsViewProps = ListingLayoutProps;

export function AdminSessionsView({ children, ...props }: AdminSessionsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [revokeTarget, setRevokeTarget] = useState<SessionRow | null>(null);

  const revokeMutation = useApiMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.SESSION_BY_ID(id));
    },
    onSuccess: () => {
      showToast("Session revoked.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
      setRevokeTarget(null);
    },
    onError: (err: Error) => {
      showToast((err as Error)?.message ?? "Failed to revoke session.", "error");
    },
  });

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminSessionsResponse, SessionRow> = {
    portal: "admin",
    title: "Sessions",
    searchPlaceholder: "Search by user or device",
    emptyLabel: "No sessions found",
    filterKeys: ["isActive"],
    defaultSort: sortBy("lastActivity", "DESC"),
    queryKey: ["admin", "sessions", "listing"],
    endpoint: ADMIN_ENDPOINTS.SESSIONS,
    sortOptions: [
      { value: sortBy("lastActivity", "DESC"), label: "Most recent" },
      { value: "lastActivity", label: "Least recent" },
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.sessions).map((item, index) => {
        const deviceInfo = (item.deviceInfo ?? {}) as Record<string, JsonValue>;
        const userLabel = toStringValue(
          (item as Record<string, JsonValue>).user &&
            ((item as Record<string, JsonValue>).user as Record<string, JsonValue>)?.displayName,
          toStringValue(item.userId, `user-${index}`),
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
          ]
            .filter(Boolean)
            .join(" · "),
          status: Boolean(item.isActive) ? "Active" : "Expired",
          updatedAt: toRelativeDate(item.lastActivity ?? item.createdAt),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.count === "number" ? response.count : mappedRows.length,
    buildFilters: (state) => (state.isActive ? sieveFilter("isActive", SIEVE_OP.EQ, state.isActive) : undefined),
    buildBulkActions: (selection) => [
      {
        id: ROW_ACTION_ID.REVOKE,
        label: ACTIONS.ADMIN["revoke-session"].label,
        variant: "secondary",
        onClick: () => selection.clearSelection(),
      },
    ],
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ROW_ACTION_META[ROW_ACTION_ID.REVOKE].label,
            destructive: ROW_ACTION_META[ROW_ACTION_ID.REVOKE].destructive,
            onClick: () => setRevokeTarget(row),
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <Stack gap="sm">
        <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">
          Status
        </Text>
        <Row wrap gap="sm">
          {[
            { label: "All", value: "" },
            { label: "Active only", value: "true" },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setPendingFilters((p) => ({ ...p, isActive: opt.value }))}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                (pendingFilters.isActive || "") === opt.value
                  ? "bg-primary text-white border-primary"
                  : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </Row>
      </Stack>
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <ConfirmDeleteModal
        isOpen={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) revokeMutation.mutate(revokeTarget.id);
        }}
        isDeleting={revokeMutation.isPending}
        confirmText="Revoke"
        title="Revoke session?"
        message="This will sign the user out of this device immediately."
        variant="danger"
      />
    </>
  );
}
