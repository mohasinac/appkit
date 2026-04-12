import { z } from "zod";

export type MediaFieldType = "image" | "video" | "file";

export type MediaFieldInput = MediaField | string | null | undefined;

export interface MediaField {
  url: string;
  type: MediaFieldType;
  alt?: string;
  thumbnailUrl?: string;
}

export const mediaFieldSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "video", "file"]),
  alt: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
});

export function coerceMediaField(
  value: MediaFieldInput,
  fallbackType: MediaFieldType = "image",
): MediaField | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return {
      url: value,
      type: fallbackType,
    };
  }

  return value;
}

export function coerceMediaFieldArray(
  values: Array<MediaField | string> | null | undefined,
  fallbackType: MediaFieldType = "image",
): MediaField[] {
  if (!values || values.length === 0) {
    return [];
  }

  return values
    .map((value) => coerceMediaField(value, fallbackType))
    .filter((value): value is MediaField => value !== null);
}

export function getMediaUrl(value: MediaFieldInput): string | undefined {
  return coerceMediaField(value)?.url;
}

export function inferMediaTypeFromMime(
  mimeType?: string,
  url?: string,
): MediaFieldType {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("video/")) return "video";

  if (url) {
    if (/\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url)) return "image";
    if (/\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url)) return "video";
  }

  return "file";
}
