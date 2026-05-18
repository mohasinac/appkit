/**
 * RBAC — roleOverrides + customRoles
 *
 * S-STORE-9B-G foundation. Stores per-user permission patches and
 * admin-defined custom roles. Used by the existing `hasPermission()`
 * predicate via a layered lookup: builtin role → custom role → override.
 */

export interface RoleOverrideDocument {
  id: string;
  /** Target user UID. */
  userId: string;
  /** Optional store-scoped override (null = global). */
  storeId?: string | null;
  /** Permission keys granted in addition to the user's base role. */
  grantedPermissions: string[];
  /** Permission keys revoked from the user's base role. */
  revokedPermissions: string[];
  /** Optional custom role IDs the user inherits from. */
  customRoleIds: string[];
  reason?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export const ROLE_OVERRIDES_COLLECTION = "roleOverrides" as const;
export const ROLE_OVERRIDE_INDEXED_FIELDS = [
  "userId",
  "storeId",
  "expiresAt",
  "createdAt",
] as const;
export const DEFAULT_ROLE_OVERRIDE_DATA: Partial<RoleOverrideDocument> = {
  grantedPermissions: [],
  revokedPermissions: [],
  customRoleIds: [],
};

export interface CustomRoleDocument {
  id: string;
  name: string;
  slug: string;
  description?: string;
  /** Permission keys this custom role confers. */
  permissions: string[];
  /** Optional parent role to inherit from. */
  inheritsFrom?: string;
  /** Where this role can be assigned. */
  scope: "global" | "store";
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CUSTOM_ROLES_COLLECTION = "customRoles" as const;
export const CUSTOM_ROLE_INDEXED_FIELDS = [
  "slug",
  "scope",
  "isActive",
  "createdAt",
] as const;
export const DEFAULT_CUSTOM_ROLE_DATA: Partial<CustomRoleDocument> = {
  permissions: [],
  isActive: true,
  scope: "global",
};

// Admin analytics + alerts + notifications (S-STORE-9B-I)
// These reuse the AnalyticsCard / AnalyticsAlert shapes with scope:"admin",
// but admin-only notifications are a separate collection because they bypass
// per-user notification prefs.

export type AdminNotificationCategory =
  | "system"
  | "security"
  | "moderation"
  | "payouts"
  | "fraud"
  | "growth";

export interface AdminNotificationDocument {
  id: string;
  category: AdminNotificationCategory;
  title: string;
  body: string;
  severity: "info" | "warning" | "error";
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  /** Admins this notification targets (empty = all admins). */
  audienceUserIds: string[];
  createdAt: Date;
  readAt?: Date;
}

export const ADMIN_NOTIFICATIONS_COLLECTION = "adminNotifications" as const;
export const ADMIN_NOTIFICATION_INDEXED_FIELDS = [
  "category",
  "severity",
  "isRead",
  "createdAt",
] as const;
export const DEFAULT_ADMIN_NOTIFICATION_DATA: Partial<AdminNotificationDocument> = {
  isRead: false,
  severity: "info",
  audienceUserIds: [],
};
