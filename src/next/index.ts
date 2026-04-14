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
export { createPiiRedactorMiddleware } from "./middleware/pii-redactor";
export type {
  BaseRequestContext,
  AuthRequestContext,
  Middleware,
  PiiRedactionRule,
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
