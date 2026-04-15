import type { UserRole } from "./types";
import { getTokenTimeRemaining, isTokenExpired } from "./token-helpers";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  seller: 1,
  moderator: 2,
  admin: 3,
};

export interface DefaultRoleOptions {
  adminEmails?: string[];
  adminRole?: UserRole;
  fallbackRole?: UserRole;
}

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function hasAnyRole(
  userRole: UserRole,
  requiredRoles: UserRole[],
): boolean {
  return requiredRoles.some((role) => hasRole(userRole, role));
}

export function getDefaultRole(
  email?: string,
  options?: DefaultRoleOptions,
): UserRole {
  const fallbackRole = options?.fallbackRole ?? "user";
  const adminRole = options?.adminRole ?? "admin";
  const adminEmails = options?.adminEmails ?? [];

  if (email && adminEmails.includes(email)) {
    return adminRole;
  }

  return fallbackRole;
}

export function formatAuthProvider(provider: string): string {
  const providerNames: Record<string, string> = {
    password: "Email/Password",
    "google.com": "Google",
    "apple.com": "Apple",
    phone: "Phone",
  };

  return providerNames[provider] || provider;
}

export function isSessionExpired(expiresAt: Date | string): boolean {
  return isTokenExpired(expiresAt);
}

export function getSessionTimeRemaining(expiresAt: Date | string): number {
  return getTokenTimeRemaining(expiresAt);
}

export function generateInitials(
  displayName?: string | null,
  email?: string | null,
): string {
  if (displayName) {
    const parts = displayName.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    return displayName.substring(0, 2).toUpperCase();
  }

  if (email) {
    return email.substring(0, 2).toUpperCase();
  }

  return "U";
}

export function calculatePasswordScore(password: string): number {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  if (/(.)\1{2,}/.test(password)) score = Math.max(0, score - 1);
  if (/^(?:password|123456|qwerty)/i.test(password)) score = 0;

  return Math.min(4, Math.max(0, score));
}
