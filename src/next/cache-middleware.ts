/**
 * API Response Cache Middleware
 *
 * Wraps a Next.js API handler with in-memory response caching via CacheManager.
 *
 * @example
 * ```ts
 * export const GET = withCache(
 *   async (request) => { ... return NextResponse.json(data); },
 *   { ttl: 5 * 60 * 1000 }
 * );
 * ```
 */

import type { NextRequest } from "next/server.js";
import { NextResponse } from "next/server.js";
import { CacheManager } from "../core/CacheManager";

export interface CacheConfig {
  /** Time to live in milliseconds. Default: 5 minutes. */
  ttl?: number;
  /** Include query string in cache key. Default: true. */
  includeQuery?: boolean;
  /** Custom cache key generator. */
  keyGenerator?: (request: NextRequest) => string;
  /** Bypass caching entirely. Default: false. */
  bypassCache?: boolean;
  /** Only cache for these HTTP methods. Default: ['GET']. */
  methods?: string[];
}

const DEFAULT_TTL = 5 * 60 * 1000;
const cache = CacheManager.getInstance(500);

function buildCacheKey(request: NextRequest, config: CacheConfig): string {
  if (config.keyGenerator) return config.keyGenerator(request);
  const url = new URL(request.url);
  if (config.includeQuery !== false && url.search)
    return `${url.pathname}${url.search}`;
  return url.pathname;
}

function isCacheable(request: NextRequest, config: CacheConfig): boolean {
  if (config.bypassCache) return false;
  const methods = config.methods ?? ["GET"];
  return methods.includes(request.method);
}

type Handler = (
  request: NextRequest,
  ...args: unknown[]
) => Promise<NextResponse>;

export function withCache(handler: Handler, config: CacheConfig = {}): Handler {
  return async (
    request: NextRequest,
    ...args: unknown[]
  ): Promise<NextResponse> => {
    if (!isCacheable(request, config)) {
      return handler(request, ...args);
    }

    const key = buildCacheKey(request, config);
    const cached = cache.get<{
      body: string;
      status: number;
      headers: Record<string, string>;
    }>(key);
    if (cached) {
      return new NextResponse(cached.body, {
        status: cached.status,
        headers: cached.headers,
      });
    }

    const response = await handler(request, ...args);
    const body = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    cache.set(
      key,
      { body, status: response.status, headers },
      { ttl: config.ttl ?? DEFAULT_TTL },
    );

    return new NextResponse(body, { status: response.status, headers });
  };
}

/**
 * Invalidate cache entries by key prefix or regex pattern.
 * Pass no argument to clear the entire cache.
 */
export function invalidateCache(pattern?: string | RegExp): void {
  if (!pattern) {
    cache.clear();
    return;
  }
  const keys = cache.keys();
  if (typeof pattern === "string") {
    for (const key of keys) {
      if (key.startsWith(pattern)) cache.delete(key);
    }
  } else {
    for (const key of keys) {
      if (pattern.test(key)) cache.delete(key);
    }
  }
}
