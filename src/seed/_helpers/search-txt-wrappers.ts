/*
 * Seed wrappers — delegate to the ONE write-path derivation.
 *
 * These used to re-derive the field lists inline. That is how the products
 * wrapper ended up indexing 9 sources while the write path indexed 12: two
 * copies, both valid TypeScript, differing only in which terms a seeded row
 * could be found by. `audit-search-parity` cross-checks the builders against
 * the backfill script; keeping the wrappers as thin delegations means there is
 * no third copy for it to have to check.
 */
import type { StoreDocument } from "../../features/stores/schemas/firestore";
import type { EventDocument } from "../../features/events/schemas/firestore";
import type { BlogPostDocument } from "../../features/blog/schemas/firestore";
import type { ReviewDocument } from "../../features/reviews/schemas/firestore";
import {
  buildStoreSearchTxt,
  buildEventSearchTxt,
  buildBlogSearchTxt,
  buildReviewSearchTxt,
} from "../../utils/search-txt-builders";

export function withStoreSearchTxt<T extends Partial<StoreDocument>>(p: T): T {
  return { ...p, searchTxt: buildStoreSearchTxt(p) };
}

export function withEventSearchTxt<T extends Partial<EventDocument>>(p: T): T {
  return { ...p, searchTxt: buildEventSearchTxt(p) };
}

export function withBlogSearchTxt<T extends Partial<BlogPostDocument>>(p: T): T {
  return { ...p, searchTxt: buildBlogSearchTxt(p) };
}

export function withReviewSearchTxt<T extends Partial<ReviewDocument>>(p: T): T {
  return { ...p, searchTxt: buildReviewSearchTxt(p) };
}
