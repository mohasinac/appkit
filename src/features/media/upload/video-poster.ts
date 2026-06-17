/**
 * Client-side first-frame extraction for video uploads.
 *
 * The original Phase C plan called for ffmpeg-based extraction inside the
 * /api/media/finalize Vercel route, but ffmpeg-static binaries are ~68 MB
 * and the Vercel Lambda 250 MB cap is already heavily consumed by
 * firebase-admin (~50 MB) + @google-cloud (~80 MB) + sharp (~30 MB).
 * Stacking ffmpeg on top risks the cap — see CLAUDE.md root-cause #6.
 *
 * Client-side capture is the documented fallback: in-browser HTMLVideoElement
 * decodes the first frame, <canvas>.drawImage copies it, .toBlob() serialises
 * it as JPEG. Zero server bundle impact. Works in every modern browser.
 *
 * When extraction fails (codec the browser can't decode, IO error, canvas
 * tainted by cross-origin source), the helper returns `null`. Callers must
 * gracefully degrade to a poster-less video — never throw, never block the
 * upload.
 *
 * The resulting JPEG enters the same image upload pipeline as any other
 * media asset, so the existing server-side Sharp watermark is applied when
 * the poster is fetched via /api/media/<slug>.
 */

const TARGET_FRAME_TIME_SECONDS = 0.5;
const JPEG_QUALITY = 0.85;
const LOAD_TIMEOUT_MS = 10_000;
const POSTER_MIME = "image/jpeg";

export interface ExtractedPoster {
  /** JPEG blob ready to upload alongside the video. */
  blob: Blob;
  /** Frame dimensions in pixels (also the JPEG's pixel dimensions). */
  width: number;
  height: number;
}

/**
 * Build a deterministic filename for the captured poster. We mirror the
 * source video's basename so downstream code can correlate the two assets
 * without a separate metadata field.
 *
 *   captured-poster-filename({ name: "vid-123.mp4" }) === "vid-123.poster.jpg"
 */
export function buildPosterFilename(sourceName: string): string {
  const base = sourceName.replace(/\.[^.]+$/, "");
  return `${base}.poster.jpg`;
}

/**
 * Extract the first decoded frame of a video file as a JPEG blob.
 * Returns `null` (never throws) when extraction fails so callers can
 * proceed without a poster.
 *
 * Browser-only — relies on HTMLVideoElement + HTMLCanvasElement + URL.createObjectURL.
 * Calling from a server component is a programming error and returns `null`.
 */
export async function extractVideoPosterFrame(
  file: File,
): Promise<ExtractedPoster | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  if (!file.type.startsWith("video/")) return null;

  const objectUrl = URL.createObjectURL(file);
  let video: HTMLVideoElement | null = null;

  try {
    video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      const onError = () => reject(new Error("video decode error"));
      const timer = window.setTimeout(
        () => reject(new Error("video load timeout")),
        LOAD_TIMEOUT_MS,
      );
      video!.addEventListener(
        "loadeddata",
        () => {
          window.clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      video!.addEventListener("error", onError, { once: true });
    });

    // Seek slightly past 0 so frames that lead with a black warm-up frame still
    // produce a meaningful poster. If the video is shorter than the target seek
    // time, snap to the duration.
    const seekTo = Math.min(
      TARGET_FRAME_TIME_SECONDS,
      Math.max(0, (video.duration || 0) - 0.05),
    );
    if (Number.isFinite(seekTo) && seekTo > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(
          () => reject(new Error("seek timeout")),
          LOAD_TIMEOUT_MS,
        );
        video!.addEventListener(
          "seeked",
          () => {
            window.clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
        video!.currentTime = seekTo;
      });
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, POSTER_MIME, JPEG_QUALITY),
    );
    if (!blob) return null;

    return { blob, width, height };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
    if (video) {
      video.removeAttribute("src");
      video.load();
    }
  }
}

/** Convenience: wrap the extracted blob as a `File` ready to feed into the upload pipeline. */
export function posterBlobAsFile(
  poster: ExtractedPoster,
  sourceName: string,
): File {
  return new File([poster.blob], buildPosterFilename(sourceName), {
    type: POSTER_MIME,
  });
}
