import { normalizeError } from "../../errors/normalize";
import { getAdminStorage } from "../../providers/db-firebase";
import type { MediaField } from "./types";
import { mediaAssetsRepository } from "./repository/media-assets.repository";

const TMP_MEDIA_PREFIX = "tmp/";
const FINAL_MEDIA_PREFIX = "media/";
const PROXY_URL_PREFIX = "/media/";

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
 * Promote a staged tmp/* upload to its canonical media/* path.
 *
 * Every producer of these URLs funnels through POST /api/media/finalize,
 * which always returns a single-segment `/media/{shortId}` proxy URL (see
 * that route's `downloadURL` construction) — so that's the only shape this
 * ever needs to handle. Looks up the asset in the mediaAssets Firestore
 * collection, moves the file from tmp/ → media/, updates the storagePath,
 * and returns the same URL unchanged (the URL is stable across the move).
 * Any other input (already-finalized `/media/...` path, or a URL that isn't
 * a `/media/` proxy URL at all) is returned as-is — nothing to promote.
 */
export async function finalizeStagedMediaUrl(url: string): Promise<string> {
  if (!url.startsWith(PROXY_URL_PREFIX)) return url;

  const shortId = url.slice(PROXY_URL_PREFIX.length);
  if (shortId.includes("/")) return url; // not a shortId — nothing to promote

  try {
    const asset = await mediaAssetsRepository.findById(shortId);
    if (asset && asset.status === "staged" && asset.storagePath.startsWith(TMP_MEDIA_PREFIX)) {
      const finalPath = await moveToFinalPath(asset.storagePath);
      await mediaAssetsRepository.promoteToFinalized(shortId, finalPath);
    }
    // Non-fatal by construction: the returned URL is the same before and after
    // the move, so a failed promotion leaves the asset in tmp/ and the proxy
    // keeps serving it from there until the tmp-cleanup job reclaims it.
  } catch (_err) {
    void normalizeError(_err);
  }
  return url; // URL is stable — same before and after the file move
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
