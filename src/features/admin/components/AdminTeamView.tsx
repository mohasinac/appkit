"use client";

import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { UserPlus } from "lucide-react";
import { Button, FilterChipGroup, ListingLayout, RowActionMenu } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import { ALL_TAB } from "../constants/filter-tabs";
import type { AdminFilterTab } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { AdminEmployeeEditorView } from "./AdminEmployeeEditorView";

const GROUP_TABS: readonly AdminFilterTab[] = [
  ALL_TAB,
  { id: "content_moderator", label: "Content Mod" },
  { id: "review_manager", label: "Reviews" },
  { id: "blog_poster", label: "Blog" },
  { id: "community_manager", label: "Community" },
  { id: "event_handler", label: "Events" },
  { id: "newsletter_manager", label: "Newsletter" },
  { id: "seo_manager", label: "SEO" },
  { id: "ad_manager", label: "Ads" },
  { id: "site_manager", label: "Site" },
  { id: "catalog_manager", label: "Catalog" },
  { id: "finance_manager", label: "Finance" },
  { id: "data_analyst", label: "Analytics" },
  { id: "customer_support", label: "Support" },
  { id: "support_agent", label: "Agent" },
  { id: "store_onboarding", label: "Onboarding" },
  { id: "trust_and_safety", label: "T&S" },
  { id: "auction_monitor", label: "Auctions" },
  { id: "scam_moderator", label: "Scams" },
  { id: "custom", label: "Custom" },
];

function formatGroup(group: string): string {
  return group.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface AdminTeamResponse {
  users?: unknown[];
  total?: number;
  meta?: { total?: number };
}

interface EmployeeRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export interface AdminTeamViewProps extends ListingLayoutProps {
  onBulkRemove?: (ids: string[]) => Promise<void>;
}

export function AdminTeamView({ children, onBulkRemove, ...props }: AdminTeamViewProps) {
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
    searchPlaceholder: "Search by name or email",
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
      toRecordArray(response.users).map((item, index) => ({
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
    toolbarExtra: (
      <Button gap="xs" 
        type="button"
        variant="primary"
        onClick={openInvite}
        className="flex items-center .5 whitespace-nowrap"
      >
        <UserPlus className="h-4 w-4" />
        Invite Employee
      </Button>
    ),
    buildBulkActions: onBulkRemove
      ? (selection): BulkActionItem[] => [
          buildBulkAction(ACTIONS.ADMIN["remove-team-member"], async () => {
            await onBulkRemove(selection.selectedIds);
            selection.clearSelection();
          }),
        ]
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
      <FilterChipGroup
        label="Permission Group"
        tabs={GROUP_TABS}
        value={pendingFilters.group ?? ""}
        onChange={(id) => setPendingFilters((p) => ({ ...p, group: id }))}
      />
    ),
  };

  return (
    <>
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
