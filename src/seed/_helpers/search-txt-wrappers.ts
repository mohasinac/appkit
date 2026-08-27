import { buildSearchTxt } from "../../utils/search-txt";
import type { StoreDocument } from "../../features/stores/schemas";
import type { EventDocument } from "../../features/events/schemas";
import type { BlogPostDocument } from "../../features/blog/schemas";
import type { ReviewDocument } from "../../features/reviews/schemas";

/**
 * Per-collection `searchTxt` derivation for seed data.
 *
 * Applied to the WHOLE array at each file's export, never per record. Writing
 * the field inside object literals is how five product seed files shipped their
 * last fixture — the sold/depleted row — with no tokens at all: the field was
 * added to every record except the one appended at the bottom. The `...p` spread
 * comes FIRST here so a record cannot override or omit it.
 *
 * All of these are pure functions of the record's own content, so they do not
 * reintroduce the `appkit-seed` idempotency problem of Root Cause #25.
 *
 * 🛑 **No PII in any of these.** `searchTxt` stores readable fragments of the
 * source text, so feeding it an encrypted field would undo the encryption.
 * Decision D1: names stay searchable, emails/phones/addresses do not.
 *
 * Each wrapper is typed against its own document rather than a shared
 * `Record<string, unknown>`: that shape trips `audit-unknown-leakage`, and more
 * importantly it would silently accept a field that no longer exists after a
 * rename, which is exactly the class of drift this migration is fixing.
 */

const stripHtml = (s: string | undefined) => (s ?? "").replace(/<[^>]+>/g, " ");

/** stores — name, description, category. No payout details, no contact. */
export function withStoreSearchTxt<T extends Partial<StoreDocument>>(p: T): T {
  return {
    ...p,
    searchTxt: buildSearchTxt([
      p.storeName,
      stripHtml(p.storeDescription),
      p.storeCategory,
    ]),
  };
}

/** events — title, description, type, tags. */
export function withEventSearchTxt<T extends Partial<EventDocument>>(p: T): T {
  return {
    ...p,
    searchTxt: buildSearchTxt([
      p.title,
      stripHtml(p.description),
      p.type,
      p.tags ?? [],
    ]),
  };
}

/**
 * blogPosts — title, excerpt, category, tags.
 *
 * The full `content` body is deliberately EXCLUDED. FAQ answers are short
 * (measured: max 449 tokens, avg 200, nothing near the 600 cap), but blog bodies
 * are an order of magnitude larger and would blow the cap — at which point
 * `buildSearchTxt` truncates silently and the tail of every post becomes
 * unsearchable with no error anywhere. The excerpt is the searchable summary.
 */
export function withBlogSearchTxt<T extends Partial<BlogPostDocument>>(p: T): T {
  return {
    ...p,
    searchTxt: buildSearchTxt([
      p.title,
      stripHtml(p.excerpt),
      p.category,
      p.tags ?? [],
    ]),
  };
}

/** reviews — title, comment, productTitle. `userName` is PII and excluded. */
export function withReviewSearchTxt<T extends Partial<ReviewDocument>>(p: T): T {
  return {
    ...p,
    searchTxt: buildSearchTxt([p.title, stripHtml(p.comment), p.productTitle]),
  };
}
