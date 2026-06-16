import { normalizeError } from "../../errors/normalize";
interface SafeParseSchema<TInput> {
  safeParse: (input: unknown) =>
    | { success: true; data: TInput }
    | { success: false; error: { issues?: unknown[] } };
}

export interface ApiRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface ApiHandlerOptions<
  TInput,
  TParams extends Record<string, string>,
  TRole,
  TRateLimitConfig,
  TUser,
> {
  auth?: boolean;
  roles?: TRole[];
  rateLimit?: TRateLimitConfig;
  schema?: SafeParseSchema<TInput>;
  /**
   * Response cache policy for unauthenticated GET handlers.
   * Use `false` to disable default public cache headers.
   */
  cache?:
    | false
    | {
        maxAge?: number;
        sMaxAge?: number;
        staleWhileRevalidate?: number;
      };
  handler: (ctx: {
    request: Request;
    user?: TUser;
    body?: TInput;
    params?: TParams;
  }) => Promise<Response>;
}

async function validateSchema<TInput>(
  request: Request,
  schema: SafeParseSchema<TInput>,
): Promise<{ validationError: false; data: TInput } | { validationError: true; issues: unknown[] | undefined }> {
  if (typeof (schema as { safeParse?: unknown }).safeParse === "function") {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return { validationError: true, issues: result.error.issues };
    }
    return { validationError: false, data: result.data };
  }
  try {
    const data = (await request.json()) as TInput;
    return { validationError: false, data };
  } catch {
    // audit-unknown-ok: TS structural escape — TInput
    return { validationError: false, data: undefined as unknown as TInput };
  }
}

function buildRateLimitHeaders(result: ApiRateLimitResult): Record<string, string> {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(result.reset),
  };
}

function buildRateLimitExceededResponse(
  message: string,
  headers: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status: 429, headers: { "Content-Type": "application/json", ...headers } },
  );
}

function applyRateLimitHeaders(response: Response, headers: Record<string, string>): void {
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
}

function buildPublicCacheControl(policy?: {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
}): string {
  const maxAge = policy?.maxAge ?? 30;
  const sMaxAge = policy?.sMaxAge ?? 300;
  const staleWhileRevalidate = policy?.staleWhileRevalidate ?? 600;
  return `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
}

export interface ApiHandlerFactoryDeps<TRole, TRateLimitConfig, TUser> {
  applyRateLimit: (
    request: Request,
    config: TRateLimitConfig,
  ) => Promise<ApiRateLimitResult>;
  requireAuthFromRequest: (request: Request) => Promise<TUser>;
  requireRoleFromRequest: (
    request: Request,
    roles: TRole[],
  ) => Promise<TUser>;
  errorResponse: (
    message: string,
    status: number,
    issues?: unknown,
  ) => Response;
  handleApiError: (error: unknown) => Response;
  getRateLimitExceededMessage: () => string;
  logTiming: (entry: {
    method: string;
    path: string;
    status?: number;
    durationMs: number;
    error?: string;
  }) => void;
}

async function applyRateLimitCheck<TRateLimitConfig>(
  request: Request,
  config: TRateLimitConfig,
  applyRateLimit: (request: Request, config: TRateLimitConfig) => Promise<ApiRateLimitResult>,
  getRateLimitExceededMessage: () => string,
): Promise<{ blocked: true; response: Response } | { blocked: false; headers: Record<string, string> }> {
  const result = await applyRateLimit(request, config);
  const headers = buildRateLimitHeaders(result);
  if (!result.success) {
    return { blocked: true, response: buildRateLimitExceededResponse(getRateLimitExceededMessage(), headers) };
  }
  return { blocked: false, headers };
}

async function applySchemaValidation<TInput>(
  request: Request,
  schema: SafeParseSchema<TInput>,
  errorResponse: (message: string, status: number, issues?: unknown) => Response,
): Promise<{ invalid: true; response: Response } | { invalid: false; data: TInput }> {
  const schemaResult = await validateSchema<TInput>(request, schema);
  if (schemaResult.validationError) {
    return { invalid: true, response: errorResponse("Validation failed", 400, schemaResult.issues) };
  }
  return { invalid: false, data: schemaResult.data };
}

export function createApiHandlerFactory<TRole, TRateLimitConfig, TUser>(
  deps: ApiHandlerFactoryDeps<TRole, TRateLimitConfig, TUser>,
) {
  return function createApiHandler<
    TInput = unknown,
    TParams extends Record<string, string> = Record<string, string>,
  >(
    options: ApiHandlerOptions<
      TInput,
      TParams,
      TRole,
      TRateLimitConfig,
      TUser
    >,
  ) {
    return async (
      request: Request,
      context: { params: Promise<TParams> },
    ): Promise<Response> => {
      const startMs = performance.now();
      try {
        let rateLimitHeaders: Record<string, string> | undefined;
        if (options.rateLimit) {
          const rlCheck = await applyRateLimitCheck(
            request,
            options.rateLimit,
            deps.applyRateLimit,
            deps.getRateLimitExceededMessage,
          );
          if (rlCheck.blocked) return rlCheck.response;
          rateLimitHeaders = rlCheck.headers;
        }

        let user: TUser | undefined;
        if (options.roles && options.roles.length > 0) {
          user = await deps.requireRoleFromRequest(request, options.roles);
        } else if (options.auth) {
          user = await deps.requireAuthFromRequest(request);
        }

        let validatedBody: TInput | undefined;
        if (options.schema) {
          const schemaCheck = await applySchemaValidation<TInput>(request, options.schema, deps.errorResponse);
          if (schemaCheck.invalid) return schemaCheck.response;
          validatedBody = schemaCheck.data;
        }

        const resolvedParams = (context as { params?: Promise<TParams> })?.params
          ? await context.params
          : undefined;

        const response = await options.handler({
          request,
          user,
          body: validatedBody,
          params: resolvedParams,
        });

        response.headers.set("Access-Control-Max-Age", "86400");

        if (rateLimitHeaders) {
          applyRateLimitHeaders(response, rateLimitHeaders);
        }

        const hasCredentialHeaders =
          !!request.headers.get("authorization") || !!request.headers.get("cookie");
        const hasRoleGuards = !!options.roles && options.roles.length > 0;
        const canApplyDefaultPublicCache =
          request.method === "GET" &&
          !options.auth &&
          !hasRoleGuards &&
          options.cache !== false &&
          !hasCredentialHeaders &&
          response.status >= 200 &&
          response.status < 300 &&
          !response.headers.has("Cache-Control");

        if (canApplyDefaultPublicCache) {
          const policy = typeof options.cache === "object" ? options.cache : undefined;
          response.headers.set("Cache-Control", buildPublicCacheControl(policy));
        }

        deps.logTiming({
          method: request.method,
          path: new URL(request.url).pathname,
          status: response.status,
          durationMs: Math.round(performance.now() - startMs),
        });

        return response;
      } catch (error) {
        void normalizeError(error);
        deps.logTiming({
          method: request.method,
          path: new URL(request.url).pathname,
          durationMs: Math.round(performance.now() - startMs),
          error: error instanceof Error ? error.message : String(error),
        });

        return deps.handleApiError(error);
      }
    };
  };
}