import type { ReactElement } from "react";
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
  const { title, description, typeLabel, startsAt, coverImageUrl } = data;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0f172a",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {coverImageUrl && (
        <img
          src={coverImageUrl}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.15 }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.80) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "60px",
          gap: "48px",
          alignItems: "center",
        }}
      >
        {coverImageUrl && (
          <img
            src={coverImageUrl}
            alt={title}
            style={{ width: 380, height: 380, objectFit: "cover", borderRadius: 16, flexShrink: 0 }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 16, color: "#a78bfa", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
              {siteName} · Events
            </div>
            {typeLabel && (
              <div
                style={{
                  fontSize: 13,
                  color: "#c4b5fd",
                  fontWeight: 500,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  background: "rgba(167,139,250,0.12)",
                  padding: "3px 10px",
                  borderRadius: 100,
                }}
              >
                {typeLabel}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: coverImageUrl ? 44 : 56,
              fontWeight: 700,
              color: "#f1f5f9",
              lineHeight: 1.2,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          {description && (
            <div
              style={{
                fontSize: 22,
                color: "#94a3b8",
                lineHeight: 1.45,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </div>
          )}
          {startsAt && (
            <div style={{ fontSize: 22, fontWeight: 600, color: "#a78bfa" }}>
              {startsAt}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
