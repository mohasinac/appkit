"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  ConfirmDeleteModal,
  RowActionMenu,
  StackedViewShell,
  Toggle,
  useToast,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { AdminNavEditorView, type NavItemData } from "./AdminNavEditorView";

// --- Types -------------------------------------------------------------------

export interface AdminNavigationViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  labels?: { title?: string };
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

  const visibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.NAVIGATION_BY_ID(id), { isVisible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "navigation"] });
    },
    onError: () => showToast("Failed to update visibility.", "error"),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.NAVIGATION_BY_ID(id), { order: newOrder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "navigation"] });
    },
    onError: () => showToast("Failed to reorder.", "error"),
  });

  const deleteMutation = useMutation({
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
          <div key="header" className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {sorted.length} nav item{sorted.length !== 1 ? "s" : ""}
            </p>
            <Button
              onClick={() => {
                setEditing(null);
                setDrawerOpen(true);
              }}
            >
              + New item
            </Button>
          </div>,
          sorted.length === 0 && !isLoading ? (
            <p key="empty" className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">
              No nav items yet. Click "New item" to add one.
            </p>
          ) : null,
          <div key="list" className="divide-y divide-zinc-200 dark:divide-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {sorted.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900"
              >
                {/* Order arrows */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0 || reorderMutation.isPending}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 leading-none text-xs"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx >= sorted.length - 1 || reorderMutation.isPending}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 leading-none text-xs"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>

                {/* Label + href */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">
                    {item.parentId ? (
                      <span className="text-zinc-400 mr-1">↳</span>
                    ) : null}
                    {item.label}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{item.href}</p>
                </div>

                {/* Visibility toggle */}
                <Toggle
                  checked={item.isVisible ?? true}
                  onChange={(val) =>
                    visibilityMutation.mutate({ id: item.id!, isVisible: val })
                  }
                  label=""
                />

                {/* Row actions */}
                <RowActionMenu
                  actions={[
                    {
                      label: "Edit",
                      onClick: () => {
                        setEditing(item);
                        setDrawerOpen(true);
                      },
                    },
                    {
                      label: "Delete",
                      destructive: true,
                      onClick: () => setDeleteTarget(item),
                    },
                  ]}
                />
              </div>
            ))}
          </div>,
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
