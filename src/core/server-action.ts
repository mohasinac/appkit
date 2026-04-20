/**
 * createServerAction — @mohasinac/appkit/core
 *
 * A typed factory for Next.js server actions with before/after middleware hooks.
 *
 * ## Why
 * Plain server action functions cannot be intercepted by consumers without
 * forking the handler. This factory wraps the handler with:
 *   - Optional input validation (Zod-compatible safeParse)
 *   - `beforeAction` hook — run custom logic (e.g. logging, auth checks) before the handler
 *   - `afterAction` hook — receive the result for post-processing (e.g. cache invalidation, audit)
 *   - Standardised `ActionResult<TOutput>` return envelope
 *
 * @example
 * ```ts
 * // In a feature action file:
 * export const createProduct = createServerAction({
 *   schema: productCreateSchema,
 *   handler: async ({ input }) => {
 *     const product = await productRepository.create(input);
 *     return product;
 *   },
 * });
 *
 * // In a consumer's providers.config.ts — extend via actionMiddleware:
 * import { setActionMiddleware } from "@mohasinac/appkit/core";
 * setActionMiddleware({
 *   beforeAction: async ({ actionName, input }) => {
 *     console.log("[audit]", actionName, input);
 *   },
 *   afterAction: async ({ actionName, result }) => {
 *     if (result.ok) myCache.invalidate(actionName);
 *   },
 * });
 * ```
 */

import { Logger } from "./Logger";
import { inferMutationEvent, emitMutation } from "./mutation-events";

const logger = Logger.getInstance();

// --- Result envelope ----------------------------------------------------------

export type ActionResult<TOutput> =
  | { ok: true; data: TOutput }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// --- Middleware ---------------------------------------------------------------

export interface ActionMiddlewareContext<TInput = unknown, TOutput = unknown> {
  actionName: string;
  input: TInput;
  result?: ActionResult<TOutput>;
}

export interface ActionMiddleware {
  beforeAction?: (ctx: ActionMiddlewareContext) => Promise<void> | void;
  afterAction?: (
    ctx: ActionMiddlewareContext & { result: ActionResult<unknown> },
  ) => Promise<void> | void;
}

let _globalMiddleware: ActionMiddleware = {};

/**
 * Register global before/after hooks applied to every server action created
 * with `createServerAction`. Call once in your `providers.config.ts`.
 */
export function setActionMiddleware(middleware: ActionMiddleware): void {
  _globalMiddleware = middleware;
}

/** Reset middleware (used in tests). */
export function _resetActionMiddleware(): void {
  _globalMiddleware = {};
}

// --- Schema helper type -------------------------------------------------------

interface SafeParseSchema<TInput> {
  safeParse: (input: unknown) =>
    | { success: true; data: TInput }
    | {
        success: false;
        error: {
          flatten?: () => { fieldErrors: Record<string, string[]> };
          issues?: unknown[];
        };
      };
}

// --- Factory ------------------------------------------------------------------

export interface ServerActionOptions<TInput, TOutput> {
  /**
   * Human-readable name used in middleware context and logging.
   * Defaults to the handler function name if not provided.
   */
  name?: string;
  /**
   * Zod-compatible schema for input validation.
   * If validation fails, returns `{ ok: false, fieldErrors }` before the handler runs.
   */
  schema?: SafeParseSchema<TInput>;
  /**
   * The core action logic. Receives validated input (or raw input if no schema).
   * Should throw on unrecoverable errors; `createServerAction` will catch and wrap them.
   */
  handler: (ctx: { input: TInput }) => Promise<TOutput>;
  /**
   * Per-action before hook. Runs after global middleware.
   */
  beforeAction?: (ctx: ActionMiddlewareContext<TInput>) => Promise<void> | void;
  /**
   * Per-action after hook. Runs before global after middleware.
   */
  afterAction?: (
    ctx: ActionMiddlewareContext<TInput, TOutput> & {
      result: ActionResult<TOutput>;
    },
  ) => Promise<void> | void;
}

/**
 * Creates a typed server action function with middleware, validation, and a
 * standardised `ActionResult<TOutput>` return envelope.
 *
 * The returned function has the same signature as a plain Next.js server action
 * and can be exported directly from an `actions/` file.
 */
export function createServerAction<TInput = unknown, TOutput = unknown>(
  options: ServerActionOptions<TInput, TOutput>,
): (rawInput: TInput) => Promise<ActionResult<TOutput>> {
  const actionName = options.name ?? options.handler.name ?? "anonymous";

  return async function serverAction(
    rawInput: TInput,
  ): Promise<ActionResult<TOutput>> {
    // -- 1. Validate input --------------------------------------------------
    let input = rawInput;
    if (options.schema) {
      const parsed = options.schema.safeParse(rawInput);
      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten?.().fieldErrors ?? {};
        return { ok: false, error: "Validation failed", fieldErrors };
      }
      input = parsed.data;
    }

    const ctx: ActionMiddlewareContext<TInput> = { actionName, input };

    // -- 2. Before hooks (global → per-action) -----------------------------
    try {
      await _globalMiddleware.beforeAction?.(ctx as ActionMiddlewareContext);
      await options.beforeAction?.(ctx);
    } catch (err) {
      logger.error(
        `[createServerAction] beforeAction error in "${actionName}"`,
        { err },
      );
    }

    // -- 3. Run handler -----------------------------------------------------
    let result: ActionResult<TOutput>;
    try {
      const data = await options.handler({ input });
      result = { ok: true, data };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      logger.error(`[createServerAction] handler error in "${actionName}"`, {
        err,
      });
      result = { ok: false, error: message };
    }

    // -- 4. After hooks (per-action → global) ------------------------------
    try {
      await options.afterAction?.({ ...ctx, result });
      await _globalMiddleware.afterAction?.({
        ...(ctx as ActionMiddlewareContext),
        result: result as ActionResult<unknown>,
      });
    } catch (err) {
      logger.error(
        `[createServerAction] afterAction error in "${actionName}"`,
        { err },
      );
    }

    // -- 5. Auto-emit mutation event ---------------------------------------
    if (result.ok) {
      const eventName = inferMutationEvent(actionName);
      if (eventName) {
        try {
          emitMutation(eventName, { actionName, data: result.data });
        } catch (err) {
          logger.error(
            `[createServerAction] emitMutation error for "${eventName}"`,
            { err },
          );
        }
      }
    }

    return result;
  };
}
