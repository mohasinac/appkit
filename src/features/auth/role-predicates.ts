import type { UserRole } from "./types";

/**
 * Canonical user-role predicates — mirror of the listing-type accessors in
 * `features/products/utils/listing-type.ts`. Read the canonical role
 * discriminator off an `AuthUser`/`UserDocument`-shaped object and return a
 * boolean. Undefined input falls back to `"user"` so legacy payloads classify
 * safely without a separate guard. SB-UNI-E 2026-05-13.
 */

function normalizeRole(input?: { role?: UserRole }): UserRole {
  return input?.role ?? "user";
}

export const isAdminUser = (input?: { role?: UserRole }): boolean =>
  normalizeRole(input) === "admin";

export const isSellerUser = (input?: { role?: UserRole }): boolean =>
  normalizeRole(input) === "seller";

export const isModeratorUser = (input?: { role?: UserRole }): boolean =>
  normalizeRole(input) === "moderator";

export const isEmployeeUser = (input?: { role?: UserRole }): boolean =>
  normalizeRole(input) === "employee";

export const isBuyerUser = (input?: { role?: UserRole }): boolean =>
  normalizeRole(input) === "user";
