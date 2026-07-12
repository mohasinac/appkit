import type { Metadata } from "next";
import type { LotteryEventClient } from "./data";

export function buildLotteryMetadata(
  event: LotteryEventClient | null,
  opts?: { siteName?: string; baseUrl?: string },
): Metadata {
  if (!event) {
    return {
      title: "Lottery Not Found",
      description: "This lottery no longer exists.",
    };
  }
  const siteName = opts?.siteName ?? "the platform";
  const title = `${event.title} — ${siteName} Lottery`;
  const description =
    typeof event.description === "string" && event.description.length > 0
      ? event.description.slice(0, 155)
      : `Enter the ${event.title} lottery on ${siteName}.`;

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
