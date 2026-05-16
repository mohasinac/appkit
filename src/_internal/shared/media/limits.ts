/**
 * Media upload limits — single source of truth for byte ceilings, MIME
 * allowlists, and extension mapping. Shared between the signed-URL issuer,
 * the finalize handler, the client upload hook, and any field-level
 * pre-validation.
 *
 * Why centralised: previously these constants were duplicated across
 * `/api/media/upload`, `/api/media/crop`, and the React hook — drifting
 * allowlists were the surface area Z2 had to chase down.
 */

export const MEGABYTE = 1024 * 1024;

export const MAX_IMAGE_BYTES = 10 * MEGABYTE;
export const MAX_PDF_BYTES = 20 * MEGABYTE;
export const MAX_VIDEO_BYTES = 50 * MEGABYTE;

export type MediaKind = "image" | "video" | "pdf";

export const MAX_LABEL: Record<MediaKind, string> = {
  image: "10MB",
  video: "50MB",
  pdf: "20MB",
};

export const MAX_BYTES: Record<MediaKind, number> = {
  image: MAX_IMAGE_BYTES,
  video: MAX_VIDEO_BYTES,
  pdf: MAX_PDF_BYTES,
};

// Image allowlist — kept conservative; SVG intentionally excluded (XSS surface).
export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

// Video allowlist — Z2 widening: phone-camera 3GPP captures + Matroska container.
// `video/x-matroska` covers .mkv from desktop encoders; `video/3gpp` + `video/3gpp2`
// cover legacy Android/iOS camera output.
export const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/3gpp",
  "video/3gpp2",
  "video/x-matroska",
] as const;

export const ALLOWED_DOC_MIMES = ["application/pdf"] as const;

export const ALLOWED_MIMES = [
  ...ALLOWED_IMAGE_MIMES,
  ...ALLOWED_VIDEO_MIMES,
  ...ALLOWED_DOC_MIMES,
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];
export type AllowedVideoMime = (typeof ALLOWED_VIDEO_MIMES)[number];
export type AllowedDocMime = (typeof ALLOWED_DOC_MIMES)[number];
export type AllowedMime = (typeof ALLOWED_MIMES)[number];

export const ALLOWED_TYPES_LABEL =
  "JPEG, PNG, GIF, WebP, MP4, WebM, QuickTime, 3GP, MKV, PDF";

// Server-detected MIME → canonical filename extension. The browser-supplied
// File.type is untrusted; the server picks the ext from the detected MIME.
export const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/3gpp": "3gp",
  "video/3gpp2": "3g2",
  "video/x-matroska": "mkv",
  "application/pdf": "pdf",
};

export function classifyMime(mime: string): MediaKind | null {
  if ((ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime)) return "image";
  if ((ALLOWED_VIDEO_MIMES as readonly string[]).includes(mime)) return "video";
  if ((ALLOWED_DOC_MIMES as readonly string[]).includes(mime)) return "pdf";
  return null;
}

export function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIMES as readonly string[]).includes(mime);
}

export function maxBytesFor(mime: string): number | null {
  const kind = classifyMime(mime);
  return kind ? MAX_BYTES[kind] : null;
}

export const PDF_MAGIC = "%PDF-";

// Known-but-rejected video formats. Mapping returns a user-actionable
// conversion hint so the upload error can say "convert your .avi to .mp4"
// rather than the generic "invalid type" response.
const HINT_HEVC = "HEVC (H.265) video is accepted but doesn't preview in most browsers — please convert to MP4 (H.264) or WebM for in-browser playback";

export const VIDEO_CONVERSION_HINTS: Record<string, string> = {
  "video/x-msvideo": "AVI is not supported — please convert to MP4 or WebM",
  "video/avi": "AVI is not supported — please convert to MP4 or WebM",
  "video/MP2T": "M2TS/TS streams are not supported — please convert to MP4",
  "video/mp2t": "M2TS/TS streams are not supported — please convert to MP4",
  "video/x-flv": "FLV is not supported — please convert to MP4",
  "video/x-ms-wmv": "WMV is not supported — please convert to MP4",
  // SB-UNI-Z4 2026-05-13 — HEVC / H.265 + HEIC/HEIF preview hint. The bytes
  // upload fine via the signed-URL flow; the issue is in-browser preview —
  // most browsers can't decode HEVC inline without an OS codec license.
  "video/hevc": HINT_HEVC,
  "video/x-hevc": HINT_HEVC,
  "video/H265": HINT_HEVC,
  "image/heic": "HEIC image is accepted but doesn't preview in most browsers — please convert to JPEG or WebP for inline preview",
  "image/heif": "HEIF image is accepted but doesn't preview in most browsers — please convert to JPEG or WebP for inline preview",
};

export function getConversionHint(mime: string): string | null {
  return VIDEO_CONVERSION_HINTS[mime] ?? null;
}
