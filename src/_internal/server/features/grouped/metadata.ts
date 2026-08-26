/**
 * Grouped-listing metadata helper.
 *
 * Maps a `GroupedListingDocument` to a Next.js Metadata object. Does NOT fetch
 * — the page already did, and both share one `React.cache`d call. Site branding
 * flows through opts so this file stays appkit-internal and
 * consumer-configurable (§ "SSR Architecture").
 */

import type { Metadata } from "next";
import type { GroupedListingDocument } from "../../../../features/grouped/schemas/firestore";

export interface GroupedListingMetadataOptions {
  siteName?: string;
  siteUrl?: string;
  /** Override the OG image — defaults to the group's coverImage. */
  ogImageUrl?: string;
}

const FALLBACK_DESCRIPTION =
  "A curated group of related listings — pick the pieces you want and add them together.";

export function buildGroupedListingMetadata(
  group: GroupedListingDocument | null,
  opts?: GroupedListingMetadataOptions,
): Metadata {
  const siteName = opts?.siteName?.trim() || "";
  const suffix = siteName ? ` — ${siteName}` : "";

  if (!group) {
    return {
      title: `Group not found${suffix}`,
      description: "This group is unavailable or has been removed.",
      robots: { index: false },
    };
  }

  const title = `${group.title}${suffix}`;
  const description = group.description?.trim() || FALLBACK_DESCRIPTION;
  const siteUrl = opts?.siteUrl?.replace(/\/+$/, "");
  const canonical = siteUrl ? `${siteUrl}/groups/${group.slug}` : undefined;
  const cover = opts?.ogImageUrl ?? group.coverImage;

  // A group below its `minActiveMembers` floor is hidden from every carousel;
  // letting a search engine index it would surface a page the site itself has
  // decided not to show.
  const isPublic = group.isActive && group.visibilityStatus === "visible";

  return {
    title,
    description,
    robots: isPublic ? undefined : { index: false },
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
