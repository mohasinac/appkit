// appkit/src/security/rbac/types.ts

export type Permission = string; // "resource:action" or "*"

export interface RoleDefinition {
  label: string;
  permissions: Permission[];
  /** Other role keys whose permissions are inherited */
  inherits?: string[];
}

export interface RbacConfig {
  /** App-defined roles — merges with or replaces DEFAULT_ROLES */
  roles: Record<string, RoleDefinition>;
  /**
   * How to resolve permissions when a user has multiple roles.
   * default: "union" — user gets the union of all roles' permissions
   */
  multiRoleStrategy?: "union" | "intersection";
}

export interface ResolvedUser {
  uid: string;
  roles: string[];
  /** Flat resolved permission set (after role inheritance + multi-role strategy) */
  permissions: Set<Permission>;
}
