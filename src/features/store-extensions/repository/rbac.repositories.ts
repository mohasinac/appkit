import { BaseRepository } from "../../../providers/db-firebase";
import {
  ADMIN_NOTIFICATIONS_COLLECTION,
  CUSTOM_ROLES_COLLECTION,
  ROLE_OVERRIDES_COLLECTION,
  type AdminNotificationDocument,
  type CustomRoleDocument,
  type RoleOverrideDocument,
} from "../schemas/rbac";

export class RoleOverridesRepository extends BaseRepository<RoleOverrideDocument> {
  constructor() {
    super(ROLE_OVERRIDES_COLLECTION);
  }
  async listForUser(userId: string): Promise<{ items: RoleOverrideDocument[] }> {
    const items = await this.findBy("userId", userId);
    return { items };
  }
}

export class CustomRolesRepository extends BaseRepository<CustomRoleDocument> {
  constructor() {
    super(CUSTOM_ROLES_COLLECTION);
  }
  async listActive(): Promise<{ items: CustomRoleDocument[] }> {
    const all = await this.findAll(50);
    return { items: all.filter((d) => d.isActive !== false) };
  }
}

export class AdminNotificationsRepository extends BaseRepository<AdminNotificationDocument> {
  constructor() {
    super(ADMIN_NOTIFICATIONS_COLLECTION);
  }
  async listUnread(): Promise<{ items: AdminNotificationDocument[] }> {
    const items = await this.findBy("isRead", false);
    return { items };
  }
}

export const roleOverridesRepository = new RoleOverridesRepository();
export const customRolesRepository = new CustomRolesRepository();
export const adminNotificationsRepository = new AdminNotificationsRepository();
