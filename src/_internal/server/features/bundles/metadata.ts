/**
 * Bundle metadata helper — SB-UNI-3 2026-05-13.
 *
 * Maps a CategoryDocument with categoryType:"bundle" to a Next.js Metadata
 * object. Consumers (page.tsx generateMetadata) pass the doc + override
 * opts; the helper does NOT fetch anything (the page already did). Site
 * branding flows through opts.siteName / opts.siteUrl so this file stays
 * appkit-internal and consumer-configurable.
 */

import type { Metadata } from "next";
import type { CategoryDocument } from "../../../../features/categories/schemas";

export interface BundleMetadataOptions {
  /** Brand label appended to titles (e.g. consumer's site name). */
  siteName?: string;
  /** Override the base public site URL when building absolute links. */
  siteUrl?: string;
  /** Override the OG image — defaults to bundle.display.coverImage. */
  ogImageUrl?: string;
}

const FALLBACK_DESCRIPTION =
  "Curated multi-product bundle — one price, one checkout, one shipment.";

export function buildBundleMetadata(
  bundle: CategoryDocument | null,
  opts?: BundleMetadataOptions,
): Metadata {
  const siteName = opts?.siteName?.trim() || "";
  const suffix = siteName ? ` — ${siteName}` : "";

  if (!bundle) {
    return {
      title: `Bundle not found${suffix}`,
      description: "This bundle is unavailable or has been removed.",
      robots: { index: false },
    };
  }

  const title = `${bundle.name}${suffix}`;
  const description = bundle.description?.trim()
    ? bundle.description.trim()
    : FALLBACK_DESCRIPTION;
  const cover = opts?.ogImageUrl ?? bundle.display?.coverImage;
  const siteUrl = opts?.siteUrl?.replace(/\/+$/, "");
  const canonical = siteUrl ? `${siteUrl}/bundles/${bundle.slug}` : undefined;

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: cover ? [{ url: cover }] : undefined,
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}
