import { ValidationError } from "../../errors";
import type { FirestoreDocument } from "@mohasinac/appkit";

/**
 * Strict JSON body parser for createRouteHandler handlers that need a body
 * but don't yet use the wrapper's `schema` option. Replaces the silent
 * `.catch(() => ({}))` pattern.
 *
 * On parse failure: throws ValidationError which the route wrapper maps to
 * 400 / VALIDATION_FAILED. NEVER returns `{}` on failure.
 *
 * @example
 *   const body = await parseJsonBody<{ name: string }>(request);
 *   const body = await parseJsonBody<{ name?: string }>(request, { allowEmpty: true });
 */
export async function parseJsonBody<T = FirestoreDocument>(
  request: Request,
  options?: { allowEmpty?: boolean },
): Promise<T> {
  // audit-unknown-ok: callback entry point — accepts arbitrary payload value
  let raw: unknown;
  try {
    const text = await request.text();
    if (!text) {
      if (options?.allowEmpty) {
        return {} as T;
      }
      throw new ValidationError("Request body is required");
    }
    raw = JSON.parse(text);
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError("Invalid JSON body");
  }
  if (raw === null || typeof raw !== "object") {
    throw new ValidationError("Request body must be a JSON object");
  }
  return raw as T;
}
