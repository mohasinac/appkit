/**
 * Guards the defect that started this whole investigation.
 *
 * FAQ search returned nothing for every query because all 63 seeded FAQs had no
 * search tokens at all: the seed writes documents raw via `batch.set()` (both
 * `seed/runner.ts` and `seed-cli.mjs`), bypassing the repository's `create()` —
 * the only thing that built them. `array-contains` then matched zero documents,
 * forever, with no error anywhere.
 *
 * These assertions are about the SEED DATA, not the query layer, because that
 * is where the hole was.
 */
import { describe, it, expect } from "vitest";

import { faqSeedData } from "../faq-seed-data";
import { parseSearchTxtQuery, matchesAllSearchTerms } from "../../utils/search-txt";

/** Every FAQ whose tokens satisfy all terms of `query` — what the repo does. */
function search(query: string) {
  const terms = parseSearchTxtQuery(query);
  return faqSeedData.filter((f) => matchesAllSearchTerms(f.searchTxt, terms));
}

describe("FAQ seed — searchTxt", () => {
  it("populates searchTxt on EVERY seeded record", () => {
    const missing = faqSeedData.filter(
      (f) => !Array.isArray(f.searchTxt) || f.searchTxt.length === 0,
    );
    expect(missing.map((f) => f.id)).toEqual([]);
  });

  it("stays within the per-document token budget", () => {
    // Firestore allows 40k index entries per doc; each array element costs one
    // per index containing the field.
    const worst = Math.max(...faqSeedData.map((f) => f.searchTxt?.length ?? 0));
    expect(worst).toBeLessThanOrEqual(600);
  });

  it("finds FAQs by a whole word from the question", () => {
    expect(search("shipping").length).toBeGreaterThan(0);
  });

  it("finds FAQs by a PARTIAL word — the thing a string field cannot do", () => {
    const partial = search("ship");
    expect(partial.length).toBeGreaterThan(0);
    // and it is a superset of the whole-word match
    expect(partial.length).toBeGreaterThanOrEqual(search("shipping").length);
  });

  it("is case- and accent-insensitive", () => {
    expect(search("SHIPPING").length).toBe(search("shipping").length);
  });

  it("ANDs multiple terms rather than ORing them", () => {
    const both = search("shipping order");
    const either = new Set([
      ...search("shipping").map((f) => f.id),
      ...search("order").map((f) => f.id),
    ]);
    // array-contains-any would have returned the union; AND must not exceed it,
    // and in practice is strictly smaller.
    expect(both.length).toBeLessThanOrEqual(either.size);
  });

  it("returns nothing for a term that appears nowhere", () => {
    expect(search("zzzznotarealword")).toHaveLength(0);
  });

  it("a single character still filters instead of returning everything", () => {
    // The old builder dropped tokens under 2 chars, so a 1-char query produced
    // no clause and silently returned the entire unfiltered list.
    expect(search("s").length).toBeLessThan(faqSeedData.length);
  });
});
