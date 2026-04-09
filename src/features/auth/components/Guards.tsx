import React from "react";
import type { UserRole } from "../types";

interface RoleGateProps {
  role: UserRole | UserRole[];
  userRole?: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/** Renders children only if userRole matches one of the required roles. */
export function RoleGate({
  role,
  userRole,
  children,
  fallback = null,
}: RoleGateProps) {
  const allowed = Array.isArray(role) ? role : [role];
  if (!userRole || !allowed.includes(userRole)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  isLoading?: boolean;
  redirectTo?: string;
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  unauthFallback?: React.ReactNode;
}

/** A guard component that shows loading/unauth states until user is confirmed. */
export function ProtectedRoute({
  isAuthenticated,
  isLoading,
  children,
  loadingFallback,
  unauthFallback,
}: ProtectedRouteProps) {
  if (isLoading) {
    return (
      <>
        {loadingFallback ?? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
          </div>
        )}
      </>
    );
  }

  if (!isAuthenticated) {
    return <>{unauthFallback ?? null}</>;
  }

  return <>{children}</>;
}
