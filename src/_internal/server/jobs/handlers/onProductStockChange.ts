/**
 * onProductStockChange — SB-UNI-V Firestore onWrite trigger on products.
 *
 * Fires when any product document is created / updated / deleted. Looks
 * up every bundle category (categoryType:"bundle") that lists the product
 * in `bundleProductIds[]` and recomputes its `bundleStockStatus`. Also
 * updates every grouped listing that lists the product in `productIds[]`
 * — bumps `activeMemberCount` and `visibilityStatus`.
 *
 * Cheap: each affected bundle/group reads its `bundleProductIds.length`
 * member products (≤16 typically). Skips entirely when the product's
 * status didn't transition between "available" and "unavailable".
 */

import type { FirestoreTriggerHandler, JobContext } from "../runtime/types";

type ProductDoc = Record<string, unknown>;

const CATEGORIES_COLLECTION = "categories";
const GROUPED_LISTINGS_COLLECTION = "groupedListings";
const PRODUCT_COLLECTION = "products";
const UNAVAILABLE_STATUSES = new Set(["sold", "out_of_stock", "discontinued"]);
const MIN_ACTIVE_DEFAULT = 2;

function isAvailable(status?: string | null): boolean {
  if (!status) return false;
  return !UNAVAILABLE_STATUSES.has(status);
}

async function recomputeBundleStatus(
  productIds: string[],
  minActive: number,
  ctx: JobContext,
): Promise<"in_stock" | "partial" | "out_of_stock"> {
  if (productIds.length === 0) return "out_of_stock";
  let unavailable = 0;
  for (let i = 0; i < productIds.length; i += 30) {
    const chunk = productIds.slice(i, i + 30);
    const snap = await ctx.db
      .collection(PRODUCT_COLLECTION)
      .where("__name__", "in", chunk)
      .get();
    for (const doc of snap.docs) {
      const status = (doc.data() as { status?: string }).status;
      if (!isAvailable(status)) unavailable++;
    }
    if (snap.size < chunk.length) unavailable += chunk.length - snap.size;
  }
  const active = productIds.length - unavailable;
  if (unavailable === 0) return "in_stock";
  if (active < minActive) return "out_of_stock";
  return "partial";
}

async function syncBundlesForProduct(
  productId: string,
  ctx: JobContext,
): Promise<number> {
  const snap = await ctx.db
    .collection(CATEGORIES_COLLECTION)
    .where("categoryType", "==", "bundle")
    .where("bundleProductIds", "array-contains", productId)
    .get();

  let updated = 0;
  for (const bundleDoc of snap.docs) {
    const data = bundleDoc.data() as {
      bundleProductIds?: string[];
      bundleStockStatus?: string;
      minActiveMembers?: number;
    };
    const ids = data.bundleProductIds ?? [];
    const minActive = data.minActiveMembers ?? 1;
    const next = await recomputeBundleStatus(ids, minActive, ctx);
    if (next !== data.bundleStockStatus) {
      await bundleDoc.ref.update({
        bundleStockStatus: next,
        bundleQueryResolvedAt: ctx.now,
        updatedAt: ctx.now,
      });
      updated++;
    }
  }
  return updated;
}

async function syncGroupedListingsForProduct(
  productId: string,
  ctx: JobContext,
): Promise<number> {
  const snap = await ctx.db
    .collection(GROUPED_LISTINGS_COLLECTION)
    .where("productIds", "array-contains", productId)
    .get();

  let updated = 0;
  for (const groupDoc of snap.docs) {
    const data = groupDoc.data() as {
      productIds?: string[];
      activeMemberCount?: number;
      visibilityStatus?: string;
      minActiveMembers?: number;
    };
    const productIds = data.productIds ?? [];
    if (productIds.length === 0) continue;
    const minActive = data.minActiveMembers ?? MIN_ACTIVE_DEFAULT;

    let activeCount = 0;
    for (let i = 0; i < productIds.length; i += 30) {
      const chunk = productIds.slice(i, i + 30);
      const productSnap = await ctx.db
        .collection(PRODUCT_COLLECTION)
        .where("__name__", "in", chunk)
        .get();
      for (const doc of productSnap.docs) {
        const status = (doc.data() as { status?: string }).status;
        if (isAvailable(status)) activeCount++;
      }
    }
    const nextVisibility: "visible" | "hidden" =
      activeCount >= minActive ? "visible" : "hidden";

    if (
      activeCount !== data.activeMemberCount ||
      nextVisibility !== data.visibilityStatus
    ) {
      await groupDoc.ref.update({
        activeMemberCount: activeCount,
        visibilityStatus: nextVisibility,
        updatedAt: ctx.now,
      });
      updated++;
    }
  }
  return updated;
}

export const onProductStockChangeHandler: FirestoreTriggerHandler<
  ProductDoc,
  ProductDoc
> = async (event, ctx: JobContext) => {
  const productId = event.params.productId as string;
  const before = event.before;
  const after = event.after;

  // Only react when the available/unavailable state actually flipped.
  // Saves Firestore reads on routine writes (price edits, image updates, etc.).
  const beforeAvailable = isAvailable(before?.status as string | undefined);
  const afterAvailable = isAvailable(after?.status as string | undefined);
  const isDelete = !after;
  const stateFlipped = beforeAvailable !== afterAvailable;

  if (!isDelete && !stateFlipped) {
    return;
  }

  try {
    const bundlesUpdated = await syncBundlesForProduct(productId, ctx);
    const groupsUpdated = await syncGroupedListingsForProduct(productId, ctx);
    ctx.logger.info("onProductStockChange synced", {
      productId,
      bundlesUpdated,
      groupsUpdated,
      isDelete,
    });
  } catch (err) {
    ctx.logger.error(
      "onProductStockChange sync failed (non-fatal)",
      err,
      { productId },
    );
  }
};
