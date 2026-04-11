"use client";

/**
 * useMedia — upload/crop/trim hooks for @mohasinac/feat-media.
 *
 * Wraps @mohasinac/http apiClient via TanStack Query mutations.
 * Endpoint paths can be overridden per call for non-standard deployments.
 */

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@mohasinac/http";

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
export function useMediaUpload(endpoint = "/api/media/upload") {
  const mutation = useMutation<MediaUploadResult, Error, FormData>({
    mutationFn: (formData) =>
      apiClient.upload<MediaUploadResult>(endpoint, formData),
  });

  const upload = async (
    file: File,
    folder = "uploads",
    isPublic = true,
    context?: Record<string, string>,
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
export function useMediaCrop(endpoint = "/api/media/crop") {
  return useMutation<{ url: string }, Error, MediaCropInput>({
    mutationFn: (data) => apiClient.post<{ url: string }>(endpoint, data),
  });
}

/**
 * useMediaTrim — sends trim params to /api/media/trim.
 */
export function useMediaTrim(endpoint = "/api/media/trim") {
  return useMutation<{ url: string }, Error, MediaTrimInput>({
    mutationFn: (data) => apiClient.post<{ url: string }>(endpoint, data),
  });
}

/**
 * useMediaCleanup — deletes uploaded objects by URL (for aborted forms).
 */
export function useMediaCleanup(endpoint = "/api/media") {
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
