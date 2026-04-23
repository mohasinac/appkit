"use client";

import React from "react";
import {
  Alert,
  Button,
  Div,
  StackedViewShell,
  Text,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import {
  MediaUploadField,
  MediaUploadList,
  type MediaField,
  useMediaCleanup,
  useMediaUpload,
} from "../../media";

export interface AdminMediaViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  children?: React.ReactNode;
  labels?: {
    title?: string;
  };
}

export function AdminMediaView({
  labels = {},
  children,
  ...rest
}: AdminMediaViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const { upload, isPending: isUploadPending } = useMediaUpload();
  const { cleanup, isPending: isCleanupPending } = useMediaCleanup();

  const [heroAssetUrl, setHeroAssetUrl] = React.useState("");
  const [galleryAssets, setGalleryAssets] = React.useState<MediaField[]>([]);
  const [stagedUrls, setStagedUrls] = React.useState<string[]>([]);
  const [operationMessage, setOperationMessage] = React.useState<string | null>(null);

  const onUpload = React.useCallback(
    async (file: File) => {
      setOperationMessage(null);
      return upload(file, "admin/media", true);
    },
    [upload],
  );

  const handleAbort = React.useCallback(
    (urls: string[]) => {
      void cleanup(urls).catch(() => {
        setOperationMessage("Some staged files could not be removed.");
      });
    },
    [cleanup],
  );

  const clearStagedUploads = React.useCallback(async () => {
    if (stagedUrls.length === 0) {
      return;
    }

    try {
      await cleanup(stagedUrls);
      setHeroAssetUrl("");
      setGalleryAssets([]);
      setStagedUrls([]);
      setOperationMessage("Discarded staged media uploads.");
    } catch {
      setOperationMessage("Failed to discard staged media uploads.");
    }
  }, [cleanup, stagedUrls]);

  if (hasChildren) {
    return (
      <StackedViewShell
        portal="admin"
        {...rest}
        title={labels.title ?? "Media Operations"}
        sections={[children]}
      />
    );
  }

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={labels.title ?? "Media Operations"}
      sections={[
        <Alert key="media-info" variant="info" title="Frame-only media surface">
          Use this screen for upload validation and staged file cleanup. Persistent asset ownership should stay in the parent form that references the media URL.
        </Alert>,
        operationMessage ? (
          <Alert
            key="media-op-message"
            variant={operationMessage.startsWith("Failed") || operationMessage.startsWith("Some") ? "error" : "success"}
            title="Media"
          >
            {operationMessage}
          </Alert>
        ) : null,
        <Div
          key="media-uploader"
          className="space-y-5 rounded-xl border border-zinc-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Upload Sandbox
          </Text>
          <MediaUploadField
            label="Primary media asset"
            value={heroAssetUrl}
            onChange={setHeroAssetUrl}
            onUpload={onUpload}
            helperText="Uploads to /api/media/upload and previews the returned URL."
            onAbort={handleAbort}
            onStagedUrlsChange={setStagedUrls}
          />
          <MediaUploadList
            label="Gallery assets"
            value={galleryAssets}
            onChange={setGalleryAssets}
            onUpload={onUpload}
            helperText="Attach multiple images or videos for batch checks."
            onAbort={handleAbort}
            onStagedUrlsChange={setStagedUrls}
            maxItems={12}
          />
          <Div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setHeroAssetUrl("");
                setGalleryAssets([]);
              }}
              disabled={isUploadPending || isCleanupPending}
            >
              Clear previews
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void clearStagedUploads();
              }}
              disabled={isUploadPending || isCleanupPending || stagedUrls.length === 0}
            >
              {isCleanupPending ? "Discarding..." : "Discard staged uploads"}
            </Button>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              {stagedUrls.length} staged upload(s)
            </Text>
          </Div>
        </Div>,
      ]}
    />
  );
}
