import type { Metadata } from "next";
import type { GiveawayEventClient } from "./data";

export function buildGiveawayMetadata(
  event: GiveawayEventClient | null,
  opts?: { siteName?: string; baseUrl?: string },
): Metadata {
  if (!event) {
    return {
      title: "Giveaway Not Found",
      description: "This giveaway no longer exists.",
    };
  }
  const siteName = opts?.siteName ?? "the platform";
  const title = `${event.title} — ${siteName} Giveaway`;
  const description =
    typeof event.description === "string" && event.description.length > 0
      ? event.description.slice(0, 155)
      : `Enter the ${event.title} giveaway on ${siteName}.`;

  const coverUrl =
    event.coverImage && typeof (event.coverImage as { url?: string }).url === "string"
      ? (event.coverImage as { url: string }).url
      : event.coverImageUrl;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(coverUrl ? { images: [{ url: coverUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(coverUrl ? { images: [coverUrl] } : {}),
    },
  };
}
