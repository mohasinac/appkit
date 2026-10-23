import React from "react";
import { splitChartBlocks } from "./chart-blocks";
import { ChartFromJson } from "../components/Chart";

export interface RichTextRendererProps {
  html?: string | null;
  className?: string;
  proseClass?: string;
  /**
   * Render `<figure data-chart>` placeholders as live charts. Default true.
   *
   * Pass `false` where a chart cannot work — an email body, a plain-text
   * export, an OG image — so the placeholder is simply dropped rather than
   * mounting a client component into a context that cannot hydrate it.
   */
  charts?: boolean;
}

/**
 * SSR-safe HTML renderer for admin/CMS-authored rich text content.
 *
 * Works as a React Server Component — no browser APIs, no `"use client"`.
 * Content is assumed to have been sanitized at save time via RichTextEditor.
 *
 * For user-generated content or untrusted HTML, use <RichText> instead
 * (client-only, runs the DOM-based sanitizer).
 *
 * ## 🛑 It is no longer a single `innerHTML` dump, and why that is safe
 *
 * Chart blocks are stored as `<figure data-chart='{json}'>` and have to become
 * real components to be theme-aware, so the HTML is split and the chart
 * segments are replaced with `<ChartFromJson>`. Two properties keep this from
 * being a regression:
 *
 *  - **The fast path is unchanged.** `splitChartBlocks` rejects on a substring
 *    test, so content with no chart returns one segment and renders through the
 *    same single `dangerouslySetInnerHTML` as before.
 *  - **Splitting cannot introduce markup.** Segments are slices of the original
 *    string, concatenated in document order; nothing is rewritten. A malformed
 *    chart figure fails the match and stays ordinary HTML.
 *
 * 🛑 The prose wrapper stays on the OUTER element, and each segment's own
 * wrapper is `display: contents` (`.appkit-rich-text__seg`). A segment needs an
 * element to carry `dangerouslySetInnerHTML`, but leaving that element in the
 * box tree restarts `prose`'s adjacency and first/last-child margin rules at
 * every chart — so paragraphs either side of a chart would space differently
 * from paragraphs anywhere else on the page.
 */
export function RichTextRenderer({
  html,
  className = "",
  proseClass = "prose max-w-none dark:prose-invert",
  charts = true,
}: RichTextRendererProps) {
  if (!html) return null;

  const wrapperClass = `appkit-rich-text ${proseClass} ${className}`.trim();
  const segments = charts ? splitChartBlocks(html) : [{ type: "html" as const, html }];

  // Single HTML segment — the overwhelmingly common case. Identical to the
  // pre-chart behaviour, down to the element shape.
  if (segments.length === 1 && segments[0].type === "html") {
    return (
      <div
        className={wrapperClass}
        dangerouslySetInnerHTML={{ __html: segments[0].html }}
      />
    );
  }

  return (
    <div className={wrapperClass}>
      {segments.map((seg, i) =>
        seg.type === "html" ? (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={`h${i}`}
            className="appkit-rich-text__seg"
            dangerouslySetInnerHTML={{ __html: seg.html }}
          />
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <ChartFromJson key={`c${i}`} json={seg.json} />
        ),
      )}
    </div>
  );
}
