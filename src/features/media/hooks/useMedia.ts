"use client";

/**
 * useMedia — upload/crop/trim hooks for @mohasinac/feat-media.
 *
 * Wraps @mohasinac/http apiClient via TanStack Query mutations.
 * Endpoint paths can be overridden per call for non-standard deployments.
 */

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { MediaFilenameContext } from "../../../utils/id-generators";
import { MEDIA_ENDPOINTS } from "../../../constants/api-endpoints";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaUploadResult {
  url: string;
  path?: string;
  filename?: string;
  size?: number;
  type?: string;
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

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * useMediaUpload — uploads a file via FormData to /api/media/upload.
 *
 * @example
 * const { upload, isPending } = useMediaUpload();
 * const url = await upload(file, "products", true);
 */
export function useMediaUpload(endpoint: string = MEDIA_ENDPOINTS.UPLOAD) {
  const mutation = useMutation<MediaUploadResult, Error, FormData>({
    mutationFn: (formData) =>
      apiClient.upload<MediaUploadResult>(endpoint, formData),
  });

  const upload = async (
    file: File,
    folder = "uploads",
    isPublic = true,
    context?: MediaFilenameContext | Record<string, unknown>,
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("public", isPublic.toString());
    if (context) {
      formData.append("context", JSON.stringify(context));
    }
    const data = await mutation.mutateAsync(formData);
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
