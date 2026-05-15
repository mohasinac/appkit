import type { Metadata } from "next";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export interface ClassifiedMetadataOptions {
  siteName?: string;
  siteUrl?: string;
  ogImageUrl?: string;
}

export function buildClassifiedMetadata(
  product: ProductDocument | null,
  opts?: ClassifiedMetadataOptions,
): Metadata {
  const siteName = opts?.siteName?.trim() || "";
  const suffix = siteName ? ` — ${siteName}` : "";

  if (!product) {
    return {
      title: `Listing not found${suffix}`,
      description: "This classified listing is unavailable or has been removed.",
      robots: { index: false },
    };
  }

  const location = product.classified?.meetupArea
    ? [product.classified.meetupArea.locality, product.classified.meetupArea.city]
        .filter(Boolean)
        .join(", ")
    : null;

  const title = `${product.title}${suffix}`;
  const description = product.seoDescription?.trim()
    ? product.seoDescription.trim()
    : location
      ? `${product.description?.slice(0, 120) ?? ""} — Available in ${location}.`
      : product.description?.slice(0, 160) ?? "";

  const image = opts?.ogImageUrl ?? (product.mainImage || product.images?.[0] || null);
  const siteUrl = opts?.siteUrl?.replace(/\/+$/, "");
  const canonical = siteUrl ? `${siteUrl}/classified/${product.id}` : undefined;

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
