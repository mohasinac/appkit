import type { Metadata } from "next";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export interface DigitalCodeMetadataOptions {
  siteName?: string;
  siteUrl?: string;
  ogImageUrl?: string;
}

export function buildDigitalCodeMetadata(
  product: ProductDocument | null,
  opts?: DigitalCodeMetadataOptions,
): Metadata {
  const siteName = opts?.siteName?.trim() || "";
  const suffix = siteName ? ` — ${siteName}` : "";

  if (!product) {
    return {
      title: `Digital code not found${suffix}`,
      description: "This digital code listing is unavailable or has been removed.",
      robots: { index: false },
    };
  }

  const title = `${product.title}${suffix}`;
  const description = product.seoDescription?.trim()
    ? product.seoDescription.trim()
    : product.description?.slice(0, 160) ?? "";

  const image = opts?.ogImageUrl ?? (product.mainImage || product.images?.[0] || null);
  const siteUrl = opts?.siteUrl?.replace(/\/+$/, "");
  const canonical = siteUrl ? `${siteUrl}/digital-codes/${product.id}` : undefined;

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
