"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Alert, Button, Div, Label, Spinner, Text } from "@mohasinac/ui";
import { MediaImage } from "../MediaImage";
import { MediaVideo } from "../MediaVideo";
import { inferMediaTypeFromMime, type MediaField } from "../types/index";

export interface MediaUploadListProps {
  label: string;
  value: MediaField[];
  onChange: (media: MediaField[]) => void;
  onUpload: (file: File) => Promise<string>;
  accept?: string;
  maxSizeMB?: number;
  maxItems?: number;
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
  } catch {
    return url;
  }
}

export function MediaUploadList({
  label,
  value,
  onChange,
  onUpload,
  accept = "image/*,video/*",
  maxSizeMB = 50,
  maxItems = 12,
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

    setError(null);
    setIsLoading(true);

    try {
      const uploaded: MediaField[] = [];

      for (const file of files) {
        const sizeMb = file.size / 1024 / 1024;
        if (sizeMb > maxSizeMB) {
          throw new Error(`${file.name} exceeds ${maxSizeMB}MB`);
        }

        const url = await onUpload(file);
        stageUrl(url);

        uploaded.push({
          url,
          type: inferMediaTypeFromMime(file.type, url),
        });
      }

      onChange([...value, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
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
    <Div className="space-y-2">
      <Label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </Label>

      {value.length > 0 && (
        <Div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {value.map((item, index) => (
            <Div
              key={`${item.url}-${index}`}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3"
            >
              {item.type === "video" ? (
                <Div className="relative aspect-video overflow-hidden rounded-lg">
                  <MediaVideo
                    src={item.url}
                    alt={item.alt || `Media ${index + 1}`}
                    controls
                  />
                </Div>
              ) : item.type === "image" ? (
                <Div className="relative aspect-video overflow-hidden rounded-lg">
                  <MediaImage
                    src={item.url}
                    alt={item.alt || `Media ${index + 1}`}
                    size="card"
                    objectFit="contain"
                  />
                </Div>
              ) : (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline break-all text-blue-600 dark:text-blue-400"
                >
                  {fileNameFromUrl(item.url)}
                </a>
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
          variant="ghost"
          className="w-full py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-500 dark:text-zinc-400"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
        >
          {isLoading ? "Uploading..." : "Add media"}
        </Button>
      )}

      {isLoading && (
        <Div className="flex items-center gap-2">
          <Spinner size="sm" />
          <Text size="sm" variant="secondary">
            Uploading
          </Text>
        </Div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {helperText && !error && (
        <Text variant="secondary" size="xs">
          {helperText}
        </Text>
      )}

      {error && <Alert variant="error">{error}</Alert>}
    </Div>
  );
}
