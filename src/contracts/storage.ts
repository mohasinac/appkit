// ─── Storage Shared Types ─────────────────────────────────────────────────────

export interface UploadOptions {
  contentType?: string;
  cacheControl?: string;
  /** Make the file publicly accessible (default: true) */
  isPublic?: boolean;
  metadata?: Record<string, string>;
}

export interface StorageFile {
  path: string;
  url: string;
  contentType: string;
  size: number;
  updatedAt: string; // ISO-8601
}

// ─── Storage Interface ────────────────────────────────────────────────────────

/**
 * File storage adapter contract.
 * Implemented by @mohasinac/storage-firebase, @mohasinac/storage-s3,
 * @mohasinac/storage-cloudinary, @mohasinac/storage-uploadthing.
 */
export interface IStorageProvider {
  upload(
    file: Buffer,
    path: string,
    options?: UploadOptions,
  ): Promise<StorageFile>;
  delete(path: string): Promise<void>;
  getPublicUrl(path: string): string;
  getSignedUrl(path: string, expiresInSeconds?: number): Promise<string>;
  copy(from: string, to: string): Promise<StorageFile>;
  list(prefix: string): Promise<StorageFile[]>;
}
