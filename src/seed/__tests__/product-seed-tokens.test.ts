/**
 * Every seeded product must carry `searchTxt`.
 *
 * Four of these files (classifieds, digital-codes, live-items, prize-draws)
 * build their records as inline object literals rather than through a wrapper,
 * and in each one the LAST record — the "sold"/"depleted" fixture appended at
 * the bottom — was missing its tokens. Those are precisely the rows the
 * "Sold & Ended" scope exists to exercise, so they would have been invisible to
 * search in the one view built to show them.
 *
 * A wrapper makes omission impossible (`...p` spreads BEFORE the field); this
 * test is the backstop for the files that still use literals.
 */
import { describe, it, expect } from "vitest";

import { productsStandardSeedData } from "../products-standard-seed-data";
import { productsAuctionsSeedData } from "../products-auctions-seed-data";
import { productsPreordersSeedData } from "../products-preorders-seed-data";
import { productsPrizeDrawsSeedData } from "../products-prize-draws-seed-data";
import { productsClassifiedsSeedData } from "../products-classifieds-seed-data";
import { productsDigitalCodesSeedData } from "../products-digital-codes-seed-data";
import { productsLiveItemsSeedData } from "../products-live-items-seed-data";
import { productsArtSeedData } from "../products-art-seed-data";
import { productsStickersSeedData } from "../products-stickers-seed-data";

const FILES: Array<[string, ReadonlyArray<Record<string, unknown>>]> = [
  ["standard", productsStandardSeedData],
  ["auctions", productsAuctionsSeedData],
  ["preorders", productsPreordersSeedData],
  ["prize-draws", productsPrizeDrawsSeedData],
  ["classifieds", productsClassifiedsSeedData],
  ["digital-codes", productsDigitalCodesSeedData],
  ["live-items", productsLiveItemsSeedData],
  ["art", productsArtSeedData],
  ["stickers", productsStickersSeedData],
];

describe("product seed — searchTxt coverage", () => {
  for (const [name, records] of FILES) {
    it(`${name}: every record has non-empty searchTxt`, () => {
      const missing = records
        .filter((p) => !Array.isArray(p.searchTxt) || (p.searchTxt as string[]).length === 0)
        .map((p) => p.id);
      expect(missing).toEqual([]);
    });
  }

  it("stays within the per-document token budget", () => {
    const worst = Math.max(
      ...FILES.flatMap(([, rs]) => rs.map((p) => (p.searchTxt as string[] | undefined)?.length ?? 0)),
    );
    expect(worst).toBeLessThanOrEqual(600);
  });
});
