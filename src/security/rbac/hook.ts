// appkit/src/security/rbac/hook.ts
"use client";

import { useMemo } from "react";
import type { RbacConfig, Permission } from "./types";
import {
  resolvePermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
} from "./resolver";

export interface RbacHookReturn {
  can: (permission: Permission) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  roles: string[];
  permissions: Set<Permission>;
  isAdmin: boolean;
  isSeller: boolean;
}

/**
 * Factory that creates a typed `useRBAC` hook bound to the given config.
 *
 * @example
 * // src/hooks/useRBAC.ts
 * import { createRbacHook } from "@mohasinac/appkit/security";
 * import { RBAC_CONFIG } from "@/constants/rbac";
 * export const useRBAC = createRbacHook(RBAC_CONFIG);
 */
export function createRbacHook(
  config: RbacConfig,
  getUserRoles: () => string[] | null | undefined,
): () => RbacHookReturn {
  return function useRBAC(): RbacHookReturn {
    const userRoles = getUserRoles() ?? [];

    const permissions = useMemo(
      () => resolvePermissions(userRoles, config),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [userRoles.join(",")],
    );

    return {
      can: (permission: Permission) => hasPermission(permissions, permission),
      canAll: (perms: Permission[]) => hasAllPermissions(permissions, perms),
      canAny: (perms: Permission[]) => hasAnyPermission(permissions, perms),
      roles: userRoles,
      permissions,
      isAdmin: hasPermission(permissions, "admin:access"),
      isSeller: hasPermission(permissions, "seller:access"),
    };
  };
}
