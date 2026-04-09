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
  handler: (ctx: {
    request: Request;
    user?: TUser;
    body?: TInput;
    params?: TParams;
  }) => Promise<Response>;
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
          const rateLimitResult = await deps.applyRateLimit(
            request,
            options.rateLimit,
          );

          rateLimitHeaders = {
            "RateLimit-Limit": String(rateLimitResult.limit),
            "RateLimit-Remaining": String(rateLimitResult.remaining),
            "RateLimit-Reset": String(rateLimitResult.reset),
          };

          if (!rateLimitResult.success) {
            return new Response(
              JSON.stringify({
                success: false,
                error: deps.getRateLimitExceededMessage(),
              }),
              {
                status: 429,
                headers: {
                  "Content-Type": "application/json",
                  ...rateLimitHeaders,
                },
              },
            );
          }
        }

        let user: TUser | undefined;
        if (options.roles && options.roles.length > 0) {
          user = await deps.requireRoleFromRequest(request, options.roles);
        } else if (options.auth) {
          user = await deps.requireAuthFromRequest(request);
        }

        let validatedBody: TInput | undefined;
        if (options.schema) {
          if (typeof (options.schema as { safeParse?: unknown }).safeParse === "function") {
            const body = await request.json();
            const result = options.schema.safeParse(body);
            if (!result.success) {
              return deps.errorResponse(
                "Validation failed",
                400,
                result.error.issues,
              );
            }
            validatedBody = result.data;
          } else {
            try {
              validatedBody = (await request.json()) as TInput;
            } catch {
              validatedBody = undefined;
            }
          }
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
          for (const [key, value] of Object.entries(rateLimitHeaders)) {
            response.headers.set(key, value);
          }
        }

        deps.logTiming({
          method: request.method,
          path: new URL(request.url).pathname,
          status: response.status,
          durationMs: Math.round(performance.now() - startMs),
        });

        return response;
      } catch (error) {
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