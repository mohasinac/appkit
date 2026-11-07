/**
 * PERMISSIONS and ROLES — the same shape as listing types, for the same reason.
 *
 * Owner, 2026-11-08: *"same applies to users and their roles and permissions as
 * well as their dashboards — we do not need to make something entirely new for
 * a new user, just change the config to have that, or a new role or permission."*
 *
 * A role is: key + label + host + a value for every permission + caps. Adding
 * one is a row. It needs **no new subdomain** (`employee.` is the catch-all
 * host) and **no new dashboard** — the dashboard resolves from the permission
 * set, so it exists the moment the row does.
 *
 * A user holds a SET of roles, capped by `maxRolesPerUser`. The dashboard is
 * the UNION of what the set permits; the more permissive wins and denials are
 * not inherited. The acceptance test for the whole rework is that a grep for
 * `role ===` outside the registry returns zero.
 *
 * Mocks: `mocks/12-admin-settings.qm` *Roles and permissions*,
 *        `mocks/02-dashboards.qm` (all four dashboards).
 */

export type PermissionGroup =
  | "catalogue"
  | "orders"
  | "money"
  | "people"
  | "content"
  | "platform";

export interface PermissionDefinition {
  id: string;
  label: string;
  group: PermissionGroup;
  /** What holding it lets you do, in a sentence the grantor can verify. */
  effect: string;
  /**
   * Money or legal consequence. These are never granted to a seller, and
   * granting one to a new role is on the two-admin threshold list.
   */
  moneyPath?: boolean;
  /** Admin-only forever, regardless of what a future role row says. */
  adminOnly?: boolean;
}

export const permissionsSeedData: PermissionDefinition[] = [
  { id: "listing.create", label: "Create listings", group: "catalogue", effect: "Publish listings in the types this role may use." },
  { id: "listing.editOwn", label: "Edit own listings", group: "catalogue", effect: "Edit listings belonging to this user's store." },
  { id: "listing.editAny", label: "Edit any listing", group: "catalogue", effect: "Edit any listing on the platform." },
  { id: "listing.moderate", label: "Moderate listings", group: "catalogue", effect: "Hold, unpublish or require changes on a listing." },

  { id: "order.viewOwn", label: "View own orders", group: "orders", effect: "See orders this user placed." },
  { id: "order.viewStore", label: "View store orders", group: "orders", effect: "See orders against this user's store." },
  { id: "order.viewAny", label: "View any order", group: "orders", effect: "See every order on the platform." },
  { id: "order.fulfil", label: "Fulfil orders", group: "orders", effect: "Pack, buy labels and hand over shipments." },
  { id: "order.cancel", label: "Cancel orders", group: "orders", effect: "Cancel an order where the state still allows it. Reason required." },
  { id: "order.support", label: "Handle support tickets", group: "orders", effect: "Claim, respond to and close support tickets." },

  { id: "order.refund", label: "Issue refunds", group: "money", effect: "Refund up to the captured amount, through the gate set.", moneyPath: true },
  { id: "order.refundApprove", label: "Approve large refunds", group: "money", effect: "Clear refunds above the approval threshold.", moneyPath: true, adminOnly: true },
  { id: "payout.view", label: "View payouts", group: "money", effect: "See payout schedules and holds." },
  { id: "payout.release", label: "Release payouts", group: "money", effect: "Move money to a seller's account.", moneyPath: true, adminOnly: true },
  { id: "tax.manage", label: "Manage tax rules", group: "money", effect: "Edit tax rule sets and the site's registration details.", moneyPath: true, adminOnly: true },
  { id: "payments.manage", label: "Manage payment providers", group: "money", effect: "Enable or disable PhonePe, Razorpay, Cashfree and COD.", moneyPath: true },

  { id: "vendor.approve", label: "Approve vendors", group: "people", effect: "Admit a store to the platform after KYC." },
  { id: "user.view", label: "View users", group: "people", effect: "See user records in scope." },
  { id: "role.manage", label: "Manage roles", group: "people", effect: "Edit permission sets and grant roles.", adminOnly: true },

  { id: "widgets.composeOwn", label: "Compose own surfaces", group: "content", effect: "Arrange widgets on surfaces this user owns." },
  { id: "widgets.composeAny", label: "Compose any surface", group: "content", effect: "Arrange widgets anywhere, including the homepage." },
  { id: "content.moderate", label: "Moderate content", group: "content", effect: "Remove reviews, UGC and store copy that breaches policy." },
  { id: "content.publishLegal", label: "Publish legal pages", group: "content", effect: "Publish a new version of a policy page.", adminOnly: true },

  { id: "settings.manage", label: "Manage site settings", group: "platform", effect: "Edit listing types, tags, rule sets and feature flags.", adminOnly: true },
  { id: "audit.view", label: "View the audit log", group: "platform", effect: "Read who changed what, and when." },
];

export const PERMISSION_IDS: readonly string[] = permissionsSeedData.map(p => p.id);

export interface RoleDefinition {
  key: string;
  label: string;
  /** Host rewrite this role lands on. Not a deployment. */
  host: "admin." | "seller." | "user." | "employee.";
  enabled: boolean;
  order: number;
  /** One value per permission id. `scoped` means "only what this user owns". */
  permissions: Record<string, boolean | "own" | "store">;
  /** Widget cap on surfaces this role may compose. `null` = unlimited. */
  widgetCap: number | null;
  /** Default dashboard layout key (see layouts-seed-data). */
  dashboardLayout: string;
}

const allDenied = (): Record<string, boolean | "own" | "store"> =>
  Object.fromEntries(PERMISSION_IDS.map(id => [id, false]));

const role = (
  r: Omit<RoleDefinition, "permissions"> & { grants: Record<string, boolean | "own" | "store"> },
): RoleDefinition => {
  const { grants, ...rest } = r;
  const permissions = allDenied();
  for (const [id, value] of Object.entries(grants)) {
    if (!(id in permissions)) throw new Error(`role "${r.key}" grants unknown permission "${id}"`);
    permissions[id] = value;
  }
  return { ...rest, permissions };
};

export const rolesSeedData: RoleDefinition[] = [
  role({
    key: "admin",
    label: "Admin",
    host: "admin.",
    enabled: true,
    order: 1,
    widgetCap: null,
    dashboardLayout: "dashboard.admin",
    grants: Object.fromEntries(PERMISSION_IDS.map(id => [id, true])),
  }),

  role({
    key: "seller",
    label: "Seller",
    host: "seller.",
    enabled: true,
    order: 2,
    widgetCap: 50,
    dashboardLayout: "dashboard.seller",
    // "Vendor" is UI copy. The role value in code is `seller` — never introduce
    // a second literal for the same thing.
    grants: {
      "listing.create": true,
      "listing.editOwn": true,
      "order.viewStore": true,
      "order.fulfil": true,
      "order.cancel": "store",
      "payout.view": "own",
      "widgets.composeOwn": true,
    },
  }),

  role({
    key: "user",
    label: "Buyer",
    host: "user.",
    enabled: true,
    order: 3,
    widgetCap: 20,
    dashboardLayout: "dashboard.buyer",
    grants: {
      "order.viewOwn": true,
      "order.cancel": "own",
      "widgets.composeOwn": true,
    },
  }),

  role({
    key: "support",
    label: "Support",
    host: "employee.",
    enabled: true,
    order: 4,
    widgetCap: null,
    dashboardLayout: "dashboard.employee",
    grants: {
      "order.viewAny": true,
      "order.support": true,
      "order.cancel": true,
      "order.refund": true,
      "user.view": true,
      "audit.view": true,
    },
  }),

  role({
    key: "fulfilment",
    label: "Fulfilment",
    host: "employee.",
    enabled: true,
    order: 5,
    widgetCap: null,
    dashboardLayout: "dashboard.employee",
    grants: { "order.viewAny": true, "order.fulfil": true },
  }),

  role({
    key: "moderator",
    label: "Moderator",
    host: "employee.",
    enabled: true,
    order: 6,
    widgetCap: null,
    dashboardLayout: "dashboard.employee",
    // Folded into employee rather than given a host — it is a permission set.
    grants: { "listing.moderate": true, "content.moderate": true, "order.viewAny": true },
  }),
];

/** Config, not code — the owner raises this without a release. */
export const roleSettingsSeedData = {
  maxRolesPerUser: 3,
  /** Refunds at or above this need `order.refundApprove` as a second pair of eyes. */
  refundApprovalThresholdInr: 5000,
  /** Settings whose change requires two admins. */
  twoAdminApprovalFor: ["tax.manage", "payout.release", "role.manage", "payments.manage"],
};

for (const r of rolesSeedData) {
  const missing = PERMISSION_IDS.filter(id => !(id in r.permissions));
  if (missing.length) throw new Error(`role "${r.key}" is missing permissions: ${missing.join(", ")}`);
  for (const p of permissionsSeedData) {
    if (p.adminOnly && r.key !== "admin" && r.permissions[p.id]) {
      throw new Error(`role "${r.key}" holds admin-only permission "${p.id}"`);
    }
  }
}

export const rolesByKey: Readonly<Record<string, RoleDefinition>> =
  Object.freeze(Object.fromEntries(rolesSeedData.map(r => [r.key, r])));
