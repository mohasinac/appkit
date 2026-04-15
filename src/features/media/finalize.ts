import { getAdminStorage } from "../../providers/db-firebase";
import type { MediaField } from "./types";

const TMP_MEDIA_PREFIX = "tmp/";
const FINAL_MEDIA_PREFIX = "media/";

/**
 * Extract a storage object path from public/download URLs for the same bucket.
 */
export function extractStoragePathFromUrl(
  url: string,
  bucketName: string,
): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "storage.googleapis.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && parts[0] === bucketName) {
        return parts.slice(1).join("/");
      }
    }

    if (parsed.hostname === "firebasestorage.googleapis.com") {
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

/** Promote staged tmp/* uploads to canonical media/* path. */
export async function finalizeStagedMediaUrl(url: string): Promise<string> {
  const storage = getAdminStorage();
  const bucket = storage.bucket();
  const sourcePath = extractStoragePathFromUrl(url, bucket.name);

  if (!sourcePath || !sourcePath.startsWith(TMP_MEDIA_PREFIX)) {
    return url;
  }

  const destinationPath = sourcePath.replace(
    TMP_MEDIA_PREFIX,
    FINAL_MEDIA_PREFIX,
  );
  if (destinationPath === sourcePath) {
    return url;
  }

  const sourceFile = bucket.file(sourcePath);
  const destinationFile = bucket.file(destinationPath);

  await sourceFile.copy(destinationFile);
  await destinationFile.makePublic();
  await sourceFile.delete({ ignoreNotFound: true });

  return `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
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
