import { useCallback, useMemo } from "react";
import { AuthenticationError, AuthorizationError } from "../../../errors";
import { hasRole as checkRoleHierarchy } from "../auth-helpers";
import type { UserRole } from "../types";
import { useCurrentUser } from "./useAuth";

export function useHasRole(role: UserRole | UserRole[]): boolean {
  const { user } = useCurrentUser();
  if (!user?.role) return false;

  const roles = Array.isArray(role) ? role : [role];
  return roles.some((requiredRole) =>
    checkRoleHierarchy(user.role as UserRole, requiredRole),
  );
}

export function useIsAdmin(): boolean {
  return useHasRole("admin");
}

export function useIsModerator(): boolean {
  return useHasRole(["moderator", "admin"]);
}

export function useIsSeller(): boolean {
  return useHasRole(["seller", "moderator", "admin"]);
}

export function useCanAccess(
  path: string,
  options?: {
    checkAccess?: (
      user: { role?: string; emailVerified?: boolean } | null,
      path: string,
    ) => {
      allowed: boolean;
      reason?: string;
      redirectTo?: string;
    };
  },
): { allowed: boolean; reason?: string; redirectTo?: string } {
  const { user } = useCurrentUser();

  if (options?.checkAccess) {
    return options.checkAccess(
      user
        ? {
            role: user.role,
            emailVerified: user.isEmailVerified,
          }
        : null,
      path,
    );
  }

  return { allowed: true };
}

export function useRoleChecks() {
  const { user } = useCurrentUser();

  const hasRole = useCallback(
    (role: UserRole | UserRole[]) => {
      if (!user?.role) return false;
      const roles = Array.isArray(role) ? role : [role];
      return roles.some((requiredRole) =>
        checkRoleHierarchy(user.role as UserRole, requiredRole),
      );
    },
    [user?.role],
  );

  return useMemo(
    () => ({
      isAuthenticated: !!user,
      isAdmin: hasRole("admin"),
      isModerator: hasRole(["moderator", "admin"]),
      isSeller: hasRole(["seller", "moderator", "admin"]),
      isUser: !!user && (user.role ?? "user") === "user",
      role: user?.role ?? null,
      hasRole,
    }),
    [user, hasRole],
  );
}

export function useIsOwner(
  resourceOwnerId: string | null | undefined,
): boolean {
  const { user } = useCurrentUser();
  if (!user || !resourceOwnerId) return false;
  if (useHasRole("admin")) return true;
  return user.id === resourceOwnerId;
}

export function useRequireAuth(): {
  user: NonNullable<ReturnType<typeof useCurrentUser>["user"]>;
  loading: boolean;
} {
  const { user, isLoading } = useCurrentUser();

  if (!isLoading && !user) {
    throw new AuthenticationError("Authentication required");
  }

  return {
    user: user!,
    loading: isLoading,
  };
}

export function useRequireRole(role: UserRole | UserRole[]): {
  user: NonNullable<ReturnType<typeof useCurrentUser>["user"]>;
  loading: boolean;
} {
  const { user, loading } = useRequireAuth();

  if (!loading && user) {
    const roles = Array.isArray(role) ? role : [role];
    const userRole = (user.role as UserRole) || "user";

    if (
      !roles.some((requiredRole) => checkRoleHierarchy(userRole, requiredRole))
    ) {
      throw new AuthorizationError("Insufficient permissions");
    }
  }

  return { user, loading };
}
