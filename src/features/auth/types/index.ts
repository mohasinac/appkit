/**
 * `tester` sits at the SAME level as `seller` (see ROLE_HIERARCHY in
 * security/authorization.ts) because a QA tester owns a real store and must
 * pass every seller gate — the Tester QA Program depends on it.
 *
 * It replaces the `isTester` boolean. The companion `canTestAdmin` boolean
 * became the `tester:admin-surfaces` permission rather than a second role,
 * because this hierarchy is LINEAR: there is no level that means
 * "seller-level, plus read admin" without also meaning admin.
 *
 * Both booleans are still read during the migration window — see
 * `isTesterUser` / `canTestAdminSurfaces` in ./role-predicates.
 */
export type UserRole =
  | "user"
  | "seller"
  | "tester"
  /**
   * @deprecated COLLAPSED INTO `employee` (A9, owner 2026-11-07 — they are the
   * same thing; moderation became an employee permission).
   *
   * 🛑 Never assign this to a new user. It stays in the union only because
   * stored documents written before the fold still carry it, and removing a
   * member would make every such document fail validation on its next write.
   * `rolesOf()` folds it to `employee` on read, so a normalised role set never
   * contains it; `scripts/backfill-user-roles.mjs` removes it from storage.
   */
  | "moderator"
  | "employee"
  | "admin";

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  /**
   * Legacy scalar — the HIGHEST-RANKED role held. 🛑 Not an authorization
   * input on its own; see `roles`.
   */
  role?: UserRole;
  /**
   * THE role authority — every role this account holds. Read through
   * `rolesOf(user)` so the `moderator` fold and the scalar fallback apply.
   */
  roles?: UserRole[];
  /** 🛑 DISPLAY ONLY. Never gates anything — see `primaryRoleOf`. */
  primaryRole?: UserRole;
  isEmailVerified?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
