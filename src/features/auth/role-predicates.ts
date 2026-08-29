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
