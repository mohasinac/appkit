import type { UserRole } from "./types";
import { getTokenTimeRemaining, isTokenExpired } from "./token-helpers";

// Was a SECOND, disagreeing copy of the hierarchy (employee and moderator both
// ranked 2, where the canonical one puts moderator above employee), so
// `hasRole` gave a different answer depending on which module you imported.
// Deleted 2026-08-29 in favour of the one in security/authorization.
import { ROLE_HIERARCHY } from "../../security/authorization";
import { rolesOf, holdsRole, holdsAnyRole } from "./role-predicates";
import type { RoleCarrier } from "./role-predicates";
import {
  ROLE_PERMISSION_BUNDLES,
  ROLE_GRANTS_EXPLICIT_PERMISSIONS,
  DEFAULT_MAX_ROLES_PER_USER,
} from "./permissions/constants";
import type { Permission } from "./permissions/constants";

export interface DefaultRoleOptions {
  adminEmails?: string[];
  adminRole?: UserRole;
  fallbackRole?: UserRole;
}

/*
 * ═════════════════════════════════════════════════════════════════════════════
 * THE permission helper (item 1.44) — `hasRole` / `hasAnyRole` /
 * `permissionsFor`. There is exactly ONE of these in the codebase and this is
 * it.
 *
 * 🛑 Do not create a second. A duplicated role helper is what left 45 appkit
 * API routes dead alongside 452 host copies, and a duplicated role HIERARCHY
 * (the comment above) is what made `hasRole` return different answers for the
 * same user depending on the import path. If something here does not fit your
 * call site, widen THIS module.
 *
 * ── The rule these functions exist to enforce ────────────────────────────────
 *
 *   A mechanism never asks "what role is this?". It asks "does this user have
 *   the permission?". Roles are named bundles of permissions, and the bundles
 *   are DATA (`ROLE_PERMISSION_BUNDLES`), so granting someone vendor-list
 *   access is a permission grant, not a code change.
 *
 * ── Every function here reads the role SET ───────────────────────────────────
 *
 * A user holds up to `maxRolesPerUser` roles and their permissions are the
 * UNION. Nothing below reads `primaryRole`, because `primaryRole` is a display
 * label — see `primaryRoleOf`'s own warning.
 * ═════════════════════════════════════════════════════════════════════════════
 */

/** Highest hierarchy rank among the roles this carrier holds. */
export function maxRoleLevel(user: RoleCarrier): number {
  return rolesOf(user).reduce(
    (best, role) => Math.max(best, ROLE_HIERARCHY[role] ?? 0),
    0,
  );
}

/**
 * Is this user AT LEAST `requiredRole` in the hierarchy, considering every
 * role they hold?
 *
 * ⚠ Hierarchy-aware on purpose — `hasRole(u, "seller")` is true for an admin,
 * which is what "admin sees everything, everywhere" means at this layer. For
 * exact set membership (e.g. "does this account literally hold `seller`") use
 * `holdsRole` from ./role-predicates.
 *
 * Accepts a user-shaped carrier OR a bare role string, so the ~5 existing
 * `hasRole(user.role, "seller")` call sites keep compiling while new ones pass
 * the whole user and get the union.
 */
export function hasRole(
  user: RoleCarrier | UserRole,
  requiredRole: UserRole,
): boolean {
  const carrier: RoleCarrier =
    typeof user === "string" ? { role: user } : user;
  return maxRoleLevel(carrier) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

/** `hasRole` against any of `requiredRoles`. */
export function hasAnyRole(
  user: RoleCarrier | UserRole,
  requiredRoles: readonly UserRole[],
): boolean {
  return requiredRoles.some((role) => hasRole(user, role));
}

/**
 * Re-exported so a caller that needs EXACT membership (no hierarchy) does not
 * have to know that it lives in a different module — one import, one helper.
 */
export { rolesOf, holdsRole, holdsAnyRole };

/**
 * The resolved permission answer for a user: either "is admin, bypasses
 * everything" or an explicit permission list.
 *
 * 🛑 One shape, shared by the pure client-safe resolver below and the
 * Firestore-reading `getServerPermissions`, so a surface cannot be gated one
 * way on the server and another in the UI.
 */
export interface ResolvedPermissions {
  /** true when the user holds `admin` — bypasses all permission checks. */
  isAdmin: boolean;
  /** Union of every permission granted by the held roles plus explicit grants. */
  permissions: Permission[];
}

/** Anything carrying roles plus the per-user explicit permission grants. */
export type PermissionCarrier =
  | {
      role?: string | null;
      roles?: readonly string[] | null;
      permissions?: readonly string[] | null;
    }
  | null
  | undefined;

/**
 * ── `permissionsFor(user)` — the UNION across every held role ────────────────
 *
 * Pure and synchronous: it resolves from the object it is handed and reads no
 * database. `getServerPermissions(uid)` is the async wrapper that fetches the
 * document first and then calls this, so there is one resolution rule rather
 * than a server copy and a client copy that drift.
 *
 * Three sources are merged:
 *   1. `ROLE_PERMISSION_BUNDLES[role]` for every role held — the DATA layer
 *      that makes "give the auditor role the ledger" a config edit.
 *   2. The user's own `permissions[]` array — per-person grants on top of the
 *      bundle, which is how an employee is actually configured today.
 *   3. `admin` short-circuits to `isAdmin: true`, which every check treats as
 *      "yes" without consulting the array at all.
 */
export function permissionsFor(user: PermissionCarrier): ResolvedPermissions {
  const held = rolesOf(user);
  if (held.includes("admin")) return { isAdmin: true, permissions: [] };

  const union = new Set<Permission>();
  for (const role of held) {
    for (const permission of ROLE_PERMISSION_BUNDLES[role] ?? []) {
      union.add(permission);
    }
  }
  /*
   * The per-user array is honoured only for roles whose fine-grained grants
   * are real — `ROLE_GRANTS_EXPLICIT_PERMISSIONS`, data, not a branch. See
   * that map's own comment for why unioning it unconditionally would have been
   * a silent privilege widening.
   */
  if (held.some((role) => ROLE_GRANTS_EXPLICIT_PERMISSIONS[role])) {
    for (const explicit of user?.permissions ?? []) {
      union.add(explicit as Permission);
    }
  }
  return { isAdmin: false, permissions: [...union] };
}

/**
 * Does this user have `required`? Admin always does.
 *
 * This is the function a mechanism should call. `hasRole` exists for the gates
 * that are genuinely about rank (portal routing, the hierarchy-ordered
 * `requireRole`); anything that is about a CAPABILITY belongs here.
 */
export function can(user: PermissionCarrier, required: Permission): boolean {
  const resolved = permissionsFor(user);
  return resolved.isAdmin || resolved.permissions.includes(required);
}

/** `can` against any of `required` — the OR of several permissions. */
export function canAny(
  user: PermissionCarrier,
  required: readonly Permission[],
): boolean {
  const resolved = permissionsFor(user);
  return (
    resolved.isAdmin || required.some((p) => resolved.permissions.includes(p))
  );
}

/*
 * ═════════════════════════════════════════════════════════════════════════════
 * MODERATION — the sites that used to read `isModeratorUser()`
 *
 * ── Why this map exists ──────────────────────────────────────────────────────
 *
 * `moderator` is collapsed into `employee` (A9, owner 2026-11-07: they are the
 * same thing). The fold is right, but on its own it made `isModeratorUser()`
 * return true for EVERY employee, so roughly 20 moderator-gated actions —
 * order payment overrides, review and product moderation, support tickets,
 * draw-entry oversight — widened to every existing employee account as a side
 * effect of a role rename. Nobody chose that.
 *
 * Owner, 2026-11-08, asked to choose: **keep the fold, gate those sites on an
 * explicit moderation permission.** So access is a GRANT, not a consequence of
 * a rename — the governing principle applied properly:
 *
 *   A mechanism never asks "what role is this?" — it asks "does this user have
 *   the permission?". Roles are bundles of capabilities, and bundles are DATA.
 *
 * ── Why a MAP and not nine scattered `can(user, "admin:…")` calls ────────────
 *
 * This is the one place that says which permission gates which moderation
 * site, so retargeting one is a data edit and the whole set is enumerable —
 * which is what makes "an employee without the grant is denied each of these"
 * an executable assertion rather than a claim. It is the same shape as the
 * listing-type capability registry, for the same reason.
 *
 * ── Why these keys, and not one blanket `moderation:*` ───────────────────────
 *
 * Because the grants are different decisions and an operator hands them out
 * separately. Resource moderation reuses the EXISTING resource keys
 * (`admin:reviews:write`, `admin:products:delete`, …): minting a parallel
 * `moderation:reviews` beside `admin:reviews:write` would be two permissions
 * for one decision — the two-divergent-copies bug in permission form, and the
 * admin UI already renders those keys.
 *
 * 🛑 The ONE new key is `admin:orders:payment-override`, and it is new because
 * an order override is a money-path power that must not ride along with
 * editing a review: it declares that money arrived, or cancels an order and
 * enqueues a 7-day ban. See its own comment in permissions/constants.
 *
 * ── The default grant ────────────────────────────────────────────────────────
 *
 * **NOT GRANTED.** `ROLE_PERMISSION_BUNDLES.employee` is `[]`, so holding
 * `employee` confers none of these. An admin grants them per person, or via a
 * moderation preset (`content_moderator`, `review_manager`,
 * `trust_and_safety`, `scam_moderator`, `payment_reviewer`). `admin`
 * short-circuits `permissionsFor` to `isAdmin: true` and so holds all of them
 * unconditionally — "admin sees everything, everywhere" is preserved without
 * being restated anywhere.
 * ═════════════════════════════════════════════════════════════════════════════
 */

/**
 * Every moderation site, keyed by what the actor is trying to DO.
 *
 * Keys are action names rather than route paths on purpose: the same power is
 * reached from an API route, a server action and a form shell, and all three
 * must resolve to the same permission or the gate is half-converted.
 */
export const MODERATION_PERMISSIONS = {
  /** Edit any review regardless of authorship, including its moderation status. */
  "reviews:moderate": "admin:reviews:write",
  /** Delete any review regardless of authorship. */
  "reviews:remove": "admin:reviews:delete",
  /** Edit any listing regardless of store ownership. */
  "products:moderate": "admin:products:write",
  /** Archive any listing regardless of store ownership. */
  "products:remove": "admin:products:delete",
  /** Read a support ticket you did not open. */
  "support-tickets:view": "admin:support-tickets:read",
  /** Reply to a support ticket as staff (and email the owner). */
  "support-tickets:reply": "admin:support-tickets:write",
  /**
   * See EVERY entrant on a product or event draw, not just your own entries.
   * `admin:moderation:read` rather than a bids/offers key: the draw-entry
   * queues are reached from the moderation hub, which this same key gates.
   */
  "draw-entries:view": "admin:moderation:read",
  /**
   * Flag a suspicious draw entry with a moderator note — a WRITE on the
   * moderation queue, so `admin:moderation:write` and not the `:read` key that
   * gates merely looking at it.
   */
  "draw-entries:flag": "admin:moderation:write",
  /**
   * Verify a manual payment, extend a payment window, or reject a proof as
   * fraud. 🛑 The money path — its own key, in one narrow preset only.
   */
  "orders:payment-override": "admin:orders:payment-override",
  /** Act on an order you neither bought nor sold — e.g. raise a dispute on it. */
  "orders:act-on-any": "admin:orders:write",
} as const satisfies Record<string, Permission>;

/** The action names above, as a type. */
export type ModerationAction = keyof typeof MODERATION_PERMISSIONS;

/** Every moderation action, as a runtime value — for exhaustive assertions. */
export const ALL_MODERATION_ACTIONS = Object.keys(
  MODERATION_PERMISSIONS,
) as ModerationAction[];

/**
 * May this user perform moderation `action`?
 *
 * ⚠ SYNCHRONOUS, so it resolves ONLY from the object handed to it. That is
 * correct for a `UserDocument` or anything else carrying `permissions[]`, and
 * WRONG for an API-route `user`: `createRouteHandler`'s session payload carries
 * `uid`/`role`/`roles` and no `permissions` array, so a per-person grant is
 * invisible to it and every employee would be denied. Server routes and
 * actions must use `canModerateServer(uid, action)` instead, which reads the
 * document first. The two share this one resolution rule.
 */
export function canModerate(
  user: PermissionCarrier,
  action: ModerationAction,
): boolean {
  return can(user, MODERATION_PERMISSIONS[action]);
}

/**
 * ── 🛑 DISPLAY ONLY ──────────────────────────────────────────────────────────
 *
 * The role to SHOW for this user — a badge, a profile line, a default tab.
 *
 * **It must never make an authorization decision.** A `primaryRole` that gates
 * anything is the single-role bug returning under a new name: an admin whose
 * primary role reads "user" would be locked out of `/admin` while genuinely
 * holding `admin`. That is precisely the failure mode 1.43 exists to remove,
 * so every gate reads `rolesOf` / `permissionsFor` instead.
 *
 * Resolution: the stored `primaryRole` when the user actually still holds it
 * (a role can be removed after being chosen as primary), otherwise the
 * highest-ranked role held. Never returns a role the user does not hold.
 */
export function primaryRoleOf(
  user:
    | (RoleCarrier & { primaryRole?: string | null })
    | null
    | undefined,
): UserRole {
  const held = rolesOf(user);
  const stored = user?.primaryRole;
  if (stored && held.includes(stored as UserRole)) return stored as UserRole;
  return held.reduce(
    (best, role) =>
      (ROLE_HIERARCHY[role] ?? 0) > (ROLE_HIERARCHY[best] ?? 0) ? role : best,
    held[0],
  );
}

/**
 * ── The normalisation every read path applies ────────────────────────────────
 *
 * Mutates and returns `doc` with all three role fields made consistent:
 * `roles` (authority), `primaryRole` (display, always actually held) and
 * `role` (legacy scalar, set to the HIGHEST-RANKED held role).
 *
 * 🛑 ONE function, called from `UserRepository.mapDoc` so every read path
 * normalises, and from `scripts/backfill-user-roles.mjs` so the stored data
 * ends up matching exactly what readers already see. A second copy of this
 * rule is how a backfill and a dual-read disagree.
 *
 * `role` is the highest rank rather than `primaryRole` on purpose — see the
 * `mapDoc` comment: a not-yet-converted guard comparing the scalar must not
 * under-grant.
 */
export function normalizeUserRoleFields<
  T extends {
    role?: string | null;
    roles?: readonly string[] | null;
    primaryRole?: string | null;
  },
>(doc: T): T {
  const target = doc as T & {
    role?: UserRole;
    roles?: UserRole[];
    primaryRole?: UserRole;
  };
  const held = rolesOf(doc);
  target.roles = held;
  target.primaryRole = primaryRoleOf(doc);
  target.role = held.reduce(
    (best, role) =>
      (ROLE_HIERARCHY[role] ?? 0) > (ROLE_HIERARCHY[best] ?? 0) ? role : best,
    held[0],
  );
  return target;
}

/*
 * ── `maxRolesPerUser` is CONFIG, not a constant ──────────────────────────────
 *
 * Owner, 2026-11-07: *"they can have more than 3 in future, for now 3"*. So
 * the cap is a setting with a default, and the literal lives in exactly ONE
 * place (`DEFAULT_MAX_ROLES_PER_USER`) instead of being restated in the
 * schema, the validator and the UI — which is the drift this rework exists to
 * remove.
 *
 * ⚠ SEAM, flagged rather than hidden: the runtime override is set once at
 * boot by whoever owns site settings (`setMaxRolesPerUser`), because the role
 * validator is synchronous and cannot await a Firestore settings read on every
 * write. Until that wiring lands, every caller gets the default of 3 — which
 * is the correct value today, so nothing is broken; it is simply not yet
 * editable without a deploy. `siteSettings` belongs to another lane.
 */
let configuredMaxRolesPerUser: number | null = null;

/** Install the configured cap. Call once at boot from the settings loader. */
export function setMaxRolesPerUser(value: number | null | undefined): void {
  configuredMaxRolesPerUser =
    typeof value === "number" && Number.isInteger(value) && value >= 1
      ? value
      : null;
}

/** The effective cap: the configured value, else the default. */
export function getMaxRolesPerUser(): number {
  return configuredMaxRolesPerUser ?? DEFAULT_MAX_ROLES_PER_USER;
}

/**
 * Validate a proposed role set.
 *
 * **No forbidden combinations** (owner decision) — the only rules are
 * non-empty, known roles, and the cap. Returns the normalised set so a caller
 * cannot accidentally persist duplicates or a legacy alias.
 */
export function validateRoleSet(
  proposed: readonly string[],
): { ok: true; roles: UserRole[] } | { ok: false; error: string } {
  const normalised = rolesOf({ roles: proposed });
  const known = Object.keys(ROLE_HIERARCHY) as UserRole[];
  const unknown = normalised.filter((r) => !known.includes(r));
  if (unknown.length > 0) {
    return { ok: false, error: `Unknown role(s): ${unknown.join(", ")}` };
  }
  if (proposed.length === 0) {
    return { ok: false, error: "A user must hold at least one role." };
  }
  const cap = getMaxRolesPerUser();
  if (normalised.length > cap) {
    return {
      ok: false,
      error: `A user may hold at most ${cap} roles (got ${normalised.length}).`,
    };
  }
  return { ok: true, roles: normalised };
}

export function getDefaultRole(
  email?: string,
  options?: DefaultRoleOptions,
): UserRole {
  const fallbackRole = options?.fallbackRole ?? "user";
  const adminRole = options?.adminRole ?? "admin";
  const adminEmails = options?.adminEmails ?? [];

  if (email && adminEmails.includes(email)) {
    return adminRole;
  }

  return fallbackRole;
}

export function formatAuthProvider(provider: string): string {
  const providerNames: Record<string, string> = {
    password: "Email/Password",
    "google.com": "Google",
    "apple.com": "Apple",
    phone: "Phone",
  };

  return providerNames[provider] || provider;
}

export function isSessionExpired(expiresAt: Date | string): boolean {
  return isTokenExpired(expiresAt);
}

export function getSessionTimeRemaining(expiresAt: Date | string): number {
  return getTokenTimeRemaining(expiresAt);
}

export function generateInitials(
  displayName?: string | null,
  email?: string | null,
): string {
  if (displayName) {
    const parts = displayName.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    return displayName.substring(0, 2).toUpperCase();
  }

  if (email) {
    return email.substring(0, 2).toUpperCase();
  }

  return "U";
}

export function calculatePasswordScore(password: string): number {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  if (/(.)\1{2,}/.test(password)) score = Math.max(0, score - 1);
  if (/^(?:password|123456|qwerty)/i.test(password)) score = 0;

  return Math.min(4, Math.max(0, score));
}
