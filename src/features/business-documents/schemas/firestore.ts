/**
 * Business Documents Firestore Document Types & Constants
 *
 * Collection: businessDocuments
 * Document ID: Firestore auto-ID (no slug prefix — same convention as
 * `adminAuditLog` / `notifications` / `sessions` / `jobs`; see CLAUDE.md's
 * "True Firestore auto-IDs" list).
 *
 * The statutory registration documents of the business itself — GST
 * certificate, Udyam registration, bank passbook. These are NOT product media
 * and NOT user uploads; there is exactly one current document per `kind`.
 *
 * ## 🛑 Metadata only. The bytes are never in Firestore.
 *
 * A Firestore document is capped at 1 MiB and the Udyam certificate alone is
 * 680 KB, which base64-encodes to ~907 KB — so an "encrypt the PDF into a
 * string field" design is one slightly larger certificate away from an
 * unrecoverable write failure, at upload time, after the user has handed over
 * the document. The ciphertext lives in Storage; this collection records where.
 *
 * ## 🛑 Why `storagePath` must never be served through /api/media
 *
 * `GET /api/media/[...slug]` applies NO authentication — deliberately, because
 * its job is serving public product photography through a watermarker — and
 * `storage.rules` is `allow read: if true` for every object in the bucket. So
 * the only thing standing between these documents and the public internet is
 * that nothing routes them there, and that they carry no `mediaAssets` row (the
 * row IS the public `/media/<shortId>` slug, so no row means no public URL).
 *
 * Read them through `GET /api/admin/business-documents/[id]` and nothing else.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const BUSINESS_DOCUMENTS_COLLECTION = "businessDocuments";

export const BusinessDocumentKindValues = {
  GST_CERTIFICATE: "gst_certificate",
  UDYAM_CERTIFICATE: "udyam_certificate",
  BANK_PASSBOOK: "bank_passbook",
} as const;

export type BusinessDocumentKind =
  (typeof BusinessDocumentKindValues)[keyof typeof BusinessDocumentKindValues];

export const ALL_BUSINESS_DOCUMENT_KINDS = Object.values(
  BusinessDocumentKindValues,
) as readonly BusinessDocumentKind[];

/**
 * A `Record<BusinessDocumentKind, string>` rather than a lookup with a
 * fallback, so adding a fourth kind is a COMPILE error here instead of
 * rendering as a raw snake_case id in the admin list.
 */
export const BUSINESS_DOCUMENT_KIND_LABELS: Record<BusinessDocumentKind, string> = {
  [BusinessDocumentKindValues.GST_CERTIFICATE]: "GST Certificate",
  [BusinessDocumentKindValues.UDYAM_CERTIFICATE]: "Udyam Registration Certificate",
  [BusinessDocumentKindValues.BANK_PASSBOOK]: "Bank Passbook",
};

export interface BusinessDocumentDocument extends BaseDocument {
  kind: BusinessDocumentKind;
  /**
   * Path inside the Storage bucket, e.g.
   * `private/business-documents/3f2a…-gst-certificate.pdf`.
   *
   * 🛑 Never returned by any API, to anyone. The download route resolves it
   * server-side and streams the decrypted bytes; handing the path to a client
   * would let it be fetched straight from Storage, where the rules permit any
   * read.
   */
  storagePath: string;
  /** Original filename as uploaded — shown in the admin list and used for Content-Disposition. */
  fileName: string;
  /** Verified against the file's magic bytes at upload; never trusted from the client. */
  contentType: string;
  /** Size of the PLAINTEXT, before the envelope. What an admin expects to see downloaded. */
  sizeBytes: number;
  /**
   * Whether the stored object carries the `enc:v1:` binary envelope.
   *
   * Always `true` for anything this codebase writes — `encryptBuffer` throws
   * rather than degrading when `SETTINGS_ENCRYPTION_KEY` is unset, so there is
   * no path that produces a plaintext object. It is recorded anyway because
   * the download route must not GUESS: a future hand-uploaded object would
   * otherwise be fed to `decryptBuffer` and throw an envelope error that
   * describes the crypto rather than the upload.
   */
  encrypted: boolean;
  /** Auth UID of the admin who uploaded it. */
  uploadedBy: string;
  uploadedAt: Date;
}

export const BUSINESS_DOCUMENT_FIELDS = {
  KIND: "kind",
  STORAGE_PATH: "storagePath",
  FILE_NAME: "fileName",
  CONTENT_TYPE: "contentType",
  SIZE_BYTES: "sizeBytes",
  ENCRYPTED: "encrypted",
  UPLOADED_BY: "uploadedBy",
  UPLOADED_AT: "uploadedAt",
  CREATED_AT: "createdAt",
  KIND_VALUES: BusinessDocumentKindValues,
} as const;

/** Storage prefix. Mirrors `private/digital-content/` — outside any public read path. */
export const BUSINESS_DOCUMENTS_STORAGE_PREFIX = "private/business-documents";

/**
 * Accepted upload types. PDFs and scans only.
 *
 * Checked against the file's MAGIC BYTES, not the declared Content-Type: a
 * declared type is a claim by the uploader, and an HTML document served from
 * this origin would be stored XSS against a signed-in admin.
 */
export const BUSINESS_DOCUMENT_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
