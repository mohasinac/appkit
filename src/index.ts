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
export * from "./repositories/index";
export * from "./utils/index";
export * from "./validation/index";
export * from "./tokens/index";
export * from "./instrumentation/index";
export * from "./security/index";
export * from "./seo/index";
export * from "./monitoring/index";
export * from "./react/index";
export * from "./seed/index";
export * from "./cli/index";
export * from "./values/index";

// Namespace exports avoid symbol collisions across large module surfaces.
export * as ui from "./ui/index";
export * as nextKit from "./next/index";
