import type { UserRole } from "./types";

/**
 * Canonical user-role predicates — mirror of the listing-type accessors in
 * `features/products/utils/listing-type.ts`. Read the canonical role
 * discriminator off any object that carries a role and return a boolean.
 *
 * Input shape is `{ role?: string; roles?: string[] }` rather than the typed
 * union so the predicates compose with `RouteUser`, `UserDocument`, the JWT
 * claims bag and the various `AuthUser`-shaped objects without each callsite
 * having to cast.
 *
 * ── A user holds a SET of roles (1.43) ───────────────────────────────────────
 *
 * `roles: UserRole[]` is the authority; the legacy `role` scalar is a FALLBACK
 * read only while the backfill is in flight. Every predicate below asks "does
 * the set contain X", never "does the scalar equal X" — which is what makes a
 * `seller` + `employee` account pass both gates instead of whichever check ran
 * first. See `rolesOf` for the dual-read contract.
 */

/**
 * Anything that carries role information, in either shape.
 *
 * 🛑 `primaryRole` is deliberately absent from this type. It is a DISPLAY
 * field (see `primaryRoleOf` in ./auth-helpers) and must never reach an
 * authorization decision — accepting it here would invite exactly that.
 */
export type RoleCarrier =
  | { role?: string | null; roles?: readonly string[] | null }
  | null
  | undefined;

/** The one role every account has when nothing else is known. */
export const FALLBACK_ROLE: UserRole = "user";

/**
 * 🛑 `moderator` is COLLAPSED INTO `employee` (owner, 2026-11-07: they are the
 * same thing; moderation is an employee *permission*, not a role).
 *
 * Folding happens here, in the normalizer, rather than at 20 call sites — so a
 * stored document that still says `role: "moderator"` behaves identically to
 * one backfilled to `employee` the moment this ships, with no window where a
 * moderator is locked out waiting on `scripts/backfill-user-roles.mjs`.
 *
 * This map is the ONLY place a legacy role name is translated. Add future
 * collapses here; never branch on the old name downstream.
 */
const ROLE_ALIASES: Partial<Record<string, UserRole>> = {
  moderator: "employee",
};

/** Translate one raw stored role string to its canonical current role. */
function canonicalRole(raw: string): UserRole {
  return ROLE_ALIASES[raw] ?? (raw as UserRole);
}

/**
 * ── THE dual-read ────────────────────────────────────────────────────────────
 *
 * Resolve any role carrier to its canonical, de-duplicated, alias-folded role
 * SET. Reads `roles[]` when present and non-empty, falls back to the legacy
 * `role` scalar, and finally to `["user"]`.
 *
 * ⚠ Why the fallback exists and when it goes: `UserDocument.role` is the only
 * field every existing account carries. `UserRepository.mapDoc` normalises
 * BOTH directions on every read path (the `altRegionName` lesson — a dual-read
 * placed in one adapter left every other read path on the raw document, 200 OK
 * and silently blank), so by the time a document reaches application code it
 * already has `roles`. The scalar fallback here covers the paths that never
 * touch the repository at all: decoded JWT claims, API response bodies, and
 * client-side `SessionUser` objects hydrated from an older session cookie.
 *
 * Remove the fallback only once `scripts/backfill-user-roles.mjs --apply` has
 * run AND every live session cookie has rotated (5-day TTL).
 */
export function rolesOf(input: RoleCarrier): UserRole[] {
  const raw =
    Array.isArray(input?.roles) && input.roles.length > 0
      ? input.roles
      : input?.role
        ? [input.role]
        : [FALLBACK_ROLE];

  const seen = new Set<UserRole>();
  for (const entry of raw) {
    if (typeof entry !== "string" || entry.length === 0) continue;
    seen.add(canonicalRole(entry));
  }
  return seen.size > 0 ? [...seen] : [FALLBACK_ROLE];
}

/**
 * Does this carrier hold `role` (after alias folding)?
 *
 * Exact set membership — NOT a hierarchy comparison. `hasRole` in
 * ./auth-helpers is the hierarchy-aware one; this is the primitive every
 * predicate below is built from.
 */
export function holdsRole(input: RoleCarrier, role: UserRole): boolean {
  return rolesOf(input).includes(canonicalRole(role));
}

/** Does this carrier hold ANY of `roles`? The union test. */
export function holdsAnyRole(
  input: RoleCarrier,
  roles: readonly UserRole[],
): boolean {
  const held = rolesOf(input);
  return roles.some((r) => held.includes(canonicalRole(r)));
}

export const isAdminUser = (input: RoleCarrier): boolean =>
  holdsRole(input, "admin");

/**
 * True for sellers AND testers.
 *
 * A QA tester owns a real store — `becomeSeller`/`createStore` auto-approve it —
 * so every seller-facing surface must admit them. Making `tester` a peer role
 * of `seller` rather than a boolean is what removed the `isTester` flag; this
 * predicate is where that peerage is expressed.
 */
export const isSellerUser = (input: RoleCarrier): boolean =>
  holdsAnyRole(input, ["seller", "tester"]);

/** Strictly the `seller` role — for the rare case that must EXCLUDE testers. */
export const isStrictSellerUser = (input: RoleCarrier): boolean =>
  holdsRole(input, "seller");

/**
 * @deprecated `moderator` is collapsed into `employee` (A9, owner 2026-11-07),
 * so this is now exactly `isEmployeeUser`. Kept as a named alias rather than
 * deleted because ~20 call sites read `isAdminUser(u) || isModeratorUser(u)`
 * and that sentence is still TRUE under the fold — a moderator is an employee.
 * New code should call `isEmployeeUser`, or better, check the moderation
 * permission (`admin:moderation:read`) via `permissionsFor`.
 */
export const isModeratorUser = (input: RoleCarrier): boolean =>
  holdsRole(input, "employee");

export const isEmployeeUser = (input: RoleCarrier): boolean =>
  holdsRole(input, "employee");

/**
 * Holds the plain `user` (buyer) role.
 *
 * ⚠ Under a role SET this is no longer the complement of "is staff" — a
 * seller who is also a buyer holds BOTH, so `isBuyerUser` and `isSellerUser`
 * are true at once. Callers that meant "has nothing but the buyer role" want
 * `rolesOf(u).length === 1 && isBuyerUser(u)`, spelled out.
 */
export const isBuyerUser = (input: RoleCarrier): boolean =>
  holdsRole(input, "user");

/**
 * ── Tester identity: role first, legacy booleans second ──────────────────────
 *
 * `isTester` / `canTestAdmin` are being replaced by the `tester` role and the
 * `tester:admin-surfaces` permission. Both predicates below read the NEW shape
 * first and fall back to the OLD one, which is what makes the code safe to ship
 * before the data migration: a tester whose document still says
 * `{ role: "seller", isTester: true }` keeps working unchanged, and one already
 * migrated to `{ role: "tester" }` works too.
 *
 * ⛔ Do NOT delete the fallbacks until the backfill has run and been verified.
 * Removing them early locks every existing tester out of the Tester Hub and out
 * of the auto-approved store the QA program depends on.
 */
type TesterCarrier =
  | {
      role?: string | null;
      roles?: readonly string[] | null;
      isTester?: boolean;
      canTestAdmin?: boolean;
      permissions?: readonly string[] | null;
    }
  | null
  | undefined;

/** The `tester` role, or the legacy `isTester` flag. */
export const isTesterUser = (input: TesterCarrier): boolean =>
  holdsRole(input, "tester") || input?.isTester === true;

/**
 * May this tester reach `/admin/**`?
 *
 * The `tester:admin-surfaces` permission, or the legacy `canTestAdmin` flag.
 * Granted through the same `permissions[]` array employees already use, so it
 * is one grant mechanism rather than a bespoke boolean — and revoking it is a
 * permission change, which the admin audit log already records.
 */
export const canTestAdminSurfaces = (input: TesterCarrier): boolean =>
  Boolean(input?.permissions?.includes("tester:admin-surfaces")) ||
  input?.canTestAdmin === true;

/**
 * True for real admins OR a tester cleared for admin surfaces. Used at the two
 * RBAC chokepoints — the API route guard (`createRouteHandler`) and the admin
 * layout guard (`makeAdminSectionLayout`) — so a cleared tester gets real
 * read/write access to `/admin/**` without holding the admin role.
 *
 * Callers must supply the role/permissions from a live Firestore read; none of
 * these are present in the session-cookie JWT claims (only `role` is).
 */
type EffectiveAdminCarrier = TesterCarrier;

export const isEffectiveAdminUser = (input: EffectiveAdminCarrier): boolean =>
  isAdminUser(input) || (isTesterUser(input) && canTestAdminSurfaces(input));

/**
 * ── Is this account blocked? ─────────────────────────────────────────────────
 *
 * 🛑 There are TWO ban fields on `UserDocument` and, until 2026-08-29, no ban
 * path wrote the one every guard reads.
 *
 *   `disabled`   — required, and read by EVERY server-side guard:
 *                  auth-server, api-handler, authorization.requireActiveUser,
 *                  Guards.requireActiveAccount, SessionContext.
 *                  Its only writers, `userRepository.disable()/enable()`, had
 *                  ZERO callers.
 *   `isDisabled` — optional, and what `hardBanCascade` and the bulk-suspend
 *                  route actually set, alongside the Firebase Auth record.
 *
 * The consequence was that **no ban terminated an existing session.** A hard
 * ban set Firebase Auth `disabled: true`, which blocks a fresh login — and
 * nothing else. Every authenticated request from a session cookie the user
 * already held kept passing, because each guard consulted a Firestore field
 * the ban never touched. Silent, and invisible to anyone testing a ban by
 * logging out first.
 *
 * This predicate reads BOTH so already-banned accounts are enforced from the
 * moment it ships, without waiting on a backfill. Every write path now sets
 * both fields too; `isDisabled` is removed once the data is reconciled.
 */
type BanCarrier =
  | { disabled?: boolean | null; isDisabled?: boolean | null }
  | null
  | undefined;

export const isAccountDisabled = (input: BanCarrier): boolean =>
  input?.disabled === true || input?.isDisabled === true;
