/**
 * Streams the digital ASSET a buyer paid for.
 *
 * 🛑 WHY THIS ROUTE EXISTS AT ALL, rather than a `/media/{slug}` URL.
 *
 * Two independent facts make the ordinary media pipeline unusable for paid
 * content, and either one alone would be enough:
 *
 *   1. `storage.rules` grants `allow read: if true` on **every object in the
 *      bucket**. The comment above it explains why that is acceptable — the
 *      rules are a safety net for a misconfigured client, all real access goes
 *      through the Admin SDK — but it means Storage itself protects nothing.
 *   2. `GET /api/media/[...slug]` performs **no authentication whatsoever**. It
 *      is a bare exported handler with no session read, deliberately, because
 *      its job is to serve public product photography through a watermarker.
 *      It also resolves legacy multi-segment slugs as raw storage paths.
 *
 * Together: anything reachable at a `/media/` slug is world-readable, and this
 * codebase's media filenames are content-derived and therefore guessable. A
 * purchased QR living there would be a paid good at a predictable public URL.
 *
 * So the bytes live under a private prefix that mints no `mediaAssets` row (and
 * therefore no slug), and are streamed only from here — after re-checking that
 * the caller owns the order. That is the same shape as
 * `GET /api/user/orders/[id]/invoice`, the one existing precedent in this
 * codebase for a gated download.
 */

import { getAdminDb } from "../../../../providers/db-firebase/admin";
import { getAdminStorage } from "../../../../providers/db-firebase";
import { normalizeError } from "../../../../errors/normalize";
import { ORDER_FIELDS } from "../../../../constants/field-names";
import {
  PRODUCT_COLLECTION,
  PRODUCT_CODES_SUBCOLLECTION,
  type ProductCodeDocument,
} from "../../../../features/products/schemas/firestore";

/** Order statuses at which delivered content may be downloaded. */
export const CODE_DOWNLOAD_STATUSES = new Set([
  "confirmed",
  "processing",
  "delivered",
]);

export interface CodeAssetResolution {
  ok: boolean;
  /** HTTP status to answer with when `ok` is false. */
  status?: number;
  message?: string;
  buffer?: Buffer;
  contentType?: string;
  fileName?: string;
}

/**
 * Resolve and read the asset for `orderId`, or explain why not.
 *
 * `viewerUid` is the authenticated caller. `isStaff` lets admin/moderator open a
 * buyer's delivery for support — the same escape hatch the invoice route has.
 */
export async function resolveCodeAssetForOrder(
  orderId: string,
  viewerUid: string,
  isStaff: boolean,
): Promise<CodeAssetResolution> {
  const db = getAdminDb();
  const orderSnap = await db.collection("orders").doc(orderId).get();
  if (!orderSnap.exists) {
    return { ok: false, status: 404, message: "Order not found" };
  }
  const order = orderSnap.data() as {
    userId?: string;
    status?: string;
    items?: Array<{ productId?: string }>;
    productId?: string;
  };

  /*
   * 404, not 403, when it is not your order — matching the reveal route and the
   * order-invoice route. Answering 403 would confirm that an order with that id
   * exists, which is a membership oracle over a guessable id space.
   */
  if (!isStaff && order.userId !== viewerUid) {
    return { ok: false, status: 404, message: "Order not found" };
  }
  if (!CODE_DOWNLOAD_STATUSES.has(String(order.status ?? "").toLowerCase())) {
    return {
      ok: false,
      status: 400,
      message: "This order is not in a state where content can be downloaded.",
    };
  }

  const productId = order.items?.[0]?.productId ?? order.productId;
  if (!productId) {
    return { ok: false, status: 404, message: "No content found for this order" };
  }

  const snap = await db
    .collection(PRODUCT_COLLECTION)
    .doc(productId)
    .collection(PRODUCT_CODES_SUBCOLLECTION)
    .where("orderId", "==", orderId)
    .where(ORDER_FIELDS.STATUS, "==", "claimed")
    .limit(1)
    .get();
  if (snap.empty) {
    return { ok: false, status: 404, message: "No content found for this order" };
  }

  const entry = snap.docs[0].data() as ProductCodeDocument;
  if (!entry.assetPath) {
    return {
      ok: false,
      status: 400,
      message: "This delivery is a code, not a downloadable file.",
    };
  }

  try {
    const file = getAdminStorage().bucket().file(entry.assetPath);
    const [buffer] = await file.download();
    return {
      ok: true,
      buffer,
      contentType: entry.contentType ?? "application/octet-stream",
      fileName: entry.fileName ?? "download",
    };
  } catch (err) {
    void normalizeError(err);
    return { ok: false, status: 404, message: "Content is no longer available" };
  }
}

/**
 * The response headers for a delivered asset.
 *
 * 🛑 `attachment`, ALWAYS — even for an image, where `inline` would be friendlier.
 * The upload surface accepts files, `finalize`'s magic-byte check proves what a
 * file IS but not that rendering it is safe, and an HTML document served inline
 * from this origin is stored XSS against a signed-in buyer. `nosniff` closes the
 * other half (a browser guessing `text/html` from content it was told was
 * `application/octet-stream`).
 *
 * `private, no-store` because a shared cache must never hold one buyer's
 * purchase — this URL is identical for every caller and only the session
 * distinguishes them.
 */
export function codeAssetHeaders(
  contentType: string,
  fileName: string,
): Record<string, string> {
  // Strip anything that could break out of the quoted filename or inject a header.
  const safeName = fileName.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "download";
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${safeName}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store, max-age=0",
  };
}
