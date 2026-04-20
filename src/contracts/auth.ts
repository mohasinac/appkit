// --- Auth Shared Types --------------------------------------------------------

export interface AuthPayload {
  uid: string;
  email: string | null;
  /** Application-level role string, e.g. "admin" | "seller" | "user" */
  role: string;
  emailVerified: boolean;
  /** Display name from the auth provider (Google "name" claim) */
  name?: string | null;
  /** Photo URL from the auth provider (Google "picture" claim) */
  picture?: string | null;
  /** Phone number from the auth provider */
  phoneNumber?: string | null;
  /** Any extra custom claims stored on the token */
  claims?: Record<string, unknown>;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: string; // ISO-8601
}

export interface CreateUserInput {
  email: string;
  password?: string;
  displayName?: string;
  photoURL?: string;
  role?: string;
  emailVerified?: boolean;
}

// --- Auth Interfaces ----------------------------------------------------------

/**
 * Server-side authentication operations.
 * Implemented by @mohasinac/auth-firebase, @mohasinac/auth-nextauth, @mohasinac/auth-clerk.
 */
export interface IAuthProvider {
  verifyToken(token: string): Promise<AuthPayload>;
  createCustomToken(
    uid: string,
    claims?: Record<string, unknown>,
  ): Promise<string>;
  getUser(uid: string): Promise<AuthUser | null>;
  createUser(data: CreateUserInput): Promise<AuthUser>;
  updateUser(uid: string, data: Partial<CreateUserInput>): Promise<AuthUser>;
  deleteUser(uid: string): Promise<void>;
  revokeTokens(uid: string): Promise<void>;
}

/**
 * Session cookie management (HTTP-only, server-side).
 * Implemented alongside IAuthProvider by the same auth package.
 */
export interface ISessionProvider {
  /** Creates a session cookie value from a verified auth payload. */
  createSession(payload: AuthPayload): Promise<string>;
  /** Verifies a session cookie and returns the auth payload. */
  verifySession(cookie: string): Promise<AuthPayload>;
  /** Invalidates a session cookie. */
  destroySession(cookie: string): Promise<void>;
}
