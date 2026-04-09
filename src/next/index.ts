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

// Response caching middleware
export { withCache, invalidateCache } from "./cache-middleware";
export type { CacheConfig } from "./cache-middleware";
