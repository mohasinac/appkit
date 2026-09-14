/**
 * The digital-content pool for a `digital-code` listing.
 *
 * 🛑 THIS IS THE MISSING HALF OF THE FEATURE. Everything downstream already
 * existed — `claimDigitalCodeForOrder` claims one at checkout, the buyer reveals
 * it through `GET /api/orders/{id}/code`, a refund revokes unclaimed ones — but
 * **nothing in the codebase had ever WRITTEN a row into the pool.** The one
 * seller-facing route returned `501 "Digital code management is not implemented
 * yet."` So every purchase of a digital-code listing hit
 * `serverLogger.warn("claimDigitalCode: code pool exhausted")` and returned
 * silently, the order completed normally, and the buyer's reveal panel answered
 * 404. The seller form even has a "Code Pool Size" field, which made the pool
 * look populated on the listing page while it was always empty.
 *
 * A "digital code" delivers digital CONTENT: a redemption string, a QR image, or
 * a file. `contentKind` says which, defaulting to `"code"` so every pre-existing
 * document keeps its meaning with no migration.
 */

import { getAdminDb } from "../../../../providers/db-firebase/admin";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import { ValidationError } from "../../../../errors";
import { ORDER_FIELDS } from "../../../../constants/field-names";
import {
  PRODUCT_COLLECTION,
  PRODUCT_CODES_SUBCOLLECTION,
  type ProductCodeContentKind,
  type ProductCodeDocument,
} from "../../../../features/products/schemas/firestore";

/**
 * Where a delivered asset's bytes live.
 *
 * Deliberately OUTSIDE every prefix the public media proxy knows how to resolve,
 * and no `mediaAssets` row is ever created for it — a `mediaAssets` row is what
 * mints a `/media/{shortId}` slug, and that slug is served without
 * authentication. No row, no slug, no public URL.
 */
export const DIGITAL_CONTENT_PREFIX = "private/digital-content";

/**
 * 🛑 THE PERMISSION SPLIT, and the reason it is not simply "admins only".
 *
 * An image is the QR/voucher case and is the whole point of widening this from
 * strings, so a seller must be able to add one — they are the person who has it.
 * Any OTHER file type is admin-only to upload: the upload surface accepts bytes
 * that will later be streamed to a buyer, and a `.html` renamed `.pdf` is stored
 * XSS the moment anything renders it inline. Narrowing who can put a non-image
 * file into that path is the cheap half of the defence; the magic-byte check and
 * the forced `Content-Disposition: attachment` are the other half.
 *
 * READ is a third thing again and is not on this axis at all: whoever may
 * upload, only the buyer who paid for that order (or staff) may download. See
 * `assertCanDownloadCodeAsset`.
 */
export function assertCanUploadContentKind(
  kind: ProductCodeContentKind,
  role: string | undefined,
): void {
  const isStaff = role === "admin" || role === "moderator" || role === "employee";
  if (kind === "file" && !isStaff) {
    throw new ValidationError(
      "Only an administrator can attach a downloadable file to a listing. Sellers can attach a code or a QR image.",
    );
  }
}

export interface AddPoolEntryInput {
  productId: string;
  contentKind: ProductCodeContentKind;
  /** Required when `contentKind === "code"`. */
  code?: string;
  /** Required for the asset kinds — a raw Storage path under DIGITAL_CONTENT_PREFIX. */
  assetPath?: string;
  fileName?: string;
  contentType?: string;
  expiresAt?: Date;
}

function assertPoolEntryShape(input: AddPoolEntryInput): void {
  if (input.contentKind === "code") {
    if (!input.code || !input.code.trim()) {
      throw new ValidationError("A code entry needs a code.");
    }
    return;
  }
  if (!input.assetPath) {
    throw new ValidationError(`A ${input.contentKind} entry needs an uploaded asset.`);
  }
  /*
   * Refuse anything outside the private prefix rather than "fixing it up".
   * A caller that hands us `tmp/uploads/<uid>/x.png` is handing us a path the
   * public proxy can already serve, and silently rewriting it would hide the
   * mistake instead of surfacing it.
   */
  if (!input.assetPath.startsWith(`${DIGITAL_CONTENT_PREFIX}/`)) {
    throw new ValidationError("Asset is not in the private digital-content store.");
  }
}

/**
 * Append entries to a product's pool and re-sync the two counters.
 *
 * `codePoolSize` and `codesAvailable` are recomputed from the subcollection, not
 * incremented from the input — the seller form lets a human type `codePoolSize`
 * by hand, so treating that number as authoritative would let the listing page
 * advertise stock that does not exist. Counting is the only thing that cannot
 * drift (Root Cause #42: a mirror is only as good as every writer of it).
 */
export async function addPoolEntries(
  entries: AddPoolEntryInput[],
): Promise<{ added: number; available: number; total: number }> {
  if (entries.length === 0) throw new ValidationError("Nothing to add.");
  const productId = entries[0].productId;
  for (const e of entries) {
    if (e.productId !== productId) {
      throw new ValidationError("All entries must belong to the same listing.");
    }
    assertPoolEntryShape(e);
  }

  const db = getAdminDb();
  const codesRef = db
    .collection(PRODUCT_COLLECTION)
    .doc(productId)
    .collection(PRODUCT_CODES_SUBCOLLECTION);

  const now = new Date();
  const batch = db.batch();
  for (const e of entries) {
    const doc: Omit<ProductCodeDocument, "id"> = {
      productId,
      code: e.contentKind === "code" ? e.code!.trim() : "",
      contentKind: e.contentKind,
      status: "available",
      createdAt: now,
      updatedAt: now,
      ...(e.assetPath ? { assetPath: e.assetPath } : {}),
      ...(e.fileName ? { fileName: e.fileName } : {}),
      ...(e.contentType ? { contentType: e.contentType } : {}),
      ...(e.expiresAt ? { expiresAt: e.expiresAt } : {}),
    } as Omit<ProductCodeDocument, "id">;
    batch.set(codesRef.doc(), doc);
  }
  await batch.commit();

  const counts = await recountPool(productId);
  return { added: entries.length, ...counts };
}

/**
 * Recount the pool and write both counters onto the product.
 *
 * 🛑 `codesAvailable` HAD NO WRITER EITHER. `claimDigitalCodeForOrder` flips a
 * code to `claimed` and never decrements it, so the counter only ever held
 * whatever the seed or the seller typed. Since `hasCodesAvailable()` is what the
 * availability predicate reads, a sold-out listing stayed "available" forever and
 * a listing that never had codes still advertised stock. Both counters are
 * derived here, so neither can drift from the subcollection.
 */
export async function recountPool(
  productId: string,
): Promise<{ available: number; total: number }> {
  const db = getAdminDb();
  const codesRef = db
    .collection(PRODUCT_COLLECTION)
    .doc(productId)
    .collection(PRODUCT_CODES_SUBCOLLECTION);

  // Aggregation counts, not document reads — a pool can be large and this runs
  // on every claim (Rule #6).
  const [availableAgg, totalAgg] = await Promise.all([
    codesRef.where(ORDER_FIELDS.STATUS, "==", "available").count().get(),
    codesRef.count().get(),
  ]);
  const available = availableAgg.data().count;
  const total = totalAgg.data().count;

  try {
    await db.collection(PRODUCT_COLLECTION).doc(productId).update({
      "digitalCode.codesAvailable": available,
      "digitalCode.codePoolSize": total,
      updatedAt: new Date(),
    });
  } catch (err) {
    void normalizeError(err);
    // Non-fatal: the pool itself is the source of truth and a stale counter only
    // affects a badge. Failing the claim over it would be worse.
    serverLogger.error("recountPool: counter write failed", { error: normalizeError(err).message, productId });
  }
  return { available, total };
}

/** The seller/admin view of a pool. Never returns `code` or `assetPath`. */
export async function listPoolEntries(
  productId: string,
): Promise<
  Array<{
    id: string;
    contentKind: ProductCodeContentKind;
    status: string;
    fileName?: string;
    orderId?: string;
    claimedAt?: string;
    createdAt?: string;
  }>
> {
  const db = getAdminDb();
  const snap = await db
    .collection(PRODUCT_COLLECTION)
    .doc(productId)
    .collection(PRODUCT_CODES_SUBCOLLECTION)
    .orderBy(ORDER_FIELDS.CREATED_AT, "desc")
    .limit(200)
    .get();

  /*
   * 🛑 An ALLOW-LIST, not a spread-and-delete. The whole value of this
   * subcollection is that the seller can see how many codes are left without
   * seeing the codes, and a buyer's claimed code is not the seller's to read
   * back either. Root Cause #70: a projection built by deleting keys publishes
   * every field nobody thought to delete.
   */
  return snap.docs.map((d) => {
    const c = d.data() as ProductCodeDocument;
    return {
      id: d.id,
      contentKind: c.contentKind ?? "code",
      status: c.status,
      ...(c.fileName ? { fileName: c.fileName } : {}),
      ...(c.orderId ? { orderId: c.orderId } : {}),
      ...(c.claimedAt ? { claimedAt: new Date(c.claimedAt).toISOString() } : {}),
      ...(c.createdAt ? { createdAt: new Date(c.createdAt).toISOString() } : {}),
    };
  });
}

/**
 * Remove an UNCLAIMED entry. A claimed one is somebody's purchase and deleting
 * it would make their reveal 404 with no trace of what they bought.
 */
export async function deletePoolEntry(
  productId: string,
  codeId: string,
): Promise<{ available: number; total: number }> {
  const db = getAdminDb();
  const ref = db
    .collection(PRODUCT_COLLECTION)
    .doc(productId)
    .collection(PRODUCT_CODES_SUBCOLLECTION)
    .doc(codeId);
  const snap = await ref.get();
  if (!snap.exists) throw new ValidationError("Entry not found.");
  if ((snap.data() as ProductCodeDocument).status === "claimed") {
    throw new ValidationError(
      "That entry has already been delivered to a buyer and cannot be removed.",
    );
  }
  await ref.delete();
  return recountPool(productId);
}
