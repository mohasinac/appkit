/*
 * WHY: The admin half of W8's C2. Two consolidations, each between pages that
 *      already share one permission — which is the test that decides whether
 *      two pages CAN be tabs at all: one page has one `requiredPermission`, so
 *      merging across a permission line either widens or narrows access
 *      silently.
 *
 *      `roles` and `permissions` are both `admin:roles:read`; `settings/actions`
 *      and `settings/navigation` are both `admin:settings:write`. Pairs that
 *      failed that test were left alone — see the plan's "deliberately NOT
 *      consolidated" list.
 *
 * EXPORTS:
 *   ROLES_TABS / isRolesTabId, ADMIN_SETTINGS_TABS / isAdminSettingsTabId
 *
 * @tag domain:admin
 * @tag layer:constants
 * @tag pattern:registry
 * @tag access:isomorphic
 * @tag consumers:admin roles + settings/actions pages,action index
 * @tag sideEffects:none
 */

export interface AdminPageTab {
  id: string;
  label: string;
  description: string;
}

/**
 * Roles, and the permission catalogue you consult while building one.
 *
 * The catalogue is a REFERENCE SHEET, not a second editor: it lists what each
 * permission string grants. Reading it is something you do mid-task, with the
 * role you are editing still on screen — which is the argument for a tab
 * rather than a separate page.
 */
export const ROLES_TABS = [
  { id: "roles", label: "Roles", description: "Who can do what, as named roles." },
  { id: "permissions", label: "Permission catalogue", description: "Every permission string and what it grants." },
] as const satisfies readonly AdminPageTab[];

export type RolesTabId = (typeof ROLES_TABS)[number]["id"];

export function isRolesTabId(value: string | null | undefined): value is RolesTabId {
  return !!value && ROLES_TABS.some((t) => t.id === value);
}

/** Both toggle platform surfaces on and off, into the same settings document. */
export const ADMIN_SETTINGS_TABS = [
  { id: "actions", label: "Actions", description: "Turn individual CTAs and bulk actions on or off." },
  { id: "navigation", label: "Navigation", description: "Turn nav entries on or off across the portals." },
] as const satisfies readonly AdminPageTab[];

export type AdminSettingsTabId = (typeof ADMIN_SETTINGS_TABS)[number]["id"];

export function isAdminSettingsTabId(value: string | null | undefined): value is AdminSettingsTabId {
  return !!value && ADMIN_SETTINGS_TABS.some((t) => t.id === value);
}
