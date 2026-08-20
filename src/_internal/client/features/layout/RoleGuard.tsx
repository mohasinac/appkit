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
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const { user, loading, refreshUser } = useSession();
  const router = useRouter();

  // SessionContext only refreshes role/disabled periodically (every 5
  // minutes) or on a hard reload/re-login — never on ordinary client-side
  // navigation. A user just approved as a seller, or just un-banned, would
  // otherwise keep getting redirected to /unauthorized by this exact guard
  // for up to 5 minutes even though the same check against live Firestore
  // data would already pass. Force one fresh check per mount (i.e. once per
  // navigation into a role-gated layout, since Next.js layouts persist
  // across sibling route changes) before trusting a denial.
  const hasRefreshedRef = useRef(false);
  const [verifying, setVerifying] = useState(true);
  useEffect(() => {
    if (loading || hasRefreshedRef.current) return;
    hasRefreshedRef.current = true;
    if (!user) {
      setVerifying(false);
      return;
    }
    refreshUser().finally(() => setVerifying(false));
  }, [loading, user, refreshUser]);

  return (
    <ProtectedRoute
      user={user as AuthGuardUser | null}
      loading={loading || verifying}
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
