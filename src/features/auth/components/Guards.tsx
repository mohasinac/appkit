"use client"
import React, { useEffect, useMemo } from "react";
import { isAccountDisabled, holdsAnyRole } from "../role-predicates";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Heading, Text } from "../../../ui/components/Typography";
import { Row } from "../../../ui/components/Layout";
import type { UserRole } from "../types";

/**
 * User shape for auth guards and route protection.
 * Consumers can pass a fuller user object; only these fields are used.
 */
export interface AuthGuardUser {
  id?: string;
  /**
   * Legacy scalar — the HIGHEST-RANKED role held. 🛑 Not the authority; see
   * `roles`. Kept because some consumer payloads still carry only this.
   */
  role?: UserRole | string;
  /**
   * THE role authority — every role this account holds. The guards below read
   * it through `holdsAnyRole`, so an account holding two roles clears a gate
   * naming either one.
   */
  roles?: readonly string[] | null;
  disabled?: boolean;
  emailVerified?: boolean;
}

/**
 * Route configuration for authorization redirects.
 * Injected by the consumer to control where unauthorized users are sent.
 */
export interface AuthRouteConfig {
  loginPath?: string;
  unauthorizedPath?: string;
  emailVerifyPath?: string;
  defaultRedirectPath?: string;
}

/**
 * RoleGate — renders children only if user role matches allowed roles.
 * @example
 * ```tsx
 * <RoleGate
 * user={currentUser}
 * allowedRoles="admin"
 * fallback={<div data-section="guards-div-259">Not authorized</div>}
 * >
 * <AdminPanel />
 * </RoleGate>
 * ```
 */
export interface RoleGateProps {
  children: React.ReactNode;
  user?: AuthGuardUser | null;
  allowedRoles: UserRole | UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGate({
  children,
  user,
  allowedRoles,
  fallback = null,
}: RoleGateProps) {
  if (!user) {
    return <>{fallback}</>;
  }

  /*
   * ── Set intersection, not scalar equality (1.44) ─────────────────────────
   *
   * Was `allowed.some((role) => role === user.role)`. `user.role` resolves to
   * the HIGHEST-RANKED held role, so a seller who also holds `employee` failed
   * `allowedRoles="seller"` and silently got the fallback — a gate denying
   * someone who holds the role it names.
   *
   * The `!user?.role` guard became `!user` for the same reason as in
   * `useHasRole`: `roles` can be populated while the scalar is absent, and the
   * old guard refused those outright.
   */
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!holdsAnyRole(user, allowed)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * ProtectedRoute — enforces authentication and authorization with redirect support.
 *
 * Handles:
 * - Authentication (requireAuth)
 * - Role-based access (requireRole)
 * - Email verification (requireEmailVerified)
 * - Account status (requireActiveAccount)
 * - Redirects to injected route config
 *
 * @example
 * ```tsx
 * <ProtectedRoute
 * user={user}
 * loading={isLoading}
 * requireAuth
 * requireRole="admin"
 * onNavigate={(path) => router.push(path)}
 * routes={{ loginPath: "/auth/login", unauthorizedPath: "/errors/403" }}
 * >
 * <AdminDashboard />
 * </ProtectedRoute>
 * ```
 */
export interface ProtectedRouteProps {
  children?: React.ReactNode;
  user?: AuthGuardUser | null;
  loading?: boolean;
  requireAuth?: boolean;
  requireRole?: UserRole | UserRole[];
  requireEmailVerified?: boolean;
  requireActiveAccount?: boolean;
  showUnauthorized?: boolean;
  onNavigate?: (path: string) => void;
  routes?: AuthRouteConfig;
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
  uiLabels?: {
    accessDenied?: string;
    unauthorizedDescription?: string;
    goHome?: string;
  };
}

export function ProtectedRoute({
  children,
  user,
  loading = false,
  requireAuth = true,
  requireRole,
  requireEmailVerified = false,
  requireActiveAccount = true,
  showUnauthorized = false,
  onNavigate,
  routes = {},
  loadingComponent,
  unauthorizedComponent,
  uiLabels = {
    accessDenied: "Access Denied",
    unauthorizedDescription: "You do not have permission to access this page.",
    goHome: "Go Home",
  },
}: ProtectedRouteProps) {
  const {
    loginPath = "/auth/login",
    unauthorizedPath = "/errors/unauthorized",
    emailVerifyPath = "/auth/verify-email",
    defaultRedirectPath = "/",
  } = routes;

  const { isAuthorized, redirectPath } = useMemo(() => {
    // Still loading
    if (loading) return { isAuthorized: null, redirectPath: null };

    // Check authentication
    if (requireAuth && !user) {
      return { isAuthorized: false, redirectPath: loginPath };
    }

    if (!requireAuth && !user) {
      return { isAuthorized: true, redirectPath: null };
    }

    if (user) {
      // Check account status
      if (requireActiveAccount && isAccountDisabled(user)) {
        return { isAuthorized: false, redirectPath: unauthorizedPath };
      }

      // Check email verification
      if (requireEmailVerified && !user.emailVerified) {
        return { isAuthorized: false, redirectPath: emailVerifyPath };
      }

      /*
       * Check role — against the SET (1.44).
       *
       * 🛑 This is the CLIENT mirror of the server gate in
       * `requireRoleFromRequest` / `createRouteHandler`, and the two must
       * agree: `RoleGuard` wraps the /admin, /store and /user dashboard
       * layouts, so a scalar comparison here redirected a seller+employee to
       * /unauthorized off their own store while every API call behind that
       * page would have succeeded. A client gate stricter than the server it
       * fronts reads as a broken page, not as a permission decision.
       *
       * `holdsAnyRole` also folds `moderator` → `employee`, so a layout still
       * written as `role="moderator"` admits the folded employee.
       */
      if (requireRole) {
        const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
        if (!holdsAnyRole(user, roles)) {
          return { isAuthorized: false, redirectPath: unauthorizedPath };
        }
      }

      return { isAuthorized: true, redirectPath: null };
    }

    return { isAuthorized: true, redirectPath: null };
  }, [
    user,
    loading,
    requireAuth,
    requireRole,
    requireEmailVerified,
    requireActiveAccount,
    loginPath,
    emailVerifyPath,
    unauthorizedPath,
  ]);

  // Side-effect: trigger navigation when unauthorized
  useEffect(() => {
    if (
      isAuthorized === false &&
      redirectPath &&
      !showUnauthorized &&
      onNavigate
    ) {
      onNavigate(redirectPath);
    }
  }, [isAuthorized, redirectPath, showUnauthorized, onNavigate]);

  // Loading state
  if (loading || isAuthorized === null) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <Row className="min-h-[40vh]" align="center" justify="center">
        <Div className="h-8 w-8 animate-spin border-2 border-neutral-300 border-t-neutral-800" rounded="full" />
      </Row>
    );
  }

  // Unauthorized — show message or return null if redirecting
  if (isAuthorized === false) {
    if (showUnauthorized) {
      if (unauthorizedComponent) {
        return <>{unauthorizedComponent}</>;
      }
      return (
        <Row className="min-h-[50vh] bg-[var(--appkit-color-surface)]" align="center" justify="center">
          <Div className="text-center">
            <Heading level={1} className="mb-2" size="2xl" weight="bold">
              {uiLabels.accessDenied}
            </Heading>
            <Text className="mb-6" color="muted">
              {uiLabels.unauthorizedDescription}
            </Text>
            <Button
              onClick={() => onNavigate?.(defaultRedirectPath)}
              variant="primary"
            >
              {uiLabels.goHome}
            </Button>
          </Div>
        </Row>
      );
    }
    return null;
  }

  // Authorized
  return <>{children}</>;
}
