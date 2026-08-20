/**
 * Public re-export of the appkit hand-mode primitives.
 *
 * `HandModeProvider`, `useHandMode`, and the related types live in
 * `_internal/client/hand-mode/` because they are consumed by both the public
 * `client.ts` barrel and other internal modules (drawers, sidebars). This
 * file is the canonical public surface — `client.ts` re-exports through
 * here so the `audit-appkit-reexports` rule (no `_internal/` in public
 * barrels) stays green. Mirrors `theme/index.ts`.
 */

export { HandModeProvider, useHandMode } from "../_internal/client/hand-mode";
export type {
  HandMode,
  HandModeContextValue,
  HandModeProviderProps,
} from "../_internal/client/hand-mode";
