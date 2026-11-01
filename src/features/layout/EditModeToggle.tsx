"use client";

import { useEditMode } from "../../_internal/client/edit-mode/EditModeProvider";
import { Toggle } from "../../ui/components/Toggle";

/**
 * Mounted via `TitleBarLayout`'s `editModeSlot`. Renders nothing for a
 * session `useEditMode()` reports `canUseEditMode: false` for — which is
 * every buyer and seller session, by construction (`EditModeProvider`'s
 * `enabled` prop is the admin-role check, decided by the consumer before
 * this ever mounts).
 */
export function EditModeToggle() {
  const { editMode, toggleEditMode, canUseEditMode } = useEditMode();
  if (!canUseEditMode) return null;

  return (
    <Toggle
      checked={editMode}
      onChange={toggleEditMode}
      size="sm"
      ariaLabel="Edit mode"
      label="Edit"
    />
  );
}
