import { MEDIA_ENDPOINTS } from "../constants/api-endpoints";

/**
 * Single source of truth for the Firebase Storage host literal. Every other
 * appkit + consumer module that needs to detect or allowlist this host
 * imports this constant — `audit-firestore-storage-urls` allowlists this
 * file as the sole literal declaration site.
 */
export const FIREBASE_STORAGE_HOST = "firebasestorage.googleapis.com";
/** Google Cloud Storage host (used by public-asset URLs). */
export const GCS_HOST = "storage.googleapis.com";
const PROXY_PREFIX = "/media/";

/**
 * Normalise any image URL so it goes through the watermark proxy:
 *  - /media/<path>         → return as-is (already proxied via Firebase Storage)
 *  - Firebase Storage URL  → extract /o/ path → /media/<path>
 *  - Any other absolute URL → /api/media/ext?url=<encoded> (ext watermark proxy)
 *  - Relative / data: URI  → return as-is
 *  - Falsy                 → undefined
 */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith(PROXY_PREFIX)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith(FIREBASE_STORAGE_HOST)) {
      const m = parsed.pathname.match(/\/o\/([^?]+)/);
      if (m) return `${PROXY_PREFIX}${decodeURIComponent(m[1])}`;
    }
    return MEDIA_ENDPOINTS.EXT_URL(url);
  } catch {
    return url;
  }
}
