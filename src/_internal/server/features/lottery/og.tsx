/**
 * Lottery OG image renderer.
 *
 * ## Why this did not exist
 *
 * `lottery/[id]` was the single entry in `verify-og-coverage`'s
 * `OG_KNOWN_GAPS` — the one public dynamic detail page shipping without an
 * `opengraph-image.tsx`, carried as a baseline since 2026-05-23 with the note
 * "OG image follows in a follow-up". Metadata already resolved
 * (`buildLotteryMetadata`), so a shared link rendered a title and whatever the
 * event's cover image happened to be, with none of the branded card every
 * other listing type gets.
 *
 * ## 🛑 No money, and no per-slot prices
 *
 * An OG image is a public image URL with its contents burned into the pixels:
 * no sign-in gate reaches it and no paywall markup describes it, which is why
 * all eight money-bearing renderers were stripped (Root Cause #93). A lottery
 * is the sharpest case in the codebase — `toClientLotteryConfig` is an
 * allow-list that exists specifically to keep `price` and `weight` off every
 * slot — so this renderer takes the CLIENT shape and reads only what that
 * allow-list already permits: the slot count, and how many are still free.
 *
 * "6 of 200 slots left" is a fact about availability rather than a disclosed
 * amount, and it is the half of the card that earns the click — exactly the
 * line `renderRandomLotsOg` draws for "Free entry".
 */

import type { ReactElement } from "react";
import { renderOgLayout } from "../seo/og-layout";
import { resolveOgImageUrl } from "../seo/og";
import type { LotteryEventClient } from "./data";

export interface LotteryOgData {
  title: string;
  imageUrl?: string | null;
  slotsLabel?: string | null;
  statusLabel?: string | null;
}

/**
 * The event's own status, as a human badge. `active` is deliberately absent:
 * a live lottery is the default case, so a chip saying so costs a badge slot
 * and tells the reader nothing they would not assume.
 */
const STATUS_BADGE_TEXT: Record<string, string> = {
  draft: "Not yet open",
  paused: "Paused",
  ended: "Closed",
  cancelled: "Cancelled",
};

export function renderLotteryOg(
  event: LotteryEventClient | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  const cfg = event?.lotteryConfig;
  const slots = cfg?.slots ?? [];
  /*
   * Counted from the slot array rather than read from `totalSlots`, which is
   * the mirror the admin write path derives FROM `slots.length` — and a mirror
   * is the field most likely to disagree (Root Cause #42). The array is here
   * either way, so counting it costs nothing.
   */
  const total = slots.length;
  const free = slots.filter((s) => !s.isBooked).length;
  const slotsLabel =
    total > 0
      ? free > 0
        ? `${free.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} slots left`
        : `All ${total.toLocaleString("en-IN")} slots claimed`
      : null;

  const coverUrl =
    event?.coverImage && typeof (event.coverImage as { url?: string }).url === "string"
      ? (event.coverImage as { url: string }).url
      : (event?.coverImageUrl ?? null);

  return renderLotteryOgImage(
    {
      title: event?.title ?? "Lottery",
      imageUrl: resolveOgImageUrl(coverUrl, opts.baseUrl),
      slotsLabel,
      statusLabel: event?.status ? (STATUS_BADGE_TEXT[event.status] ?? null) : null,
    },
    opts.siteName,
  );
}

export function renderLotteryOgImage(
  data: LotteryOgData,
  siteName: string,
): ReactElement {
  const badges = [data.statusLabel].filter((s): s is string => Boolean(s));
  return renderOgLayout({
    title: data.title,
    subtitle: data.slotsLabel ?? undefined,
    imageUrl: data.imageUrl,
    siteName: `${siteName} · Lottery`,
    badges: badges.length > 0 ? badges : undefined,
    // Violet, distinct from the prize-draw amber beside it in the nav — the two
    // are different products and a shared accent makes shared links ambiguous.
    theme: { accentColor: "#8b5cf6" },
  });
}
