import { z } from "zod";

export type MediaFieldType = "image" | "video" | "file";

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
