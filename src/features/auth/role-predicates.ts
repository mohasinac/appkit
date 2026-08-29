import type { UserRole } from "./types";

/**
 * Canonical user-role predicates — mirror of the listing-type accessors in
 * `features/products/utils/listing-type.ts`. Read the canonical role
 * discriminator off any object that carries a string `role` field and return
 * a boolean. Undefined or null input falls back to `"user"` so legacy payloads
 * classify safely without a separate guard.
 *
 * Input shape is `{ role?: string }` rather than `{ role?: UserRole }` so the
 * predicates compose with `RouteUser`, `UserDocument`, and the various
 * `AuthUser`-shaped objects without each callsite having to cast.
 */

type RoleCarrier = { role?: string | null } | null | undefined;

function normalizeRole(input: RoleCarrier): UserRole {
  return (input?.role ?? "user") as UserRole;
}

export const isAdminUser = (input: RoleCarrier): boolean =>
  normalizeRole(input) === "admin";

/**
 * True for sellers AND testers.
 *
 * A QA tester owns a real store — `becomeSeller`/`createStore` auto-approve it —
 * so every seller-facing surface must admit them. Making `tester` a peer role
 * of `seller` rather than a boolean is what removed the `isTester` flag; this
 * predicate is where that peerage is expressed.
 */
export const isSellerUser = (input: RoleCarrier): boolean => {
  const role = normalizeRole(input);
  return role === "seller" || role === "tester";
};

/** Strictly the `seller` role — for the rare case that must EXCLUDE testers. */
export const isStrictSellerUser = (input: RoleCarrier): boolean =>
  normalizeRole(input) === "seller";

export const isModeratorUser = (input: RoleCarrier): boolean =>
  normalizeRole(input) === "moderator";

export const isEmployeeUser = (input: RoleCarrier): boolean =>
  normalizeRole(input) === "employee";

export const isBuyerUser = (input: RoleCarrier): boolean =>
  normalizeRole(input) === "user";

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
      isTester?: boolean;
      canTestAdmin?: boolean;
      permissions?: readonly string[] | null;
    }
  | null
  | undefined;

/** The `tester` role, or the legacy `isTester` flag. */
export const isTesterUser = (input: TesterCarrier): boolean =>
  normalizeRole(input) === "tester" || input?.isTester === true;

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
