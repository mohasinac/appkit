"use client";

import { sieveFilter, SIEVE_OP, type JsonArray } from "@mohasinac/appkit/client";
import type { JsonValue } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "../../../ui/components/Button";
import { Label } from "../../../ui/components/Typography";
import { ListingLayout } from "../../../ui/components/ListingLayout";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import { RowActionMenu } from "../../../ui/components/RowActionMenu";
import { Stack } from "../../../ui/components/Layout";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";
import type { ListingLayoutProps } from "../../../ui/components/ListingLayout";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META } from "../../products/constants/action-defs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminEmployeeEditorView, GROUP_OPTIONS } from "./AdminEmployeeEditorView";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

/**
 * RS13 (2026-11-04) — this used to be a hand-written 20-chip `FilterChipGroup`
 * (19 permission groups + "All"), which CLAUDE.md's "Overflowing Pill & Tab
 * Rows" / "Select / Dropdown Rules" sections both name as the >5-option
 * SELECTING case (a role picker, their own named example), not the small
 * closed-set SCOPING case pill rows are for. Migrated to `<PaginatedSelect>`,
 * reusing `AdminEmployeeEditorView`'s `GROUP_OPTIONS` — the real, derived
 * `PERMISSION_GROUPS` list — rather than this file's own stale hand-copy
 * (raw snake_case labels, no `GROUP_LABEL_OVERRIDES`, Root Cause #61 shape).
 * "All" is prepended here only, since it is a filter-scope concept the
 * single-employee editor's own picker has no use for.
 */
const GROUP_FILTER_OPTIONS = [{ value: "All", label: "All" }, ...GROUP_OPTIONS];

function formatGroup(group: string): string {
  return group.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface AdminTeamResponse {
  items?: JsonArray;
  total?: number;
  meta?: { total?: number };
}

interface EmployeeRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, JsonValue>;
}

export interface AdminTeamViewProps extends ListingLayoutProps {
  onBulkRemove?: (ids: string[]) => Promise<void>;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export function AdminTeamView({ children, onBulkRemove, pageRegionCards = [], ...props }: AdminTeamViewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<EmployeeRow | null>(null);
  const [inviteMode, setInviteMode] = useState(false);

  const openInvite = useCallback(() => {
    setSelectedRow(null);
    setInviteMode(true);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((row: EmployeeRow) => {
    setSelectedRow(row);
    setInviteMode(false);
    setDrawerOpen(true);
  }, []);

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminTeamResponse, EmployeeRow> = {
    portal: "admin",
    title: "Team",
    subtitle: "Manage employee accounts and permissions",
    search: {
      placeholder: "Search by name or email",
      /*
       * Genuinely partial, and that is worth stating: `/api/admin/team`
       * filters AFTER `mapDoc` has decrypted, with
       * `(u.email ?? "").toLowerCase().includes(q)`. Most PII search in this
       * codebase resolves an HMAC blind index and matches exactly; this one
       * does not, which is why `mode` stays partial here.
       */
      fields: ["displayName", "email"],
    },
    emptyLabel: "No employees found",
    filterKeys: ["group"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "team", "listing"],
    endpoint: ADMIN_ENDPOINTS.TEAM,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: "displayName", label: "Name A–Z" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id ?? item.uid, `employee-${index}`),
        primary: toStringValue(item.displayName, "Unnamed employee"),
        secondary: [
          toStringValue(item.email, "No email"),
          item.permissionGroup
            ? formatGroup(toStringValue(item.permissionGroup, ""))
            : "Custom",
        ].join(" · "),
        status:
          typeof item.disabled === "boolean"
            ? item.disabled
              ? "Disabled"
              : "Active"
            : "Active",
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.total === "number") return response.meta.total;
      if (typeof response.total === "number") return response.total;
      return mappedRows.length;
    },
    buildFilters: (state) =>
      state.group && state.group !== "All" ? sieveFilter("permissionGroup", SIEVE_OP.EQ, state.group) : undefined,
    // Mirrors the row action's "edit-team-member" entry so the row itself
    // is clickable, not just the overflow menu.
    onRowClick: (row) => openEdit(row),
    toolbarExtra: (
      <Button gap="sm" 
        type="button"
        variant="primary"
        onClick={openInvite}
        className="whitespace-nowrap"
      >
        <UserPlus className="h-4 w-4" />
        Invite Employee
      </Button>
    ),
    // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset.
    buildBulkActions: onBulkRemove
      ? (selection): BulkActionItem[] =>
          ADMIN_BULK_ACTIONS.team.map((id) => ({
            id,
            label: ROW_ACTION_META[id].label,
            destructive: ROW_ACTION_META[id].destructive,
            onClick: async () => {
              await onBulkRemove(selection.selectedIds);
              selection.clearSelection();
            },
          }))
      : undefined,
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          {
            label: ACTIONS.ADMIN["edit-team-member"].label,
            onClick: () => openEdit(row),
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <Stack gap="xs">
        <Label size="sm" color="muted">Permission Group</Label>
        <PaginatedSelect
          ariaLabel="Permission Group"
          options={GROUP_FILTER_OPTIONS}
          value={pendingFilters.group || "All"}
          onChange={(v) => setPendingFilters((p) => ({ ...p, group: v ?? "All" }))}
        />
      </Stack>
    ),
  };

  return (
    <>
      <AdminComposableRegion pageId="admin-team" initialCards={pageRegionCards} />
      <DataListingView config={config} />
      <AdminEmployeeEditorView
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={inviteMode ? "invite" : "edit"}
        userId={selectedRow?.id}
        displayName={selectedRow?.primary}
        currentPermissionGroup={toStringValue(
          selectedRow?._raw?.permissionGroup,
          "custom",
        )}
        currentPermissions={
          Array.isArray(selectedRow?._raw?.permissions)
            ? (selectedRow!._raw!.permissions as string[])
            : []
        }
      />
    </>
  );
}
