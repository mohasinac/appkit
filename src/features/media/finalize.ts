import { getAdminStorage } from "../../providers/db-firebase";
import { FIREBASE_STORAGE_HOST, GCS_HOST } from "../../utils/media-url";
import type { MediaField } from "./types";
import { mediaAssetsRepository } from "./repository/media-assets.repository";

const TMP_MEDIA_PREFIX = "tmp/";
const FINAL_MEDIA_PREFIX = "media/";
const PROXY_URL_PREFIX = "/media/";

/**
 * Extract a storage object path from public/download URLs for the same bucket.
 */
export function extractStoragePathFromUrl(
  url: string,
  bucketName: string,
): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === GCS_HOST) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && parts[0] === bucketName) {
        return parts.slice(1).join("/");
      }
    }

    if (parsed.hostname === FIREBASE_STORAGE_HOST) {
      const match = parsed.pathname.match(/\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (match && match[1] === bucketName) {
        return decodeURIComponent(match[2]);
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Move a file from tmp/ to media/ in Firebase Storage.
 * Returns the new storage path.
 */
async function moveToFinalPath(sourcePath: string): Promise<string> {
  const storage = getAdminStorage();
  const bucket = storage.bucket();
  const destinationPath = sourcePath.replace(TMP_MEDIA_PREFIX, FINAL_MEDIA_PREFIX);
  if (destinationPath === sourcePath) return sourcePath;

  const sourceFile = bucket.file(sourcePath);
  const destinationFile = bucket.file(destinationPath);
  await sourceFile.copy(destinationFile);
  await sourceFile.delete({ ignoreNotFound: true });
  return destinationPath;
}

/**
 * Promote staged tmp/* uploads to canonical media/* path.
 *
 * Handles two URL formats:
 *  1. `/media/{shortId}` — the new SEO-friendly short-ID format.
 *     Looks up the asset in the mediaAssets Firestore collection, moves the
 *     file from tmp/ → media/, updates the storagePath, and returns the same
 *     URL unchanged (the URL is stable across the move).
 *  2. Raw GCS URLs (`https://storage.googleapis.com/...` or Firebase Storage URLs) —
 *     legacy path kept for backward compatibility; moves the file and returns a
 *     /media/{finalStoragePath} proxy URL.
 */
export async function finalizeStagedMediaUrl(url: string): Promise<string> {
  // ── Path 1: /media/{shortId} proxy URLs (new system) ──────────────────────
  if (url.startsWith(PROXY_URL_PREFIX)) {
    const afterPrefix = url.slice(PROXY_URL_PREFIX.length);

    // Single-segment = shortId. Multi-segment = legacy raw path embedded in URL.
    if (!afterPrefix.includes("/")) {
      const shortId = afterPrefix;
      try {
        const asset = await mediaAssetsRepository.findById(shortId);
        if (asset && asset.status === "staged" && asset.storagePath.startsWith(TMP_MEDIA_PREFIX)) {
          const finalPath = await moveToFinalPath(asset.storagePath);
          await mediaAssetsRepository.promoteToFinalized(shortId, finalPath);
        }
      } catch {
        // Non-fatal: URL is still valid; proxy will serve whatever storagePath points to.
      }
      return url; // URL is stable — same before and after the file move
    }

    // Multi-segment legacy: /media/tmp/folder/uid/file.jpg → move + return proxy URL
    const rawPath = afterPrefix;
    if (rawPath.startsWith(TMP_MEDIA_PREFIX)) {
      try {
        const finalPath = await moveToFinalPath(rawPath);
        return `${PROXY_URL_PREFIX}${finalPath}`;
      } catch {
        return url;
      }
    }
    return url; // already at media/ or other path — no-op
  }

  // ── Path 2: Legacy raw GCS URLs ────────────────────────────────────────────
  const storage = getAdminStorage();
  const bucket = storage.bucket();
  const sourcePath = extractStoragePathFromUrl(url, bucket.name);

  if (!sourcePath || !sourcePath.startsWith(TMP_MEDIA_PREFIX)) {
    return url;
  }

  const finalPath = await moveToFinalPath(sourcePath);
  return `${PROXY_URL_PREFIX}${finalPath}`;
}

export async function finalizeStagedMediaField(
  url: string | null | undefined,
): Promise<string | undefined> {
  if (!url) return url ?? undefined;
  return finalizeStagedMediaUrl(url);
}

export async function finalizeStagedMediaArray(
  urls: string[] | null | undefined,
): Promise<string[]> {
  if (!urls || urls.length === 0) return urls ?? [];
  return Promise.all(urls.map(finalizeStagedMediaUrl));
}

export async function finalizeStagedMediaObject(
  media: MediaField | null | undefined,
): Promise<MediaField | undefined> {
  if (!media) return undefined;

  return {
    ...media,
    url: await finalizeStagedMediaUrl(media.url),
    thumbnailUrl: await finalizeStagedMediaField(media.thumbnailUrl),
  };
}

export async function finalizeStagedMediaObjectArray(
  media: MediaField[] | null | undefined,
): Promise<MediaField[]> {
  if (!media || media.length === 0) return media ?? [];

  return Promise.all(media.map((item) => finalizeStagedMediaObject(item))).then(
    (items) => items.filter((item): item is MediaField => Boolean(item)),
  );
}
