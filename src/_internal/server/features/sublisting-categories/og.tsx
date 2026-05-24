import type { ReactElement } from "react";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface SublistingCategoryOgData {
  name: string;
  description?: string | null;
  productCount?: number | null;
  coverImage?: string | null;
}

interface SublistingCategoryDocLike {
  name?: string | null;
  itemCode?: string | null;
  description?: string | null;
  productCount?: number | null;
  coverImage?: string | null;
}

/** High-level OG renderer — accepts the raw sublisting-category doc from the repository. */
export function renderSublistingCategoryOg(
  doc: SublistingCategoryDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  const baseName = doc?.name ?? "Sub-listing";
  const name = doc?.itemCode ? `${baseName} (${doc.itemCode})` : baseName;
  return renderSublistingCategoryOgImage(
    {
      name,
      description: doc?.description?.slice(0, 120) ?? null,
      productCount: doc?.productCount ?? null,
      coverImage: resolveOgImageUrl(doc?.coverImage ?? null, opts.baseUrl),
    },
    opts.siteName,
  );
}

export function renderSublistingCategoryOgImage(data: SublistingCategoryOgData, siteName: string): ReactElement {
  const countLabel =
    data.productCount !== null && data.productCount !== undefined && data.productCount > 0
      ? `${data.productCount} listing${data.productCount !== 1 ? "s" : ""} available`
      : null;
  return renderOgLayout({
    title: data.name,
    subtitle: data.description ?? undefined,
    imageUrl: data.coverImage,
    siteName: `${siteName} · Listings`,
    accentSlot: countLabel,
    theme: { accentColor: "#f59e0b" },
  });
}
