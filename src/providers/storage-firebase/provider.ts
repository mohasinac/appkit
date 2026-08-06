/**
 * firebaseStorageProvider — IStorageProvider
 *
 * Implements `@mohasinac/contracts` `IStorageProvider` using the Firebase Admin SDK
 * Cloud Storage.  Server-side only.
 *
 * All operations target the default storage bucket configured via
 * `FIREBASE_ADMIN_STORAGE_BUCKET` or `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.
 *
 * @example
 * ```ts
 * import { firebaseStorageProvider } from "@mohasinac/storage-firebase";
 *
 * const file = await firebaseStorageProvider.upload(
 * buffer,
 * "products/abc123.jpg",
 * { contentType: "image/jpeg" }
 * );
 * console.log(file.url); // Public download URL
 * ```
 */

import type {
  IStorageProvider,
  StorageFile,
  UploadOptions,
} from "../../contracts";
import { getAdminStorageLite } from "../db-firebase/admin-storage-lite";
import { withRetry } from "../../http/retry";
import { normalizeError } from "../../errors/normalize";
import { serverLogger } from "../../monitoring/server-logger";

function getBucket() {
  const bucketName =
    process.env.FIREBASE_ADMIN_STORAGE_BUCKET?.trim() ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  return bucketName
    ? getAdminStorageLite().bucket(bucketName)
    : getAdminStorageLite().bucket();
}

export const firebaseStorageProvider: IStorageProvider = {
  async upload(
    file: Buffer,
    storagePath: string,
    options?: UploadOptions,
  ): Promise<StorageFile> {
    try {
      const bucket = getBucket();
      const fileRef = bucket.file(storagePath);

      await withRetry(
        () =>
          fileRef.save(file, {
            metadata: {
              contentType: options?.contentType ?? "application/octet-stream",
              cacheControl: options?.cacheControl ?? "public, max-age=31536000",
              metadata: options?.metadata ?? {},
            },
            public: options?.isPublic !== false,
          }),
        2,
        300,
      );

      const [metadata] = await withRetry(() => fileRef.getMetadata(), 2, 300);

      const url =
        options?.isPublic !== false
          ? `https://storage.googleapis.com/${bucket.name}/${storagePath}`
          : await withRetry(
              () =>
                fileRef
                  .getSignedUrl({
                    action: "read",
                    expires: Date.now() + 60 * 60 * 1000,
                  })
                  .then(([u]) => u),
              2,
              300,
            );

      return {
        path: storagePath,
        url,
        contentType: metadata.contentType as string,
        size: Number(metadata.size),
        updatedAt: metadata.updated as string,
      };
    } catch (err) {
      void normalizeError(err);
      serverLogger.error("storage-provider: upload failed", {
        storagePath,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  async delete(storagePath: string): Promise<void> {
    try {
      await withRetry(
        () => getBucket().file(storagePath).delete({ ignoreNotFound: true }),
        2,
        300,
      );
    } catch (err) {
      void normalizeError(err);
      serverLogger.error("storage-provider: delete failed", {
        storagePath,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  getPublicUrl(storagePath: string): string {
    const bucket = getBucket();
    return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  },

  async getSignedUrl(
    storagePath: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    try {
      const [url] = await withRetry(
        () =>
          getBucket()
            .file(storagePath)
            .getSignedUrl({
              action: "read",
              expires: Date.now() + expiresInSeconds * 1000,
            }),
        2,
        300,
      );
      return url;
    } catch (err) {
      void normalizeError(err);
      serverLogger.error("storage-provider: getSignedUrl failed", {
        storagePath,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  async copy(from: string, to: string): Promise<StorageFile> {
    try {
      const bucket = getBucket();
      const src = bucket.file(from);
      const dest = bucket.file(to);
      await withRetry(() => src.copy(dest), 2, 300);
      const [metadata] = await withRetry(() => dest.getMetadata(), 2, 300);
      return {
        path: to,
        url: `https://storage.googleapis.com/${bucket.name}/${to}`,
        contentType: metadata.contentType as string,
        size: Number(metadata.size),
        updatedAt: metadata.updated as string,
      };
    } catch (err) {
      void normalizeError(err);
      serverLogger.error("storage-provider: copy failed", {
        from,
        to,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  async list(prefix: string): Promise<StorageFile[]> {
    try {
      const bucket = getBucket();
      const [files] = await withRetry(() => bucket.getFiles({ prefix }), 2, 300);
      return Promise.all(
        files.map(async (f) => {
          const [metadata] = await withRetry(() => f.getMetadata(), 2, 300);
          return {
            path: f.name,
            url: `https://storage.googleapis.com/${bucket.name}/${f.name}`,
            contentType: metadata.contentType as string,
            size: Number(metadata.size),
            updatedAt: metadata.updated as string,
          };
        }),
      );
    } catch (err) {
      void normalizeError(err);
      serverLogger.error("storage-provider: list failed", {
        prefix,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
};
