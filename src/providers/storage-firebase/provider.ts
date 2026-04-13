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
 *   buffer,
 *   "products/abc123.jpg",
 *   { contentType: "image/jpeg" }
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
    const bucket = getBucket();
    const fileRef = bucket.file(storagePath);

    await fileRef.save(file, {
      metadata: {
        contentType: options?.contentType ?? "application/octet-stream",
        cacheControl: options?.cacheControl ?? "public, max-age=31536000",
        metadata: options?.metadata ?? {},
      },
      public: options?.isPublic !== false,
    });

    const [metadata] = await fileRef.getMetadata();

    const url =
      options?.isPublic !== false
        ? `https://storage.googleapis.com/${bucket.name}/${storagePath}`
        : await fileRef
            .getSignedUrl({
              action: "read",
              expires: Date.now() + 60 * 60 * 1000, // 1 hour
            })
            .then(([u]) => u);

    return {
      path: storagePath,
      url,
      contentType: metadata.contentType as string,
      size: Number(metadata.size),
      updatedAt: metadata.updated as string,
    };
  },

  async delete(storagePath: string): Promise<void> {
    await getBucket().file(storagePath).delete({ ignoreNotFound: true });
  },

  getPublicUrl(storagePath: string): string {
    const bucket = getBucket();
    return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  },

  async getSignedUrl(
    storagePath: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const [url] = await getBucket()
      .file(storagePath)
      .getSignedUrl({
        action: "read",
        expires: Date.now() + expiresInSeconds * 1000,
      });
    return url;
  },

  async copy(from: string, to: string): Promise<StorageFile> {
    const bucket = getBucket();
    const src = bucket.file(from);
    const dest = bucket.file(to);
    await src.copy(dest);
    const [metadata] = await dest.getMetadata();
    return {
      path: to,
      url: `https://storage.googleapis.com/${bucket.name}/${to}`,
      contentType: metadata.contentType as string,
      size: Number(metadata.size),
      updatedAt: metadata.updated as string,
    };
  },

  async list(prefix: string): Promise<StorageFile[]> {
    const bucket = getBucket();
    const [files] = await bucket.getFiles({ prefix });
    return Promise.all(
      files.map(async (f) => {
        const [metadata] = await f.getMetadata();
        return {
          path: f.name,
          url: `https://storage.googleapis.com/${bucket.name}/${f.name}`,
          contentType: metadata.contentType as string,
          size: Number(metadata.size),
          updatedAt: metadata.updated as string,
        };
      }),
    );
  },
};
