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
