/**
 * Seed-time media URL helper.
 *
 * Wraps a 3rd-party image/video URL in the /api/media/ext proxy path so
 * seed data never persists raw upstream URLs. The proxy adds watermarking,
 * survives upstream rate-limits, and keeps CSP / image hosts under our
 * control.
 *
 * Companion runtime helper: `resolveMediaUrl()` in ../../utils/media-url.ts
 * — defends consumers that still see raw URLs (e.g. live Firestore reads
 * from older docs). Both produce the same `/api/media/ext?url=<encoded>`
 * shape for external https URLs.
 *
 * Idempotent: already-proxied URLs (`/media/...` or `/api/media/ext?url=...`)
 * pass through untouched, so wrapping a wrapped URL is safe.
 */
import { MEDIA_ENDPOINTS } from "../../constants/api-endpoints";

const PROXY_PREFIX = "/media/";
const EXT_PREFIX = "/api/media/ext?url=";

export function seedExtMedia(url: string): string {
  if (url.startsWith(PROXY_PREFIX)) return url;
  if (url.startsWith(EXT_PREFIX)) return url;
  return MEDIA_ENDPOINTS.EXT_URL(url);
}
