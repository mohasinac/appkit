/**
 * CacheManager Class — @mohasinac/core
 *
 * Simple TTL-based in-memory cache with FIFO eviction.
 * Pure utility — no framework or app-specific imports.
 */

export interface CacheOptions {
  ttl?: number;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private readonly cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly maxSize: number;

  private constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  public static getInstance(maxSize?: number): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(maxSize);
    }
    return CacheManager.instance;
  }

  public set<T>(key: string, value: T, options?: CacheOptions): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value as string | undefined;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, timestamp: Date.now(), ttl: options?.ttl });
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }

  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Item 8 §18 (overhaul brief) — the admin cache page's real prerequisite.
   * `.keys()`/`.clear()` already told a caller WHICH keys exist and how to
   * wipe everything; neither told it how STALE an entry is, which is what
   * a "current TTL" column needs. Returns `null` for a missing OR already
   * logically-expired key — same "nothing to show" answer either way, so a
   * caller never has to special-case the two.
   */
  public getEntryMeta(key: string): { ageMs: number; ttl: number | undefined; expiresInMs: number | null } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    const ageMs = Date.now() - entry.timestamp;
    if (entry.ttl && ageMs > entry.ttl) return null;
    return {
      ageMs,
      ttl: entry.ttl,
      expiresInMs: entry.ttl ? entry.ttl - ageMs : null,
    };
  }

  /**
   * Item 8 §18 — a repository whose cache is keyed per-id/per-slug (e.g.
   * `products.repository.ts`) has no single key to `.delete()`; every entry
   * sharing that repository's key prefix needs to go together. The admin
   * page's "Clear all `<repo>` cache" button is this, not a loop the caller
   * reimplements against `.keys()` itself.
   */
  public clearByPrefix(prefix: string): number {
    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  public cleanExpired(): number {
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }
}

/** Default shared CacheManager singleton */
export const cacheManager = CacheManager.getInstance();
