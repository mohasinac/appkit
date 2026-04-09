export type UserRole = "user" | "seller" | "moderator" | "admin";

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
