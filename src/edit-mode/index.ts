/**
 * Public re-export of the appkit edit-mode primitives (Phase 3, overhaul
 * brief — the admin-only "view as buyer" toggle).
 *
 * `EditModeProvider`/`useEditMode` live in `_internal/client/edit-mode/`
 * for the same reason `HandModeProvider` does — this file is the canonical
 * public surface so `audit-appkit-reexports` (no `_internal/` in public
 * barrels) stays green. Mirrors `hand-mode/index.ts`.
 */

export { EditModeProvider, useEditMode } from "../_internal/client/edit-mode";
export type { EditModeContextValue } from "../_internal/client/edit-mode";
