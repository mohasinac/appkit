import { createApiHandlerFactory } from "../next";
import { applyRateLimit } from "../security";
import {
  AuthenticationError,
  AuthorizationError,
  ERROR_MESSAGES,
  handleApiError,
} from "../errors";
import type { AuthPayload } from "../contracts";
import { errorResponse } from "../next";
import { serverLogger } from "../monitoring";
import { getProviders } from "../contracts";
import type { UserDocument } from "../features/auth/schemas/firestore";
import type { UserRole } from "../features/auth/types";

interface SafeParseSchema<TInput> {
  safeParse: (
    // audit-unknown-ok: callback entry point — accepts arbitrary payload value
    input: unknown,
  ) =>
    | { success: true; data: TInput }
    // audit-unknown-ok: Zod safeParse boundary
    | { success: false; error: { issues?: unknown[] } };
}

export interface ApiHandlerRateLimitConfig {
  limit: number;
  window: number;
}

export interface ApiHandlerOptions<
  TInput = unknown,
  TParams extends Record<string, string> = Record<string, string>,
> {
  auth?: boolean;
  roles?: UserRole[];
  rateLimit?: ApiHandlerRateLimitConfig;
  schema?: SafeParseSchema<TInput>;
  handler: (ctx: {
    request: Request;
    user?: UserDocument;
    body?: TInput;
    params?: TParams;
  }) => Promise<Response>;
}

function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const result = new Map<string, string>();
  if (!cookieHeader) return result;

  for (const segment of cookieHeader.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const equalsIdx = trimmed.indexOf("=");
    if (equalsIdx === -1) continue;

    const key = trimmed.slice(0, equalsIdx).trim();
    const value = trimmed.slice(equalsIdx + 1).trim();
    if (!key) continue;

    try {
      result.set(key, decodeURIComponent(value));
    } catch {
      result.set(key, value);
    }
  }

  return result;
}

async function getUserFromRequest(
  request: Request,
): Promise<UserDocument | null> {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const sessionCookie = cookies.get("__session");
  if (!sessionCookie) return null;

  const providers = getProviders();
  let decoded: AuthPayload;
  try {
    decoded = await providers.session.verifySession(sessionCookie);
  } catch {
    throw new AuthenticationError(ERROR_MESSAGES.USER.NOT_AUTHENTICATED);
  }

  const db = providers.db;
  if (!db) {
    throw new Error("Database provider is not registered");
  }

  const userRepo = db.getRepository<UserDocument>("users");
  const userDoc = await userRepo.findById(decoded.uid);
  if (!userDoc) return null;

  // Firestore is the authoritative source for role. Session cookie claims are
  // created from the ID token at login time, which predates the setCustomUserClaims
  // call in the session route — so claims can carry a stale role (e.g. "user"
  // instead of "admin"). Always use the Firestore value.
  return userDoc;
}

async function requireAuthFromRequest(request: Request): Promise<UserDocument> {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new AuthenticationError(ERROR_MESSAGES.USER.NOT_AUTHENTICATED);
  }
  if (user.disabled) {
    throw new AuthenticationError(ERROR_MESSAGES.AUTH.ACCOUNT_DISABLED);
  }
  return user;
}

async function requireRoleFromRequest(
  request: Request,
  roles: UserRole[],
): Promise<UserDocument> {
  const user = await requireAuthFromRequest(request);
  if (!roles.includes(user.role as UserRole)) {
    throw new AuthorizationError(ERROR_MESSAGES.AUTH.FORBIDDEN);
  }
  return user;
}

const sharedCreateApiHandler = createApiHandlerFactory<
  UserRole,
  ApiHandlerRateLimitConfig,
  UserDocument
>({
  applyRateLimit,
  requireAuthFromRequest,
  requireRoleFromRequest,
  errorResponse,
  handleApiError,
  getRateLimitExceededMessage: () => ERROR_MESSAGES.GENERIC.RATE_LIMIT_EXCEEDED,
  logTiming: ({ method, path, status, durationMs, error }) => {
    if (error) {
      serverLogger.error("api.timing", {
        method,
        path,
        durationMs,
        error,
      });
      return;
    }

    serverLogger.info("api.timing", {
      method,
      path,
      status,
      durationMs,
    });
  },
});

export function createApiHandler<
  TInput = unknown,
  TParams extends Record<string, string> = Record<string, string>,
>(options: ApiHandlerOptions<TInput, TParams>) {
  return sharedCreateApiHandler<TInput, TParams>(options);
}
