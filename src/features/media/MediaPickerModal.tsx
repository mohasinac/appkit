"use client"
import React, { useState, useCallback } from "react";
import { Modal } from "../../ui/components/Modal";
import { Button, Input, Label, Row, Stack, Text, Alert } from "../../ui";
import { MediaUploadField } from "./upload/MediaUploadField";
import { useMediaUpload, useMediaCleanup } from "./index";

export interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the selected media URL (proxy path or external URL). */
  onSelect: (url: string) => void;
  /** Accepted MIME types for file upload. Defaults to image/*. */
  accept?: string;
  /** Max file size in MB for upload tab. Defaults to 10. */
  maxSizeMB?: number;
  /** Storage path prefix for uploaded files. Defaults to "media". */
  uploadPath?: string;
  title?: string;
}

type Tab = "upload" | "url";

/**
 * MediaPickerModal â€” pick or upload a media file for use in a form field.
 *
 * Two tabs:
 * - Upload: drag/drop or click to upload a new file â†’ "Use this file" button
 * - URL: paste an external image/video URL directly
 *
 * @example
 * ```tsx
 * <MediaPickerModal
 *   isOpen={open}
 *   onClose={() => setOpen(false)}
 *   onSelect={(url) => form.setValue("imageUrl", url)}
 * />
 * ```
 */
export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  accept = "image/*",
  maxSizeMB = 10,
  uploadPath = "media",
  title = "Pick Media",
}: MediaPickerModalProps) {
  const [tab, setTab] = useState<Tab>("upload");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  const { upload } = useMediaUpload();
  const { cleanup } = useMediaCleanup();

  const handleUpload = useCallback(
    (file: File) => upload(file, uploadPath, true),
    [upload, uploadPath],
  );

  const handleAbort = useCallback(
    (urls: string[]) => { void cleanup(urls); },
    [cleanup],
  );

  function handleUseUpload() {
    if (!uploadedUrl) return;
    onSelect(uploadedUrl);
    resetAndClose();
  }

  function handleUseExternal() {
    const trimmed = externalUrl.trim();
    if (!trimmed) {
      setUrlError("Please enter a URL.");
      return;
    }
    try { new URL(trimmed); } catch {
      setUrlError("Enter a valid URL starting with https://");
      return;
    }
    onSelect(trimmed);
    resetAndClose();
  }

  function resetAndClose() {
    setUploadedUrl("");
    setExternalUrl("");
    setUrlError("");
    setTab("upload");
    onClose();
  }

  const tabBtnClass = (active: boolean) =>
    [
      "appkit-media-picker__tab-btn",
      active ? "appkit-media-picker__tab-btn--active" : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={title}
      size="lg"
      actions={
        <Row gap="sm" justify="end">
          <Button variant="ghost" onClick={resetAndClose}>
            Cancel
          </Button>
          {tab === "upload" ? (
            <Button
              variant="primary"
              onClick={handleUseUpload}
              disabled={!uploadedUrl}
            >
              Use this file
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleUseExternal}
              disabled={!externalUrl.trim()}
            >
              Use this URL
            </Button>
          )}
        </Row>
      }
    >
      <Stack gap="md">
        {/* Tab switcher */}
        <Row gap="none" className="appkit-media-picker__tabs">
          <button
            type="button"
            className={tabBtnClass(tab === "upload")}
            onClick={() => setTab("upload")}
          >
            Upload file
          </button>
          <button
            type="button"
            className={tabBtnClass(tab === "url")}
            onClick={() => setTab("url")}
          >
            External URL
          </button>
        </Row>

        {tab === "upload" && (
          <MediaUploadField
            label="File"
            value={uploadedUrl}
            onChange={setUploadedUrl}
            onUpload={handleUpload}
            accept={accept}
            maxSizeMB={maxSizeMB}
            onAbort={handleAbort}
          />
        )}

        {tab === "url" && (
          <Stack gap="sm">
            <Label htmlFor="media-picker-url">Image or video URL</Label>
            <Input
              id="media-picker-url"
              value={externalUrl}
              onChange={(e) => {
                setExternalUrl(e.target.value);
                setUrlError("");
              }}
              placeholder="https://example.com/image.jpg"
            />
            {urlError && <Alert variant="error">{urlError}</Alert>}
            <Text size="sm" color="muted">
              External URLs are stored as-is and are not watermarked.
            </Text>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
