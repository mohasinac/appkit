/**
 * Reads a statutory business document — GST certificate, Udyam registration,
 * bank passbook — and decrypts it for an admin.
 *
 * 🛑 WHY THIS EXISTS rather than a `/media/{slug}` URL. Same two facts that
 * forced `digital-code/download.ts` into the same shape, and either alone is
 * enough:
 *
 *   1. `storage.rules` grants `allow read: if true` on EVERY object in the
 *      bucket. All real access goes through the Admin SDK, so that is an
 *      acceptable safety net — but it means Storage itself protects nothing.
 *   2. `GET /api/media/[...slug]` performs NO authentication. It is a bare
 *      handler with no session read, deliberately, because its job is public
 *      product photography.
 *
 * So the bytes live under a private prefix that mints no `mediaAssets` row —
 * and the row IS the public slug, so no row means no public URL — and are read
 * only from here, after the route has checked the caller is an admin.
 *
 * On top of that, and unlike the digital-code case, these objects are stored
 * ENCRYPTED: a bank passbook sitting in plaintext in a bucket whose rules say
 * `read: if true` would depend entirely on nobody ever minting a slug for it.
 */

import { getAdminStorage } from "../../../../providers/db-firebase";
import { normalizeError } from "../../../../errors/normalize";
import { decryptBuffer, isBufferEncrypted } from "../../../../security/settings-encryption";
import { businessDocumentsRepository } from "../../../../features/business-documents/repository/business-documents.repository";

export interface BusinessDocumentResolution {
  ok: boolean;
  status?: number;
  message?: string;
  buffer?: Buffer;
  contentType?: string;
  fileName?: string;
}

/**
 * Resolve, download and decrypt the document with id `documentId`.
 *
 * The caller is responsible for the authorization check — the route wraps this
 * in `createRouteHandler({ roles: ROLES_ADMIN_ONLY, permission: "settings:write" })`.
 * This function deliberately takes no viewer: there is no per-row ownership to
 * evaluate, so inventing a `viewerUid` parameter it never reads would imply a
 * check that is not happening here.
 */
export async function resolveBusinessDocument(
  documentId: string,
): Promise<BusinessDocumentResolution> {
  const record = await businessDocumentsRepository.findById(documentId);
  if (!record) {
    return { ok: false, status: 404, message: "Document not found" };
  }

  let stored: Buffer;
  try {
    const file = getAdminStorage().bucket().file(record.storagePath);
    const [buffer] = await file.download();
    stored = buffer;
  } catch (err) {
    void normalizeError(err);
    return { ok: false, status: 404, message: "Document is no longer available" };
  }

  /*
   * Branch on the RECORDED flag, never on sniffing the buffer.
   *
   * `isBufferEncrypted` is used only to catch disagreement: a row that claims
   * encryption over an object that has none means the upload half-failed or
   * the object was replaced by hand, and handing those bytes back as though
   * nothing were wrong is how a plaintext passbook gets served while every log
   * line says it was encrypted. Refuse and say which way the mismatch runs.
   */
  if (record.encrypted !== isBufferEncrypted(stored)) {
    return {
      ok: false,
      status: 500,
      message: record.encrypted
        ? "Stored document is not encrypted but its record says it is — refusing to serve it."
        : "Stored document is encrypted but its record says it is not — refusing to guess.",
    };
  }

  let plaintext: Buffer;
  if (record.encrypted) {
    try {
      plaintext = decryptBuffer(stored);
    } catch (err) {
      // A GCM auth failure means the wrong key or a tampered object. Both are
      // worth a 500 and a log; neither is worth telling the caller which.
      void normalizeError(err);
      return { ok: false, status: 500, message: "Document could not be decrypted" };
    }
  } else {
    plaintext = stored;
  }

  return {
    ok: true,
    buffer: plaintext,
    contentType: record.contentType || "application/octet-stream",
    fileName: record.fileName || "document",
  };
}
