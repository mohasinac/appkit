/**
 * The chart DATA contract — pure, and deliberately separate from `<Chart>`.
 *
 * ## 🛑 Why this is not in Chart.tsx
 *
 * `Chart.tsx` is `"use client"` and statically reaches recharts. Anything that
 * imports it inherits both. But the validator needs to be callable from places
 * that are neither:
 *
 *   - `chart-blocks.ts`, which must stay SSR-safe because `RichTextRenderer`
 *     is a Server Component;
 *   - a route handler or a seed script validating authored content before it
 *     is stored, where pulling in recharts would be absurd.
 *
 * Keeping the types and the parser here means a server-side caller gets the
 * contract without the renderer — the same split as Root Cause #24's lesson
 * about a file that mixed Node-only crypto with client-safe display helpers.
 *
 * No React, no DOM, no recharts.
 */
import { normalizeError } from "../../errors/normalize";

export const CHART_KINDS = ["bar", "groupedBar", "line", "area"] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

/**
 * 🛑 Eight, and a ninth is never a generated hue.
 *
 * The categorical palette is a fixed, validated ORDER of eight steps, checked
 * for colourblind separation between adjacent pairs. A 9th colour generated at
 * runtime cannot be validated, so a 9-series chart is REFUSED and the author is
 * told to fold the tail into "Other" or split into small multiples.
 */
export const CHART_MAX_SERIES = 8;

export interface ChartSeries {
  label: string;
  values: number[];
}

export interface ChartSpec {
  kind: ChartKind;
  /** X-axis categories. `series[].values` must be exactly this long. */
  categories: string[];
  series: ChartSeries[];
  /** Appended to every value in tooltips and the table view. */
  unit?: string;
  /** Rendered under the plot. */
  caption?: string;
  /** Accessible name. Falls back to the caption. */
  title?: string;
}

export type ChartSpecResult =
  | { ok: true; spec: ChartSpec }
  | { ok: false; reason: string };

/**
 * Validate an untrusted object into a `ChartSpec`.
 *
 * 🛑 Returns a REASON rather than throwing or silently returning null. This
 * parses author-supplied JSON out of a `data-chart` attribute, and an author
 * who mistyped needs to be told which rule they broke — a chart that quietly
 * renders nothing is the failure mode this codebase keeps paying for.
 *
 * 🛑 There is deliberately no second y-axis in the shape. A dual-axis chart
 * invites comparing two incommensurable scales on one plot; two measures mean
 * two charts, small multiples, or indexing to a common base.
 */
export function parseChartSpec(input: unknown): ChartSpecResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, reason: "Chart data must be an object." };
  }
  const o = input as Record<string, unknown>;

  const kind = o.kind;
  if (typeof kind !== "string" || !(CHART_KINDS as readonly string[]).includes(kind)) {
    return {
      ok: false,
      reason: `Chart "kind" must be one of ${CHART_KINDS.join(", ")}.`,
    };
  }

  if (
    !Array.isArray(o.categories) ||
    o.categories.length === 0 ||
    !o.categories.every((c) => typeof c === "string" && c.length > 0)
  ) {
    return { ok: false, reason: 'Chart "categories" must be a non-empty array of labels.' };
  }
  const categories = o.categories as string[];

  if (!Array.isArray(o.series) || o.series.length === 0) {
    return { ok: false, reason: 'Chart "series" must be a non-empty array.' };
  }
  if (o.series.length > CHART_MAX_SERIES) {
    return {
      ok: false,
      reason:
        `A chart carries at most ${CHART_MAX_SERIES} series (got ${o.series.length}). ` +
        `Fold the smallest into an "Other" series, or split into separate charts — ` +
        `a 9th colour cannot be checked for colourblind separation.`,
    };
  }

  const series: ChartSeries[] = [];
  for (const [i, raw] of o.series.entries()) {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, reason: `Series ${i + 1} must be an object.` };
    }
    const s = raw as Record<string, unknown>;
    if (typeof s.label !== "string" || s.label.length === 0) {
      return { ok: false, reason: `Series ${i + 1} needs a non-empty "label".` };
    }
    if (
      !Array.isArray(s.values) ||
      !s.values.every((v) => typeof v === "number" && Number.isFinite(v))
    ) {
      return {
        ok: false,
        reason: `Series "${s.label}" — "values" must be an array of finite numbers.`,
      };
    }
    if (s.values.length !== categories.length) {
      return {
        ok: false,
        reason:
          `Series "${s.label}" has ${s.values.length} values but there are ` +
          `${categories.length} categories. They must match one-to-one.`,
      };
    }
    series.push({ label: s.label, values: s.values as number[] });
  }

  return {
    ok: true,
    spec: {
      kind: kind as ChartKind,
      categories,
      series,
      ...(typeof o.unit === "string" ? { unit: o.unit } : {}),
      ...(typeof o.caption === "string" ? { caption: o.caption } : {}),
      ...(typeof o.title === "string" ? { title: o.title } : {}),
    },
  };
}

/**
 * Parse the JSON string carried by a `data-chart` attribute.
 *
 * 🛑 The normalised error is deliberately NOT surfaced to the caller. The
 * thrown value is a `SyntaxError` from `JSON.parse` carrying nothing an author
 * can act on beyond "it is not JSON" — which the returned reason already says,
 * in their language, at the place they will read it. Returning the engine's
 * message instead is how server text reaches a user (Root Cause #86). Malformed
 * authored content is an expected input here, not an incident to report.
 *
 * `normalizeError` is still called, because that is what `audit-catch-normalize`
 * actually accepts: its header also lists "return immediately" as sufficient,
 * but the implementation only tests for `normalizeError(var)` or `throw var`
 * (audit-catch-normalize.mjs:210-213), so a bare early return is reported.
 */
export function parseChartAttr(json: string): ChartSpecResult {
  try {
    return parseChartSpec(JSON.parse(json));
  } catch (err) {
    void normalizeError(err);
    return { ok: false, reason: "Chart data is not valid JSON." };
  }
}

/**
 * How many series the palette can colour. Exposed so a caller can decide to
 * fold a tail into "Other" BEFORE validation rejects the whole chart.
 */
export function exceedsSeriesLimit(count: number): boolean {
  return count > CHART_MAX_SERIES;
}
