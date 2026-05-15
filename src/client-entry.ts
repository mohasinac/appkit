"use client";
/**
 * appkit client entry — resolved by browser / bundler conditionals.
 *
 * S1: thin proxy that re-exports the full index (shared + client + server stubs).
 * index.ts is the existing 8,933-line barrel and already covers everything that
 * client.ts and server.ts export, so we only need index.ts here.
 *
 * Starting in S2, features migrate to _internal/client/** and the re-export
 * below is progressively replaced with targeted exports + throwing stubs for
 * server symbols.
 *
 * Consumer code: import { Button, ROUTES, ... } from "@mohasinac/appkit"
 * The conditional exports map in package.json routes here for browser context.
 */

// Full surface (types, constants, utils, UI, ROUTES, repositories, actions).
// Server symbols are safe here while the existing next.config.js webpack externals
// keep firebase-admin out of the client bundle. The _internal/ migration in S2+
// replaces this with targeted exports + throwing stubs for server symbols.
export * from "./index";

// New i18n contract — available to consumers immediately
export { LabelsProvider, useLabels } from "./_internal/client/i18n/LabelsProvider";
export type { AppkitLabelSet } from "./_internal/client/i18n/LabelsProvider";

// Scaffolds — slot-driven shell + dashboard chrome (S6)
export { AppShell, DashboardScaffold } from "./_internal/client/scaffolds/index";
export type {
  AppShellProps,
  AppShellRenderContext,
  DashboardScaffoldProps,
  DashboardScaffoldRenderContext,
} from "./_internal/client/scaffolds/index";

// Hydration helpers (CC-3) — safe to call from RSC and client
export { toClient, clientInitial } from "./_internal/shared/serialization/index";

// New shared tokens and config types
export type {
  AppkitConfig,
  AppkitFirebaseConfig,
  AppkitFirebaseExtensions,
  AppkitVercelConfig,
  AppkitBrandConfig,
  AppkitSeoConfig,
  AppkitI18nConfig,
  AppkitImagePattern,
  FirestoreIndex,
  FirestoreIndexField,
  FirestoreFieldOverride,
} from "./_internal/shared/config/schema";
export {
  SEMANTIC_COLORS,
  SEMANTIC_COLORS_DARK,
  SEMANTIC_RADIUS,
  SEMANTIC_SHADOWS,
  SEMANTIC_Z_INDEX,
  MOTION_TOKENS,
  BREAKPOINTS,
  PLATFORM_LIMITS,
} from "./_internal/shared/tokens/index";
export type { Responsive, Breakpoint, SemanticColor } from "./_internal/shared/tokens/index";
