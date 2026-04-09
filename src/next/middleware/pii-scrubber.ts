// appkit/src/next/middleware/pii-scrubber.ts
import type { NextRequest, NextResponse as NR } from "next/server";
import { NextResponse } from "next/server";
import type { BaseRequestContext, Middleware } from "./types";

const ENC_PREFIX = "enc:v1:";

function scrubValue(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith(ENC_PREFIX)) {
    return "[encrypted]";
  }
  if (Array.isArray(value)) return value.map(scrubValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        scrubValue(v),
      ]),
    );
  }
  return value;
}

/**
 * PiiScrubberMiddleware — safety net.
 *
 * Walks the entire JSON response body and replaces any string that starts with
 * the `enc:v1:` prefix (AES-256-GCM ciphertext) with the literal `"[encrypted]"`.
 *
 * This prevents raw Firestore ciphertext from leaking to the client when a
 * repository path forgets to call `decryptPiiFields()`.
 */
export const piiScrubberMiddleware: Middleware<BaseRequestContext> = async (
  _request: NextRequest,
  _ctx: BaseRequestContext,
  next: () => Promise<NR>,
): Promise<NR> => {
  const response = await next();

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return response;
  }

  const scrubbed = scrubValue(body);

  return NextResponse.json(scrubbed, {
    status: response.status,
    headers: response.headers,
  });
};
