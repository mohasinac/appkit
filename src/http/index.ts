/**
 * @mohasinac/http — Stage B3
 *
 * Framework-agnostic HTTP client extracted from src/lib/api-client.ts.
 * No app-specific imports (API_ENDPOINTS stripped).
 * Accepts baseURL as a constructor option instead.
 */

export { ApiClient, ApiClientError, apiClient } from "./ApiClient";
export type { ApiClientOptions, RequestConfig, ApiResponse } from "./ApiClient";
/*
 * The subdomain seam. `configureServiceOrigins` is how a consumer points
 * `/api/blog/*` or `/api/events/*` at the deployment that OWNS them without
 * editing a single call site. Registering nothing keeps same-origin behaviour
 * exactly, so adoption is opt-in per deployment and per prefix.
 */
export {
  configureServiceOrigins,
  getServiceOrigins,
  serviceOriginFor,
  _resetServiceOrigins,
} from "./service-origins";
export type { ServiceOriginMap } from "./service-origins";
export { withRetry } from "./retry";
