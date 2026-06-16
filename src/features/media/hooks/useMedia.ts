/**
 * useMedia — upload/crop/trim hooks for @mohasinac/feat-media.
 *
 * useMediaUpload uses the signed-URL flow:
 *   1. POST /api/media/sign — server issues v4 signed PUT URL
 *   2. PUT directly to GCS — bytes bypass the Vercel function (Rule #6)
 *   3. POST /api/media/finalize — server runs magic-byte check + returns URL
 *
 * The hook surface (`upload(file, folder, isPublic, context) => Promise<string>`)
 * is unchanged so existing field components (MediaUploadField, MediaUploadList,
 * ImageUpload, MediaPickerModal) keep working without modification.
 */

import { useMutation } from "@tanstack/react-query";
import type { JsonValue } from "@mohasinac/appkit";
import { apiClient } from "../../../http";
import {
  classifyMime,
  MAX_BYTES,
  MAX_LABEL,
  isAllowedMime,
} from "../../../_internal/shared/media/limits";
import type { MediaFilenameContext } from "../../../utils/id-generators";
import { MEDIA_ENDPOINTS } from "../../../constants/api-endpoints";

// --- Types --------------------------------------------------------------------

export interface MediaUploadResult {
  url: string;
  path?: string;
  filename?: string;
  size?: number;
  type?: string;
}

interface SignResponse {
  uploadUrl: string;
  storagePath: string;
  filename: string;
  contentType: string;
  isPublic: boolean;
  expiresAt: string;
}

interface UploadVariables {
  file: File;
  folder: string;
  isPublic: boolean;
  context?: MediaFilenameContext | Record<string, JsonValue>;
}

export interface MediaCropInput {
  sourceUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  outputFolder?: string;
  outputFormat?: "jpeg" | "png" | "webp";
  quality?: number;
}

export interface MediaTrimInput {
  sourceUrl: string;
  startTime: number;
  endTime: number;
  outputFolder?: string;
  outputFormat?: "mp4" | "webm";
  quality?: "low" | "medium" | "high";
}

// --- Hooks --------------------------------------------------------------------

/**
 * useMediaUpload — uploads a file via the signed-URL flow.
 *
 * @example
 * const { upload, isPending } = useMediaUpload();
 * const url = await upload(file, "products", true);
 */
export function useMediaUpload(
  endpoints: { sign?: string; finalize?: string } = {},
) {
  const signEndpoint = endpoints.sign ?? MEDIA_ENDPOINTS.SIGN;
  const finalizeEndpoint = endpoints.finalize ?? MEDIA_ENDPOINTS.FINALIZE;

  const mutation = useMutation<MediaUploadResult, Error, UploadVariables>({
    mutationFn: async ({ file, folder, isPublic, context }) => {
      const contentType = file.type;

      // Client-side precheck — fail fast before any network call. Catches
      // image-vs-video kind mismatch and oversize files with the same
      // user-facing message the server would have returned.
      if (!isAllowedMime(contentType)) {
        throw new Error(
          `Unsupported file type: ${contentType || "unknown"}`,
        );
      }
      const kind = classifyMime(contentType)!;
      if (file.size > MAX_BYTES[kind]) {
        throw new Error(
          `File too large — ${kind} uploads must be ≤ ${MAX_LABEL[kind]}`,
        );
      }

      const signResponse = await apiClient.post<SignResponse>(signEndpoint, {
        contentType,
        size: file.size,
        folder,
        isPublic,
        context,
      });

      // PUT bytes directly to Cloud Storage. The browser does NOT send
      // credentials and the bucket must allow the request origin via CORS.
      const putResponse = await fetch(signResponse.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": signResponse.contentType },
      });
      if (!putResponse.ok) {
        throw new Error(
          `Storage PUT failed with status ${putResponse.status}`,
        );
      }

      return apiClient.post<MediaUploadResult>(finalizeEndpoint, {
        storagePath: signResponse.storagePath,
        isPublic,
      });
    },
  });

  const upload = async (
    file: File,
    folder = "uploads",
    isPublic = true,
    context?: MediaFilenameContext | Record<string, JsonValue>,
  ): Promise<string> => {
    const data = await mutation.mutateAsync({ file, folder, isPublic, context });
    return data.url;
  };

  return { ...mutation, upload };
}

/**
 * useMediaCrop — sends pixel-crop params to /api/media/crop.
 */
export function useMediaCrop<TResult = { url: string }>(
  endpoint: string = MEDIA_ENDPOINTS.CROP,
) {
  return useMutation<TResult, Error, MediaCropInput>({
    mutationFn: (data) => apiClient.post<TResult>(endpoint, data),
  });
}

/**
 * useMediaTrim — sends trim params to /api/media/trim.
 */
export function useMediaTrim<TResult = { url: string }>(
  endpoint: string = MEDIA_ENDPOINTS.TRIM,
) {
  return useMutation<TResult, Error, MediaTrimInput>({
    mutationFn: (data) => apiClient.post<TResult>(endpoint, data),
  });
}

/**
 * useMediaAbort — compatibility alias for staged-media cleanup.
 */
export function useMediaAbort(endpoint: string = MEDIA_ENDPOINTS.BASE) {
  const { cleanup } = useMediaCleanup(endpoint);
  return cleanup;
}

/**
 * useMediaCleanup — deletes uploaded objects by URL (for aborted forms).
 */
export function useMediaCleanup(endpoint: string = MEDIA_ENDPOINTS.BASE) {
  const mutation = useMutation<void, Error, string[]>({
    mutationFn: async (urls) => {
      await Promise.all(
        urls.map(async (url) => {
          const encoded = encodeURIComponent(url);
          await apiClient.delete(`${endpoint}?url=${encoded}`);
        }),
      );
    },
  });

  const cleanup = async (urls: string[]) => {
    const unique = Array.from(new Set(urls.filter(Boolean)));
    if (unique.length === 0) return;
    await mutation.mutateAsync(unique);
  };

  return { ...mutation, cleanup };
}
