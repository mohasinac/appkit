// appkit/src/security/rbac/Can.tsx
import React from "react";
import type { Permission } from "./types";
import type { RbacHookReturn } from "./hook";

interface CanProps {
  /** Single required permission */
  permission?: Permission;
  /** Multiple permissions to check */
  permissions?: Permission[];
  /** When multiple permissions are provided: "all" (default) or "any" */
  mode?: "all" | "any";
  /** Rendered when the check fails */
  fallback?: React.ReactNode;
  children: React.ReactNode;
  /** The resolved rbac hook return value — pass from useRBAC() */
  rbac: Pick<RbacHookReturn, "can" | "canAll" | "canAny">;
}

/**
 * Conditionally renders children based on RBAC permissions.
 *
 * The consumer's `useRBAC()` hook must be called in the parent component and
 * passed as the `rbac` prop; this avoids coupling `<Can>` to a specific context.
 *
 * @example
 * const rbac = useRBAC();
 * <Can rbac={rbac} permission="admin:payouts"><PayoutsTable /></Can>
 * <Can rbac={rbac} permissions={["seller:products:write", "seller:store"]} mode="any">
 *   <SellerActions />
 * </Can>
 */
export function Can({
  permission,
  permissions,
  mode = "all",
  fallback = null,
  children,
  rbac,
}: CanProps): React.ReactElement | null {
  const allowed = permission
    ? rbac.can(permission)
    : mode === "all"
      ? rbac.canAll(permissions ?? [])
      : rbac.canAny(permissions ?? []);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
