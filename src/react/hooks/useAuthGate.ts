"use client";
import { useState, useCallback } from "react";
import { useAuth } from "../contexts/SessionContext";
import { useSiteSettings } from "../../core/hooks/useSiteSettings";
import { ACTION_META } from "../../features/products/constants/action-defs";
import type { ActionId } from "../../features/products/constants/action-defs";

const DEFAULT_MSG = "You need to be signed in to continue.";
const DISABLED_MSG = "This action is currently unavailable.";
const PERMISSION_MSG = "You don't have permission to perform this action.";

export interface UseAuthGateReturn {
  requireAuth: (actionId: ActionId, fn: () => void | Promise<void>) => void;
  modalOpen: boolean;
  modalMessage: string;
  closeModal: () => void;
}

export function useAuthGate(): UseAuthGateReturn {
  const { user } = useAuth();
  const { data: settings } = useSiteSettings<{ actionConfig?: Record<string, { enabled: boolean }> }>();
  const [state, setState] = useState({ open: false, message: "" });

  const requireAuth = useCallback(
    (actionId: ActionId, fn: () => void | Promise<void>) => {
      const meta = ACTION_META[actionId];
      const enabled =
        (settings as { actionConfig?: Record<string, { enabled: boolean }> } | undefined)
          ?.actionConfig?.[actionId]?.enabled ??
        meta?.defaultEnabled ??
        true;
      if (!enabled) {
        setState({ open: true, message: DISABLED_MSG });
        return;
      }
      if (meta?.requiresAuth && !user?.uid) {
        setState({ open: true, message: meta.authMessage ?? DEFAULT_MSG });
        return;
      }
      if (meta?.requiredPermission && !user?.permissions?.includes(meta.requiredPermission)) {
        setState({ open: true, message: PERMISSION_MSG });
        return;
      }
      void fn();
    },
    [user, settings],
  );

  const closeModal = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  return { requireAuth, modalOpen: state.open, modalMessage: state.message, closeModal };
}
