import type { ReactElement } from "react";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";

export interface EventOgData {
  title: string;
  description?: string | null;
  typeLabel?: string | null;
  startsAt?: string | null;
  coverImageUrl?: string | null;
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  TOURNAMENT: "Tournament",
  CONVENTION: "Convention",
  MEETUP: "Meetup",
  SALE: "Sale",
  sale: "Sale",
  offer: "Offer",
  poll: "Poll",
  survey: "Survey",
  feedback: "Feedback",
};

interface EventDocLike {
  title?: string | null;
  description?: string | null;
  type?: string | null;
  startsAt?: Date | string | null;
  coverImageUrl?: string | null;
  coverImage?: string | { url?: string | null } | null;
}

/** High-level OG renderer — accepts the raw event document from `getEventForDetail`. */
export function renderEventOg(
  doc: EventDocLike | null | undefined,
  opts: { siteName: string; locale?: string; typeLabels?: Record<string, string>; baseUrl?: string },
): ReactElement {
  const locale = opts.locale ?? "en-IN";
  const labels = { ...EVENT_TYPE_LABEL, ...(opts.typeLabels ?? {}) };
  const eventType = doc?.type ?? null;
  const rawCoverImageUrl =
    doc?.coverImageUrl ??
    (typeof doc?.coverImage === "string"
      ? doc.coverImage
      : (doc?.coverImage as { url?: string } | null | undefined)?.url) ??
    null;
  const coverImageUrl = resolveOgImageUrl(rawCoverImageUrl, opts.baseUrl);
  const startsAt = doc?.startsAt
    // audit-unknown-ok: TS structural escape — primitive cast
    ? new Date(doc.startsAt as unknown as string).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;
  return renderEventOgImage(
    {
      title: doc?.title ?? `${opts.siteName} Event`,
      description:
        (typeof doc?.description === "string" ? doc.description : "").slice(0, 110) || null,
      typeLabel: eventType ? (labels[eventType] ?? eventType) : null,
      startsAt,
      coverImageUrl,
    },
    opts.siteName,
  );
}

export function renderEventOgImage(data: EventOgData, siteName: string): ReactElement {
  return renderOgLayout({
    title: data.title,
    subtitle: data.description ?? undefined,
    imageUrl: data.coverImageUrl,
    siteName: `${siteName} · Events`,
    badges: data.typeLabel ? [data.typeLabel] : undefined,
    accentSlot: data.startsAt,
    theme: { accentColor: "#a78bfa" },
  });
}
