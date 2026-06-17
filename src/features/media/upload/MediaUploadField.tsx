"use client"
/**
 * MediaUploadField — single-file upload field for @mohasinac/feat-media.
 *
 * For video: optionally opens VideoTrimModal then VideoThumbnailSelector after upload.
 * Stage locally → caller-provided onUpload() → sign+PUT+finalize signed-URL flow.
 */

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { useCamera } from "../../../react";
import { Alert, Anchor, Button, Div, Label, Row, Span, Spinner, Stack, Text } from "../../../ui";
import { MediaImage } from "../MediaImage";
import { MediaVideo } from "../MediaVideo";
import { VideoTrimModal } from "../modals/VideoTrimModal";
import { VideoThumbnailSelector } from "../modals/VideoThumbnailSelector";
import CameraCapture from "./CameraCapture";
import { extractVideoPosterFrame, posterBlobAsFile } from "./video-poster";
import { inferMediaTypeFromMime, type MediaField } from "../types/index";

import { normalizeError } from "../../../errors/normalize";
const __P = {
  p3: "p-3",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

/**
 * SB-UNI-Z5 2026-05-13 — `kind` prop UX sugar. When set, the component
 * auto-derives `accept` + `maxSizeMB` from the canonical media-limits
 * registry so callers don't have to remember the MIME list per type.
 * Explicit `accept` / `maxSizeMB` props still win when provided.
 */
export type MediaUploadFieldKind = "image" | "video" | "pdf" | "auto";

const CLS_PDF_BADGE = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-error-surface text-error dark:bg-error-surface dark:text-error";
const CLS_PDF_NAME = "text-sm font-medium text-info underline break-all dark:text-info";
const CLS_PDF_LINK = "text-sm underline break-all text-info dark:text-info";

const KIND_DEFAULTS: Record<
  Exclude<MediaUploadFieldKind, "auto">,
  { accept: string; maxSizeMB: number }
> = {
  image: { accept: "image/*", maxSizeMB: 25 },
  video: { accept: "video/*", maxSizeMB: 200 },
  pdf: { accept: "application/pdf", maxSizeMB: 10 },
};

const AUTO_KIND_DEFAULTS = {
  accept: "image/*,video/*,application/pdf",
  maxSizeMB: 200,
};

export interface MediaUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onChangeField?: (media: MediaField | null) => void;
  onUpload: (file: File) => Promise<string>;
  accept?: string;
  maxSizeMB?: number;
  /**
   * SB-UNI-Z5 2026-05-13 — derives `accept` + `maxSizeMB` defaults when
   * those props aren't explicitly set. Useful so per-context fields
   * (avatar = "image", product video = "video", etc.) don't have to
   * duplicate the MIME list. Explicit `accept` / `maxSizeMB` override.
   */
  kind?: MediaUploadFieldKind;
  disabled?: boolean;
  helperText?: string;
  captureSource?: "file-only" | "camera-only" | "both";
  captureMode?: "photo" | "video" | "both";
  enableTrim?: boolean;
  enableThumbnail?: boolean;
  onThumbnailChange?: (url: string) => void;
  /** Show a "YouTube URL" tab to embed a YouTube video by ID or URL. */
  showYoutube?: boolean;
  /** Show an "External URL" tab to link a third-party image/video URL. */
  showExternal?: boolean;
  /**
   * Called with every URL that was staged (uploaded) but never persisted.
   * The parent form should call `DELETE /api/media?url=…` for each entry.
   */
  onAbort?: (stagedUrls: string[]) => void;
  /**
   * Called whenever staged URLs change.
   */
  onStagedUrlsChange?: (stagedUrls: string[]) => void;
  /**
   * Set true after successful save to prevent auto-cleanup on unmount.
   */
  isPersisted?: boolean;
  /** Allow selecting multiple files at once. Each is uploaded individually. */
  multiple?: boolean;
  /** Called with each successfully uploaded URL when `multiple` is true. */
  onAddUrl?: (url: string) => void;
  /**
   * Phase-D (2026-06-17). When `true` (the default), every uploaded video
   * has its first frame extracted client-side via `extractVideoPosterFrame()`,
   * uploaded via the same `onUpload` callback, and surfaced as a poster
   * (`thumbnailUrl` on the `MediaField` callback, + `onThumbnailChange`).
   *
   * Set `false` to opt out — e.g. when the consumer prefers to source a
   * poster from another origin or skip posters entirely.
   *
   * No-op when the source is not a video. No-op when extraction fails
   * (browser codec gap, IO error). Never blocks the video upload.
   */
  autoCapturePoster?: boolean;
}

function isVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url);
}

function isImage(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url);
}

function isPdf(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

function isPdfAccept(accept: string): boolean {
  return accept
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .some((s) => s === "application/pdf" || s === ".pdf");
}

function filenameFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/");
    return decodeURIComponent(parts[parts.length - 1] || url);
  } catch {
    return url;
  }
}

type MediaSourceTab = "upload" | "youtube" | "external";

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  // Already just an ID (11 chars, alphanumeric + _ -)
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    return (
      url.searchParams.get("v") ||
      (url.hostname === "youtu.be" ? url.pathname.slice(1) : null)
    );
  } catch {
    return null;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function YoutubeTabPanel({
  ytInput,
  setYtInput,
  ytError,
  setYtError,
  onApply,
  value,
}: {
  ytInput: string;
  setYtInput: (v: string) => void;
  ytError: string;
  setYtError: (v: string) => void;
  onApply: () => void;
  value: string;
}) {
  return (
    <Stack gap="sm">
      <Row gap="sm">
        <input
          type="text"
          value={ytInput}
          onChange={(e) => { setYtInput(e.target.value); setYtError(""); }}
          placeholder="YouTube video ID or URL"
          className="appkit-input flex-1"
        />
        <Button type="button" variant="primary" size="sm" onClick={onApply}>Apply</Button>
      </Row>
      {ytError && <Alert variant="error">{ytError}</Alert>}
      {value?.includes("youtube.com") && (
        <Text size="xs" variant="secondary">YouTube embed: {value}</Text>
      )}
    </Stack>
  );
}

function ExternalUrlTabPanel({
  extInput,
  setExtInput,
  extError,
  setExtError,
  onApply,
}: {
  extInput: string;
  setExtInput: (v: string) => void;
  extError: string;
  setExtError: (v: string) => void;
  onApply: () => void;
}) {
  return (
    <Stack gap="sm">
      <Row gap="sm">
        <input
          type="url"
          value={extInput}
          onChange={(e) => { setExtInput(e.target.value); setExtError(""); }}
          placeholder="https://example.com/image.jpg"
          className="appkit-input flex-1"
        />
        <Button type="button" variant="primary" size="sm" onClick={onApply}>Apply</Button>
      </Row>
      {extError && <Alert variant="error">{extError}</Alert>}
      <Text size="xs" variant="secondary">
        External URLs are stored as-is and are not watermarked.
      </Text>
    </Stack>
  );
}

function MediaPreviewPanel({
  value,
  label,
  disabled,
  enableTrim,
  enableThumbnail,
  onEditVideo,
  onRemove,
  tUpload,
  tMediaEditor,
}: {
  value: string;
  label: string;
  disabled: boolean;
  enableTrim: boolean;
  enableThumbnail: boolean;
  onEditVideo: (url: string) => void;
  onRemove: () => void;
  tUpload: (key: string) => string;
  tMediaEditor: (key: string) => string;
}) {
  return (
    <Div className={`${__P.p3}`} rounded="lg" surface="muted" border="default">
      {isVideo(value) ? (
        <Stack gap="sm">
          <Div className={`relative aspect-video ${__O.hidden}`} rounded="lg">
            <MediaVideo src={value} alt={label} controls objectFit="contain" />
          </Div>
          {/* Video size warning for large files */}
          <Text size="xs" variant="secondary">
            Video uploaded successfully. Large videos may take longer to process.
          </Text>
        </Stack>
      ) : isImage(value) ? (
        <Div className={`relative aspect-video ${__O.hidden}`} rounded="lg">
          <MediaImage src={value} alt={label} size="card" objectFit="contain" />
        </Div>
      ) : isPdf(value) ? (
        <Stack gap="sm">
          <Div
            className={`relative w-full ${__O.hidden}`} rounded="lg" border="default"
            // audit-inline-style-ok: dynamic CSS
            style={{ height: 280 }}
          >
            <iframe
              src={value}
              title={filenameFromUrl(value)}
              className="w-full h-full border-0"
            />
          </Div>
          <Row gap="md" align="center">
            <Div aria-hidden className={CLS_PDF_BADGE}>
              <Span size="xs" weight="bold">PDF</Span>
            </Div>
            <Anchor href={value} className={CLS_PDF_NAME}>
              {filenameFromUrl(value)}
            </Anchor>
          </Row>
        </Stack>
      ) : (
        <Anchor href={value} className={CLS_PDF_LINK}>
          {filenameFromUrl(value)}
        </Anchor>
      )}

      {!disabled && (
        <Row wrap gap="sm" className="mt-2">
          {isVideo(value) && (enableTrim || enableThumbnail) && (
            <Button type="button" onClick={() => onEditVideo(value)} variant="secondary" size="sm">
              {tMediaEditor("editVideo")}
            </Button>
          )}
          <Button type="button" onClick={onRemove} variant="danger" size="sm">
            {tUpload("remove")}
          </Button>
        </Row>
      )}
    </Div>
  );
}

export function MediaUploadField({
  label,
  value,
  onChange,
  onChangeField,
  onUpload,
  // SB-UNI-Z5 2026-05-13 — `kind` derives accept/maxSizeMB when not set
  // explicitly; explicit props still win. "*" + 50 stay as the floor for
  // back-compat with callers that pass neither.
  kind,
  accept: acceptProp,
  maxSizeMB: maxSizeMBProp,
  disabled = false,
  helperText,
  captureSource = "both",
  captureMode = "photo",
  enableTrim = true,
  enableThumbnail = true,
  onThumbnailChange,
  showYoutube = true,
  showExternal = true,
  onAbort,
  onStagedUrlsChange,
  isPersisted = false,
  multiple = false,
  onAddUrl,
  autoCapturePoster = true,
}: MediaUploadFieldProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingVideoUrl, setPendingVideoUrl] = useState<string | null>(null);
  const [showTrimModal, setShowTrimModal] = useState(false);
  const [showThumbnailModal, setShowThumbnailModal] = useState(false);
  const [inputMode, setInputMode] = useState<"file" | "camera">("file");
  const [sourceTab, setSourceTab] = useState<MediaSourceTab>("upload");
  const [ytInput, setYtInput] = useState("");
  const [ytError, setYtError] = useState("");
  const [extInput, setExtInput] = useState("");
  const [extError, setExtError] = useState("");

  const hasAlternateSources = showYoutube || showExternal;
  // PDF mode: derived from the `accept` prop. Hides camera capture + alternate
  // URL tabs (YouTube/External never make sense for invoice/payout-doc fields)
  // and trim/thumbnail flow.
  // SB-UNI-Z5 2026-05-13 — fold `kind` defaults under explicit props.
  const kindDefaults =
    kind === "auto"
      ? AUTO_KIND_DEFAULTS
      : kind
        ? KIND_DEFAULTS[kind]
        : null;
  const accept = acceptProp ?? kindDefaults?.accept ?? "*";
  const maxSizeMB = maxSizeMBProp ?? kindDefaults?.maxSizeMB ?? 50;
  const pdfMode = isPdfAccept(accept);

  function handleYtApply() {
    const id = extractYouTubeId(ytInput);
    if (!id) {
      setYtError("Enter a valid YouTube video ID or URL.");
      return;
    }
    const url = `https://www.youtube.com/watch?v=${id}`;
    const thumb = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    onChange(url);
    onChangeField?.({ url, type: "video", source: "youtube", youtubeId: id, thumbnailUrl: thumb });
    setYtError("");
  }

  function handleExtApply() {
    const trimmed = extInput.trim();
    if (!trimmed) { setExtError("Enter a URL."); return; }
    try { new URL(trimmed); } catch { setExtError("Enter a valid URL."); return; }
    const type = /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(trimmed) ? "video" : "image";
    onChange(trimmed);
    onChangeField?.({ url: trimmed, type, source: "external" });
    setExtError("");
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCaptureRef = useRef<HTMLInputElement>(null);
  const stagedUrlsRef = useRef<string[]>([]);
  const onAbortRef = useRef(onAbort);
  const onStagedUrlsChangeRef = useRef(onStagedUrlsChange);
  const isPersistedRef = useRef(isPersisted);

  useEffect(() => {
    onAbortRef.current = onAbort;
  }, [onAbort]);

  useEffect(() => {
    onStagedUrlsChangeRef.current = onStagedUrlsChange;
  }, [onStagedUrlsChange]);

  useEffect(() => {
    isPersistedRef.current = isPersisted;
  }, [isPersisted]);

  // On unmount, clean up only if the form wasn't persisted.
  useEffect(() => {
    return () => {
      if (!isPersistedRef.current && stagedUrlsRef.current.length > 0) {
        onAbortRef.current?.([...stagedUrlsRef.current]);
      }
    };
  }, []);

  const emitStaged = () => {
    onStagedUrlsChangeRef.current?.([...stagedUrlsRef.current]);
  };

  const stageUrl = (url: string) => {
    if (!stagedUrlsRef.current.includes(url)) {
      stagedUrlsRef.current.push(url);
      emitStaged();
    }
  };

  const unstageUrl = (url: string) => {
    const next = stagedUrlsRef.current.filter((u) => u !== url);
    if (next.length !== stagedUrlsRef.current.length) {
      stagedUrlsRef.current = next;
      emitStaged();
    }
  };

  const t = useTranslations("camera");
  const tUpload = useTranslations("upload");
  const tMediaEditor = useTranslations("mediaEditor");
  const { isSupported: isCameraSupported } = useCamera();

  // PDF uploads never come from a camera capture — force file-only in pdfMode.
  const effectiveCaptureSource = pdfMode ? "file-only" : captureSource;
  const showCamera =
    effectiveCaptureSource === "camera-only" ||
    (effectiveCaptureSource === "both" && inputMode === "camera");
  const showFileInput =
    effectiveCaptureSource === "file-only" ||
    (effectiveCaptureSource === "both" && inputMode === "file");

  const captureModeAccept =
    captureMode === "video"
      ? "video/*"
      : captureMode === "both"
        ? "image/*,video/*"
        : "image/*";

  const afterUpload = (
    url: string,
    fileType: string,
    autoPosterUrl?: string,
  ) => {
    onChangeField?.({
      url,
      type: inferMediaTypeFromMime(fileType, url),
      ...(autoPosterUrl ? { thumbnailUrl: autoPosterUrl } : {}),
    });
    if (autoPosterUrl) onThumbnailChange?.(autoPosterUrl);

    const isVideoFile = fileType.startsWith("video/");
    if (isVideoFile && enableTrim) {
      setPendingVideoUrl(url);
      setShowTrimModal(true);
      return;
    }
    if (isVideoFile && enableThumbnail) {
      setPendingVideoUrl(url);
      setShowThumbnailModal(true);
      return;
    }
    onChange(url);
  };

  const handleTrimSave = (trimmedUrl: string) => {
    setShowTrimModal(false);
    if (enableThumbnail) {
      setPendingVideoUrl(trimmedUrl);
      setShowThumbnailModal(true);
    } else {
      onChange(trimmedUrl);
      setPendingVideoUrl(null);
    }
  };

  const handleTrimClose = () => {
    setShowTrimModal(false);
    if (enableThumbnail && pendingVideoUrl) {
      setShowThumbnailModal(true);
    } else {
      if (pendingVideoUrl) onChange(pendingVideoUrl);
      setPendingVideoUrl(null);
    }
  };

  const handleThumbnailSelect = (thumbUrl: string) => {
    setShowThumbnailModal(false);
    if (pendingVideoUrl) onChange(pendingVideoUrl);
    onThumbnailChange?.(thumbUrl);
    setPendingVideoUrl(null);
  };

  const handleThumbnailClose = () => {
    setShowThumbnailModal(false);
    if (pendingVideoUrl) onChange(pendingVideoUrl);
    setPendingVideoUrl(null);
  };

  const uploadSingleFile = async (file: File) => {
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSizeMB) {
      setError(`${file.name}: exceeds ${maxSizeMB}MB limit`);
      return null;
    }
    const url = await onUpload(file);
    stageUrl(url);
    return { url, type: file.type };
  };

  /**
   * Client-side first-frame extraction for video uploads. Runs after the
   * video has uploaded so we never block the canonical path. Errors are
   * swallowed by `extractVideoPosterFrame` (returns null) so a codec gap or
   * canvas taint silently degrades to "no poster" rather than failing the
   * whole upload.
   */
  const maybeCaptureVideoPoster = async (
    file: File,
  ): Promise<string | null> => {
    if (!autoCapturePoster) return null;
    if (!file.type.startsWith("video/")) return null;
    try {
      const poster = await extractVideoPosterFrame(file);
      if (!poster) return null;
      const posterFile = posterBlobAsFile(poster, file.name);
      const posterUrl = await onUpload(posterFile);
      stageUrl(posterUrl);
      return posterUrl;
    } catch (err) {
      // The upload-poster step is best-effort. Log via normalizeError so any
      // observability hook still fires, then swallow.
      void normalizeError(err);
      return null;
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsLoading(true);
    try {
      if (multiple && files.length > 1) {
        for (const file of Array.from(files)) {
          const result = await uploadSingleFile(file);
          if (result) onAddUrl?.(result.url);
        }
      } else {
        const result = await uploadSingleFile(files[0]);
        if (result) {
          const posterUrl = (await maybeCaptureVideoPoster(files[0])) ?? undefined;
          afterUpload(result.url, result.type, posterUrl);
        }
      }
    } catch (err) {
      void normalizeError(err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleEditVideo = (videoUrl: string) => {
    setPendingVideoUrl(videoUrl);
    if (enableTrim) {
      setShowTrimModal(true);
    } else {
      setShowThumbnailModal(true);
    }
  };

  const handleRemove = () => {
    if (value && stagedUrlsRef.current.includes(value)) {
      onAbortRef.current?.([value]);
      unstageUrl(value);
    }
    onChange("");
    onChangeField?.(null);
    setError(null);
  };

  const handleCameraCapture = async (blob: Blob, type: "photo" | "video") => {
    const ext = type === "video" ? "webm" : "webp";
    // blob.type can be empty with some MediaRecorder implementations; fall back
    // to the canonical MIME for the capture type so the server MIME check passes.
    const mimeType = blob.type || (type === "video" ? "video/webm" : "image/webp");
    const file = new File([blob], `camera-capture.${ext}`, { type: mimeType });
    setError(null);
    setIsLoading(true);
    try {
      const url = await onUpload(file);
      stageUrl(url);
      const posterUrl = (await maybeCaptureVideoPoster(file)) ?? undefined;
      afterUpload(url, blob.type || mimeType, posterUrl);
    } catch (err) {
      void normalizeError(err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack gap="sm">
      <Label className="block" color="muted" size="sm" weight="medium">
        {label}
      </Label>

      {/* Source tab switcher — only shown when alternate sources are enabled */}
      {hasAlternateSources && !disabled && (
        <Row gap="none" className="appkit-media-upload__source-tabs">
          {(["upload", ...(showYoutube ? ["youtube"] : []), ...(showExternal ? ["external"] : [])] as MediaSourceTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSourceTab(tab)}
              className={[
                "appkit-media-upload__source-tab",
                sourceTab === tab ? "appkit-media-upload__source-tab--active" : "",
              ].filter(Boolean).join(" ")}
            >
              {tab === "upload" ? "Upload" : tab === "youtube" ? "YouTube" : "External URL"}
            </button>
          ))}
        </Row>
      )}

      {/* YouTube input */}
      {hasAlternateSources && sourceTab === "youtube" && !disabled && (
        <YoutubeTabPanel
          ytInput={ytInput}
          setYtInput={setYtInput}
          ytError={ytError}
          setYtError={setYtError}
          onApply={handleYtApply}
          value={value}
        />
      )}

      {/* External URL input */}
      {hasAlternateSources && sourceTab === "external" && !disabled && (
        <ExternalUrlTabPanel
          extInput={extInput}
          setExtInput={setExtInput}
          extError={extError}
          setExtError={setExtError}
          onApply={handleExtApply}
        />
      )}

      {/* Standard upload UI — shown when source tab is "upload" (or no alternate sources) */}
      {(!hasAlternateSources || sourceTab === "upload") && value && !isLoading && (
        <MediaPreviewPanel
          value={value}
          label={label}
          disabled={disabled}
          enableTrim={enableTrim}
          enableThumbnail={enableThumbnail}
          onEditVideo={handleEditVideo}
          onRemove={handleRemove}
          tUpload={tUpload}
          tMediaEditor={tMediaEditor}
        />
      )}

      {!disabled && !isLoading && (!hasAlternateSources || sourceTab === "upload") && (
        <>
          {captureSource === "both" && isCameraSupported && (
            <Row gap="sm">
              <Button
                type="button"
                variant={inputMode === "file" ? "primary" : "outline"}
                size="sm"
                onClick={() => setInputMode("file")}
              >
                {t("switchToUpload")}
              </Button>
              <Button
                type="button"
                variant={inputMode === "camera" ? "primary" : "outline"}
                size="sm"
                onClick={() => setInputMode("camera")}
              >
                {t("switchToCamera")}
              </Button>
            </Row>
          )}

          {showCamera && isCameraSupported && (
            <CameraCapture
              mode={captureMode}
              facingMode="environment"
              onCapture={handleCameraCapture}
              onError={(msg) => setError(msg)}
            />
          )}

          {showCamera && !isCameraSupported && (
            <Button rounded="xl" 
              type="button"
              onClick={() => mobileCaptureRef.current?.click()}
              variant="ghost"
              className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400"
            >
              {t("switchToCamera")}
            </Button>
          )}

          {showFileInput && (
            <Button rounded="xl" 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="ghost"
              className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400"
            >
              {value ? tUpload("replaceFile") : tUpload("chooseFile")}
            </Button>
          )}
        </>
      )}

      {isLoading && (
        <Row gap="sm">
          <Spinner size="sm" />
          <Text size="sm" variant="secondary">
            {tUpload("uploading")}
          </Text>
        </Row>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        data-testid="media-upload-input"
      />

      {showCamera && !isCameraSupported && (
        <input
          ref={mobileCaptureRef}
          type="file"
          accept={captureModeAccept}
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
          data-testid="media-upload-capture-input"
        />
      )}

      {helperText && !error && (
        <Text variant="secondary" size="xs">
          {helperText}
        </Text>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {pendingVideoUrl && (
        <VideoTrimModal
          isOpen={showTrimModal}
          videoUrl={pendingVideoUrl}
          onClose={handleTrimClose}
          onSave={handleTrimSave}
        />
      )}

      {pendingVideoUrl && (
        <VideoThumbnailSelector
          isOpen={showThumbnailModal}
          videoUrl={pendingVideoUrl}
          onClose={handleThumbnailClose}
          onSelect={handleThumbnailSelect}
          onUpload={onUpload}
        />
      )}
    </Stack>
  );
}
