"use client";

import { useApiMutation, type JsonArray } from "@mohasinac/appkit/client";
import type { JsonValue } from "@mohasinac/appkit";
import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FilterChipGroup,
  Form,
  FormActions,
  Input,
  ListingLayout,
  Modal,
  RowActionMenu,
  Text as AppText,
  useToast,
} from "../../../ui";
import type { ListingLayoutProps, BulkActionItem } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import { ADMIN_USER_STATUS_TABS, ADMIN_USER_ROLE_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig, ListingSelectionContext } from "./DataListingView";
import { apiClient } from "../../../http";
import { AdminUserEditorView } from "./AdminUserEditorView";
import { useBulkAction } from "../../../react";
import { useBulkEvent } from "../../events/hooks/useBulkEvent";
import { RTDB_PATHS } from "../../../providers/db-firebase/rtdb-paths";
import { RealtimeEventStatus } from "../../../react/hooks/useRealtimeEvent";

interface AdminUsersResponse {
  users?: JsonArray;
  total?: number;
  meta?: { total?: number };
}

interface UserRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, JsonValue>;
}

export type AdminUsersViewProps = ListingLayoutProps;

export function AdminUsersView({ children, ...props }: AdminUsersViewProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<UserRow | null>(null);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banTargetId, setBanTargetId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [bulkConfirmTarget, setBulkConfirmTarget] = useState<{
    action: "suspend" | "delete";
    ids: string[];
  } | null>(null);

  // Hard-ban runs as a Firebase Function job (cascade across address/payment
  // clusters can exceed the Vercel Hobby 10s ceiling) — the route only
  // enqueues it and returns {jobId, customToken} immediately. This event
  // stream tracks that job through to completion via the bulk_events RTDB
  // ping channel.
  const banJobEvent = useBulkEvent<{ uid: string }>({ rtdbPath: RTDB_PATHS.BULK_EVENTS });

  useEffect(() => {
    if (banJobEvent.status === RealtimeEventStatus.SUCCESS) {
      toast.showToast("User has been banned.", "success");
      setBanModalOpen(false);
      setBanTargetId(null);
      setBanReason("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "users", "listing"] });
      banJobEvent.reset();
    } else if (
      banJobEvent.status === RealtimeEventStatus.FAILED ||
      banJobEvent.status === RealtimeEventStatus.TIMEOUT
    ) {
      toast.showToast(banJobEvent.error ?? "Failed to ban user.", "error");
      banJobEvent.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banJobEvent.status]);

  const banUser = useApiMutation({
    mutationFn: () => {
      if (!banTargetId) throw new Error("No user selected");
      return apiClient.post<{ jobId: string; customToken: string; uid: string }>(
        ADMIN_ENDPOINTS.USER_HARD_BAN(banTargetId),
        { reason: banReason.trim() },
      );
    },
    onSuccess: (result) => {
      banJobEvent.subscribe(result.jobId, result.customToken);
    },
    onError: () => {
      toast.showToast("Failed to start hard-ban.", "error");
    },
  });

  const bulkUsers = useBulkAction<{ action: string; ids: string[] }, unknown>({
    mutationFn: (payload) => apiClient.post(ADMIN_ENDPOINTS.USERS_BULK, payload),
    onSuccess: (result) => {
      toast.showToast(
        `${result.summary.succeeded}/${result.summary.total} users updated.`,
        result.summary.failed > 0 ? "warning" : "success",
      );
      void queryClient.invalidateQueries({ queryKey: ["admin", "users", "listing"] });
    },
    onError: () => {
      toast.showToast("Bulk action failed.", "error");
    },
  });

  const unbanUser = useApiMutation({
    mutationFn: (uid: string) => apiClient.post(ADMIN_ENDPOINTS.USER_UNBAN(uid), {}),
    onSuccess: () => {
      toast.showToast("Ban lifted.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "users", "listing"] });
    },
    onError: () => {
      toast.showToast("Failed to lift ban.", "error");
    },
  });

  const handleManageBulkClick = (selection: ListingSelectionContext<UserRow>) => {
    const rowId = selection.selectedIds[0];
    const row = selection.rows.find((r) => r.id === rowId) ?? null;
    if (row) {
      setSelectedRow(row);
      setDrawerOpen(true);
    }
    selection.clearSelection();
  };

  const handleRestoreBulkClick = (selection: ListingSelectionContext<UserRow>) => {
    void bulkUsers.execute({ action: "restore", ids: selection.selectedIds });
    selection.clearSelection();
  };

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const config: ListingViewConfig<AdminUsersResponse, UserRow> = {
    portal: "admin",
    title: "Users",
    searchPlaceholder: "Search users, email, or seller handles",
    emptyLabel: "No users found",
    filterKeys: ["status", "role"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "users", "listing"],
    endpoint: ADMIN_ENDPOINTS.USERS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: "displayName", label: "Name A–Z" },
    ],
    mapRows: (response) =>
      toRecordArray(response.users).map((item, index) => {
        const isDisabled = Boolean(item.isDisabled ?? item.disabled);
        const isHardBanned = isDisabled && Boolean(item.hardBanReason);
        const softBanCount = Array.isArray(item.softBans) ? item.softBans.length : 0;
        let status = "Active";
        if (isHardBanned) status = "Hard banned";
        else if (isDisabled) status = "Disabled";
        else if (softBanCount > 0) status = `Soft bans (${softBanCount})`;
        return {
          id: toStringValue(item.id ?? item.uid, `user-${index}`),
          primary: toStringValue(item.displayName, "Unnamed user"),
          secondary: [
            toStringValue(item.email, "No email"),
            toStringValue(item.role, "Unknown role"),
          ].join(" · "),
          status,
          updatedAt: toRelativeDate(item.lastLoginAt ?? item.createdAt),
          _raw: item,
        };
      }),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.total === "number") return response.meta.total;
      if (typeof response.total === "number") return response.total;
      return mappedRows.length;
    },
    buildFilters: (f) => {
      const parts: string[] = [];
      if (f.status && f.status !== "All") {
        parts.push(f.status === "Active" ? "disabled==false" : "disabled==true");
      }
      if (f.role && f.role !== "All") parts.push(sieveFilter("role", SIEVE_OP.EQ, f.role));
      return parts.join(",") || undefined;
    },
    onRowClick: (row) => {
      setSelectedRow(row);
      setDrawerOpen(true);
    },
    // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset,
    // backed by the real /api/admin/users/bulk endpoint via useBulkAction.
    buildBulkActions: (selection): BulkActionItem[] =>
      ([ROW_ACTION_ID.MANAGE, ROW_ACTION_ID.SUSPEND, ROW_ACTION_ID.RESTORE, ROW_ACTION_ID.DELETE] as const)
        .filter((id) => ADMIN_BULK_ACTIONS.users.includes(id))
        .map((id) => {
          if (id === ROW_ACTION_ID.MANAGE) {
            return {
              id,
              label: ROW_ACTION_META[id].label,
              variant: "primary" as const,
              onClick: () => handleManageBulkClick(selection),
            };
          }
          if (id === ROW_ACTION_ID.RESTORE) {
            return {
              id,
              label: ROW_ACTION_META[id].label,
              variant: "secondary" as const,
              loading: bulkUsers.isLoading,
              onClick: () => handleRestoreBulkClick(selection),
            };
          }
          const action = id === ROW_ACTION_ID.SUSPEND ? "suspend" : "delete";
          return {
            id,
            label: ROW_ACTION_META[id].label,
            variant: "danger" as const,
            loading: bulkUsers.isLoading,
            onClick: () => setBulkConfirmTarget({ action, ids: selection.selectedIds }),
          };
        }),
    renderRowActions: (row) => {
      const isBanned = row.status === "Hard banned";
      return (
        <RowActionMenu
          actions={[
            {
              label: ACTIONS.ADMIN["manage-user"].label,
              onClick: () => {
                setSelectedRow(row);
                setDrawerOpen(true);
              },
            },
            {
              label: ACTIONS.ADMIN["ban-user"].label,
              onClick: () => {
                setBanTargetId(row.id);
                setBanReason("");
                setBanModalOpen(true);
              },
              disabled: isBanned,
            },
            {
              label: ACTIONS.ADMIN["unban-user"].label,
              onClick: () => unbanUser.mutate(row.id),
              disabled: !isBanned || unbanUser.isPending,
            },
          ]}
        />
      );
    },
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <>
        <FilterChipGroup
          label="Status"
          tabs={ADMIN_USER_STATUS_TABS}
          value={pendingFilters.status ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
        />
        <FilterChipGroup
          label="Role"
          tabs={ADMIN_USER_ROLE_TABS}
          value={pendingFilters.role ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, role: id }))}
        />
      </>
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      <AdminUserEditorView
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userId={selectedRow?.id}
        displayName={selectedRow?.primary}
        currentRole={toStringValue(selectedRow?._raw?.role, "user")}
        currentEmailVerified={Boolean(selectedRow?._raw?.emailVerified)}
        currentIsTester={Boolean(selectedRow?._raw?.isTester)}
        ownedStoreId={toStringValue(selectedRow?._raw?.storeId, "") || undefined}
        ownedStoreName={toStringValue(selectedRow?._raw?.storeName, "") || undefined}
        currentIsHardBanned={Boolean(
          (selectedRow?._raw?.isDisabled ?? selectedRow?._raw?.disabled) &&
            selectedRow?._raw?.hardBanReason,
        )}
        currentHardBanReason={toStringValue(selectedRow?._raw?.hardBanReason, "") || undefined}
        currentSoftBans={
          Array.isArray(selectedRow?._raw?.softBans)
            ? (selectedRow!._raw!.softBans as Array<Record<string, JsonValue>>).map((b) => ({
                action: toStringValue(b.action, ""),
                reason: toStringValue(b.reason, ""),
                bannedAt: toStringValue(
                  b.bannedAt instanceof Date
                    ? b.bannedAt.toISOString()
                    : (b.bannedAt as string | undefined),
                  "",
                ),
                expiresAt: b.expiresAt
                  ? toStringValue(
                      b.expiresAt instanceof Date
                        ? b.expiresAt.toISOString()
                        : (b.expiresAt as string | undefined),
                      "",
                    ) || null
                  : null,
                bannedBy: toStringValue(b.bannedBy, ""),
              }))
            : undefined
        }
        // ST-2 — extended profile fields
        currentPhoneNumber={
          toStringValue(selectedRow?._raw?.phoneNumber, "") || undefined
        }
        currentBio={
          toStringValue(
            (selectedRow?._raw?.publicProfile as Record<string, JsonValue> | undefined)?.bio,
            "",
          ) || undefined
        }
        currentLocation={
          toStringValue(
            (selectedRow?._raw?.publicProfile as Record<string, JsonValue> | undefined)?.location,
            "",
          ) || undefined
        }
        currentWebsite={
          toStringValue(
            (selectedRow?._raw?.publicProfile as Record<string, JsonValue> | undefined)?.website,
            "",
          ) || undefined
        }
        currentSocialLinks={(() => {
          const pp = selectedRow?._raw?.publicProfile as
            | Record<string, JsonValue>
            | undefined;
          const sl = pp?.socialLinks as Record<string, JsonValue> | undefined;
          if (!sl) return undefined;
          return {
            twitter: toStringValue(sl.twitter, "") || undefined,
            instagram: toStringValue(sl.instagram, "") || undefined,
            facebook: toStringValue(sl.facebook, "") || undefined,
            linkedin: toStringValue(sl.linkedin, "") || undefined,
          };
        })()}
      />
      <Modal
        isOpen={banModalOpen}
        onClose={() => {
          setBanModalOpen(false);
          setBanTargetId(null);
          setBanReason("");
        }}
        title={ACTIONS.ADMIN["ban-user"].confirmation!.title}
      >
        <AppText size="sm" color="muted" className="mb-4">
          {ACTIONS.ADMIN["ban-user"].confirmation!.body}
        </AppText>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            banUser.mutate();
          }}
        >
          <Input
            label="Reason"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="e.g. Repeated fraud, scam activity…"
            required
          />
          <FormActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setBanModalOpen(false);
                setBanTargetId(null);
                setBanReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={banUser.isPending || banJobEvent.status === RealtimeEventStatus.SUBSCRIBING || banJobEvent.status === RealtimeEventStatus.PENDING}
              disabled={
                !banReason.trim() ||
                banUser.isPending ||
                banJobEvent.status === RealtimeEventStatus.SUBSCRIBING ||
                banJobEvent.status === RealtimeEventStatus.PENDING
              }
            >
              {ACTIONS.ADMIN["ban-user"].confirmation!.confirmLabel}
            </Button>
          </FormActions>
        </Form>
      </Modal>
      <Modal
        isOpen={Boolean(bulkConfirmTarget)}
        onClose={() => setBulkConfirmTarget(null)}
        title={
          bulkConfirmTarget?.action === "suspend"
            ? ACTIONS.ADMIN["bulk-suspend-users"].confirmation!.title
            : ACTIONS.ADMIN["bulk-delete-users"].confirmation!.title
        }
      >
        <AppText size="sm" color="muted" className="mb-4">
          {bulkConfirmTarget?.action === "suspend"
            ? ACTIONS.ADMIN["bulk-suspend-users"].confirmation!.body
            : ACTIONS.ADMIN["bulk-delete-users"].confirmation!.body}
        </AppText>
        <FormActions>
          <Button type="button" variant="secondary" onClick={() => setBulkConfirmTarget(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={bulkUsers.isLoading}
            onClick={() => {
              if (!bulkConfirmTarget) return;
              // bulkUsers.execute already surfaces success/failure via its
              // own onSuccess/onError toasts — .finally() just closes the
              // confirm dialog either way.
              void bulkUsers
                .execute({ action: bulkConfirmTarget.action, ids: bulkConfirmTarget.ids })
                .finally(() => setBulkConfirmTarget(null));
            }}
          >
            {bulkConfirmTarget?.action === "suspend"
              ? ACTIONS.ADMIN["bulk-suspend-users"].confirmation!.confirmLabel
              : ACTIONS.ADMIN["bulk-delete-users"].confirmation!.confirmLabel}
          </Button>
        </FormActions>
      </Modal>
    </>
  );
}
