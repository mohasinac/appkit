/**
 * @mohasinac/http — Stage B3
 *
 * Framework-agnostic HTTP client extracted from src/lib/api-client.ts.
 * No app-specific imports (API_ENDPOINTS stripped).
 * Accepts baseURL as a constructor option instead.
 */

export { ApiClient, ApiClientError, apiClient } from "./ApiClient";
export type { ApiClientOptions, RequestConfig, ApiResponse } from "./ApiClient";
export { createApiHandler } from "./api-handler";
export type {
  ApiHandlerOptions,
  ApiHandlerRateLimitConfig,
} from "./api-handler";
