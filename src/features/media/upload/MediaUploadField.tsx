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
import { Alert, Button, Div, Label, Row, Spinner, Text } from "../../../ui";
import { MediaImage } from "../MediaImage";
import { MediaVideo } from "../MediaVideo";
import { VideoTrimModal } from "../modals/VideoTrimModal";
import { VideoThumbnailSelector } from "../modals/VideoThumbnailSelector";
import CameraCapture from "./CameraCapture";
import { inferMediaTypeFromMime, type MediaField } from "../types/index";

/**
 * SB-UNI-Z5 2026-05-13 — `kind` prop UX sugar. When set, the component
 * auto-derives `accept` + `maxSizeMB` from the canonical media-limits
 * registry so callers don't have to remember the MIME list per type.
 * Explicit `accept` / `maxSizeMB` props still win when provided.
 */
export type MediaUploadFieldKind = "image" | "video" | "pdf" | "auto";

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
  showYoutube = false,
  showExternal = false,
  onAbort,
  onStagedUrlsChange,
  isPersisted = false,
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

  const afterUpload = (url: string, fileType: string) => {
    onChangeField?.({
      url,
      type: inferMediaTypeFromMime(fileType, url),
    });

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

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const url = await onUpload(file);
      stageUrl(url);
      afterUpload(url, file.type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    const file = new File([blob], `camera-capture.${ext}`, { type: blob.type });
    setError(null);
    setIsLoading(true);
    try {
      const url = await onUpload(file);
      stageUrl(url);
      afterUpload(url, blob.type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Div className="space-y-2">
      <Label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
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
        <Div className="space-y-2">
          <Row gap="sm">
            <input
              type="text"
              value={ytInput}
              onChange={(e) => { setYtInput(e.target.value); setYtError(""); }}
              placeholder="YouTube video ID or URL"
              className="appkit-input flex-1"
            />
            <Button type="button" variant="primary" size="sm" onClick={handleYtApply}>
              Apply
            </Button>
          </Row>
          {ytError && <Alert variant="error">{ytError}</Alert>}
          {value?.includes("youtube.com") && (
            <Text size="xs" variant="secondary">YouTube embed: {value}</Text>
          )}
        </Div>
      )}

      {/* External URL input */}
      {hasAlternateSources && sourceTab === "external" && !disabled && (
        <Div className="space-y-2">
          <Row gap="sm">
            <input
              type="url"
              value={extInput}
              onChange={(e) => { setExtInput(e.target.value); setExtError(""); }}
              placeholder="https://example.com/image.jpg"
              className="appkit-input flex-1"
            />
            <Button type="button" variant="primary" size="sm" onClick={handleExtApply}>
              Apply
            </Button>
          </Row>
          {extError && <Alert variant="error">{extError}</Alert>}
          <Text size="xs" variant="secondary">
            External URLs are stored as-is and are not watermarked.
          </Text>
        </Div>
      )}

      {/* Standard upload UI — shown when source tab is "upload" (or no alternate sources) */}
      {(!hasAlternateSources || sourceTab === "upload") && value && !isLoading && (
        <Div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3">
          {isVideo(value) ? (
            <Div className="relative aspect-video overflow-hidden rounded-lg">
              <MediaVideo
                src={value}
                alt={label}
                controls
                objectFit="contain"
              />
            </Div>
          ) : isImage(value) ? (
            <Div className="relative aspect-video overflow-hidden rounded-lg">
              <MediaImage
                src={value}
                alt={label}
                size="card"
                objectFit="contain"
              />
            </Div>
          ) : isPdf(value) ? (
            <Row gap="md" align="center">
              <Div
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
              >
                <span className="text-xs font-bold">PDF</span>
              </Div>
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 underline break-all dark:text-blue-400"
              >
                {filenameFromUrl(value)}
              </a>
            </Row>
          ) : (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline break-all text-blue-600 dark:text-blue-400"
            >
              {filenameFromUrl(value)}
            </a>
          )}

          {!disabled && (
            <Row wrap gap="sm" className="mt-2">
              {isVideo(value) && (enableTrim || enableThumbnail) && (
                <Button
                  type="button"
                  onClick={() => {
                    setPendingVideoUrl(value);
                    if (enableTrim) setShowTrimModal(true);
                    else setShowThumbnailModal(true);
                  }}
                  variant="secondary"
                  size="sm"
                >
                  {tMediaEditor("editVideo")}
                </Button>
              )}
              <Button
                type="button"
                onClick={handleRemove}
                variant="danger"
                size="sm"
              >
                {tUpload("remove")}
              </Button>
            </Row>
          )}
        </Div>
      )}

      {!disabled && !isLoading && (!hasAlternateSources || sourceTab === "upload") && (
        <>
          {captureSource === "both" && isCameraSupported && (
            <Row className="gap-2">
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
            <Button
              type="button"
              onClick={() => mobileCaptureRef.current?.click()}
              variant="ghost"
              className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-500 dark:text-zinc-400"
            >
              {t("switchToCamera")}
            </Button>
          )}

          {showFileInput && (
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="ghost"
              className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-500 dark:text-zinc-400"
            >
              {value ? tUpload("replaceFile") : tUpload("chooseFile")}
            </Button>
          )}
        </>
      )}

      {isLoading && (
        <Row className="gap-2">
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
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
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
    </Div>
  );
}
