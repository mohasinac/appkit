/**
 * Cache Performance Metrics — pure localStorage implementation.
 * No Firebase dependencies.
 */

interface CacheMetrics {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  lastReset: string;
}

const STORAGE_KEY = "mohasinac:cache_metrics";
const RESET_INTERVAL_MS = 3_600_000; // 1 hour

function nowISO(): string {
  return new Date().toISOString();
}

function initializeMetrics(): CacheMetrics {
  const m: CacheMetrics = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
    lastReset: nowISO(),
  };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  }
  return m;
}

export function getCacheMetrics(): CacheMetrics {
  if (typeof localStorage === "undefined") {
    return {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      lastReset: nowISO(),
    };
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return initializeMetrics();
  try {
    const m = JSON.parse(stored) as CacheMetrics;
    if (Date.now() - new Date(m.lastReset).getTime() > RESET_INTERVAL_MS) {
      return initializeMetrics();
    }
    return m;
  } catch {
    return initializeMetrics();
  }
}

function saveMetrics(m: CacheMetrics): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  }
}

export function recordCacheHit(): void {
  const m = getCacheMetrics();
  m.hits++;
  m.totalRequests++;
  m.hitRate = m.totalRequests > 0 ? m.hits / m.totalRequests : 0;
  saveMetrics(m);
}

export function recordCacheMiss(): void {
  const m = getCacheMetrics();
  m.misses++;
  m.totalRequests++;
  m.hitRate = m.totalRequests > 0 ? m.hits / m.totalRequests : 0;
  saveMetrics(m);
}

export function resetCacheMetrics(): void {
  initializeMetrics();
}

export function getCacheHitRate(): number {
  return getCacheMetrics().hitRate;
}

export function isCacheHitRateLow(threshold: number = 0.5): boolean {
  return getCacheHitRate() < threshold;
}

export function getCacheStatistics(): {
  hitRate: string;
  totalRequests: number;
  hits: number;
  misses: number;
} {
  const m = getCacheMetrics();
  return {
    hitRate: `${(m.hitRate * 100).toFixed(1)}%`,
    totalRequests: m.totalRequests,
    hits: m.hits,
    misses: m.misses,
  };
}
