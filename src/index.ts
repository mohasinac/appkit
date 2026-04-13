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

export * from "./contracts/index";
export * from "./core/index";
export * from "./http/index";
export * from "./errors/index";
export * from "./utils/index";
export * from "./validation/index";
export * from "./tokens/index";
export * from "./security/index";
export * from "./seo/index";
export * from "./monitoring/index";
