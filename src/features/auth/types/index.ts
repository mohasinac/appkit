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
  | "moderator"
  | "employee"
  | "admin";

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  role?: UserRole;
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
