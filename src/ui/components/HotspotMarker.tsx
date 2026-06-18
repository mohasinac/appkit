import type { CSSProperties, ReactNode } from "react";

/**
 * HotspotMarker — primitive for dynamically-positioned overlay markers
 * (character image hotspots, pins on a campaign image, etc.).
 *
 * Takes percentage coordinates and emits the required inline positioning
 * style internally. The variant catalogue blocks consumer-side inline
 * `style={{ left/top }}` writes — this primitive is the source-of-truth for
 * that pattern.
 */
export type HotspotMarkerSize = "sm" | "md" | "lg";
export type HotspotMarkerTone =
  | "brand"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "neutral";
export type HotspotMarkerShape = "dot" | "pin" | "ring" | "halo";

export interface HotspotMarkerProps {
  /** Horizontal position as a percentage of the parent's width (0–100). */
  xPct: number;
  /** Vertical position as a percentage of the parent's height (0–100). */
  yPct: number;
  /** Visual size preset. Default `"md"`. */
  size?: HotspotMarkerSize;
  /** Colour tone, drawn from the active theme. Default `"brand"`. */
  tone?: HotspotMarkerTone;
  /** Marker shape. Default `"dot"`. */
  shape?: HotspotMarkerShape;
  /** Optional child content (number badge, icon). Centred inside the marker. */
  children?: ReactNode;
  /** Optional click handler. */
  onClick?: () => void;
  /** Optional ARIA label when interactive. */
  "aria-label"?: string;
  /** Render mode: `"absolute"` (default — parent is the relative container) or `"fixed"`. */
  positionMode?: "absolute" | "fixed";
}

const SIZE_PX: Record<HotspotMarkerSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

const TONE_BG: Record<HotspotMarkerTone, string> = {
  brand: "var(--appkit-color-primary)",
  accent: "var(--appkit-color-secondary)",
  success: "var(--appkit-color-success)",
  warning: "var(--appkit-color-warning)",
  danger: "var(--appkit-color-error)",
  neutral: "var(--appkit-color-text-muted)",
};

const TONE_TEXT: Record<HotspotMarkerTone, string> = {
  brand: "var(--appkit-color-text-on-primary)",
  accent: "var(--appkit-color-text-on-primary)",
  success: "var(--appkit-color-text-on-primary)",
  warning: "var(--appkit-color-text-on-primary)",
  danger: "var(--appkit-color-text-on-primary)",
  neutral: "var(--appkit-color-text-on-primary)",
};

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function buildShapeStyle(shape: HotspotMarkerShape, sizePx: number): CSSProperties {
  switch (shape) {
    case "pin":
      return {
        borderRadius: `${sizePx}px ${sizePx}px ${sizePx}px 0`,
        transform: "translate(-50%, -100%) rotate(-45deg)",
      };
    case "ring":
      return {
        borderRadius: "9999px",
        backgroundColor: "transparent",
        border: `${Math.max(2, Math.round(sizePx / 6))}px solid currentColor`,
      };
    case "halo":
      return {
        borderRadius: "9999px",
        boxShadow:
          "0 0 0 4px color-mix(in srgb, currentColor 20%, transparent), 0 0 0 8px color-mix(in srgb, currentColor 10%, transparent)",
      };
    case "dot":
    default:
      return { borderRadius: "9999px" };
  }
}

export function HotspotMarker({
  xPct,
  yPct,
  size = "md",
  tone = "brand",
  shape = "dot",
  children,
  onClick,
  positionMode = "absolute",
  ...rest
}: HotspotMarkerProps) {
  const sizePx = SIZE_PX[size];
  const baseTransform = shape === "pin" ? undefined : "translate(-50%, -50%)";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rest["aria-label"]}
      data-shape={shape}
      data-tone={tone}
      style={{
        position: positionMode,
        left: `${clampPct(xPct)}%`,
        top: `${clampPct(yPct)}%`,
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        backgroundColor: TONE_BG[tone],
        color: TONE_TEXT[tone],
        fontSize: `${Math.max(10, Math.round(sizePx * 0.45))}px`,
        fontWeight: 600,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: 0,
        cursor: onClick ? "pointer" : "default",
        padding: 0,
        transform: baseTransform,
        ...buildShapeStyle(shape, sizePx),
      }}
    >
      {children}
    </button>
  );
}
