/**
 * Splitting rich-text HTML around `<figure data-chart>` placeholders.
 *
 * ## 🛑 Why this is regex and not a DOM parse
 *
 * `RichTextRenderer` is a React Server Component — no `DOMParser`, no
 * `document`. So the split has to work on the string, and it is only safe to do
 * that because the shape being matched is one we WRITE: a childless
 * `<figure data-chart='…'></figure>` emitted by the chart toolbar button.
 *
 * This is deliberately not a general HTML parser and must not grow into one. It
 * matches exactly one element shape and hands everything else through
 * untouched, so a malformed chart figure degrades to "rendered as ordinary
 * HTML" rather than corrupting the document around it.
 *
 * ## 🛑 Why the JSON needs entity decoding
 *
 * A `ChartSpec` is full of `"` characters, so the attribute is written
 * single-quoted. But anything that round-trips the HTML through a DOM — the
 * client sanitiser's `DOMParser`, a contenteditable surface, an admin preview —
 * re-serialises it double-quoted with the inner quotes as `&quot;`. Both
 * spellings therefore occur in stored content, and a renderer that handles only
 * the one it writes will fail on its own saved output.
 *
 * Pure. No React, no DOM, safe on the server.
 */
import type { ChartSpec } from "../components/chart-spec";

/** A run of ordinary HTML, or a chart placeholder's raw JSON payload. */
export type RichTextSegment =
  | { type: "html"; html: string }
  | { type: "chart"; json: string };

/**
 * Matches a childless `<figure>` carrying `data-chart`, single- or
 * double-quoted. `[\s\S]*?` rather than `.*?` because stored content is
 * frequently pretty-printed across lines.
 */
const CHART_FIGURE_RE =
  /<figure\b[^>]*\bdata-chart\s*=\s*(?:'([^']*)'|"([^"]*)")[^>]*>[\s\S]*?<\/figure\s*>/gi;

/**
 * 🛑 A SECOND, non-global copy, purely for `hasChartBlock`.
 *
 * `RegExp.prototype.test` on a `/g` regex ADVANCES `lastIndex`, so calling it
 * twice on the same string returns `true` then `false`. Measured on the first
 * draft of this file: three consecutive calls gave `true false true`. Sharing
 * one `/g` literal between `exec` in a loop and `test` as a predicate is the
 * bug — a predicate must be stateless, so it gets its own non-global regex
 * rather than relying on every caller to reset `lastIndex` first.
 *
 * Derived from `.source` so the pattern has exactly one definition. It is also
 * written as a LITERAL above rather than built from a string: a string-built
 * pattern needs every backslash doubled, which is silently destroyed by any
 * tool that re-escapes the file on the way in — a draft of this module lost
 * `\s` to `s` that way and matched nothing at all while looking correct.
 */
const CHART_FIGURE_TEST_RE = new RegExp(CHART_FIGURE_RE.source, "i");

/**
 * Decode the entity subset an HTML serialiser can introduce inside an
 * attribute value.
 *
 * 🛑 `&amp;` is decoded LAST. Decoding it first turns a legitimately encoded
 * `&amp;quot;` into `&quot;` and then into `"`, which injects a quote the
 * author never wrote and breaks the JSON parse — the classic double-decode bug.
 */
export function decodeAttrEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Split HTML into alternating prose and chart segments, in document order.
 *
 * Returns a single `html` segment when there are no charts, so the common case
 * costs one regex test and the caller's fast path stays a plain innerHTML
 * render.
 */
export function splitChartBlocks(html: string): RichTextSegment[] {
  if (!html) return [];
  // Cheap reject before the real scan — most content has no chart at all.
  if (!html.includes("data-chart")) return [{ type: "html", html }];

  const segments: RichTextSegment[] = [];
  let cursor = 0;

  // `exec` in a loop needs a fresh lastIndex; the literal is module-scoped and
  // /g, so reset rather than relying on a previous call having run to the end.
  CHART_FIGURE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CHART_FIGURE_RE.exec(html)) !== null) {
    if (m.index > cursor) {
      segments.push({ type: "html", html: html.slice(cursor, m.index) });
    }
    const raw = m[1] ?? m[2] ?? "";
    segments.push({ type: "chart", json: decodeAttrEntities(raw) });
    cursor = m.index + m[0].length;
  }

  if (cursor < html.length) {
    segments.push({ type: "html", html: html.slice(cursor) });
  }
  return segments;
}

/** True when the content carries at least one chart placeholder. Stateless. */
export function hasChartBlock(html: string | null | undefined): boolean {
  return !!html && CHART_FIGURE_TEST_RE.test(html);
}

/**
 * Build the placeholder a toolbar or a seed fixture should emit.
 *
 * Single-quoted, with any single quote in the payload escaped as `&#39;` so the
 * attribute cannot be terminated early by a label containing an apostrophe —
 * "Blader's choice" is an entirely ordinary series label.
 */
export function chartFigureHtml(spec: ChartSpec): string {
  const json = JSON.stringify(spec).replace(/'/g, "&#39;");
  return `<figure data-chart='${json}'></figure>`;
}
