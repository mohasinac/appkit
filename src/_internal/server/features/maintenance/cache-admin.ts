/**
 * Admin cache status + clear — item 8 §18 (overhaul brief).
 *
 * `CacheManager` itself has no notion of "which repositories use it" — that
 * knowledge is repository-specific, so the two real cache sources (site
 * settings' 2 fixed named keys, products' dynamic per-id/per-slug prefix) are
 * named here rather than guessed generically from key strings. A third
 * repository adopting `CacheManager` later is a one-line addition to
 * `NAMED_SOURCES`/`KEYED_SOURCES`, not a second hand-written UI section.
 */
import { cacheManager } from "../../../../core/CacheManager";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import { productRepository } from "../../../../features/products/repository/products.repository";

export interface NamedCacheStatus {
  id: string;
  label: string;
  cached: boolean;
  ageMs: number | null;
  ttlMs: number | null;
  expiresInMs: number | null;
}

export interface KeyedCacheStatus {
  id: string;
  label: string;
  entryCount: number;
}

export interface CacheAdminStatus {
  named: NamedCacheStatus[];
  keyed: KeyedCacheStatus[];
}

function namedSources(): Array<{ id: string; label: string; key: string }> {
  const keys = siteSettingsRepository.adminCacheKeys();
  return [
    { id: "site-settings-main", label: "Site settings", key: keys.main },
    { id: "site-settings-flags", label: "Site settings — feature flags", key: keys.flags },
  ];
}

function keyedSources(): Array<{ id: string; label: string; prefix: string }> {
  return [{ id: "products", label: "Products", prefix: productRepository.cachePrefix() }];
}

export function getCacheAdminStatus(): CacheAdminStatus {
  const allKeys = cacheManager.keys();
  return {
    named: namedSources().map(({ id, label, key }) => {
      const meta = cacheManager.getEntryMeta(key);
      return {
        id,
        label,
        cached: meta !== null,
        ageMs: meta?.ageMs ?? null,
        ttlMs: meta?.ttl ?? null,
        expiresInMs: meta?.expiresInMs ?? null,
      };
    }),
    keyed: keyedSources().map(({ id, label, prefix }) => ({
      id,
      label,
      entryCount: allKeys.filter((k) => k.startsWith(prefix)).length,
    })),
  };
}

export type CacheClearTarget =
  | { kind: "named"; id: string }
  | { kind: "keyed"; id: string }
  | { kind: "all" };

/** Returns the number of cache entries actually removed. */
export function clearAdminCache(target: CacheClearTarget): number {
  if (target.kind === "all") {
    const count = cacheManager.keys().length;
    cacheManager.clear();
    return count;
  }
  if (target.kind === "named") {
    const source = namedSources().find((s) => s.id === target.id);
    if (!source) return 0;
    return cacheManager.delete(source.key) ? 1 : 0;
  }
  const source = keyedSources().find((s) => s.id === target.id);
  if (!source) return 0;
  return cacheManager.clearByPrefix(source.prefix);
}
