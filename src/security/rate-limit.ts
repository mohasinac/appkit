/**
 * Rate Limiting
 *
 * Sliding-window rate limiter. Designed for free tier:
 * - Defaults to in-memory rate limiting (no external service required)
 * - Upstash Redis optional for distributed deployments (removed from free tier)
 *
 * On Vercel Free + Firebase Blaze free tier: uses in-memory only
 *
 * Legacy Upstash support (if UPSTASH_REDIS_REST_URL/TOKEN set):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

import type { NextRequest } from "next/server.js";

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  window: number;
  /** Custom identifier (default: IP address) */
  identifier?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  error?: string;
}

// --- IP extraction ------------------------------------------------------------

function getClientIP(request: NextRequest | Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;
  return "unknown";
}

// --- Upstash-backed limiter ---------------------------------------------------

let upstashLimiter:
  | ((ip: string, limit: number, window: number) => Promise<RateLimitResult>)
  | null = null;

async function getUpstashLimiter() {
  if (upstashLimiter) return upstashLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const { Redis } = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");

  const redis = new Redis({ url, token });
  const cache = new Map<string, import("@upstash/ratelimit").Ratelimit>();

  upstashLimiter = async (
    ip: string,
    limit: number,
    window: number,
  ): Promise<RateLimitResult> => {
    const key = `${limit}:${window}`;
    if (!cache.has(key)) {
      cache.set(
        key,
        new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(limit, `${window} s`),
          prefix: "mohasinac:rl",
        }),
      );
    }
    const result = await cache.get(key)!.limit(ip);
    const reset = Math.ceil(result.reset / 1000);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset,
      error: result.success
        ? undefined
        : `Rate limit exceeded. Try again at ${new Date(reset * 1000).toISOString()}`,
    };
  };

  return upstashLimiter;
}

// --- In-memory fallback -------------------------------------------------------

const memStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryLimit(
  identifier: string,
  limit: number,
  window: number,
): RateLimitResult {
  const now = Date.now();
  const windowMs = window * 1000;
  let entry = memStore.get(identifier);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    memStore.set(identifier, entry);
  }
  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  const reset = Math.ceil(entry.resetAt / 1000);
  if (entry.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset,
      error: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds`,
    };
  }
  return { success: true, limit, remaining, reset };
}

// --- Public API ---------------------------------------------------------------

/**
 * Rate limit by request. Uses Upstash Redis when configured, in-memory otherwise.
 */
export async function rateLimit(
  request: NextRequest | Request,
  config: RateLimitConfig = { limit: 10, window: 60 },
): Promise<RateLimitResult> {
  const identifier = config.identifier || getClientIP(request);
  const limiter = await getUpstashLimiter();
  if (limiter) return limiter(identifier, config.limit, config.window);
  return inMemoryLimit(identifier, config.limit, config.window);
}

/** Alias */
export const applyRateLimit = rateLimit;

/**
 * Rate limit by an explicit identifier string.
 * Use in Server Actions where no Request object is available.
 */
export async function rateLimitByIdentifier(
  identifier: string,
  config: Omit<RateLimitConfig, "identifier"> = { limit: 60, window: 60 },
): Promise<RateLimitResult> {
  const limiter = await getUpstashLimiter();
  if (limiter) return limiter(identifier, config.limit, config.window);
  return inMemoryLimit(identifier, config.limit, config.window);
}

/** Presets for common scenarios */
export const RateLimitPresets = {
  STRICT: { limit: 5, window: 60 },
  AUTH: { limit: 10, window: 60 },
  API: { limit: 60, window: 60 },
  GENEROUS: { limit: 100, window: 60 },
  PASSWORD_RESET: { limit: 3, window: 3600 },
  EMAIL_VERIFICATION: { limit: 5, window: 3600 },
} as const;

/** For testing only: clear the in-memory store. */
export function clearRateLimitStore(): void {
  memStore.clear();
}
