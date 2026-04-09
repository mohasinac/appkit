/**
 * @mohasinac/appkit — Root barrel export
 *
 * Prefer importing from specific sub-paths for better tree-shaking:
 *   import { getProviders } from "@mohasinac/appkit/contracts"
 *   import { apiClient }    from "@mohasinac/appkit/http"
 *   import { Button }       from "@mohasinac/appkit/ui"
 *
 * This root barrel is provided for convenience in small projects or
 * when bundle size is not a concern.
 */

export * from "./contracts/index.js";
export * from "./core/index.js";
export * from "./http/index.js";
export * from "./errors/index.js";
export * from "./utils/index.js";
export * from "./validation/index.js";
export * from "./tokens/index.js";
export * from "./security/index.js";
export * from "./seo/index.js";
export * from "./monitoring/index.js";
