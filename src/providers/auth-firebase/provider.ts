/**
 * firebaseAuthProvider — IAuthProvider
 *
 * Implements `@mohasinac/contracts` `IAuthProvider` using the Firebase Admin SDK.
 * Server-side only.  Never import this in browser/client-component code.
 */

import type {
  IAuthProvider,
  AuthPayload,
  AuthUser,
  CreateUserInput,
} from "../../contracts";
import { getAdminAuthLite } from "../db-firebase/admin-auth-lite";

/** Firebase error codes that represent a normal "not authenticated" state. */
const EXPECTED_AUTH_CODES = new Set([
  "auth/argument-error",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/session-cookie-expired",
  "auth/session-cookie-revoked",
  "auth/user-disabled",
  "auth/user-not-found",
]);

function isExpectedAuthError(err: unknown): boolean {
  return EXPECTED_AUTH_CODES.has((err as { code?: string }).code ?? "");
}

function toAuthPayload(decoded: {
  uid: string;
  email?: string | null;
  role?: string;
  email_verified?: boolean;
  [k: string]: unknown;
}): AuthPayload {
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    role: (decoded.role as string | undefined) ?? "user",
    emailVerified: decoded.email_verified ?? false,
    claims: Object.fromEntries(
      Object.entries(decoded).filter(
        ([k]) =>
          ![
            "uid",
            "email",
            "email_verified",
            "iat",
            "exp",
            "aud",
            "iss",
            "sub",
            "auth_time",
            "firebase",
          ].includes(k),
      ),
    ),
  };
}

function toAuthUser(record: {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  disabled: boolean;
  metadata: { creationTime?: string };
  customClaims?: Record<string, unknown>;
}): AuthUser {
  return {
    uid: record.uid,
    email: record.email ?? null,
    displayName: record.displayName ?? null,
    photoURL: record.photoURL ?? null,
    role: (record.customClaims?.["role"] as string | undefined) ?? "user",
    emailVerified: record.emailVerified,
    disabled: record.disabled,
    createdAt: record.metadata.creationTime ?? new Date(0).toISOString(),
  };
}

export const firebaseAuthProvider: IAuthProvider = {
  async verifyToken(token: string): Promise<AuthPayload> {
    try {
      const decoded = await getAdminAuthLite().verifyIdToken(token);
      return toAuthPayload(decoded);
    } catch (err) {
      if (!isExpectedAuthError(err)) {
        console.error(
          "[@mohasinac/auth-firebase] Token verification failed:",
          err,
        );
      }
      throw err;
    }
  },

  async createCustomToken(
    uid: string,
    claims?: Record<string, unknown>,
  ): Promise<string> {
    return getAdminAuthLite().createCustomToken(uid, claims);
  },

  async getUser(uid: string): Promise<AuthUser | null> {
    try {
      const record = await getAdminAuthLite().getUser(uid);
      return toAuthUser(record);
    } catch (err) {
      if ((err as { code?: string }).code === "auth/user-not-found")
        return null;
      throw err;
    }
  },

  async createUser(data: CreateUserInput): Promise<AuthUser> {
    const record = await getAdminAuthLite().createUser({
      email: data.email,
      password: data.password,
      displayName: data.displayName,
      photoURL: data.photoURL,
      emailVerified: data.emailVerified ?? false,
    });
    if (data.role) {
      await getAdminAuthLite().setCustomUserClaims(record.uid, {
        role: data.role,
      });
      // Re-fetch to get updated claims
      const updated = await getAdminAuthLite().getUser(record.uid);
      return toAuthUser(updated);
    }
    return toAuthUser(record);
  },

  async updateUser(
    uid: string,
    data: Partial<CreateUserInput>,
  ): Promise<AuthUser> {
    const record = await getAdminAuthLite().updateUser(uid, {
      email: data.email,
      password: data.password,
      displayName: data.displayName,
      photoURL: data.photoURL,
      emailVerified: data.emailVerified,
    });
    if (data.role !== undefined) {
      await getAdminAuthLite().setCustomUserClaims(uid, { role: data.role });
    }
    const updated = await getAdminAuthLite().getUser(record.uid);
    return toAuthUser(updated);
  },

  async deleteUser(uid: string): Promise<void> {
    await getAdminAuthLite().deleteUser(uid);
  },

  async revokeTokens(uid: string): Promise<void> {
    await getAdminAuthLite().revokeRefreshTokens(uid);
  },
};
