import { normalizeError } from "../../../../errors/normalize";
import type { JobContext } from "../runtime/types";
import type { JsonValue } from "@mohasinac/appkit";

/**
 * Tell the Next.js app that a document changed, so it can drop the stale ISR
 * entries for the pages that render it.
 *
 * ## Why an HTTP call and not `revalidatePath()`
 *
 * `revalidatePath` only exists inside the Next.js runtime. The writers that
 * matter most do NOT run there: a checkout stock decrement, auction settlement,
 * the nightly reconcilers and every `appkit-seed` write all execute in Cloud
 * Functions or a CLI. A Firestore trigger is the one place that observes all of
 * them, and the only way it can reach Next's cache is over the network.
 *
 * ## 🛑 This does not write to Firestore — by construction
 *
 * Root Cause #92: a trigger that writes back to the collection it watches is how
 * this project produced 1.02M invocations/day and knocked out production. This
 * performs exactly one `fetch` and touches no document, so it cannot re-trigger
 * itself. Keep it that way — if this ever needs to persist anything, it needs a
 * different trigger path, not a write.
 *
 * ## Best-effort, and silent about it
 *
 * A failed invalidation must never fail the write side-effects it rides along
 * with — the product is already saved; the worst case is a page that stays stale
 * until its TTL rolls. So this swallows every error after classifying it, and
 * logs at `warn` once per failure rather than per document.
 */

/** Fields whose change can alter what a public page renders. */
const CACHE_RELEVANT_PRODUCT_FIELDS = [
  "status",
  "stockQuantity",
  "isSold",
  "price",
  "salePrice",
  "title",
  "images",
  "categorySlugs",
  "brandSlug",
  "brand",
  "storeId",
  "listingType",
  "auctionEndDate",
  "currentBid",
  "buyNowPrice",
  "isFeatured",
  "isPromoted",
  "featured",
] as const;

/** Same shape the sibling job cores use (`ProductDoc`, `CategoryDoc`, …). */
type Doc = Record<string, JsonValue> | null | undefined;

/**
 * Did anything a page renders actually change?
 *
 * 🛑 Compared with `JSON.stringify` per FIELD, never over the whole document.
 * Root Cause #92's bug was a whole-object `JSON.stringify` comparison that could
 * never report "equal" because Firestore returns map keys alphabetically while
 * the code built them in construction order. Per-field, the values are scalars
 * or small arrays whose order IS meaningful, so stringify is sound here.
 *
 * A create or a delete always counts — there is no previous/next state to diff.
 */
export function productCacheFieldsChanged(before: Doc, after: Doc): boolean {
  if (!before || !after) return true;
  for (const field of CACHE_RELEVANT_PRODUCT_FIELDS) {
    if (JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null)) {
      return true;
    }
  }
  return false;
}

export interface RevalidateNotifyInput {
  collection: string;
  id: string;
  hints?: {
    listingType?: string;
    categorySlugs?: string[];
    brandSlug?: string;
    storeId?: string;
  };
}

/**
 * The app origin to call.
 *
 * No existing job needed one, so this introduces `APP_ORIGIN`. Returning null
 * (rather than guessing a host) makes an unconfigured deployment a no-op with a
 * one-line warning instead of a stream of failed requests to the wrong site —
 * and the stale page it leaves behind is bounded by the TTL.
 */
function appOrigin(ctx: JobContext): string | null {
  const raw = ctx.env("APP_ORIGIN");
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export async function notifyRevalidate(
  input: RevalidateNotifyInput,
  ctx: JobContext,
): Promise<void> {
  const origin = appOrigin(ctx);
  const secret = ctx.env("CACHE_REVALIDATION_SECRET");
  if (!origin || !secret) {
    ctx.logger.warn("revalidate-notify: not configured — skipping", {
      hasOrigin: !!origin,
      hasSecret: !!secret,
      collection: input.collection,
    });
    return;
  }

  try {
    const res = await fetch(`${origin}/api/cache/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": secret },
      body: JSON.stringify({
        collections: [input.collection],
        id: input.id,
        hints: input.hints ?? {},
      }),
      // The caller is a background trigger, not a user request — but an
      // unbounded fetch would pin the function open until the platform kills it.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      ctx.logger.warn("revalidate-notify: endpoint returned non-ok", {
        status: res.status,
        collection: input.collection,
        id: input.id,
      });
    }
  } catch (err) {
    void normalizeError(err);
    ctx.logger.warn("revalidate-notify: request failed", {
      collection: input.collection,
      id: input.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
