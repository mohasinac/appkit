/**
 * Item Request OG image renderer — OG-coverage-followup 2026-05-23.
 *
 * Two layers (mirror of classified/og.tsx):
 *  - `renderItemRequestOg(doc, opts)` — maps an ItemRequestDocument into the
 *    OG data shape.
 *  - `renderItemRequestOgImage(data, siteName)` — pure JSX primitive,
 *    consumer wraps with `new ImageResponse(...)`.
 *
 * Item-request-specific accents:
 *  - Header pill says "Wanted" with cyan accent.
 *  - Status badge (Open / Closed).
 *  - Budget chip when maxBudgetInPaise is set.
 *  - Reply count chip.
 */

import type { ReactElement } from "react";
import { resolveOgImageUrl } from "../seo/og";

export interface ItemRequestOgData {
  title: string;
  opDisplayName?: string | null;
  budgetLabel?: string | null;
  imageUrl?: string | null;
  status?: "open" | "closed" | "removed" | "approved" | null;
  replyCount?: number | null;
  category?: string | null;
}

interface ItemRequestDocLike {
  title?: string | null;
  opDisplayName?: string | null;
  maxBudgetInPaise?: number | null;
  imageUrls?: (string | null | undefined)[] | null;
  status?: string | null;
  replyCount?: number | null;
  category?: string | null;
}

function formatPriceInr(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `≤ ₹${rupees.toLocaleString("en-IN")}`;
}

function normalizeStatus(s: string | null | undefined): ItemRequestOgData["status"] {
  if (s === "open" || s === "closed" || s === "removed" || s === "approved") return s;
  return null;
}

export function renderItemRequestOg(
  doc: ItemRequestDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  const budgetLabel =
    typeof doc?.maxBudgetInPaise === "number" && doc.maxBudgetInPaise > 0
      ? formatPriceInr(doc.maxBudgetInPaise)
      : null;

  return renderItemRequestOgImage(
    {
      title: doc?.title ?? "Item Request",
      opDisplayName: doc?.opDisplayName ?? null,
      budgetLabel,
      imageUrl: resolveOgImageUrl(doc?.imageUrls?.[0] ?? null, opts.baseUrl),
      status: normalizeStatus(doc?.status),
      replyCount: doc?.replyCount ?? null,
      category: doc?.category ?? null,
    },
    opts.siteName,
  );
}

const STATUS_BADGE: Record<
  NonNullable<ItemRequestOgData["status"]>,
  { text: string; bg: string; border: string; color: string }
> = {
  open: {
    text: "Open",
    bg: "rgba(74, 222, 128, 0.18)",
    border: "rgba(74, 222, 128, 0.4)",
    color: "#bbf7d0",
  },
  approved: {
    text: "Approved",
    bg: "rgba(56, 189, 248, 0.18)",
    border: "rgba(56, 189, 248, 0.4)",
    color: "#e0f2fe",
  },
  closed: {
    text: "Closed",
    bg: "rgba(148, 163, 184, 0.2)",
    border: "rgba(148, 163, 184, 0.45)",
    color: "#e2e8f0",
  },
  removed: {
    text: "Removed",
    bg: "rgba(239, 68, 68, 0.18)",
    border: "rgba(239, 68, 68, 0.45)",
    color: "#fee2e2",
  },
};

export function renderItemRequestOgImage(
  data: ItemRequestOgData,
  siteName: string,
): ReactElement {
  const { title, opDisplayName, budgetLabel, imageUrl, status, replyCount, category } = data;
  const statusBadge = status ? STATUS_BADGE[status] : null;
  const replyLabel =
    typeof replyCount === "number" && replyCount >= 0
      ? `${replyCount} repl${replyCount === 1 ? "y" : "ies"}`
      : null;

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
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.14,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.8) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 22,
          padding: "72px",
          width: "100%",
          height: "100%",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            fontSize: 18,
            color: "#22d3ee",
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {siteName} · Wanted
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#f1f5f9",
            lineHeight: 1.1,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            letterSpacing: -1,
          }}
        >
          {title}
        </div>
        {(opDisplayName || category) && (
          <div style={{ fontSize: 22, color: "#94a3b8" }}>
            {opDisplayName ? `by ${opDisplayName}` : ""}
            {opDisplayName && category ? " · " : ""}
            {category ?? ""}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 12,
            marginTop: 4,
            flexWrap: "wrap",
          }}
        >
          {statusBadge && (
            <div
              style={{
                display: "inline-flex",
                padding: "10px 22px",
                borderRadius: 999,
                background: statusBadge.bg,
                color: statusBadge.color,
                fontSize: 22,
                fontWeight: 700,
                border: `1px solid ${statusBadge.border}`,
              }}
            >
              {statusBadge.text}
            </div>
          )}
          {budgetLabel && (
            <div
              style={{
                display: "inline-flex",
                padding: "10px 22px",
                borderRadius: 999,
                background: "rgba(34, 211, 238, 0.18)",
                color: "#cffafe",
                fontSize: 22,
                fontWeight: 700,
                border: "1px solid rgba(34, 211, 238, 0.4)",
              }}
            >
              {budgetLabel}
            </div>
          )}
          {replyLabel && (
            <div
              style={{
                display: "inline-flex",
                padding: "10px 22px",
                borderRadius: 999,
                background: "rgba(148, 163, 184, 0.18)",
                color: "#e2e8f0",
                fontSize: 22,
                fontWeight: 600,
                border: "1px solid rgba(148, 163, 184, 0.35)",
              }}
            >
              {replyLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
