import type { Metadata } from "next";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export interface LiveItemMetadataOptions {
  siteName?: string;
  siteUrl?: string;
  ogImageUrl?: string;
}

export function buildLiveItemMetadata(
  product: ProductDocument | null,
  opts?: LiveItemMetadataOptions,
): Metadata {
  const siteName = opts?.siteName?.trim() || "";
  const suffix = siteName ? ` — ${siteName}` : "";

  if (!product) {
    return {
      title: `Live listing not found${suffix}`,
      description: "This live listing is unavailable or has been removed.",
      robots: { index: false },
    };
  }

  const species = product.liveItem?.species
    ? ` (${product.liveItem.species})`
    : "";

  const title = `${product.title}${species}${suffix}`;
  const description = product.seoDescription?.trim()
    ? product.seoDescription.trim()
    : product.description?.slice(0, 160) ?? "";

  const image = opts?.ogImageUrl ?? (product.mainImage || product.images?.[0] || null);
  const siteUrl = opts?.siteUrl?.replace(/\/+$/, "");
  const canonical = siteUrl ? `${siteUrl}/live/${product.id}` : undefined;

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}
