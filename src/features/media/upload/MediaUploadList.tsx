"use client"
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Alert, Anchor, Button, Div, Label, Row, Spinner, Stack, Text } from "../../../ui";
import { MediaImage } from "../MediaImage";
import { MediaVideo } from "../MediaVideo";
import { inferMediaTypeFromMime, type MediaField } from "../types/index";

import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_PDF_LINK = "text-[length:var(--appkit-text-sm)] underline break-all text-info dark:text-info";

export interface MediaUploadListProps {
  label: string;
  value: MediaField[];
  onChange: (media: MediaField[]) => void;
  onUpload: (file: File) => Promise<string>;
  accept?: string;
  maxSizeMB?: number;
  maxItems?: number;
  /**
   * Per-TYPE ceilings, counted separately.
   *
   * `maxItems` alone cannot express "10 images and 1 video" — it is one
   * number over a mixed list, so a buyer-facing rule of that shape had to be
   * enforced by splitting the control in two, which is why product forms
   * carried a gallery AND a separate single-video field that wrote a
   * different part of the document.
   *
   * When either is set the matching type is counted on its own and `maxItems`
   * becomes the overall backstop. Existing callers that pass neither are
   * completely unaffected.
   */
  maxImages?: number;
  maxVideos?: number;
  disabled?: boolean;
  helperText?: string;
  /**
   * Called with staged URLs that were uploaded but never persisted.
   * Parent should call DELETE /api/media?url=... for each URL.
   */
  onAbort?: (stagedUrls: string[]) => void;
  /**
   * Live callback for parent forms to track staged URLs.
   */
  onStagedUrlsChange?: (stagedUrls: string[]) => void;
  /**
   * Set true after successful save to prevent auto-cleanup on unmount.
   */
  isPersisted?: boolean;
}

function fileNameFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/");
    return decodeURIComponent(parts[parts.length - 1] || url);
  } catch (_err) {
    void normalizeError(_err);
    return url;
  }
}

export function MediaUploadList({
  label,
  value,
  onChange,
  onUpload,
  accept = "image/*,video/*,application/pdf",
  maxSizeMB = 50,
  maxItems = 12,
  maxImages,
  maxVideos,
  disabled = false,
  helperText,
  onAbort,
  onStagedUrlsChange,
  isPersisted = false,
}: MediaUploadListProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    if (value.length + files.length > maxItems) {
      setError(`You can upload up to ${maxItems} files.`);
      e.currentTarget.value = "";
      return;
    }

    /*
     * Per-type ceilings. Counted from the INCOMING batch as well as what is
     * already there, so selecting five videos at once is refused up front
     * rather than after four of them have uploaded.
     *
     * `inferMediaTypeFromMime` is the same classifier used to tag the item
     * below, so the count and the stored `type` can never disagree.
     */
    if (maxImages != null || maxVideos != null) {
      const incoming = files.map((f) => inferMediaTypeFromMime(f.type, f.name));
      const countOf = (t: string) =>
        value.filter((v) => v.type === t).length + incoming.filter((v) => v === t).length;

      if (maxImages != null && countOf("image") > maxImages) {
        setError(`You can upload up to ${maxImages} image${maxImages === 1 ? "" : "s"}.`);
        e.currentTarget.value = "";
        return;
      }
      if (maxVideos != null && countOf("video") > maxVideos) {
        setError(
          maxVideos === 1
            ? "Only one video is allowed. Remove the current one to replace it."
            : `You can upload up to ${maxVideos} videos.`,
        );
        e.currentTarget.value = "";
        return;
      }
    }

    setError(null);
    /*
     * Size is checked BEFORE the upload loop, and reported directly rather
     * than thrown.
     *
     * It used to throw into the shared catch, which then rendered
     * `err.message` — so one branch of that catch was authored copy worth
     * showing while the other was whatever the network layer happened to
     * throw. Splitting them lets the useful message survive and the arbitrary
     * one resolve through `toUserMessage` (Rule #9.6 / Root Cause #86).
     */
    const tooBig = files.find((f) => f.size / 1024 / 1024 > maxSizeMB);
    if (tooBig) {
      setError(`${tooBig.name} exceeds ${maxSizeMB}MB`);
      e.currentTarget.value = "";
      return;
    }

    setIsLoading(true);

    try {
      const uploaded: MediaField[] = [];

      for (const file of files) {
        const url = await onUpload(file);
        stageUrl(url);

        uploaded.push({
          url,
          type: inferMediaTypeFromMime(file.type, url),
        });
      }

      onChange([...value, ...uploaded]);
    } catch (err) {
      const normalized = normalizeError(err);
      // Never the thrown value's own text: `onUpload` reaches the signed-URL
      // endpoint, so this is where a server sentence would surface.
      setError(
        toUserMessage(normalized.code, undefined, {
          fallback: "Upload failed. Please try again.",
        }),
      );
    } finally {
      setIsLoading(false);
      e.currentTarget.value = "";
    }
  };

  const removeAt = (index: number) => {
    const target = value[index];
    if (!target) return;

    const next = value.filter((_, i) => i !== index);
    onChange(next);

    if (stagedUrlsRef.current.includes(target.url)) {
      onAbortRef.current?.([target.url]);
      unstageUrl(target.url);
    }
  };

  return (
    <Stack gap="sm">
      <Label className="block" color="muted" size="sm" weight="medium">
        {label}
      </Label>

      {value.length > 0 && (
        <Div layout="grid" gap="3" className="grid-cols-1 sm:grid-cols-2">
          {value.map((item, index) => (
            <Div
              key={`${item.url}-${index}`} rounded="lg" padding="sm" border="default" surface="muted">
              {item.type === "video" ? (
                <Div className={`relative aspect-square max-h-24 ${__O.hidden}`} rounded="lg">
                  <MediaVideo
                    src={item.url}
                    alt={item.alt || `Media ${index + 1}`}
                    controls
                  />
                </Div>
              ) : item.type === "image" ? (
                <Div className={`relative aspect-square max-h-24 ${__O.hidden}`} rounded="lg">
                  <MediaImage
                    src={item.url}
                    alt={item.alt || `Media ${index + 1}`}
                    size="card"
                    objectFit="contain"
                  />
                </Div>
              ) : (
                <Anchor href={item.url} tone="none" underline="none" className={CLS_PDF_LINK}>
                  {fileNameFromUrl(item.url)}
                </Anchor>
              )}

              {!disabled && (
                <Div className="mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => removeAt(index)}
                  >
                    Remove
                  </Button>
                </Div>
              )}
            </Div>
          ))}
        </Div>
      )}

      {!disabled && value.length < maxItems && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
        >
          {isLoading ? "Uploading..." : `+ Add Files (${value.length}/${maxItems})`}
        </Button>
      )}

      {isLoading && (
        <Row align="center" gap="sm">
          <Spinner size="sm" />
          <Text size="sm" variant="secondary">
            Uploading
          </Text>
        </Row>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        data-testid="media-upload-list-input"
      />

      {/*
        Live per-type counter. Without it a shared image+video control gives no
        warning before the refusal — the user finds the ceiling by hitting it.
        Only rendered when a per-type cap is actually in force.
      */}
      {(maxImages != null || maxVideos != null) && (
        <Text variant="secondary" size="xs">
          {[
            maxImages != null
              ? `${value.filter((v) => v.type === "image").length}/${maxImages} images`
              : null,
            maxVideos != null
              ? `${value.filter((v) => v.type === "video").length}/${maxVideos} video${maxVideos === 1 ? "" : "s"}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      )}

      {helperText && !error && (
        <Text variant="secondary" size="xs">
          {helperText}
        </Text>
      )}

      {error && <Alert variant="error">{error}</Alert>}
    </Stack>
  );
}
