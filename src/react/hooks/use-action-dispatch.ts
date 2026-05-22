"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast, type ToastVariant } from "../../ui";
import { usePanelStore } from "../../stores/panel-store";

export type DispatchAction =
  | { type: "NAVIGATE"; href: string }
  | { type: "OPEN_PANEL"; panelId: string; data?: Record<string, unknown> }
  | { type: "TOAST"; message: string; variant?: ToastVariant }
  | { type: "BULK"; actionId: string; ids: string[] }
  | { type: "COPY"; text: string; successMessage?: string }
  | { type: "EXECUTE"; handler: () => Promise<void>; successMessage?: string; errorMessage?: string };

export interface UseActionDispatchOptions {
  onBulk?: (actionId: string, ids: string[]) => void;
}

export function useActionDispatch(options?: UseActionDispatchOptions) {
  const router = useRouter();
  const { showToast } = useToast();
  const { openPanel } = usePanelStore();

  return useCallback(
    async (action: DispatchAction) => {
      switch (action.type) {
        case "NAVIGATE":
          router.push(action.href);
          break;
        case "OPEN_PANEL":
          openPanel(action.panelId, action.data);
          break;
        case "TOAST":
          showToast(action.message, action.variant ?? "info");
          break;
        case "BULK":
          options?.onBulk?.(action.actionId, action.ids);
          break;
        case "COPY":
          await navigator.clipboard.writeText(action.text);
          showToast(action.successMessage ?? "Copied!", "success");
          break;
        case "EXECUTE":
          try {
            await action.handler();
            if (action.successMessage) showToast(action.successMessage, "success");
          } catch (err) {
            showToast(
              action.errorMessage ?? (err instanceof Error ? err.message : "Something went wrong."),
              "error",
            );
          }
          break;
      }
    },
    [router, showToast, openPanel, options],
  );
}
