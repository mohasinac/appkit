import { createApiHandlerFactory } from "../next";
import { applyRateLimit } from "../security";
import {
  AuthenticationError,
  AuthorizationError,
  ERROR_MESSAGES,
  handleApiError,
} from "../errors";
import { errorResponse } from "../next";
import { serverLogger } from "../monitoring";
import { getProviders } from "../contracts";
import type { UserDocument } from "../features/auth/schemas/firestore";
import type { UserRole } from "../features/auth/types";

interface SafeParseSchema<TInput> {
  safeParse: (
    input: unknown,
  ) =>
    | { success: true; data: TInput }
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
  const decoded = await providers.session.verifySession(sessionCookie);

  const db = providers.db;
  if (!db) {
    throw new Error("Database provider is not registered");
  }

  const userRepo = db.getRepository<UserDocument>("users");
  return userRepo.findById(decoded.uid);
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
