// appkit/src/security/rbac/server.ts
import type { RbacConfig, Permission } from "./types";
import { resolvePermissions, hasPermission } from "./resolver";

/**
 * Factory creating a server-side permission guard for API routes + Server Actions.
 *
 * @example
 * // src/lib/auth/require-permission.ts
 * import { createRequirePermission } from "@mohasinac/appkit/security";
 * import { RBAC_CONFIG } from "@/constants/rbac";
 * export const requirePermission = createRequirePermission(RBAC_CONFIG);
 *
 * // In Server Action:
 * await requirePermission(authUser, "admin:payouts");
 */
export function createRequirePermission(config: RbacConfig) {
  return async function requirePermission(
    user: { uid: string; roles: string[] } | null | undefined,
    permission: Permission,
  ): Promise<void> {
    if (!user) {
      const { AuthenticationError } = await import("../../errors");
      throw new AuthenticationError("Not authenticated");
    }
    const perms = resolvePermissions(user.roles, config);
    if (!hasPermission(perms, permission)) {
      const { AuthorizationError } = await import("../../errors");
      throw new AuthorizationError(`Missing permission: ${permission}`);
    }
  };
}

/**
 * Synchronous variant — use when errors cannot be imported directly.
 */
export function createRequirePermissionSync(config: RbacConfig) {
  return function requirePermission(
    user: { uid: string; roles: string[] } | null | undefined,
    permission: Permission,
  ): void {
    if (!user) {
      throw Object.assign(new Error("Not authenticated"), { status: 401 });
    }
    const perms = resolvePermissions(user.roles, config);
    if (!hasPermission(perms, permission)) {
      throw Object.assign(new Error(`Missing permission: ${permission}`), {
        status: 403,
      });
    }
  };
}
