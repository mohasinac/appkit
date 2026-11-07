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
import { permissionsFor } from "../../../../features/auth/auth-helpers";
import type { ResolvedPermissions } from "../../../../features/auth/auth-helpers";

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
