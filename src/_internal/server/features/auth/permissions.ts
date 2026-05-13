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

import { userRepository } from "../../../../repositories";
import type { Permission } from "../../../../features/auth/permissions/constants";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ResolvedPermissions {
  /** true when role === "admin" — bypasses all permission checks */
  isAdmin: boolean;
  /** explicit permissions array; only meaningful when role === "employee" */
  permissions: Permission[];
}

// ── Core resolver ─────────────────────────────────────────────────────────────

/**
 * Fetch and resolve permissions for a user.
 * Returns { isAdmin: true } for admins, explicit permissions for employees,
 * empty for all other roles.
 */
export async function getServerPermissions(
  uid: string,
): Promise<ResolvedPermissions> {
  if (!uid) return { isAdmin: false, permissions: [] };

  // userRepository.findById is cached per request in BaseRepository
  const user = await (userRepository.findById(uid) as Promise<{
    role?: string;
    permissions?: string[];
  } | null>);

  if (!user) return { isAdmin: false, permissions: [] };

  if (user.role === "admin") return { isAdmin: true, permissions: [] };

  if (user.role === "employee") {
    return {
      isAdmin: false,
      permissions: (user.permissions ?? []) as Permission[],
    };
  }

  return { isAdmin: false, permissions: [] };
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

type GetUser = () => Promise<{ uid: string; role: string } | null>;

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
      redirect(opts.loginPath ?? "/auth/login");
      return null;
    }

    // admin role passes without a permission check
    if (user.role === "admin") return children;

    // non-employee non-admin roles have no business in /admin
    if (user.role !== "employee") {
      redirect(opts.unauthorizedPath ?? "/unauthorized");
      return null;
    }

    const resolved = await getServerPermissions(user.uid);
    if (!checkPermission(resolved, permission)) {
      redirect(opts.unauthorizedPath ?? "/unauthorized");
      return null;
    }

    return children;
  };
}
