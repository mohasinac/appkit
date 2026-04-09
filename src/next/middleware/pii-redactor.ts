// appkit/src/next/middleware/pii-redactor.ts
import type { NextRequest, NextResponse as NR } from "next/server";
import { NextResponse } from "next/server";
import type { AuthRequestContext, Middleware } from "./types";

export interface PiiRedactionRule {
  /** Fields to redact from the top-level object or items[] */
  fields: string[];
  /**
   * If `true` (default), replace the value with a masked string like `a***@domain.com`.
   * If `false`, remove the field entirely.
   */
  mask?: boolean;
  /** Only redact if the caller does NOT have this permission string */
  unless?: string;
}

function maskPii(value: string): string {
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    return `${local?.[0] ?? ""}***@${domain}`;
  }
  if (/^\+?\d{7,}$/.test(value)) {
    return value.slice(0, 3) + "***" + value.slice(-2);
  }
  return "***";
}

function hasPermission(permissions: Set<string>, required: string): boolean {
  return permissions.has("*") || permissions.has(required);
}

function redactObject(
  obj: Record<string, unknown>,
  fields: string[],
  mask: boolean,
): Record<string, unknown> {
  return fields.reduce((acc, field) => {
    if (!(field in acc)) return acc;
    const current = acc[field];
    const redacted: Record<string, unknown> = { ...acc };
    if (mask && typeof current === "string") {
      redacted[field] = maskPii(current);
    } else {
      delete redacted[field];
    }
    return redacted;
  }, obj);
}

/**
 * createPiiRedactorMiddleware — field-level PII redaction for non-owners.
 *
 * Removes or masks declared PII fields from the response body unless the
 * calling user holds the specified permission.
 *
 * @example
 * ```ts
 * const userListRedactor = createPiiRedactorMiddleware([
 *   { fields: ["email", "phone"], mask: true,  unless: "admin:users:pii" },
 *   { fields: ["bankAccount"],    mask: false, unless: "admin:payouts" },
 * ]);
 *
 * export const GET = createApiMiddleware({
 *   permission: "admin:users",
 *   middlewares: [userListRedactor],
 * })(async (input, ctx) => { ... });
 * ```
 */
export function createPiiRedactorMiddleware(
  rules: PiiRedactionRule[],
): Middleware<AuthRequestContext> {
  return async (
    _req: NextRequest,
    ctx: AuthRequestContext,
    next: () => Promise<NR>,
  ): Promise<NR> => {
    const response = await next();

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return response;

    let body: Record<string, unknown>;
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      return response;
    }

    for (const { fields, mask = true, unless } of rules) {
      // Skip redaction if caller has the authorising permission
      if (unless && hasPermission(ctx.user.permissions, unless)) continue;

      // Handle both paginated { data: [] } and single-object responses
      if (Array.isArray(body.data)) {
        body = {
          ...body,
          data: (body.data as Record<string, unknown>[]).map((item) =>
            redactObject(item, fields, mask),
          ),
        };
      } else {
        body = redactObject(body, fields, mask);
      }
    }

    return NextResponse.json(body, {
      status: response.status,
      headers: response.headers,
    });
  };
}
