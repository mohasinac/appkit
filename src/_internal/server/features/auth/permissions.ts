/**
 * Server-side RBAC permission resolver.
 *
 * Logic lives here; consumers inject config via opts parameters.
 *
 * Design:
 *  - admin role bypasses all permission checks (isAdmin: true)
 *  - employee role is gated by permissions[] on UserDocument
 *  - all other roles get empty permissions (no admin access)
 */

import { userRepository } from "../../../../features/auth/repository/user.repository";
import type { Permission } from "../../../../features/auth/permissions/constants";
import { ROUTES } from "../../../../next/routing/route-map";
import { isEffectiveAdminUser, isEmployeeUser } from "../../../../features/auth/role-predicates";
import { permissionsFor, MODERATION_PERMISSIONS } from "../../../../features/auth/auth-helpers";
import type { ResolvedPermissions, ModerationAction } from "../../../../features/auth/auth-helpers";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * 🛑 Re-exported, not redefined. The shape now lives next to
 * `permissionsFor()` in `features/auth/auth-helpers` so the server resolver
 * and the client-safe one cannot disagree about what a resolved permission
 * answer looks like. The alias keeps the ~40 existing
 * `import type { ResolvedPermissions } from ".../server"` sites compiling.
 */
export type { ResolvedPermissions };

// ── Core resolver ─────────────────────────────────────────────────────────────

/**
 * Fetch and resolve permissions for a user — the UNION across every role they
 * hold (1.44).
 *
 * 🛑 Was three sequential `user.role === "..."` comparisons, so a user holding
 * both `employee` and `seller` resolved by whichever equality matched the
 * single stored scalar: an admin+employee got `{ isAdmin: true }` only if the
 * scalar happened to say "admin", and an employee+seller lost their whole
 * permission array if it happened to say "seller". Both failures are silent.
 *
 * Now: read the document, hand it to `permissionsFor()`, which unions
 * `ROLE_PERMISSION_BUNDLES` across the held set with the per-user
 * `permissions[]` grants. No role comparison appears here at all — adding an
 * auditor role with ledger access is a bundle edit, not a branch here.
 *
 * `UserRepository.mapDoc` has already normalised `roles` on this document, so
 * the union is computed from the set even for accounts the backfill has not
 * reached yet.
 */
export async function getServerPermissions(
  uid: string,
): Promise<ResolvedPermissions> {
  if (!uid) return { isAdmin: false, permissions: [] };

  // userRepository.findById is cached per request in BaseRepository
  const user = await (userRepository.findById(uid) as Promise<{
    role?: string;
    roles?: string[];
    permissions?: string[];
  } | null>);

  if (!user) return { isAdmin: false, permissions: [] };

  return permissionsFor(user);
}

// ── Permission check helpers ──────────────────────────────────────────────────

export function checkPermission(
  resolved: ResolvedPermissions,
  required: Permission,
): boolean {
  return resolved.isAdmin || resolved.permissions.includes(required);
}

export function checkAnyPermission(
  resolved: ResolvedPermissions,
  required: Permission[],
): boolean {
  return resolved.isAdmin || required.some((p) => resolved.permissions.includes(p));
}

/**
 * ── The server-side answer to "may this user do X?" ──────────────────────────
 *
 * `can(user, perm)` in `features/auth/auth-helpers` is pure and reads the
 * object it is handed. That is the wrong tool inside an API route: the session
 * payload `createRouteHandler` builds carries `uid`, `role`, `roles` and
 * `primaryRole` and **no `permissions` array** (see `RouteUser` — none of the
 * fine-grained grants reach the session-cookie JWT claims). So a synchronous
 * check there would silently ignore every per-person grant and deny a properly
 * configured employee.
 *
 * This reads the document first and then applies the SAME rule —
 * `getServerPermissions` → `permissionsFor` — so there is one resolution rule,
 * not a server copy and a client copy that drift. `userRepository.findById` is
 * cached per request in `BaseRepository`, so several of these in one handler
 * cost one read.
 *
 * ⚠ Call it only AFTER the cheap ownership test has failed. Every gate this
 * converts reads "the owner, or someone with the permission", and an owner must
 * not pay a Firestore read to edit their own thing (Rule #6).
 */
export async function serverCan(
  uid: string | null | undefined,
  required: Permission,
): Promise<boolean> {
  if (!uid) return false;
  return checkPermission(await getServerPermissions(uid), required);
}

/**
 * `serverCan` for the moderation action names.
 *
 * 🛑 This is the function the ~20 former `isModeratorUser()` sites call. The
 * action → permission mapping lives in `MODERATION_PERMISSIONS` beside
 * `permissionsFor`, so the gate is data; this is only the async wrapper that
 * fetches the document.
 *
 * Default grant, restated because it is the whole point: `employee` carries an
 * EMPTY permission bundle, so an employee who has not been granted the key is
 * DENIED here. `admin` short-circuits to `isAdmin: true` inside
 * `permissionsFor` and is therefore always allowed, unconditionally.
 */
export async function canModerateServer(
  uid: string | null | undefined,
  action: ModerationAction,
): Promise<boolean> {
  return serverCan(uid, MODERATION_PERMISSIONS[action]);
}

// ── RSC layout factory ────────────────────────────────────────────────────────

type GetUser = () => Promise<
  | {
      uid: string;
      /** Legacy scalar. The guard below reads `roles` through a predicate. */
      role: string;
      /** THE role authority — present on anything from `UserRepository`. */
      roles?: readonly string[] | null;
      permissions?: readonly string[] | null;
      /** @deprecated Legacy tester flags; still read during the migration window. */
      isTester?: boolean;
      canTestAdmin?: boolean;
    }
  | null
>;

export interface AdminSectionLayoutOpts {
  getUser: GetUser;
  loginPath?: string;
  unauthorizedPath?: string;
}

/**
 * Factory that returns a Next.js RSC layout component guarding an admin section.
 *
 * Usage in consumer:
 * ```ts
 * // src/app/[locale]/admin/blog/layout.tsx
 * import { makeAdminSectionLayout } from "@mohasinac/appkit/server";
 * import { getServerSessionUser } from "@/lib/firebase/auth-server";
 * export default makeAdminSectionLayout("admin:blog:read", { getUser: getServerSessionUser });
 * ```
 */
export function makeAdminSectionLayout(
  permission: Permission,
  opts: AdminSectionLayoutOpts,
) {
  return async function AdminSectionLayout({
    children,
  }: {
    children: React.ReactNode;
  }): Promise<React.ReactNode> {
    const { redirect } = await import("next/navigation");

    const user = await opts.getUser();
    if (!user) {
      redirect(opts.loginPath ?? String(ROUTES.AUTH.LOGIN));
      return null;
    }

    // Admin role, or a tester cleared for admin surfaces (the `tester` role
    // plus `tester:admin-surfaces`, or the legacy isTester/canTestAdmin pair),
    // passes without a permission check.
    if (isEffectiveAdminUser(user)) return children;

    /*
     * Non-employee non-admin roles have no business in /admin.
     *
     * 🛑 `isEmployeeUser` (set membership + the moderator fold), not
     * `user.role !== "employee"`. The scalar form refused an employee who also
     * held `seller` — `mapDoc` resolves such an account's scalar to the
     * highest rank, which is `employee`, but a stored document written before
     * the normalisation could say either — and it refused a stored
     * `moderator` outright, who under A9 IS an employee. Both were a redirect
     * to /unauthorized for someone entitled to the page.
     */
    if (!isEmployeeUser(user)) {
      redirect(opts.unauthorizedPath ?? String(ROUTES.ERRORS.UNAUTHORIZED));
      return null;
    }

    const resolved = await getServerPermissions(user.uid);
    if (!checkPermission(resolved, permission)) {
      redirect(opts.unauthorizedPath ?? String(ROUTES.ERRORS.UNAUTHORIZED));
      return null;
    }

    return children;
  };
}
