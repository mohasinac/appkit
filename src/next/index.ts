/**
 * @mohasinac/next — Next.js adapters and utilities
 *
 * Stage B4: IAuthVerifier interface + createApiErrorHandler factory.
 */

// Auth verifier interface (inject your Firebase / Auth.js implementation)
export type { IAuthVerifier, AuthVerifiedUser } from "./IAuthVerifier";

// Generic API error handler factory
export { createApiErrorHandler } from "./api/errorHandler";
export type {
  IApiErrorLogger,
  ApiErrorHandlerOptions,
} from "./api/errorHandler";

// Provider-aware route handler factory for feat-* packages
export { createRouteHandler } from "./api/routeHandler";
export type { RouteUser } from "./api/routeHandler";

// Generic API handler factory (auth + rate-limit + validation wrapper)
export { createApiHandlerFactory } from "./api/apiHandler";
export { createRouteHandler as createApiHandler } from "./api/routeHandler";
export type {
  ApiHandlerOptions,
  ApiHandlerFactoryDeps,
  ApiRateLimitResult,
} from "./api/apiHandler";

// Request parsing helpers
export {
  getSearchParams,
  getOptionalSessionCookie,
  getRequiredSessionCookie,
  getBooleanParam,
  getStringParam,
  getNumberParam,
} from "./request-helpers";

// Shared route-map primitives (SSR apps can extend/override)
export {
  DEFAULT_ROUTE_MAP,
  createRouteMap,
  ROUTES,
  PUBLIC_ROUTES,
  PROTECTED_ROUTES,
  AUTH_ROUTES,
} from "./routing/route-map";
export type { RouteMap, RoutePath } from "./routing/route-map";

// Response caching middleware
export { withCache, invalidateCache } from "./cache-middleware";
export type { CacheConfig } from "./cache-middleware";

// PII-aware composable middleware chain (Phase 21)
export {
  createApiMiddleware,
  runChain,
  buildBaseContext,
} from "./middleware/chain";
export type { CreateApiMiddlewareConfig } from "./middleware/chain";
export { piiScrubberMiddleware } from "./middleware/pii-scrubber";
export type {
  BaseRequestContext,
  AuthRequestContext,
  Middleware,
} from "./middleware";

// Standardized API response helpers
export { successResponse, errorResponse, ApiErrors } from "./api/api-response";
export type { ApiSuccessResponse, ApiErrorResponse } from "./api/api-response";

// Error UI view components
export { GlobalError } from "./components/GlobalError";
export type { GlobalErrorProps } from "./components/GlobalError";
export { ErrorView } from "./components/ErrorView";
export type { ErrorViewProps } from "./components/ErrorView";
export { NotFoundView } from "./components/NotFoundView";
export type { NotFoundViewProps } from "./components/NotFoundView";
export { UnauthorizedView } from "./components/UnauthorizedView";
export type { UnauthorizedViewProps } from "./components/UnauthorizedView";

export { ErrorBoundary } from "./ErrorBoundary";
export type { ErrorBoundaryProps } from "./ErrorBoundary";

/*
 * Pure, isomorphic nav helpers — deliberately re-exported HERE as well as from
 * the main and client entries.
 *
 * 🛑 `src/constants/navigation.tsx` CALLS `navItemId()` at module scope and is
 * imported by BOTH server code (the locale and store layouts, the action index)
 * and client code (every sidebar). That leaves it nowhere to import from:
 *
 *   - `@mohasinac/appkit/client` is `"use client"`, so on the server the binding
 *     is a client-reference proxy and calling it throws (Root Cause #76). It did
 *     — "Attempted to call navItemId() from the server" failed the Vercel build.
 *   - the bare `@mohasinac/appkit` entry then trips
 *     `audit-client-server-only-leak` on all 57 client components that reach
 *     navigation.tsx transitively (Root Cause #6).
 *
 * The two audits pull in opposite directions, and both are right. `./next` is
 * the third door: not `"use client"`, and not a path to firebase-admin — so it
 * satisfies both. This is the same reasoning that keeps `/ui` and `/tokens`
 * separate entries.
 */
export { navItemId } from "../_internal/shared/features/layout/types";
export { matchesNavQuery } from "../_internal/shared/features/layout/matchesNavQuery";

/*
 * The action-index derivation — same reasoning as the nav helpers above.
 *
 * `src/constants/action-index.ts` calls `buildActionIndexBase()` at module
 * scope and is imported by `GET /api/action-index` (a server route) as well as
 * by `LayoutShellClient` (a client component). Neither the `"use client"` entry
 * nor the bare one works for both; `./next` does.
 *
 * Found by `audit-client-entry-in-server`'s R2 the first time it ran — the same
 * defect as navItemId, one file over, and the next build failure in line.
 */
export {
  buildActionIndexBase,
  deriveNavEntries,
  deriveQuickActionEntries,
} from "../features/search/action-index/derive";
export { deriveSettingsEntries } from "../features/search/action-index/settings-entries";
export {
  mergeActionIndex,
  projectActionIndexForViewer,
} from "../features/search/action-index/types";
export type {
  ActionIndexEntry,
  ActionIndexControl,
  ActionIndexOverride,
} from "../features/search/action-index/types";
