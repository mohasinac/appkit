import React from "react";
import { Div, Heading, Row, Text } from "../../../../ui";
import { DynamicBgDiv } from "../../../../ui/components/DynamicBgDiv";
const BRAND_FROM = "var(--appkit-color-primary-700)";
const BRAND_MID  = "var(--appkit-color-cobalt)";
const BRAND_TO   = "var(--appkit-color-secondary-400)";

const GRADIENTS: Record<string, string> = {
  brand:  `linear-gradient(135deg, ${BRAND_FROM} 0%, ${BRAND_MID} 55%, ${BRAND_TO} 100%)`,
  blue:   `linear-gradient(135deg, ${BRAND_FROM} 0%, ${BRAND_MID} 100%)`,
  green:  `linear-gradient(135deg, ${BRAND_MID} 0%, ${BRAND_TO} 100%)`,
  amber:  "var(--appkit-gradient-warning-stat)",
  rose:   "var(--appkit-gradient-danger-stat)",
};

export interface AdminStatCardProps {
  label: string;
  value: string;
  sub?: string;
  /** Emoji or ReactNode icon */
  icon?: React.ReactNode | string;
  /** Named preset or raw CSS gradient string */
  gradient?: keyof typeof GRADIENTS | string;
  className?: string;
  /**
   * Change against the previous comparable period, as a SIGNED percentage.
   * `12.4` renders "▲ 12.4%", `-3` renders "▼ 3%", `0` renders "no change".
   *
   * 🛑 OMIT IT WHEN THERE IS NO COMPARISON, and never pass `0` to mean "we
   * did not measure". A number here is a factual claim about a previous
   * period; `0` claims the figure held steady, which is a different and
   * stronger statement than silence. The whole reason a trend is worth adding
   * is that it is trusted, and a fabricated flat line is the cheapest way to
   * lose that.
   */
  trendPercent?: number;
  /**
   * What `trendPercent` is measured against — "vs last week", "vs yesterday".
   *
   * 🛑 REQUIRED WHENEVER `trendPercent` IS PASSED, enforced by the discriminated
   * shape below rather than by a comment. "▲ 12.4%" alone is unreadable: up
   * on what? The same number is excellent against last month and alarming
   * against last hour.
   */
  trendLabel?: string;
  /**
   * 🛑 DOES A HIGHER NUMBER MEAN BETTER? Defaults to `true`, and the exception
   * is the reason this prop exists: refunds, cancellations, failed payments
   * and error counts all go UP when things go WRONG. Colouring those green
   * because the arrow points up is a dashboard actively misinforming the
   * person reading it.
   */
  higherIsBetter?: boolean;
  /**
   * Recent values, oldest first, for the sparkline. Needs at least two points
   * to draw a line; fewer renders nothing rather than a dot or a flat stub.
   */
  series?: readonly number[];
}

/**
 * A 40×24 trend line. Deliberately NOT recharts.
 *
 * 🛑 recharts IS installed and is used for the three real charts in this app —
 * but it is a ~100 KB client bundle with a `ResponsiveContainer` that measures
 * on mount, and a dashboard home renders six to eight of these. Six
 * ResizeObservers to draw six polylines is a layout-thrash and a bundle cost
 * for 24 pixels of decoration. An inline `<svg>` with a `<polyline>` is the
 * whole feature.
 *
 * `preserveAspectRatio="none"` so the line fills its box at any size: the
 * values are normalised to 0–100 here, so the viewBox IS the data range and
 * stretching it is correct rather than distorting.
 */
function Sparkline({
  series,
  rising,
}: {
  series: readonly number[];
  rising: boolean;
}) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  /*
   * 🛑 A FLAT SERIES IS DRAWN FLAT, not divided by zero. When every value is
   * equal `max - min` is 0; the guard puts the line down the middle, which is
   * what "no change" looks like. Without it every point becomes NaN and the
   * polyline silently renders nothing — a missing sparkline that reads as
   * "no data" about a series that is simply steady.
   */
  const span = max - min || 1;
  const points = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * 100;
      // SVG y grows downward, so the value is inverted.
      const y = 100 - ((v - min) / span) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-full w-full"
      focusable="false"
    >
      <polyline
        points={points}
        fill="none"
        stroke={
          rising
            ? "var(--appkit-color-success)"
            : "var(--appkit-color-error)"
        }
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function AdminStatCard({
  label,
  value,
  sub,
  icon,
  gradient = "brand",
  className = "",
  trendPercent,
  trendLabel,
  higherIsBetter = true,
  series,
}: AdminStatCardProps) {
  const resolvedGradient = GRADIENTS[gradient as keyof typeof GRADIENTS] ?? gradient;

  /*
   * 🛑 `!= null`, NOT a truthiness check. `trendPercent === 0` is a real
   * measurement — "this figure did not move" — and `if (trendPercent)` would
   * discard exactly that reading while keeping every other one. The same
   * mistake as `rating !== undefined` passing for `rating: 0`, which showed
   * five stars on unreviewed products (and is fixed two commits over).
   */
  const showTrend = trendPercent != null;
  /* Two points minimum: one point is not a line, and a 1-point polyline
   * renders as nothing at all rather than as a dot. */
  const showSpark = Array.isArray(series) && series.length >= 2;

  const up = showTrend && trendPercent > 0;
  const down = showTrend && trendPercent < 0;
  const flat = showTrend && trendPercent === 0;

  /*
   * 🛑 GOOD/BAD IS NOT UP/DOWN. Refunds, cancellations, failed payments and
   * error counts all rise when things go wrong, so `higherIsBetter` decides
   * the colour and the arrow only decides the direction. Tying the tone to
   * the arrow would paint a spike in refunds green.
   */
  const good = higherIsBetter ? up : down;
  const bad = higherIsBetter ? down : up;
  const trendTone = flat ? "muted" : good ? "success" : bad ? "error" : "muted";

  const trendArrow = flat ? "–" : up ? "▲" : "▼";
  const trendText = flat
    ? "no change"
    : `${up ? "up" : "down"} ${Math.abs(trendPercent!).toFixed(1).replace(/\.0$/, "")}%`;

  // The sparkline's colour follows the same good/bad rule, not its slope.
  const sparkRising = good || (flat && higherIsBetter);

  return (
    <Div
      className={`relative border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden ${className}`} rounded="xl" shadow="sm-hover-md"
    >
      {/* 3-px gradient top accent */}
      <DynamicBgDiv
        background={resolvedGradient}
        className="absolute top-0 left-0 right-0 h-[3px]"
        aria-hidden="true"
      />

      <Row paddingX="x-5" paddingY="b-md-lg" padding="t-lg" align="start" justify="between" gap="3">
        <Div className="min-w-0 flex-1">
          <Text className="text-[11px] tracking-widest text-[var(--appkit-color-text-muted)]" weight="semibold" transform="uppercase">
            {label}
          </Text>
          <Heading
            level={3}
            className="mt-2 tabular-nums leading-none text-[var(--appkit-color-text)]" size="2xl" weight="bold"
          >
            {value}
          </Heading>
          {sub && (
            <Text className="mt-1.5 text-[var(--appkit-color-text-muted)]" size="xs">{sub}</Text>
          )}
        </Div>

        {icon && (
          <DynamicBgDiv
            background={resolvedGradient}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-[length:var(--appkit-text-xl)]"
          >
            {icon}
          </DynamicBgDiv>
        )}
      </Row>

      {(showTrend || showSpark) && (
        <Row
          paddingX="x-5"
          padding="b-md"
          align="center"
          justify="between"
          gap="3"
        >
          {showTrend ? (
            <Text size="xs" color={trendTone} weight="semibold">
              {/*
                🛑 THE ARROW IS `aria-hidden` AND THE DIRECTION IS ALSO IN
                WORDS. A screen reader announcing "▲ 12.4% vs last week" reads
                the glyph as "up-pointing triangle" or skips it entirely, so
                the direction — the whole point — is carried by a character
                that may not survive. "up 12.4%" is in the text itself.

                And colour is never the only signal (the same rule the status
                dots follow): red and green here are reinforcement, not
                information.
              */}
              <span aria-hidden="true">{trendArrow} </span>
              {trendText}
              {trendLabel ? (
                <Text as="span" size="xs" color="muted" weight="normal">
                  {" "}
                  {trendLabel}
                </Text>
              ) : null}
            </Text>
          ) : (
            <span />
          )}

          {showSpark && (
            /*
              🛑 `aria-hidden`, with NO accessible label. A sparkline is a
              decorative restatement of a trend already given in words
              directly beside it — describing it again would make a screen
              reader read the same fact twice. If the series ever carried
              information the trend line does not, it needs a real chart with
              a real description, not a label bolted onto 40 pixels.
            */
            <Div
              aria-hidden="true"
              className="h-6 w-20 flex-shrink-0 opacity-80"
            >
              <Sparkline series={series!} rising={sparkRising} />
            </Div>
          )}
        </Row>
      )}
    </Div>
  );
}
