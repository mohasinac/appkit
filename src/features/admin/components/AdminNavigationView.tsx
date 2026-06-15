"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, ConfirmDeleteModal, Div, RowActionMenu, Span, StackedViewShell, Text, Toggle, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { AdminNavEditorView, type NavItemData } from "./AdminNavEditorView";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../../features/products/constants/action-defs";

const __O = {
  hidden: "overflow-hidden",
} as const;

// --- Types -------------------------------------------------------------------

export interface AdminNavigationViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  labels?: { title?: string };
}

// --- Helpers -----------------------------------------------------------------

interface NavItemRowProps {
  item: NavItemData;
  idx: number;
  total: number;
  reorderPending: boolean;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onVisibilityChange: (id: string, isVisible: boolean) => void;
  onEdit: (item: NavItemData) => void;
  onDelete: (item: NavItemData) => void;
}

function NavItemRow({
  item, idx, total, reorderPending,
  onMoveUp, onMoveDown, onVisibilityChange, onEdit, onDelete,
}: NavItemRowProps) {
  return (
    <Div surface="default" className="flex items-center gap-3 px-4 py-3">
      <Div className="flex flex-col gap-0.5 shrink-0">
        <Button variant="ghost" type="button" onClick={() => onMoveUp(idx)} disabled={idx === 0 || reorderPending}
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 leading-none text-xs p-0 min-h-0 h-auto rounded-none" aria-label="Move up">▲</Button>
        <Button variant="ghost" type="button" onClick={() => onMoveDown(idx)} disabled={idx >= total - 1 || reorderPending}
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 leading-none text-xs p-0 min-h-0 h-auto rounded-none" aria-label="Move down">▼</Button>
      </Div>
      <Div className="flex-1 min-w-0">
        <Text className="text-zinc-800 dark:text-zinc-100 truncate" size="sm" weight="medium">
          {item.parentId ? <Span className="mr-1" color="faint">↳</Span> : null}
          {item.label}
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 truncate" size="xs">{item.href}</Text>
      </Div>
      <Toggle checked={item.isVisible ?? true} onChange={(val) => onVisibilityChange(item.id!, val)} label="" />
      <RowActionMenu actions={[
        { label: ROW_ACTION_META[ROW_ACTION_ID.EDIT].label, onClick: () => onEdit(item) },
        { label: ROW_ACTION_META[ROW_ACTION_ID.DELETE].label, destructive: true, onClick: () => onDelete(item) },
      ]} />
    </Div>
  );
}

// --- Component ---------------------------------------------------------------

export function AdminNavigationView({
  labels = {},
  ...rest
}: AdminNavigationViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<NavItemData | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<NavItemData | null>(null);

  const { data, isLoading, error } = useQuery<{ items: NavItemData[] }>({
    queryKey: ["admin", "navigation"],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.NAVIGATION);
      return (res as any)?.data ?? res;
    },
  });

  const items: NavItemData[] = data?.items ?? [];
  const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const visibilityMutation = useApiMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.NAVIGATION_BY_ID(id), { isVisible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "navigation"] });
    },
    onError: () => showToast("Failed to update visibility.", "error"),
  });

  const reorderMutation = useApiMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.NAVIGATION_BY_ID(id), { order: newOrder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "navigation"] });
    },
    onError: () => showToast("Failed to reorder.", "error"),
  });

  const deleteMutation = useApiMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.NAVIGATION_BY_ID(id));
    },
    onSuccess: () => {
      showToast("Nav item deleted.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "navigation"] });
      setDeleteTarget(null);
    },
    onError: () => showToast("Failed to delete nav item.", "error"),
  });

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const current = sorted[idx];
    const above = sorted[idx - 1];
    reorderMutation.mutate({ id: current.id!, newOrder: (above.order ?? 0) - 1 });
  };

  const handleMoveDown = (idx: number) => {
    if (idx >= sorted.length - 1) return;
    const current = sorted[idx];
    const below = sorted[idx + 1];
    reorderMutation.mutate({ id: current.id!, newOrder: (below.order ?? 0) + 1 });
  };

  const parentOptions = sorted
    .filter((i) => !i.parentId)
    .map((i) => ({ label: i.label, value: i.id! }));

  return (
    <>
      <StackedViewShell
        portal="admin"
        {...rest}
        title={labels.title ?? "Navigation"}
        sections={[
          isLoading ? (
            <Alert key="loading" variant="info" title="Loading">
              Fetching nav items…
            </Alert>
          ) : null,
          error ? (
            <Alert key="error" variant="error" title="Load failed">
              {error instanceof Error ? error.message : "Unknown error"}
            </Alert>
          ) : null,
          <Div key="header" className="flex items-center justify-between mb-4">
            <Text className="text-zinc-500 dark:text-zinc-400" size="sm">
              {sorted.length} nav item{sorted.length !== 1 ? "s" : ""}
            </Text>
            <Button
              onClick={() => {
                setEditing(null);
                setDrawerOpen(true);
              }}
            >
              + New item
            </Button>
          </Div>,
          sorted.length === 0 && !isLoading ? (
            <Text key="empty" className="text-zinc-400 dark:text-zinc-400 py-8" size="sm" align="center">
              No nav items yet. Click "New item" to add one.
            </Text>
          ) : null,
          <Div key="list" className={`divide-y divide-zinc-200 dark:divide-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-700 ${__O.hidden}`}>
            {sorted.map((item, idx) => (
              <NavItemRow
                key={item.id}
                item={item}
                idx={idx}
                total={sorted.length}
                reorderPending={reorderMutation.isPending}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onVisibilityChange={(id, isVisible) => visibilityMutation.mutate({ id, isVisible })}
                onEdit={(i) => { setEditing(i); setDrawerOpen(true); }}
                onDelete={setDeleteTarget}
              />
            ))}
          </Div>,
        ]}
      />

      <AdminNavEditorView
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={() =>
          queryClient.invalidateQueries({ queryKey: ["admin", "navigation"] })
        }
        item={editing}
        parentOptions={parentOptions}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.id!)}
        isDeleting={deleteMutation.isPending}
        title="Delete nav item"
        message={`Remove "${deleteTarget?.label}" from navigation? This cannot be undone.`}
      />
    </>
  );
}
