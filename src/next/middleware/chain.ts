// appkit/src/next/middleware/chain.ts
import type { NextRequest, NextResponse as NR } from "next/server";
import { NextResponse } from "next/server";
import type {
  BaseRequestContext,
  AuthRequestContext,
  Middleware,
} from "./types";
import { piiScrubberMiddleware } from "./pii-scrubber";

/**
 * runChain — sequential middleware runner.
 *
 * Each middleware calls `next()` to pass control to the subsequent one.
 * The final `next()` invokes the `handler` function.
 */
export async function runChain<Ctx extends BaseRequestContext>(
  middlewares: Middleware<Ctx>[],
  ctx: Ctx,
  request: NextRequest,
  handler: () => Promise<NR>,
): Promise<NR> {
  let index = 0;

  async function next(): Promise<NR> {
    if (index < middlewares.length) {
      const mw = middlewares[index++]!;
      return mw(request, ctx, next);
    }
    return handler();
  }

  return next();
}

/**
 * buildBaseContext — initialises request context from the incoming NextRequest.
 */
export function buildBaseContext(request: NextRequest): BaseRequestContext {
  return {
    traceId: crypto.randomUUID(),
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown",
    locale:
      request.headers.get("accept-language")?.split(",")[0]?.split("-")[0] ??
      "en",
    startedAt: Date.now(),
  };
}

export interface CreateApiMiddlewareConfig<TCtx extends BaseRequestContext> {
  /** Additional domain-specific middlewares to run before the handler */
  middlewares?: Middleware<TCtx>[];
  /**
   * Whether to apply the PII scrubber to the response.
   * Default: `true`.
   */
  scrubPii?: boolean;
}

/**
 * createApiMiddleware — lightweight middleware chain builder for Next.js API routes.
 *
 * Composes the provided middlewares with the PII scrubber by default.
 * Returns an HOF: pass the route handler function to get a `NextRequest → NextResponse`
 * handler suitable for use as a Next.js App Router route export.
 *
 * @example
 * ```ts
 * // Simple route with scrubber only
 * export const GET = createApiMiddleware({})(async (_input, _ctx, req) => {
 *   const data = await getProducts();
 *   return NextResponse.json({ data });
 * });
 *
 * // Route with auth context + custom middleware
 * export const GET = createApiMiddleware({
 *   middlewares: [myCustomMiddleware],
 * })(async (_input, ctx, _req) => {
 *   // ctx is AuthRequestContext
 *   return NextResponse.json({ uid: ctx.user.uid });
 * });
 * ```
 */
export function createApiMiddleware<
  TInput = unknown,
  TCtx extends BaseRequestContext = AuthRequestContext,
>(config: CreateApiMiddlewareConfig<TCtx> = {}) {
  const { middlewares = [], scrubPii = true } = config;

  return function withHandler(
    routeFn: (input: TInput, ctx: TCtx, req: NextRequest) => Promise<NR>,
  ) {
    return async function handler(request: NextRequest): Promise<NR> {
      const ctx = buildBaseContext(request) as TCtx;

      const chain: Middleware<TCtx>[] = [
        ...middlewares,
        // Apply PII scrubber last (wraps all other middleware output)
        ...(scrubPii
          ? [piiScrubberMiddleware as unknown as Middleware<TCtx>]
          : []),
      ];

      return runChain(chain, ctx, request, async () => {
        try {
          return await routeFn({} as TInput, ctx, request);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Internal server error";
          return NextResponse.json({ error: message }, { status: 500 });
        }
      });
    };
  };
}
