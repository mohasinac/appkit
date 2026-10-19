/**
 * downscaleImageFile — bound an image's pixel dimensions and re-encode it
 * before it ever leaves the browser.
 *
 * ## Why this exists
 *
 * Until 2026-10-19 the ONLY client-side resize in the whole upload path was
 * inside `ImageEditor` (`modals/ImageEditor.tsx`), which runs only when the
 * user opens the crop editor. Everything else stored the original bytes: a 9 MB
 * phone photo was stored at 9 MB, watermarked at 9 MB, and served at 9 MB into
 * a 64px thumbnail, because `/api/media/[...slug]` resizes nothing and
 * `next/image` optimisation was off.
 *
 * That is the shape of the cost that suspended this project with HTTP 402 for
 * Fast Origin Transfer at 5.25x its cap (Root Cause #104). Bounding the master
 * at upload is the one fix that helps every downstream consumer at once.
 *
 * ## Why 2048
 *
 * Measured (docs/research/competitor-crawl-2026-10/images.md): worldhobbyshop
 * serves a 2048x2048 master to photoswipe for zoom, and WordPress's own
 * `-scaled` threshold is 2560. 2048 survives our lightbox's 300% zoom over a
 * ~680px display box with detail to spare, and is 1/4 the pixels of a 4096px
 * phone capture.
 *
 * ## Four cases where it deliberately returns the ORIGINAL file
 *
 * 1. **Not a raster image we own the pipeline for** — anything outside
 *    `CONVERTIBLE_MIMES`. SVG is never rasterised (it is also not in
 *    `ALLOWED_IMAGE_MIMES`), and GIF is never touched because re-encoding an
 *    animated GIF to a still WebP silently destroys the animation.
 * 2. **Already small enough AND already a compact format** — re-encoding a
 *    1200px WebP buys nothing and loses a generation of quality.
 * 3. **The re-encode came out BIGGER.** A small, already-optimised JPEG can
 *    grow under WebP q0.9. Shipping the larger file would make this helper a
 *    pessimisation, so the original wins.
 * 4. **Anything threw.** 🛑 Fail OPEN. A canvas decode failure, a tainted
 *    canvas, a browser without `createImageBitmap` — none of those are a reason
 *    to block a seller's upload. The server still enforces `MAX_BYTES[kind]`,
 *    so the worst case is the pre-2026-10-19 behaviour, not a hole.
 */

/** Longest edge, in CSS pixels, of the stored master. */
export const IMAGE_DOWNSCALE_MAX_EDGE = 2048;

/** Output MIME for a re-encoded master. */
export const IMAGE_DOWNSCALE_FORMAT = "image/webp";

/** Output quality for a re-encoded master. */
export const IMAGE_DOWNSCALE_QUALITY = 0.9;

/**
 * MIMEs this helper is willing to decode and re-encode.
 *
 * 🛑 Deliberately NOT derived from `ALLOWED_IMAGE_MIMES` — that list is about
 * what the server will STORE, this one is about what a canvas may safely
 * round-trip. `image/gif` is in the first and must stay out of the second
 * (animation loss), and the two lists answering different questions is exactly
 * why one must not be spelled in terms of the other.
 */
const CONVERTIBLE_MIMES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

/** Formats already compact enough that a same-size re-encode is pointless. */
const ALREADY_COMPACT = new Set(["image/webp", "image/avif"]);

export interface DownscaleImageOptions {
  /** Longest edge of the output. Default `IMAGE_DOWNSCALE_MAX_EDGE`. */
  maxEdge?: number;
  /** Output MIME. Default `IMAGE_DOWNSCALE_FORMAT`. */
  format?: string;
  /** Output quality, 0..1. Default `IMAGE_DOWNSCALE_QUALITY`. */
  quality?: number;
}

function replaceExtension(name: string, mime: string): string {
  const ext = mime.split("/")[1] || "webp";
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return `${stem}.${ext}`;
}

async function decode(file: File): Promise<{ width: number; height: number; source: CanvasImageSource; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { width: bitmap.width, height: bitmap.height, source: bitmap, release: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image decode failed"));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      source: img,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

export async function downscaleImageFile(
  file: File,
  options: DownscaleImageOptions = {},
): Promise<File> {
  const maxEdge = options.maxEdge ?? IMAGE_DOWNSCALE_MAX_EDGE;
  const format = options.format ?? IMAGE_DOWNSCALE_FORMAT;
  const quality = options.quality ?? IMAGE_DOWNSCALE_QUALITY;

  // Case 1 — not something we are willing to round-trip through a canvas.
  if (!CONVERTIBLE_MIMES.has(file.type)) return file;

  let decoded: Awaited<ReturnType<typeof decode>> | null = null;
  try {
    decoded = await decode(file);
    const { width, height, source } = decoded;
    if (!width || !height) return file;

    const longest = Math.max(width, height);
    const scale = longest > maxEdge ? maxEdge / longest : 1;

    // Case 2 — small enough already, and re-encoding would only lose a generation.
    if (scale === 1 && ALREADY_COMPACT.has(file.type)) return file;

    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, format, quality),
    );
    if (!blob || blob.size === 0) return file;

    // Case 3 — the re-encode is bigger than what we started with.
    if (blob.size >= file.size && scale === 1) return file;

    return new File([blob], replaceExtension(file.name, format), {
      type: format,
      lastModified: file.lastModified,
    });
  } catch {
    // Case 4 — fail open. See the header.
    return file;
  } finally {
    decoded?.release();
  }
}
