import type { ReactElement } from "react";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface BlogOgData {
  title: string;
  excerpt?: string | null;
  authorName?: string | null;
  category?: string | null;
  coverImage?: string | null;
}

interface BlogDocLike {
  title?: string | null;
  excerpt?: string | null;
  authorName?: string | null;
  category?: string | null;
  coverImage?: string | { url?: string | null } | null;
}

/** High-level OG renderer — accepts the raw blog post document from `getBlogPostForDetail`. */
export function renderBlogOg(
  doc: BlogDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  const rawCoverImage =
    typeof doc?.coverImage === "string"
      ? doc.coverImage
      : (doc?.coverImage as { url?: string } | null | undefined)?.url ?? null;
  return renderBlogOgImage(
    {
      title: doc?.title ?? `${opts.siteName} Blog`,
      excerpt: doc?.excerpt?.slice(0, 120) ?? null,
      authorName: doc?.authorName ?? null,
      category: doc?.category ?? null,
      coverImage: resolveOgImageUrl(rawCoverImage, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderBlogOgImage(data: BlogOgData, siteName: string): ReactElement {
  const sublines = [data.excerpt, data.authorName ? `By ${data.authorName}` : null].filter(Boolean);
  return renderOgLayout({
    title: data.title,
    subtitle: sublines.length > 0 ? sublines.join(" · ") : undefined,
    imageUrl: data.coverImage,
    siteName: `${siteName} · Blog`,
    badges: data.category ? [data.category] : undefined,
    theme: { accentColor: "#34d399" },
  });
}
