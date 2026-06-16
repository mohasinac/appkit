"use client"
import React, { useState, useCallback } from "react";
import { Modal } from "../../ui/components/Modal";
import { Button, Div, Input, Label, Row, Stack, Text, Alert } from "../../ui";
import { MediaUploadField } from "./upload/MediaUploadField";
import { useMediaUpload, useMediaCleanup } from "./index";

const MEDIA_LIST_ENDPOINT = "/api/admin/media";
const EXISTING_GRID_MAX_HEIGHT = "max-h-96";

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

type Tab = "upload" | "existing" | "url";

interface BrowsedFile {
  name: string;
  contentType: string | null;
  downloadURL: string;
}

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
  const [existingFiles, setExistingFiles] = useState<BrowsedFile[]>([]);
  const [existingLoading, setExistingLoading] = useState(false);
  const [existingError, setExistingError] = useState<string | null>(null);
  const [existingSearch, setExistingSearch] = useState("");
  const [selectedExisting, setSelectedExisting] = useState("");
  const [existingPrefix, setExistingPrefix] = useState(() =>
    uploadPath && uploadPath !== "media" ? `${uploadPath}/` : "",
  );

  React.useEffect(() => {
    if (tab !== "existing" || !isOpen) return;
    let cancelled = false;
    setExistingLoading(true);
    setExistingError(null);
    const params = new URLSearchParams();
    if (existingPrefix) params.set("prefix", existingPrefix);
    fetch(`${MEDIA_LIST_ENDPOINT}?${params.toString()}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to list media");
        return r.json();
      })
      .then((data: { data: { files: BrowsedFile[] } }) => {
        if (!cancelled) setExistingFiles(data.data.files);
      })
      .catch((err) => {
        if (!cancelled)
          setExistingError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setExistingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, isOpen, existingPrefix]);

  const filteredExisting = React.useMemo(() => {
    const q = existingSearch.trim().toLowerCase();
    if (!q) return existingFiles;
    return existingFiles.filter((f) => f.name.toLowerCase().includes(q));
  }, [existingFiles, existingSearch]);

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

  function handleUseExisting() {
    if (!selectedExisting) return;
    onSelect(selectedExisting);
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
    setSelectedExisting("");
    setExistingSearch("");
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
          {tab === "upload" && (
            <Button
              variant="primary"
              onClick={handleUseUpload}
              disabled={!uploadedUrl}
            >
              Use this file
            </Button>
          )}
          {tab === "existing" && (
            <Button
              variant="primary"
              onClick={handleUseExisting}
              disabled={!selectedExisting}
            >
              Use selected
            </Button>
          )}
          {tab === "url" && (
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
            className={tabBtnClass(tab === "existing")}
            onClick={() => setTab("existing")}
          >
            Existing
          </button>
          <button
            type="button"
            className={tabBtnClass(tab === "url")}
            onClick={() => setTab("url")}
          >
            External URL
          </button>
        </Row>

        {tab === "existing" && (
          <Stack gap="sm">
            <Row gap="sm">
              <Input
                placeholder={`Filter "${existingPrefix || "all"}"…`}
                value={existingSearch}
                onChange={(e) => setExistingSearch(e.target.value)}
              />
              <Input
                placeholder="Prefix (e.g. products/)"
                value={existingPrefix}
                onChange={(e) => setExistingPrefix(e.target.value)}
              />
            </Row>
            {existingError && <Alert variant="error">{existingError}</Alert>}
            <Div layout="grid" gap="2" 
              className={`grid-cols-3 sm:grid-cols-4 md:grid-cols-5 ${EXISTING_GRID_MAX_HEIGHT} overflow-y-auto`}
            >
              {filteredExisting.map((f) => {
                const isImage = (f.contentType ?? "").startsWith("image/");
                const isSelected = selectedExisting === f.downloadURL;
                return (
                  <Button
                    key={f.name}
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedExisting(f.downloadURL)}
                    className={[
                      "rounded-lg border overflow-hidden text-left transition p-0 h-auto",
                      isSelected
                        ? "border-primary-500 ring-2 ring-primary-300"
                        : "border-zinc-200 dark:border-slate-700",
                    ].join(" ")}
                    aria-pressed={isSelected}
                  >
                    <Row
                      className="aspect-square w-full" surface="subtle" align="center" justify="center"
                    >
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={f.downloadURL}
                          alt={f.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Text size="sm" color="muted">
                          {f.contentType ?? "file"}
                        </Text>
                      )}
                    </Row>
                    <Text className="block truncate p-1.5 font-mono" size="xs">
                      {f.name.split("/").pop()}
                    </Text>
                  </Button>
                );
              })}
              {existingLoading && (
                <Text paddingY="lg" className="col-span-full" align="center" color="muted">
                  Loading…
                </Text>
              )}
              {!existingLoading && filteredExisting.length === 0 && (
                <Text paddingY="lg" className="col-span-full" align="center" color="muted">
                  No files match.
                </Text>
              )}
            </Div>
          </Stack>
        )}

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
