"use client"
import React, { useEffect, useMemo } from "react";
import { Div, Heading, Text, Button } from "../../../ui";
import type { UserRole } from "../types";

/**
 * User shape for auth guards and route protection.
 * Consumers can pass a fuller user object; only these fields are used.
 */
export interface AuthGuardUser {
  id?: string;
  role?: UserRole | string;
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
 *   user={currentUser}
 *   allowedRoles="admin"
 *   fallback={<div>Not authorized</div>}
 * >
 *   <AdminPanel />
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
  if (!user?.role) {
    return <>{fallback}</>;
  }

  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!allowed.some((role) => role === user.role)) {
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
 *   user={user}
 *   loading={isLoading}
 *   requireAuth
 *   requireRole="admin"
 *   onNavigate={(path) => router.push(path)}
 *   routes={{ loginPath: "/auth/login", unauthorizedPath: "/errors/403" }}
 * >
 *   <AdminDashboard />
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
      if (requireActiveAccount && user.disabled) {
        return { isAuthorized: false, redirectPath: unauthorizedPath };
      }

      // Check email verification
      if (requireEmailVerified && !user.emailVerified) {
        return { isAuthorized: false, redirectPath: emailVerifyPath };
      }

      // Check role
      if (requireRole) {
        const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
        const userRole = user.role;
        if (!userRole || !roles.some((role) => role === userRole)) {
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
      <Div className="flex min-h-[40vh] items-center justify-center">
        <Div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
      </Div>
    );
  }

  // Unauthorized — show message or return null if redirecting
  if (isAuthorized === false) {
    if (showUnauthorized) {
      if (unauthorizedComponent) {
        return <>{unauthorizedComponent}</>;
      }
      return (
        <Div className="flex min-h-[50vh] items-center justify-center bg-neutral-50 dark:bg-neutral-900">
          <Div className="text-center">
            <Heading level={1} className="mb-2 text-2xl font-bold">
              {uiLabels.accessDenied}
            </Heading>
            <Text className="mb-6 text-neutral-600 dark:text-neutral-400">
              {uiLabels.unauthorizedDescription}
            </Text>
            <Button
              onClick={() => onNavigate?.(defaultRedirectPath)}
              variant="primary"
            >
              {uiLabels.goHome}
            </Button>
          </Div>
        </Div>
      );
    }
    return null;
  }

  // Authorized
  return <>{children}</>;
}
