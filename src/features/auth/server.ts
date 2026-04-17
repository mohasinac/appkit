/**
 * @mohasinac/appkit/features/auth/server
 *
 * Server-only entry point — exports only the API route handlers.
 * Import this sub-path from Next.js API routes to avoid bundling
 * client-side React components into server bundles.
 *
 * @example
 * ```ts
 * // app/api/auth/me/route.ts
 * import { withProviders } from "@/providers.config";
 * import { authMeGET } from "@mohasinac/appkit/features/auth/server";
 * export const GET = withProviders(authMeGET);
 * ```
 */

import "server-only";

export * from "./token-store";
export * from "./consent-otp";
export * from "./repository";
export * from "./actions";

export { authMeGET } from "./api/route";
