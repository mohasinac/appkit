"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Admin-only "view as buyer" toggle (point 7, overhaul brief).
 *
 * Off (the default, and the only state a buyer or seller can ever reach):
 * the admin sees exactly what a buyer/seller sees — which doubles as the
 * admin's own verification that a Phase 1 content-tag kill-switch is
 * actually hidden, not just believed to be. On: `<LiveEditableRegion>`
 * wrappers around tagged content render an inline edit affordance.
 *
 * 🛑 `enabled` is NOT a preference — it is the admin-role check, decided by
 * the consumer (which knows the session) and passed in. A non-admin mount
 * gets `enabled={false}`, and `editMode` can then never become `true`
 * regardless of what `setEditMode` is called with — see `toggleEditMode`
 * below. This is the one guarantee the whole feature rests on: a buyer
 * cannot reach edit affordances by any client-side code path.
 */
export interface EditModeContextValue {
  /** True only when BOTH the admin flipped the toggle AND this mount is admin-enabled. */
  editMode: boolean;
  /** No-ops when `enabled` is false. */
  setEditMode: (next: boolean) => void;
  toggleEditMode: () => void;
  /** Whether this session may use edit mode at all — drives whether the toggle control renders. */
  canUseEditMode: boolean;
}

const DEFAULT_CONTEXT_VALUE: EditModeContextValue = {
  editMode: false,
  setEditMode: () => {},
  toggleEditMode: () => {},
  canUseEditMode: false,
};

const EditModeContext = createContext<EditModeContextValue>(DEFAULT_CONTEXT_VALUE);

export function EditModeProvider({
  enabled,
  children,
}: {
  /** The admin-role check — decide this from the session, never from a client toggle. */
  enabled: boolean;
  children: ReactNode;
}) {
  const [rawEditMode, setRawEditMode] = useState(false);

  const setEditMode = useCallback(
    (next: boolean) => {
      if (!enabled) return;
      setRawEditMode(next);
    },
    [enabled],
  );

  const toggleEditMode = useCallback(() => {
    if (!enabled) return;
    setRawEditMode((prev) => !prev);
  }, [enabled]);

  const value = useMemo<EditModeContextValue>(
    () => ({
      editMode: enabled && rawEditMode,
      setEditMode,
      toggleEditMode,
      canUseEditMode: enabled,
    }),
    [enabled, rawEditMode, setEditMode, toggleEditMode],
  );

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}

export function useEditMode(): EditModeContextValue {
  return useContext(EditModeContext);
}
