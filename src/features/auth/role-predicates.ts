import type { UserRole } from "./types";

/**
 * Canonical user-role predicates — mirror of the listing-type accessors in
 * `features/products/utils/listing-type.ts`. Read the canonical role
 * discriminator off any object that carries a string `role` field and return
 * a boolean. Undefined or null input falls back to `"user"` so legacy payloads
 * classify safely without a separate guard.
 *
 * Input shape is `{ role?: string }` rather than `{ role?: UserRole }` so the
 * predicates compose with `RouteUser`, `UserDocument`, and the various
 * `AuthUser`-shaped objects without each callsite having to cast.
 */

type RoleCarrier = { role?: string | null } | null | undefined;

function normalizeRole(input: RoleCarrier): UserRole {
  return (input?.role ?? "user") as UserRole;
}

export const isAdminUser = (input: RoleCarrier): boolean =>
  normalizeRole(input) === "admin";

export const isSellerUser = (input: RoleCarrier): boolean =>
  normalizeRole(input) === "seller";

export const isModeratorUser = (input: RoleCarrier): boolean =>
  normalizeRole(input) === "moderator";

export const isEmployeeUser = (input: RoleCarrier): boolean =>
  normalizeRole(input) === "employee";

export const isBuyerUser = (input: RoleCarrier): boolean =>
  normalizeRole(input) === "user";
