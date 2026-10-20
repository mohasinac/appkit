/**
 * Reads for the public bey surfaces.
 *
 * 🛑 Wrapped in `React.cache` because a page and its `generateMetadata` share
 * the call — and the NARROWEST shared call is what gets cached, not whatever
 * is convenient to export. `React.cache` memoises per argument list, so two
 * call sites passing different arguments get two entries and dedupe nothing
 * (the `getStoreBySlug(slug)` vs `getStoreBySlug(slug, viewer)` trap).
 */
import { cache } from "react";
import {
  BEYS_COLLECTION,
  BEY_PRODUCTS_COLLECTION,
  type BeyDocument,
  type BeyProductDocument,
} from "../../../../features/beys/schemas/firestore";
import { getAdminDb } from "../../../../providers/db-firebase";
import { BEY_FIELDS } from "../../../../constants/field-names";
import { serverLogger } from "../../../../monitoring/server-logger";
import { normalizeError } from "../../../../errors/normalize";

/**
 * One bey, by slug.
 *
 * 🛑 A DIRECT DOC READ — `id === slug`, so this needs no query, no index and
 * no scan. That is the whole reason the id is the slug.
 */
export const getBeyBySlug = cache(async (slug: string): Promise<BeyDocument | null> => {
  try {
    const snap = await getAdminDb().collection(BEYS_COLLECTION).doc(slug).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as BeyDocument) : null;
  } catch (err) {
    const e = normalizeError(err);
    serverLogger.warn("getBeyBySlug failed", { slug, error: e.message });
    return null;
  }
});

/**
 * The bey(s) paired with a category leaf — the inverse of `BeyDocument.categoryId`.
 *
 * 🛑 ONE INDEXED EQUALITY, no composite index, which is the same shape
 * `getCompositionsForCategory` uses for the parts side of this exact job. A
 * single-field `==` is served by Firestore's automatic index, so this adds no
 * index to declare and no deploy to wait on.
 *
 * 🛑 NOT `.limit(1)`, and that is measured rather than cautious. 1,880 beys
 * carry a `categoryId` across 1,858 distinct leaves — so **22 leaves pair with
 * TWO beys**, which are the vendor pairs (a Takara-Tomy release and its Hasbro
 * equivalent merged onto one taxonomy leaf). `limit(1)` would render one of
 * them and silently drop the other on 22 pages, with nothing to indicate a
 * second existed. The cap is small and the extra rows are the point.
 *
 * Fails OPEN to an empty list for the same reason as below: a category page
 * missing its reference link is a worse page, a category page that throws is no
 * page at all.
 */
export const getBeysForCategory = cache(
  async (categoryId: string): Promise<BeyDocument[]> => {
    try {
      const snap = await getAdminDb()
        .collection(BEYS_COLLECTION)
        .where(BEY_FIELDS.CATEGORY_ID, "==", categoryId)
        .limit(4)
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BeyDocument);
    } catch (err) {
      const e = normalizeError(err);
      serverLogger.warn("getBeysForCategory failed", { categoryId, error: e.message });
      return [];
    }
  },
);

/**
 * The products that ship a bey.
 *
 * 🛑 A QUERY, unlike `getModelsUsingPart`'s `getAll`, and the difference is a
 * real asymmetry in the data rather than an inconsistency: a part row carries
 * `usedBy` so its models are ids already in hand, whereas the product→bey edge
 * lives on the PRODUCT (`assortment[].beyId`). A bey has no stored list of the
 * products containing it.
 *
 * So this is one `array-contains` over a denormalised id array, bounded at 12.
 * 🛑 It needs `assortmentBeyIds` on the product — a flat array of the ids
 * inside `assortment[]`, because Firestore cannot `array-contains` on a field
 * nested inside objects in an array. Until the seed carries that field this
 * returns [] and says so, rather than running a scan.
 */
export const getProductsContainingBey = cache(
  async (beyId: string): Promise<BeyProductDocument[]> => {
    try {
      const snap = await getAdminDb()
        .collection(BEY_PRODUCTS_COLLECTION)
        .where("assortmentBeyIds", "array-contains", beyId)
        .limit(12)
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BeyProductDocument);
    } catch (err) {
      const e = normalizeError(err);
      /*
       * Fails OPEN to an empty list. A missing composite index throws
       * `FAILED_PRECONDITION`, and the right outcome is a bey page without its
       * "found in" section rather than a broken page — the caller wraps this in
       * `safeRead` as well, so the degradation is recorded rather than silent.
       *
       * 🛑 `normalizeError` is the FIRST statement on purpose. It was below
       * this comment, which put it outside audit-catch-normalize's proximity
       * window — so the audit correctly reported it as missing even though the
       * call was right there. Comment after the call, never before it.
       */
      serverLogger.warn("getProductsContainingBey failed", { beyId, error: e.message });
      return [];
    }
  },
);
