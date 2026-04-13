/**
 * API Request Helpers
 *
 * Generic utilities for API route request parsing and session extraction.
 * Uses structural request types (not NextRequest) to avoid cross-package
 * type identity issues when multiple Next.js installs exist in a monorepo.
 */

import { AuthenticationError } from "../errors";

interface CookieStoreLike {
  get(name: string): { value?: string } | string | undefined;
}

type CookieCapableRequest = Request & { cookies?: CookieStoreLike };

function readCookieFromHeader(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function getSearchParams(request: Request): URLSearchParams {
  return new URL(request.url).searchParams;
}

export function getOptionalSessionCookie(
  request: CookieCapableRequest,
): string | undefined {
  const cookieValue = request.cookies?.get("__session");
  if (typeof cookieValue === "string") return cookieValue;
  if (cookieValue && typeof cookieValue === "object") return cookieValue.value;
  return readCookieFromHeader(request, "__session");
}

export function getRequiredSessionCookie(request: CookieCapableRequest): string {
  const cookie = getOptionalSessionCookie(request);
  if (!cookie) throw new AuthenticationError("Unauthorized");
  return cookie;
}

export function getBooleanParam(
  searchParams: URLSearchParams,
  key: string,
): boolean | undefined {
  const value = searchParams.get(key);
  if (value === null) return undefined;
  return value === "true";
}

export function getStringParam(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key);
  if (!value) return undefined;
  return value;
}

export function getNumberParam(
  searchParams: URLSearchParams,
  key: string,
  fallback: number,
  options?: { min?: number; max?: number },
): number {
  const rawValue = searchParams.get(key);
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : fallback;
  const safeValue = Number.isNaN(parsed) ? fallback : parsed;
  if (typeof options?.min === "number" && safeValue < options.min)
    return options.min;
  if (typeof options?.max === "number" && safeValue > options.max)
    return options.max;
  return safeValue;
}
