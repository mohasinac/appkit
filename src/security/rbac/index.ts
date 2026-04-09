// appkit/src/security/rbac/index.ts
export type { Permission, RoleDefinition, RbacConfig, ResolvedUser } from "./types";
export { DEFAULT_ROLES } from "./default-roles";
export {
  resolvePermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
} from "./resolver";
export type { RbacHookReturn } from "./hook";
export { createRbacHook } from "./hook";
export { Can } from "./Can";
export { createRequirePermission, createRequirePermissionSync } from "./server";
export { createRbacMiddleware } from "./middleware";
