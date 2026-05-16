"use client";

import React from "react";
import {
  Alert,
  Button,
  Div,
  Input,
  Select,
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
    <Div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Browse existing media
      </Text>
      <Div className="flex flex-wrap items-center gap-2">
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
      </Div>
      {error && (
        <Alert variant="error" title="Load failed">
          {error}
        </Alert>
      )}
      <Div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {filtered.map((f) => {
          const isImage = (f.contentType ?? "").startsWith("image/");
          return (
            <Div
              key={f.name}
              className="group rounded-lg border border-zinc-200 dark:border-slate-700 overflow-hidden bg-zinc-50 dark:bg-slate-800"
            >
              <Div className="aspect-square flex items-center justify-center bg-zinc-100 dark:bg-slate-700 text-xs text-zinc-500 dark:text-zinc-400">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.downloadURL}
                    alt={f.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <Text className="px-2 text-center break-all">
                    {f.contentType ?? "file"}
                  </Text>
                )}
              </Div>
              <Div className="p-1.5">
                <Text className="truncate text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">
                  {f.name.split("/").pop()}
                </Text>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-1 w-full text-xs"
                  onClick={() => onCopy(f.downloadURL)}
                >
                  Copy URL
                </Button>
              </Div>
            </Div>
          );
        })}
        {filtered.length === 0 && !isLoading && (
          <Text className="col-span-full py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No files found.
          </Text>
        )}
      </Div>
      <Div className="flex items-center justify-between">
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
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
      </Div>
    </Div>
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
    <Div
      className="space-y-5 rounded-xl border border-zinc-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
    >
      <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
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
        <Div className="flex items-center gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
          <Text className="flex-1 truncate text-xs text-zinc-600 dark:text-zinc-400 font-mono">
            {heroAssetUrl}
          </Text>
          <Button
            type="button"
            variant="outline"
            onClick={() => onCopy(heroAssetUrl)}
          >
            {copiedUrl === heroAssetUrl ? "Copied!" : "Copy URL"}
          </Button>
        </Div>
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
        <Div className="flex flex-col gap-1">
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Gallery URLs
          </Text>
          {galleryAssets.map((asset, i) => (
            <Div
              key={i}
              className="flex items-center gap-2 rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1"
            >
              <Text className="flex-1 truncate text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                {asset.url}
              </Text>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onCopy(asset.url)}
              >
                {copiedUrl === asset.url ? "Copied!" : "Copy"}
              </Button>
            </Div>
          ))}
        </Div>
      )}
      <Div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClearPreviews}
          disabled={isUploadPending || isCleanupPending}
        >
          Clear previews
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onDiscardStaged}
          disabled={isUploadPending || isCleanupPending || stagedUrls.length === 0}
        >
          {isCleanupPending ? "Discarding…" : "Discard staged uploads"}
        </Button>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          {stagedUrls.length} staged upload(s)
        </Text>
      </Div>
    </Div>
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
    } catch {
      setOperationMessage("Failed to discard staged media uploads.");
    }
  }, [cleanup, stagedUrls]);

  const copyToClipboard = React.useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      setOperationMessage("Could not copy URL to clipboard.");
    }
  }, []);

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
