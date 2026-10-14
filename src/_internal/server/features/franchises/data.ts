import { cache } from "react";
import { categoriesRepository } from "../../../../features/categories/repository/categories.repository";
import type { CategoryDocument } from "../../../../features/categories/schemas";

/**
 * SSR reads for the FRANCHISE unit — what a product is FROM, where a brand is
 * who made it.
 *
 * 🛑 Wrapped in `React.cache` because each of these is called by BOTH the page
 * body and its `generateMetadata`. Without it that is two identical Firestore
 * reads per render, on routes that are meant to be cheap (CLAUDE.md, "React.cache
 * discipline").
 *
 * The argument list is the cache key, so these take the slug and nothing else —
 * adding a viewer parameter here would give every call site its own entry and
 * dedupe nothing.
 *
 * @tag domain:categories
 * @tag layer:server
 * @tag access:server-only
 * @tag sideEffects:firestore-read
 */

/**
 * One franchise by slug.
 *
 * 🛑 Deliberately NOT filtered on `isActive`. Seven of the eight seeded
 * franchises are inactive because they have no stock yet, and the entire point
 * of seeding them is that `/franchise/marvel` resolves instead of 404ing — the
 * eighteen `CharacterHotspot` links pointed at a route that did not exist. The
 * grid is where inactive rows are hidden (`findActiveFranchises`); the detail
 * page renders them as an honest "nothing here yet".
 */
export const getFranchiseForDetail = cache(
  async (slug: string): Promise<CategoryDocument | null> =>
    categoriesRepository.findBySlugAndType(slug, "franchise"),
);

/** Every franchise a visitor may browse — active only, so no dead facets. */
export const listActiveFranchises = cache(
  async (): Promise<CategoryDocument[]> => categoriesRepository.findActiveFranchises(),
);
