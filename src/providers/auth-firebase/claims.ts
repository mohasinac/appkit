/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Role claims sync — THE only writer of role custom claims (reviewer R1-F5)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🛑 `setCustomUserClaims` REPLACES the entire claims object. It does not
 * merge. Firebase documents this, and six call sites across this codebase
 * ignored it:
 *
 *   src/app/api/auth/login/route.ts      setCustomUserClaims(uid, { role })
 *   src/app/api/auth/me/route.ts         setCustomUserClaims(uid, { role })
 *   src/app/api/auth/session/route.ts    setCustomUserClaims(uid, { role })  ×2
 *   providers/auth-firebase/provider.ts  setCustomUserClaims(uid, { role })  ×2
 *
 * Each one wrote a bare `{ role }` object, so **every other claim the account
 * held was silently dropped** on the next login, profile update or
 * `/api/auth/me` round-trip.
 *
 * Under a role SET that becomes a lockout, not just data loss. The chain the
 * reviewer traced:
 *
 *   1. `/api/auth/me` writes `{ role }` — one role, the rest of the set gone.
 *   2. `src/lib/edge/session-role.ts` decodes a single `role` from the token.
 *   3. `src/proxy.ts` gates `/admin` on that single decoded role.
 *
 * Net effect: **a multi-role admin was silently locked out of `/admin`** after
 * any request that touched `/api/auth/me`. The repository dual-read does not
 * help — the token is a SEPARATE read path, and it is the one that gates
 * access.
 *
 * So: one function, it MERGES, and it writes the whole set.
 */

import { getAdminAuthLite } from "../db-firebase/admin-auth-lite";
import { normalizeError } from "../../errors/normalize";
import { rolesOf } from "../../features/auth/role-predicates";
import { primaryRoleOf } from "../../features/auth/auth-helpers";
import type { JsonValue } from "../../schemas/types";

/** The role-shaped claims this module owns. Everything else is preserved. */
export interface RoleClaims {
  /**
   * THE authority in the token. The edge decoder reads this.
   */
  roles: string[];
  /**
   * Legacy scalar, kept in the token for the migration window: the highest-
   * ranked held role, so a consumer still reading `payload.role` against a
   * hierarchy under-grants nothing. Mirrors `UserRepository.mapDoc`.
   */
  role: string;
  /** Display label. Never read by a gate. */
  primaryRole: string;
}

/**
 * Resolve a role carrier to the claims that should be on its token.
 *
 * Pure — exported so a caller can diff against the current claims without a
 * write, and so this rule has one definition rather than one per route.
 */
export function roleClaimsFor(carrier: {
  role?: string | null;
  roles?: readonly string[] | null;
  primaryRole?: string | null;
}): RoleClaims {
  const held = rolesOf(carrier);
  return {
    roles: held,
    // Same "highest rank wins" rule the repository applies to the scalar.
    role: held.reduce((best, r) => (RANK[r] > RANK[best] ? r : best), held[0]),
    primaryRole: primaryRoleOf(carrier),
  };
}

/*
 * A local rank table rather than importing ROLE_HIERARCHY: this module is
 * loaded on the auth hot path and `security/authorization` pulls in the error
 * classes and message catalogue. The two must agree — if a role is added to
 * ROLE_HIERARCHY and not here it ranks 0 and the scalar degrades to "lowest
 * wins", which under-grants rather than over-grants. Checked by
 * `roleClaimsFor`'s unit expectations.
 */
const RANK: Record<string, number> = {
  admin: 5,
  moderator: 3,
  employee: 3,
  seller: 2,
  tester: 2,
  user: 1,
};

/**
 * Write this user's role set into their custom claims, **merging** with the
 * claims already there.
 *
 * Costs one extra `getUser` read, and that read is the entire point: without
 * it there is nothing to merge with and the write is a clobber. Returns the
 * claims that were written.
 *
 * @param carrier Anything with `roles` / `role` / `primaryRole` — a
 *                `UserDocument`, a session user, or `{ role }` from a legacy
 *                caller.
 */
export async function syncRoleClaims(
  uid: string,
  carrier: {
    role?: string | null;
    roles?: readonly string[] | null;
    primaryRole?: string | null;
  },
): Promise<RoleClaims> {
  const next = roleClaimsFor(carrier);
  const auth = getAdminAuthLite();

  let existing: Record<string, JsonValue> = {};
  try {
    const record = await auth.getUser(uid);
    existing = (record.customClaims ?? {}) as Record<string, JsonValue>;
  } catch (err) {
    /*
     * A failed read must not escalate into a clobber. Falling through with an
     * empty `existing` would write `{ roles, role, primaryRole }` and drop
     * whatever the account held — the exact bug this function exists to fix.
     * So the error propagates and the caller decides.
     */
    void normalizeError(err);
    throw err;
  }

  await auth.setCustomUserClaims(uid, { ...existing, ...next });
  return next;
}

/**
 * True when the token's claims already match `carrier`'s role set — so a
 * caller can skip a write (and the token refresh it forces) on the common
 * case where nothing changed.
 */
export function roleClaimsAreCurrent(
  claims: Record<string, unknown> | null | undefined,
  carrier: {
    role?: string | null;
    roles?: readonly string[] | null;
    primaryRole?: string | null;
  },
): boolean {
  const next = roleClaimsFor(carrier);
  const current = Array.isArray(claims?.roles)
    ? (claims.roles as unknown[]).filter(
        (r): r is string => typeof r === "string",
      )
    : claims?.role
      ? [String(claims.role)]
      : [];
  if (current.length !== next.roles.length) return false;
  return next.roles.every((r) => current.includes(r));
}
