"use client"
/**
 * The one chart primitive — C-chart.
 *
 * ## Why this exists
 *
 * Three features had already hand-rolled the same thing:
 * `AdminAnalyticsCharts`, `SellerRevenueChart` and `TesterFeedbackChart` each
 * re-declare the same eight `dynamic(() => import("recharts"))` wrappers with
 * the same `as React.ComponentType<any>` cast and their own hardcoded fills.
 * Three copies is the Duplication Framework's Rule-of-Three trigger, so this is
 * consolidation of something that exists, not speculative infrastructure.
 *
 * It is also what lets a chart live in CMS content: `ChartSpec` is a plain
 * JSON-serialisable object, so a rich-text author can embed one as
 * `<figure data-chart='{...}'>` and the renderer hydrates it here.
 *
 * The data contract and its validator live in `./chart-spec`, which is pure —
 * see that file's header for why the split matters.
 *
 * ## 🛑 recharts is client-only, and that is not incidental
 *
 * Every recharts component is behind `dynamic(..., { ssr: false })`, so this
 * module renders its chrome on the server and the plot only in the browser.
 * `RichTextRenderer` is a Server Component; it can mount this because this is a
 * client component, but nothing here may be called during SSR.
 *
 * ## 🛑 The palette lives in CSS and NOWHERE ELSE
 *
 * There is deliberately no colour literal in this file. An earlier draft kept a
 * `FALLBACK_SERIES_COLORS` array of eight hexes beside the identical eight in
 * `Chart.style.css` — which is a denormalised mirror of exactly the kind Root
 * Cause #42 is about: the day someone re-steps a hue for contrast, they fix one
 * copy, and the chart renders one colour in CSS and a different one in JS with
 * nothing reporting the disagreement.
 *
 * So the colours are read from the cascade at runtime, and if the stylesheet is
 * absent the chart renders with recharts' own defaults plus a one-time console
 * warning naming the likely cause. A wrong-but-plausible colour is worse than
 * an obviously unstyled one.
 *
 * Colour is read off THIS element rather than from `useTheme()`, which throws
 * without a `<ThemeProvider>` — a chart has to survive a preview iframe, an
 * email preview or a test harness, the same reason `useCanSeePrices` uses
 * `useOptionalSession` (Root Cause #20).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  CHART_MAX_SERIES,
  parseChartAttr,
  type ChartSpec,
} from "./chart-spec";

/*
 * recharts exports generic components (<DataPointType>) whose inferred props do
 * not satisfy `dynamic()`'s ComponentType constraint, so each needs a cast.
 * This is the SINGLE copy of that cast in the codebase — the three feature
 * charts above should migrate onto this module rather than repeating it.
 */
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer as React.ComponentType<any>),
  { ssr: false },
);
const BarChart = dynamic(
  () => import("recharts").then((m) => m.BarChart as React.ComponentType<any>),
  { ssr: false },
);
const LineChart = dynamic(
  () => import("recharts").then((m) => m.LineChart as React.ComponentType<any>),
  { ssr: false },
);
const AreaChart = dynamic(
  () => import("recharts").then((m) => m.AreaChart as React.ComponentType<any>),
  { ssr: false },
);
const Bar = dynamic(
  () => import("recharts").then((m) => m.Bar as React.ComponentType<any>),
  { ssr: false },
);
const Line = dynamic(
  () => import("recharts").then((m) => m.Line as React.ComponentType<any>),
  { ssr: false },
);
const Area = dynamic(
  () => import("recharts").then((m) => m.Area as React.ComponentType<any>),
  { ssr: false },
);
const XAxis = dynamic(
  () => import("recharts").then((m) => m.XAxis as React.ComponentType<any>),
  { ssr: false },
);
const YAxis = dynamic(
  () => import("recharts").then((m) => m.YAxis as React.ComponentType<any>),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid as React.ComponentType<any>),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import("recharts").then((m) => m.Tooltip as React.ComponentType<any>),
  { ssr: false },
);

/* ── Palette, read from the cascade ───────────────────────────────────────── */

interface ChartPalette {
  /** Index i is `--chart-{i+1}`. An entry may be "" if the sheet is absent. */
  series: string[];
  grid: string;
  axis: string;
  inkMuted: string;
}

/** `""` → `undefined`, so recharts falls back to its own default. */
const orUndef = (s: string) => (s.length > 0 ? s : undefined);

let warnedMissingStylesheet = false;

/**
 * Resolve the palette from the element's own computed style, and re-resolve
 * whenever the active theme changes.
 *
 * Two triggers, because there are two ways the theme can move: the viewer's
 * toggle (which stamps `data-theme` on `<html>`) and the OS preference (which
 * only the media query sees). Watching one and not the other leaves a chart
 * stranded in the previous palette.
 *
 * Returns `null` until the first read completes — one frame after mount, which
 * is invisible given the plot itself is behind `ssr: false` anyway.
 */
function useChartPalette(ref: React.RefObject<HTMLDivElement | null>): ChartPalette | null {
  const [palette, setPalette] = useState<ChartPalette | null>(null);

  const read = useCallback(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const cs = window.getComputedStyle(el);
    const v = (name: string) => cs.getPropertyValue(name).trim();

    const series = Array.from({ length: CHART_MAX_SERIES }, (_, i) =>
      v(`--chart-${i + 1}`),
    );

    if (!series[0] && !warnedMissingStylesheet) {
      warnedMissingStylesheet = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[appkit] <Chart> found no --chart-* custom properties. " +
          'Import the stylesheet once at your app root: import "@mohasinac/appkit/styles". ' +
          "Rendering with recharts' default colours until then.",
      );
    }

    setPalette({
      series,
      grid: v("--chart-grid"),
      axis: v("--chart-axis"),
      inkMuted: v("--chart-ink-muted"),
    });
  }, [ref]);

  useEffect(() => {
    read();
    if (typeof window === "undefined") return;

    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style", "class"],
    });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", read);
    };
  }, [read]);

  return palette;
}

/* ── Component ────────────────────────────────────────────────────────────── */

export interface ChartProps {
  spec: ChartSpec;
  /** Plot height in px. Default 300. */
  height?: number;
  className?: string;
  /** Hide the table-view toggle. The legend is never optional for ≥2 series. */
  hideTableToggle?: boolean;
}

const fmt = (n: number, unit?: string) =>
  `${Number.isInteger(n) ? n : n.toFixed(2)}${unit ? ` ${unit}` : ""}`;

export function Chart({
  spec,
  height = 300,
  className = "",
  hideTableToggle = false,
}: ChartProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const palette = useChartPalette(rootRef);
  const [showTable, setShowTable] = useState(false);

  /** recharts wants row-per-category; the spec is column-per-series. */
  const rows = useMemo(
    () =>
      spec.categories.map((cat, i) => {
        const row: Record<string, string | number> = { category: cat };
        for (const s of spec.series) row[s.label] = s.values[i] ?? 0;
        return row;
      }),
    [spec],
  );

  const multi = spec.series.length >= 2;
  const accessibleName = spec.title ?? spec.caption ?? "Chart";
  const colorAt = (i: number) =>
    orUndef(palette?.series[i % CHART_MAX_SERIES] ?? "");

  const renderTable = () => (
    <div className="appkit-chart__scroll">
      <table className="appkit-chart__table">
        <caption className="appkit-chart__caption">{accessibleName}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            {spec.series.map((s) => (
              <th scope="col" key={s.label}>
                {s.label}
                {spec.unit ? ` (${spec.unit})` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.categories.map((cat, i) => (
            <tr key={cat}>
              <th scope="row">{cat}</th>
              {spec.series.map((s) => (
                <td key={s.label}>{fmt(s.values[i] ?? 0, spec.unit)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const tooltip = (
    <Tooltip
      content={(props: any) => {
        if (!props?.active || !Array.isArray(props.payload) || !props.payload.length) {
          return null;
        }
        return (
          <div className="appkit-chart__tooltip">
            <div className="appkit-chart__tooltip-label">{props.label}</div>
            {props.payload.map((p: any) => (
              <div className="appkit-chart__tooltip-row" key={String(p.dataKey)}>
                <span style={{ color: p.color }}>{String(p.dataKey)}</span>
                <span>{fmt(Number(p.value), spec.unit)}</span>
              </div>
            ))}
          </div>
        );
      }}
    />
  );

  const axes = (
    <>
      <CartesianGrid stroke={orUndef(palette?.grid ?? "")} vertical={false} />
      <XAxis
        dataKey="category"
        stroke={orUndef(palette?.axis ?? "")}
        tick={{ fill: orUndef(palette?.inkMuted ?? ""), fontSize: 12 }}
        tickLine={false}
      />
      <YAxis
        stroke={orUndef(palette?.axis ?? "")}
        tick={{ fill: orUndef(palette?.inkMuted ?? ""), fontSize: 12 }}
        tickLine={false}
        width={48}
      />
      {tooltip}
    </>
  );

  let plot: React.ReactNode;
  if (spec.kind === "bar" || spec.kind === "groupedBar") {
    plot = (
      <BarChart data={rows} barGap={2} barCategoryGap="20%">
        {axes}
        {spec.series.map((s, i) => (
          <Bar key={s.label} dataKey={s.label} fill={colorAt(i)} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    );
  } else if (spec.kind === "line") {
    plot = (
      <LineChart data={rows}>
        {axes}
        {spec.series.map((s, i) => (
          <Line
            key={s.label}
            type="monotone"
            dataKey={s.label}
            stroke={colorAt(i)}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    );
  } else {
    plot = (
      <AreaChart data={rows}>
        {axes}
        {spec.series.map((s, i) => (
          <Area
            key={s.label}
            type="monotone"
            dataKey={s.label}
            stroke={colorAt(i)}
            strokeWidth={2}
            fill={colorAt(i)}
            fillOpacity={0.18}
          />
        ))}
      </AreaChart>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`appkit-chart ${className}`.trim()}
      role="group"
      aria-label={accessibleName}
    >
      {/*
        Legend is always present for ≥2 series and never for one — with a single
        series the title already names it, and a one-row legend is noise. This
        is also the required relief for the light palette's sub-3:1 contrast
        WARN, so it is not an optional nicety.
      */}
      {multi && palette ? (
        <div className="appkit-chart__legend">
          {spec.series.map((s, i) => (
            <span key={s.label}>
              <span
                className="appkit-chart__legend-swatch"
                style={{ background: colorAt(i) }}
                aria-hidden="true"
              />
              {s.label}
            </span>
          ))}
        </div>
      ) : null}

      {showTable ? (
        renderTable()
      ) : (
        <div className="appkit-chart__plot" style={{ height }}>
          {palette ? (
            <ResponsiveContainer width="100%" height="100%">
              {plot}
            </ResponsiveContainer>
          ) : null}
        </div>
      )}

      {spec.caption ? <p className="appkit-chart__caption">{spec.caption}</p> : null}

      {hideTableToggle ? null : (
        <div className="appkit-chart__toolbar">
          <button
            type="button"
            className="appkit-chart__toggle"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
          >
            {showTable ? "Show chart" : "Show as table"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Render a `ChartSpec` from untrusted JSON, showing the validation reason when
 * it does not parse — never rendering nothing.
 */
export function ChartFromJson({
  json,
  ...rest
}: { json: string } & Omit<ChartProps, "spec">) {
  const result = useMemo(() => parseChartAttr(json), [json]);
  if (!result.ok) {
    return (
      <div className="appkit-chart">
        <p className="appkit-chart__error">Chart could not be rendered: {result.reason}</p>
      </div>
    );
  }
  return <Chart spec={result.spec} {...rest} />;
}
