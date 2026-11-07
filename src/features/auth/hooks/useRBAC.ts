"use client"
import { useCallback, useMemo } from "react";
import { AuthenticationError, AuthorizationError } from "../../../errors";
import { hasRole as checkRoleHierarchy, primaryRoleOf } from "../auth-helpers";
import { holdsRole, rolesOf } from "../role-predicates";
import type { UserRole } from "../types";
import { useCurrentUser } from "./useAuth";

/**
 * Does the current user satisfy `role` (or any of them)?
 *
 * 🛑 Reads the role SET (1.44). Was `checkRoleHierarchy(user.role, required)`
 * on a single scalar, so `useIsSeller()` returned false for a seller who also
 * held `employee` — the client hid store controls the server would have
 * allowed, which reads as a broken page rather than a permission decision.
 *
 * `hasRole` is hierarchy-aware across the whole set, so an admin satisfies
 * every role. The `!user` guard replaced `!user?.role`: `role` is optional on
 * some client payloads while `roles` is populated, and the old guard refused
 * those outright.
 */
export function useHasRole(role: UserRole | UserRole[]): boolean {
  const { user } = useCurrentUser();
  if (!user) return false;
  const roles = Array.isArray(role) ? role : [role];
  return roles.some((requiredRole) => checkRoleHierarchy(user, requiredRole));
}

export function useIsAdmin(): boolean {
  return useHasRole("admin");
}

/**
 * @deprecated `moderator` folds into `employee` (A9) — this is
 * `useHasRole(["employee", "admin"])`. Kept as a named alias so call sites
 * reading "is this a moderator" still compile and still mean the same thing.
 */
export function useIsModerator(): boolean {
  return useHasRole(["employee", "admin"]);
}

export function useIsSeller(): boolean {
  // `moderator` → `employee`; the hierarchy means admin satisfies it anyway.
  return useHasRole(["seller", "employee", "admin"]);
}

export function useCanAccess(
  path: string,
  options?: {
    checkAccess?: (
      /**
       * `roles` is the authority a consumer's own gate should read; `role`
       * stays for the ones not yet converted. Widened with 1.44 — the old
       * shape could only hand over the scalar, so a consumer-supplied
       * `checkAccess` had no way to see a multi-role user's full set.
       */
      user: {
        role?: string;
        roles?: readonly string[];
        emailVerified?: boolean;
      } | null,
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
            /*
             * The SET, resolved through `rolesOf` so the fold and the scalar
             * fallback both apply. `AuthUser` (the client auth type) carries
             * only `role`, hence the cast at the read.
             */
            roles: rolesOf(user),
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

  // Same set-aware body as `useHasRole`; see its comment.
  const hasRole = useCallback(
    (role: UserRole | UserRole[]) => {
      if (!user) return false;
      const roles = Array.isArray(role) ? role : [role];
      return roles.some((requiredRole) => checkRoleHierarchy(user, requiredRole));
    },
    [user],
  );

  return useMemo(
    () => ({
      isAuthenticated: !!user,
      isAdmin: hasRole("admin"),
      isModerator: hasRole(["employee", "admin"]),
      isSeller: hasRole(["seller", "employee", "admin"]),
      /*
       * `isUser` means "holds the buyer role", read off the SET. The old
       * `(user.role ?? "user") === "user"` was false for a seller who is also
       * a buyer — under a role set those are no longer mutually exclusive.
       */
      isUser: !!user && holdsRole(user, "user"),
      /** Display label. `roles` below is what a gate must read. */
      role: user ? primaryRoleOf(user) : null,
      roles: user ? rolesOf(user) : [],
      hasRole,
    }),
    [user, hasRole],
  );
}

export function useIsOwner(
  resourceOwnerId: string | null | undefined,
): boolean {
  const { user } = useCurrentUser();
  // useHasRole must run unconditionally on every render — it was previously
  // called after the early return below, which skips the hook call whenever
  // !user || !resourceOwnerId, violating the Rules of Hooks (call-count
  // mismatch risk when that condition flips between renders).
  const isAdmin = useHasRole("admin");
  if (!user || !resourceOwnerId) return false;
  if (isAdmin) return true;
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
