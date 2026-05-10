"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export interface PanelUrlSync {
  openCreatePanel: () => void;
  openEditPanel: (id: string) => void;
  closePanel: () => void;
  isCreateOpen: boolean;
  isEditOpen: boolean;
  editId: string | null;
}

/**
 * Syncs create/edit panel state with URL search params.
 * ?panel=create → isCreateOpen=true
 * ?panel=edit&id=xxx → isEditOpen=true, editId="xxx"
 * Closing removes both params via router.replace (no history entry).
 */
export function usePanelUrlSync(): PanelUrlSync {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const panelParam = searchParams.get("panel");
  const idParam = searchParams.get("id");

  const isCreateOpen = panelParam === "create";
  const isEditOpen = panelParam === "edit" && !!idParam;
  const editId = isEditOpen ? idParam : null;

  const openCreatePanel = useCallback(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("panel", "create");
    sp.delete("id");
    router.push(`${pathname}?${sp.toString()}`);
  }, [searchParams, pathname, router]);

  const openEditPanel = useCallback(
    (id: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("panel", "edit");
      sp.set("id", id);
      router.push(`${pathname}?${sp.toString()}`);
    },
    [searchParams, pathname, router],
  );

  const closePanel = useCallback(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("panel");
    sp.delete("id");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [searchParams, pathname, router]);

  return {
    openCreatePanel,
    openEditPanel,
    closePanel,
    isCreateOpen,
    isEditOpen,
    editId,
  };
}
