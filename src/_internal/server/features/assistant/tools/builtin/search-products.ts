import { z } from "zod";
import type { JsonValue } from "../../../../../../schemas/types";
import { listPublicProducts } from "../../../products/list-public";
import { defineAssistantTool } from "../define";

/**
 * `searchProducts` — the second of A2's two zero-PII tools.
 *
 * Wraps `listPublicProducts`, the EXACT function `GET /api/products` already
 * calls and returns to any anonymous browser with no further field-stripping
 * — confirmed by reading that route, not assumed. So the data this tool can
 * see is already public by design; nothing here is a new projection.
 *
 * What IS new here, deliberately: this tool does not return the raw `Row`
 * (`Record<string, JsonValue>`, an unbounded serialized product doc). It
 * picks a small, named field set. Not a security boundary — `/api/products`
 * already ships every one of these fields and more to a stranger — but a
 * context-budget one: a model doesn't need `categorySlugs`, `seo*`,
 * `customFields`, or any of the other ~40 fields a product document carries
 * to answer "is this in stock" or "how much is it".
 *
 * `piiClass: "none"` — same reasoning as searchFaqs: every field here is
 * already rendered on a public listing page to anyone, signed in or not.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:none
 */

const MAX_RESULTS = 10;

const inputSchema = z.object({
  query: z.string().min(1).max(200),
  category: z.string().optional(),
  brand: z.string().optional(),
});

export interface SearchProductsResult {
  title: string;
  slug: string | null;
  price: number | null;
  currentBid: number | null;
  currency: string | null;
  listingType: string | null;
  condition: string | null;
  mainImage: string | null;
  storeName: string | null;
}

function readString(row: Record<string, JsonValue>, key: string): string | null {
  const v = row[key];
  return typeof v === "string" ? v : null;
}

function readNumber(row: Record<string, JsonValue>, key: string): number | null {
  const v = row[key];
  return typeof v === "number" ? v : null;
}

export const searchProductsTool = defineAssistantTool({
  name: "searchProducts",
  description:
    "Search the public product catalogue by keyword, with optional category or " +
    "brand filters. Returns title, price (or current bid for auctions), " +
    "condition, listing type, and store name for each match. Use this to " +
    "answer questions about availability, price, or what a store sells.",
  inputSchema,
  piiClass: "none",
  execute: async (input): Promise<readonly SearchProductsResult[]> => {
    const result = await listPublicProducts({
      q: input.query,
      category: input.category,
      brand: input.brand,
      page: 1,
      pageSize: MAX_RESULTS,
    });

    /*
     * `listPublicProducts` returns `null` on executor failure (verified —
     * its own return type is `PublicProductListResult | null`). A model
     * asking "is X in stock" must get "I could not find that", never a
     * thrown error surfaced as a tool failure that reads like X doesn't
     * exist for a different reason.
     */
    if (!result) return [];

    return result.items.map((row) => ({
      title: readString(row, "title") ?? "",
      slug: readString(row, "slug"),
      price: readNumber(row, "price"),
      currentBid: readNumber(row, "currentBid"),
      currency: readString(row, "currency"),
      listingType: readString(row, "listingType"),
      condition: readString(row, "condition"),
      mainImage: readString(row, "mainImage"),
      storeName: readString(row, "storeName"),
    }));
  },
});
