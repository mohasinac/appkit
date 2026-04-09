/**
 * feat-auth — API route handlers
 *
 * GET /api/auth/me  — return the currently authenticated user's profile.
 *
 * Consumer project wires this as a 2-line stub:
 *   export { authMeGET as GET } from "@mohasinac/feat-auth";
 */

import { NextResponse } from "next/server.js";
import { createRouteHandler } from "@mohasinac/next";
import { getProviders } from "@mohasinac/contracts";
import type { AuthUser as ContractsAuthUser } from "@mohasinac/contracts";
import type { AuthUser, UserRole } from "../types/index.js";

// ─── Transform ────────────────────────────────────────────────────────────────

function toClientUser(u: ContractsAuthUser): AuthUser {
  return {
    id: u.uid,
    email: u.email ?? undefined,
    displayName: u.displayName ?? undefined,
    photoURL: u.photoURL ?? undefined,
    role: u.role as UserRole,
    isEmailVerified: u.emailVerified,
  };
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

/**
 * Return the currently authenticated user's profile.
 * Reads the `__session` HTTP-only cookie → verifies via ISessionProvider →
 * fetches full profile via IAuthProvider.
 *
 * @example (letitrip.in stub)
 * ```ts
 * // src/app/api/auth/me/route.ts
 * export { authMeGET as GET } from "@mohasinac/feat-auth";
 * ```
 */
export const authMeGET = createRouteHandler({
  auth: true,
  handler: async ({ user }): Promise<NextResponse> => {
    const { auth } = getProviders();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Auth provider not configured" },
        { status: 503 },
      );
    }

    const profile = await auth.getUser(user!.uid);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: toClientUser(profile) });
  },
});
