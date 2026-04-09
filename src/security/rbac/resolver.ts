// appkit/src/security/rbac/resolver.ts
import type { Permission, RbacConfig } from "./types";

export function resolvePermissions(
  userRoles: string[],
  config: RbacConfig,
): Set<Permission> {
  const { roles, multiRoleStrategy = "union" } = config;

  function getPermissionsForRole(
    roleKey: string,
    visited = new Set<string>(),
  ): Set<Permission> {
    if (visited.has(roleKey)) return new Set();
    visited.add(roleKey);

    const def = roles[roleKey];
    if (!def) return new Set();

    const own = new Set<Permission>(def.permissions);

    // Wildcard — super_admin gets everything
    if (own.has("*")) return new Set(["*"]);

    for (const inherited of def.inherits ?? []) {
      for (const p of getPermissionsForRole(inherited, visited)) {
        own.add(p);
      }
    }
    return own;
  }

  if (userRoles.length === 0) return new Set<Permission>();

  const sets = userRoles.map((r) => getPermissionsForRole(r));

  if (multiRoleStrategy === "intersection") {
    return sets.reduce(
      (acc, set) => new Set([...acc].filter((p) => set.has(p))),
    );
  }

  // union (default)
  return sets.reduce(
    (acc, set) => new Set([...acc, ...set]),
    new Set<Permission>(),
  );
}

export function hasPermission(
  permissions: Set<Permission>,
  required: Permission,
): boolean {
  return permissions.has("*") || permissions.has(required);
}

export function hasAllPermissions(
  permissions: Set<Permission>,
  required: Permission[],
): boolean {
  return required.every((p) => hasPermission(permissions, p));
}

export function hasAnyPermission(
  permissions: Set<Permission>,
  required: Permission[],
): boolean {
  return required.some((p) => hasPermission(permissions, p));
}
