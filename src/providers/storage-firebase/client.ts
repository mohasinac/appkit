/**
 * Firebase Client Storage Helpers
 *
 * Generic utilities for uploading, downloading, and managing files via the
 * Firebase Client SDK (browser). Accepts a `FirebaseStorage` instance so the
 * caller controls which Firebase app is used.
 *
 * @example
 * ```ts
 * import { storage } from "@/lib/firebase/config";
 * import { createStorageHelpers } from "@mohasinac/appkit/providers/storage-firebase/client";
 *
 * const { uploadFile, deleteFile } = createStorageHelpers(storage);
 * ```
 */

import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
  type FirebaseStorage,
  type UploadResult,
  type UploadTask,
  type StorageReference,
} from "firebase/storage";
import { DatabaseError } from "../../errors";

export const STORAGE_PATHS = {
  USERS: "users",
  PRODUCTS: "products",
  ORDERS: "orders",
  PUBLIC: "public",
} as const;

export interface StorageHelpers {
  uploadFile(
    path: string,
    file: File,
    metadata?: {
      contentType?: string;
      customMetadata?: Record<string, string>;
    },
  ): Promise<{
    url: string;
    ref: StorageReference;
    uploadResult: UploadResult;
  }>;

  uploadFileWithProgress(
    path: string,
    file: File,
    onProgress?: (progress: number) => void,
    metadata?: {
      contentType?: string;
      customMetadata?: Record<string, string>;
    },
  ): UploadTask;

  uploadProfilePhoto(userId: string, file: File): Promise<string>;
  uploadDocument(userId: string, file: File, folder?: string): Promise<string>;
  getFileUrl(path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
  deleteProfilePhoto(userId: string): Promise<void>;
  listFiles(folderPath: string): Promise<StorageReference[]>;
  getFileMetadata(path: string): ReturnType<typeof getMetadata>;
  updateFileMetadata(
    path: string,
    metadata: { contentType?: string; customMetadata?: Record<string, string> },
  ): ReturnType<typeof updateMetadata>;
  deleteFolder(folderPath: string): Promise<void>;
}

/** Create a set of storage helpers bound to a given FirebaseStorage instance. */
export function createStorageHelpers(storage: FirebaseStorage): StorageHelpers {
  async function uploadFile(
    path: string,
    file: File,
    metadata?: {
      contentType?: string;
      customMetadata?: Record<string, string>;
    },
  ): Promise<{
    url: string;
    ref: StorageReference;
    uploadResult: UploadResult;
  }> {
    try {
      const storageRef = ref(storage, path);
      const uploadResult = await uploadBytes(storageRef, file, {
        contentType: metadata?.contentType || file.type,
        customMetadata: metadata?.customMetadata || {},
      });
      const url = await getDownloadURL(uploadResult.ref);
      return { url, ref: uploadResult.ref, uploadResult };
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to upload file";
      throw new DatabaseError(msg, {
        path,
        fileType: file.type,
        fileName: file.name,
      });
    }
  }

  function uploadFileWithProgress(
    path: string,
    file: File,
    onProgress?: (progress: number) => void,
    metadata?: {
      contentType?: string;
      customMetadata?: Record<string, string>;
    },
  ): UploadTask {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: metadata?.contentType || file.type,
      customMetadata: metadata?.customMetadata || {},
    });
    task.on("state_changed", (snapshot) => {
      onProgress?.((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
    });
    return task;
  }

  async function uploadProfilePhoto(
    userId: string,
    file: File,
  ): Promise<string> {
    const { url } = await uploadFile(
      `${STORAGE_PATHS.USERS}/${userId}/profile.jpg`,
      file,
      {
        contentType: "image/jpeg",
        customMetadata: { userId, type: "profile" },
      },
    );
    return url;
  }

  async function uploadDocument(
    userId: string,
    file: File,
    folder = "documents",
  ): Promise<string> {
    const { url } = await uploadFile(
      `${STORAGE_PATHS.USERS}/${userId}/${folder}/${Date.now()}_${file.name}`,
      file,
      { contentType: file.type, customMetadata: { userId, folder } },
    );
    return url;
  }

  async function getFileUrl(path: string): Promise<string> {
    try {
      return await getDownloadURL(ref(storage, path));
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to get file URL";
      throw new DatabaseError(msg, { path });
    }
  }

  async function deleteFile(path: string): Promise<void> {
    try {
      await deleteObject(ref(storage, path));
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to delete file";
      throw new DatabaseError(msg, { path });
    }
  }

  async function deleteProfilePhoto(userId: string): Promise<void> {
    await deleteFile(`${STORAGE_PATHS.USERS}/${userId}/profile.jpg`);
  }

  async function listFiles(folderPath: string): Promise<StorageReference[]> {
    try {
      const result = await listAll(ref(storage, folderPath));
      return result.items;
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to list files";
      throw new DatabaseError(msg, { folderPath });
    }
  }

  function getFileMetadata(path: string) {
    return getMetadata(ref(storage, path));
  }

  function updateFileMetadata(
    path: string,
    metadata: { contentType?: string; customMetadata?: Record<string, string> },
  ) {
    return updateMetadata(ref(storage, path), metadata);
  }

  async function deleteFolder(folderPath: string): Promise<void> {
    const files = await listFiles(folderPath);
    await Promise.all(files.map((f) => deleteObject(f)));
  }

  return {
    uploadFile,
    uploadFileWithProgress,
    uploadProfilePhoto,
    uploadDocument,
    getFileUrl,
    deleteFile,
    deleteProfilePhoto,
    listFiles,
    getFileMetadata,
    updateFileMetadata,
    deleteFolder,
  };
}

// ─── File validation helpers (pure, no storage instance needed) ───────────────

export function validateFileSize(file: File, maxSizeMB = 10): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

export function validateFileType(
  file: File,
  allowedTypes = ["image/jpeg", "image/png", "image/webp"],
): boolean {
  return allowedTypes.includes(file.type);
}

export function validateImage(
  file: File,
  maxSizeMB = 10,
): { valid: boolean; error?: string } {
  if (!validateFileType(file)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Use JPEG, PNG, or WebP.`,
    };
  }
  if (!validateFileSize(file, maxSizeMB)) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit.` };
  }
  return { valid: true };
}
