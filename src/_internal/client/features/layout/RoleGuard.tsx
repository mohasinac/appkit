"use client";

/**
 * RoleGuard — preset wrapper over ProtectedRoute.
 *
 * Collapses the boilerplate that every dashboard layout repeats:
 *   - reading `useSession()`
 *   - resolving `onNavigate` against the i18n router
 *   - passing default `routes.loginPath` / `routes.unauthorizedPath`
 *
 * Consumers supply only the `role` (or none, for auth-only) plus optional
 * route overrides. Everything else defaults to appkit's ROUTES.
 */

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ProtectedRoute, type AuthGuardUser } from "../../../../features/auth/components/Guards";
import { useSession } from "../../../../react/contexts/SessionContext";
import { ROUTES } from "../../../../next/routing/route-map";
import type { LayoutRole } from "../../../shared/features/layout/types";

export interface RoleGuardProps {
  /** Single role or array. Omit for auth-only (any signed-in user). */
  role?: LayoutRole | LayoutRole[];
  /** When true, unauthenticated users are redirected (default true). */
  requireAuth?: boolean;
  /** Optional route overrides (defaults come from appkit ROUTES). */
  loginPath?: string;
  unauthorizedPath?: string;
  /** Render while loading the session. */
  loadingComponent?: ReactNode;
  children: ReactNode;
}

export function RoleGuard({
  role,
  requireAuth = true,
  loginPath,
  unauthorizedPath,
  loadingComponent,
  children,
}: RoleGuardProps) {
  const { user, loading } = useSession();
  const router = useRouter();
  return (
    <ProtectedRoute
      user={user as AuthGuardUser | null}
      loading={loading}
      requireAuth={requireAuth}
      requireRole={role}
      onNavigate={(path) => router.push(path)}
      routes={{
        loginPath: loginPath ?? String(ROUTES.AUTH.LOGIN),
        unauthorizedPath: unauthorizedPath ?? String(ROUTES.ERRORS.UNAUTHORIZED),
      }}
      loadingComponent={loadingComponent}
    >
      {children}
    </ProtectedRoute>
  );
}
