"use client";

import React from "react";
import { Alert, Button, Div, Input, Row, Select, Stack, StackedViewShell, Text, useToast } from "../../../ui";
import { normalizeError } from "../../../errors/normalize";
import type { StackedViewShellProps } from "../../../ui";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  MediaUploadField,
  MediaUploadList,
  type MediaField,
  useMediaCleanup,
  useMediaUpload,
} from "../../media";

const __P = {
  p4: "p-4",
} as const;

interface BrowsedFile {
  name: string;
  size: number;
  contentType: string | null;
  updatedAt: string;
  downloadURL: string;
}

const PREFIX_OPTIONS = [
  { value: "", label: "All" },
  { value: "products/", label: "Products" },
  { value: "auctions/", label: "Auctions" },
  { value: "preorders/", label: "Pre-orders" },
  { value: "stores/", label: "Stores" },
  { value: "blog/", label: "Blog" },
  { value: "events/", label: "Events" },
  { value: "carousel/", label: "Carousel" },
  { value: "users/", label: "Users" },
  { value: "admin/", label: "Admin sandbox" },
];

function MediaBrowser({ onCopy }: { onCopy: (url: string) => void }) {
  const [prefix, setPrefix] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [files, setFiles] = React.useState<BrowsedFile[]>([]);
  const [nextPageToken, setNextPageToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (token: string | null) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (prefix) params.set("prefix", prefix);
        if (token) params.set("pageToken", token);
        const res = await fetch(`/api/admin/media?${params.toString()}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to list media");
        const data = (await res.json()) as {
          data: { files: BrowsedFile[]; nextPageToken: string | null };
        };
        setFiles((prev) => (token ? [...prev, ...data.data.files] : data.data.files));
        setNextPageToken(data.data.nextPageToken ?? null);
      } catch (err) {
        void normalizeError(err);
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    },
    [prefix],
  );

  React.useEffect(() => {
    void load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, search]);

  return (
    <Stack className={`${__P.p4}`} gap="3" rounded="xl" surface="default" border="default">
      <Text size="sm" weight="semibold" color="primary">
        Browse existing media
      </Text>
      <Row align="center" gap="sm" wrap>
        <Select
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          options={PREFIX_OPTIONS}
          aria-label="Prefix filter"
          className="min-w-[140px]"
        />
        <Input
          type="text"
          placeholder="Search filename…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[160px]"
        />
      </Row>
      {error && (
        <Alert variant="error" title="Load failed">
          {error}
        </Alert>
      )}
      <Div layout="grid" gap="2" className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {filtered.map((f) => {
          const isImage = (f.contentType ?? "").startsWith("image/");
          return (
            <Div
              key={f.name}
              className="group overflow-hidden" surface="muted" rounded="lg" border="default"
            >
              <Row color="muted" textSize="xs" className="aspect-square" surface="subtle" align="center" justify="center">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.downloadURL}
                    alt={f.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <Text align="center" paddingX="x-xs" className="break-all">
                    {f.contentType ?? "file"}
                  </Text>
                )}
              </Row>
              <Div className="p-[0.375rem]">
                <Text className="truncate text-[10px] font-mono" color="muted">
                  {f.name.split("/").pop()}
                </Text>
                <Button
                  type="button"
                  variant="ghost"
                  textSize="xs"
                  className="mt-1 w-full"
                  onClick={() => onCopy(f.downloadURL)}
                >
                  {ACTIONS.MEDIA["copy-url"].label}
                </Button>
              </Div>
            </Div>
          );
        })}
        {filtered.length === 0 && !isLoading && (
          <Text paddingY="lg" className="col-span-full" color="muted" size="sm" align="center">
            No files found.
          </Text>
        )}
      </Div>
      <Row align="center" justify="between">
        <Text size="xs" color="muted">
          {filtered.length} file(s){nextPageToken ? " · more available" : ""}
        </Text>
        {nextPageToken && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void load(nextPageToken)}
            disabled={isLoading}
          >
            {isLoading ? "Loading…" : "Load more"}
          </Button>
        )}
      </Row>
    </Stack>
  );
}

interface MediaUploaderPanelProps {
  onUpload: (file: File) => Promise<string>;
  isUploadPending: boolean;
  isCleanupPending: boolean;
  heroAssetUrl: string;
  setHeroAssetUrl: (v: string) => void;
  galleryAssets: MediaField[];
  setGalleryAssets: React.Dispatch<React.SetStateAction<MediaField[]>>;
  stagedUrls: string[];
  setHeroStagedUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setGalleryStagedUrls: React.Dispatch<React.SetStateAction<string[]>>;
  handleAbort: (urls: string[]) => void;
  copiedUrl: string | null;
  onCopy: (url: string) => void;
  onClearPreviews: () => void;
  onDiscardStaged: () => void;
}

function MediaUploaderPanel({
  onUpload, isUploadPending, isCleanupPending, heroAssetUrl, setHeroAssetUrl,
  galleryAssets, setGalleryAssets, stagedUrls, setHeroStagedUrls,
  setGalleryStagedUrls, handleAbort, copiedUrl, onCopy, onClearPreviews, onDiscardStaged,
}: MediaUploaderPanelProps) {
  return (
    <Stack surface="default" rounded="xl" padding="md" border="default" gap="5">
      <Text size="sm" weight="semibold" color="primary">
        Upload & Copy URL
      </Text>
      <MediaUploadField
        label="Primary media asset"
        value={heroAssetUrl}
        onChange={setHeroAssetUrl}
        onUpload={onUpload}
        helperText="Uploads via signed URL (sign → PUT → finalize) and previews the returned URL."
        onAbort={handleAbort}
        onStagedUrlsChange={setHeroStagedUrls}
      />
      {heroAssetUrl && (
        <Row surface="muted" padding="inlineSm" align="center" gap="sm" rounded="lg" border="default">
          <Text className="flex-1 truncate font-mono" color="muted" size="xs">
            {heroAssetUrl}
          </Text>
          <Button
            type="button"
            variant="outline"
            onClick={() => onCopy(heroAssetUrl)}
          >
            {copiedUrl === heroAssetUrl ? "Copied!" : ACTIONS.MEDIA["copy-url"].label}
          </Button>
        </Row>
      )}
      <MediaUploadList
        label="Gallery assets"
        value={galleryAssets}
        onChange={setGalleryAssets}
        onUpload={onUpload}
        helperText="Attach multiple images or videos for batch checks."
        onAbort={handleAbort}
        onStagedUrlsChange={setGalleryStagedUrls}
        maxItems={12}
      />
      {galleryAssets.length > 0 && (
        <Stack gap="xs">
          <Text size="xs" weight="medium" color="muted">
            Gallery URLs
          </Text>
          {galleryAssets.map((asset, i) => (
            <Row
              key={i}
              paddingY="y-2xs" padding="x-xs" surface="muted" rounded="default" align="center" gap="sm" border="default"
            >
              <Text className="flex-1 truncate font-mono" color="muted" size="xs">
                {asset.url}
              </Text>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onCopy(asset.url)}
              >
                {copiedUrl === asset.url ? "Copied!" : "Copy"}
              </Button>
            </Row>
          ))}
        </Stack>
      )}
      <Row align="center" gap="sm" wrap>
        <Button
          type="button"
          variant="outline"
          onClick={onClearPreviews}
          disabled={isUploadPending || isCleanupPending}
        >
          {ACTIONS.MEDIA["clear-previews"].label}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onDiscardStaged}
          disabled={isUploadPending || isCleanupPending || stagedUrls.length === 0}
        >
          {isCleanupPending ? "Discarding…" : ACTIONS.MEDIA["discard-staged"].label}
        </Button>
        <Text size="xs" color="muted">
          {stagedUrls.length} staged upload(s)
        </Text>
      </Row>
    </Stack>
  );
}

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
  const [heroStagedUrls, setHeroStagedUrls] = React.useState<string[]>([]);
  const [galleryStagedUrls, setGalleryStagedUrls] = React.useState<string[]>([]);
  const stagedUrls = React.useMemo(
    () => Array.from(new Set([...heroStagedUrls, ...galleryStagedUrls])),
    [heroStagedUrls, galleryStagedUrls],
  );
  const [operationMessage, setOperationMessage] = React.useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null);
  const { showToast } = useToast();

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
    if (stagedUrls.length === 0) return;
    try {
      await cleanup(stagedUrls);
      setHeroAssetUrl("");
      setGalleryAssets([]);
      setHeroStagedUrls([]);
      setGalleryStagedUrls([]);
      setOperationMessage("Discarded staged media uploads.");
      showToast("Staged uploads cleared.", "success");
    } catch (err) {
      void normalizeError(err);
      setOperationMessage("Failed to discard staged media uploads.");
      showToast(err instanceof Error ? err.message : "Failed to clear uploads.", "error");
    }
  }, [cleanup, stagedUrls, showToast]);

  const copyToClipboard = React.useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
      showToast("Copied!", "success");
    } catch (err) {
      void normalizeError(err);
      setOperationMessage("Could not copy URL to clipboard.");
      showToast(err instanceof Error ? err.message : "Failed to copy.", "error");
    }
  }, [showToast]);

  if (hasChildren) {
    return (
      <StackedViewShell
        portal="admin"
        {...rest}
        title={labels.title ?? "Media Library"}
        sections={[children]}
      />
    );
  }

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={labels.title ?? "Media Library"}
      sections={[
        <Alert key="media-info" variant="info" title="Media Library">
          Upload new files in the sandbox below, or browse the existing Storage bucket via the grid.
        </Alert>,
        <MediaBrowser key="media-browser" onCopy={copyToClipboard} />,
        operationMessage ? (
          <Alert
            key="media-op-message"
            variant={operationMessage.startsWith("Failed") || operationMessage.startsWith("Some") || operationMessage.startsWith("Could") ? "error" : "success"}
            title="Media"
          >
            {operationMessage}
          </Alert>
        ) : null,
        <MediaUploaderPanel
          key="media-uploader"
          onUpload={onUpload}
          isUploadPending={isUploadPending}
          isCleanupPending={isCleanupPending}
          heroAssetUrl={heroAssetUrl}
          setHeroAssetUrl={setHeroAssetUrl}
          galleryAssets={galleryAssets}
          setGalleryAssets={setGalleryAssets}
          stagedUrls={stagedUrls}
          setHeroStagedUrls={setHeroStagedUrls}
          setGalleryStagedUrls={setGalleryStagedUrls}
          handleAbort={handleAbort}
          copiedUrl={copiedUrl}
          onCopy={copyToClipboard}
          onClearPreviews={() => { setHeroAssetUrl(""); setGalleryAssets([]); }}
          onDiscardStaged={() => { void clearStagedUploads(); }}
        />,
      ]}
    />
  );
}
