/**
 * 4B part 2 (overhaul brief) — the cached flat index behind entity search
 * for categories/brands/franchises (~1,221 rows) in the admin
 * `CommandPalette`/`InlineNavSearch`.
 *
 * 🛑 NOT the same feature as `search-everything.ts`/`search-sources.ts` in
 * this same directory — those serve the PUBLIC `/search?q=` cross-resource
 * page (live Firestore `searchTxt` push-down queries, buyer-facing, nine
 * collections). This is a different consumer entirely: an ADMIN jumping
 * straight from `⌘K` to a taxonomy row's own editor, scored by the SAME
 * in-memory `rankNavSearchResults` the nav items already use — not a second
 * ranking implementation, and not a second read of `search-everything`'s
 * sources.
 *
 * Design confirmed against the plan's own spike (see the plan's "4B —
 * Universal control search" section): ~1,221 rows is small enough for a
 * flat array scored by substring/prefix match, no trie. The caching pattern
 * already exists in this codebase for exactly this shape of problem —
 * admin-managed data that changes infrequently — so this reuses
 * `SiteSettingsRepository.getFlagSnapshot()`'s exact primitive
 * (`cacheManager.get/set({ ttl })`, 30-min TTL, dev-bypassed) rather than
 * inventing a second one.
 */
import { categoriesRepository } from "../../../../features/categories/repository/categories.repository";
import type { CategoryType } from "../../../../features/categories/types/index";
import { CATEGORY_FIELDS } from "../../../../constants/field-names";
import { ROUTES } from "../../../../next/routing/route-map";
import { cacheManager } from "../../../../core/CacheManager";

export type EntitySearchType = "category" | "brand" | "franchise";

export interface EntitySearchEntry {
  id: string;
  label: string;
  type: EntitySearchType;
  href: string;
}

const CACHE_KEY = "search:entity-index";
const CACHE_TTL_MS = 30 * 60_000;

const { BRAND, FRANCHISE } = CATEGORY_FIELDS.CATEGORY_TYPE_VALUES;

/**
 * 🛑 Franchise rows reuse the category editor and have none of their own —
 * confirmed against `OwnerQuickActions.FRANCHISE: { bucket: "CATEGORY", edit:
 * "edit" }` (`appkit/src/features/admin/components/OwnerQuickActions.tsx`),
 * whose own comment states "a franchise row IS a category … reuses the
 * category leaves rather than duplicating copy that would drift."
 */
function hrefFor(type: EntitySearchType, id: string): string {
  if (type === "brand") return String(ROUTES.ADMIN.BRANDS_EDIT(id));
  return String(ROUTES.ADMIN.CATEGORIES_EDIT(id));
}

function classify(categoryType: CategoryType | undefined): EntitySearchType | null {
  if (categoryType === BRAND) return "brand";
  if (categoryType === FRANCHISE) return "franchise";
  // Empty/undefined is a plain taxonomy category. `bundle` and `sublisting`
  // are deliberately excluded — the plan's own "~1,221 rows" count is
  // categories + brands + franchises only (1,185 + 28 + 8), not the whole
  // collection.
  if (!categoryType) return "category";
  return null;
}

async function buildEntitySearchIndex(): Promise<EntitySearchEntry[]> {
  const rows = await categoriesRepository.findAllForEntitySearch();
  const entries: EntitySearchEntry[] = [];
  for (const row of rows) {
    if (!row.name || !row.name.trim()) continue;

    const type = classify(row.categoryType);
    if (!type) continue;

    entries.push({ id: row.id, label: row.name, type, href: hrefFor(type, row.id) });
  }
  return entries;
}

/**
 * Cached per `getFlagSnapshot()`'s own precedent — an admin convenience
 * feature, not buyer-facing, so a few minutes of staleness after a rename
 * is an acceptable trade for not re-reading ~1,221 docs on every palette
 * open. Dev-bypassed so a local taxonomy edit is seen immediately.
 */
export async function getEntitySearchIndex(): Promise<EntitySearchEntry[]> {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    const cached = cacheManager.get<EntitySearchEntry[]>(CACHE_KEY);
    if (cached) return cached;
  }

  const entries = await buildEntitySearchIndex();

  if (isProd) {
    cacheManager.set(CACHE_KEY, entries, { ttl: CACHE_TTL_MS });
  }
  return entries;
}
