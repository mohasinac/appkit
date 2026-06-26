import React from "react";
import { ROUNDED_MAP, PADDING_MAP, X_ONLY_MAP, type RoundedKey, type PaddingKey, type XPaddingKey } from "./surface-tokens";

const TYPOGRAPHY = {
  headingLevel: {
    1: "appkit-heading--h1",
    2: "appkit-heading--h2",
    3: "appkit-heading--h3",
    4: "appkit-heading--h4",
    5: "appkit-heading--h5",
    6: "appkit-heading--h6",
  },
  textSize: {
    xs: "appkit-text--xs",
    sm: "appkit-text--sm",
    base: "appkit-text--base",
    lg: "appkit-text--lg",
    xl: "appkit-text--xl",
    "2xl": "appkit-text--2xl",
    "3xl": "appkit-text--3xl",
    "4xl": "appkit-text--4xl",
    "5xl": "appkit-text--5xl",
    "6xl": "text-6xl",
    "7xl": "text-7xl",
    "8xl": "text-8xl",
  },
  textWeight: {
    light: "appkit-font--light",
    normal: "appkit-font--normal",
    medium: "appkit-font--medium",
    semibold: "appkit-font--semibold",
    bold: "appkit-font--bold",
  },
  colorVariant: {
    primary: "appkit-color--primary",
    secondary: "appkit-color--secondary",
    muted: "appkit-color--muted",
    faint: "appkit-color--faint",
    error: "appkit-color--error",
    danger: "appkit-color--error",
    success: "appkit-color--success",
    warning: "appkit-color--warning",
    info: "appkit-color--info",
    none: "",
    inherit: "",
    accent: "appkit-color--accent",
    inverse: "appkit-color--inverse",
  },
} as const;

// --- Heading -----------------------------------------------------------------

export type ColorVariant = keyof typeof TYPOGRAPHY.colorVariant;

/** Shared text-shaping modifiers added by the variant-catalogue rollout. */
export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";
export type TextAlign = "start" | "center" | "end" | "justify";
export type FontFamily = "sans" | "display" | "editorial" | "mono";
export type TextGradient = "none" | "brand" | "brand-tri" | "accent";
/** Multi-line ellipsis: `true` = 1 line; pass `2`, `3`, or `4` for line-clamp. */
export type TextTruncate = boolean | 1 | 2 | 3 | 4;

/** Drop-shadow preset shared by Heading and Text (over-image/hero text). */
export type DropShadowPreset = "none" | "sm" | "md" | "lg" | "2xl";

const DROP_SHADOW_MAP: Record<DropShadowPreset, string> = {
  none: "",
  sm: "drop-shadow-sm",
  md: "drop-shadow-md",
  lg: "drop-shadow-lg",
  "2xl": "drop-shadow-2xl",
};

/** CSS text-shadow preset for hero headings where filter drop-shadow is insufficient. */
export type HeadingTextShadow = "soft-dark";

const HEADING_TEXT_SHADOW_MAP: Record<HeadingTextShadow, string> = {
  "soft-dark": "[text-shadow:0_4px_32px_rgba(0,0,0,0.5)]",
};

function shapingClasses(opts: {
  transform?: TextTransform;
  truncate?: TextTruncate;
  numeric?: boolean;
  italic?: boolean;
  family?: FontFamily;
  align?: TextAlign;
  gradient?: TextGradient;
}): string[] {
  const out: string[] = [];
  if (opts.transform && opts.transform !== "none") {
    out.push(`appkit-text--transform-${opts.transform}`);
  }
  if (opts.truncate) {
    const lines = typeof opts.truncate === "number" ? opts.truncate : 1;
    out.push(`appkit-text--truncate-${lines}`);
  }
  if (opts.numeric) out.push("appkit-text--numeric");
  if (opts.italic) out.push("appkit-text--italic");
  if (opts.family) out.push(`appkit-font--${opts.family}`);
  if (opts.align) out.push(`appkit-text--align-${opts.align}`);
  if (opts.gradient && opts.gradient !== "none") {
    out.push(`appkit-text--gradient-${opts.gradient}`);
  }
  return out;
}

type HeadingSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "8xl";

function responsiveSizeClass(prefix: "sm:" | "md:" | "lg:" | "xl:", size: HeadingSize | undefined): string {
  if (!size) return "";
  // Use raw Tailwind text-* utilities (which support responsive prefixes) rather
  // than the custom .appkit-text--N classes (which don't).
  return `${prefix}text-${size}`;
}

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  variant?: "primary" | "secondary" | "muted" | "none";
  color?: ColorVariant;
  /** Optional size override — defaults to the level's heading size. */
  size?: HeadingSize;
  /** Responsive size override at the sm breakpoint and up. */
  smSize?: HeadingSize;
  /** Responsive size override at the md breakpoint and up. */
  mdSize?: HeadingSize;
  /** Responsive size override at the lg breakpoint and up. */
  lgSize?: HeadingSize;
  /** Responsive size override at the xl breakpoint and up. */
  xlSize?: HeadingSize;
  /** Optional weight override — defaults to the level's heading weight. */
  weight?: "light" | "normal" | "medium" | "semibold" | "bold";
  transform?: TextTransform;
  truncate?: TextTruncate;
  numeric?: boolean;
  italic?: boolean;
  family?: FontFamily;
  align?: TextAlign;
  gradient?: TextGradient;
  /** Drop-shadow filter preset for over-image / hero-section headings. */
  shadow?: DropShadowPreset;
  /** CSS text-shadow preset — use instead of wrapping children in a native `<span style>`. */
  textShadow?: HeadingTextShadow;
  children: React.ReactNode;
}

export function Heading({
  level = 1,
  variant = "primary",
  color,
  size,
  smSize,
  mdSize,
  lgSize,
  xlSize,
  weight,
  transform,
  truncate,
  numeric,
  italic,
  family,
  align,
  gradient,
  shadow,
  textShadow,
  className = "",
  children,
  ...props
}: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  const resolvedColor = color ?? variant;

  return (
    <Tag
      className={[
        "appkit-heading",
        TYPOGRAPHY.headingLevel[level],
        TYPOGRAPHY.colorVariant[resolvedColor],
        size ? TYPOGRAPHY.textSize[size] : "",
        responsiveSizeClass("sm:", smSize),
        responsiveSizeClass("md:", mdSize),
        responsiveSizeClass("lg:", lgSize),
        responsiveSizeClass("xl:", xlSize),
        weight ? TYPOGRAPHY.textWeight[weight] : "",
        ...shapingClasses({ transform, truncate, numeric, italic, family, align, gradient }),
        shadow ? DROP_SHADOW_MAP[shadow] : "",
        textShadow ? HEADING_TEXT_SHADOW_MAP[textShadow] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}

// --- Text ---------------------------------------------------------------------

type TextPaddingY = "none" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
const TEXT_PADDING_Y_MAP: Record<TextPaddingY, string> = {
  none: "",
  "2xs": "py-1",
  xs: "py-2",
  sm: "py-3",
  md: "py-4",
  lg: "py-6",
  xl: "py-8",
  "2xl": "py-10",
  "3xl": "py-12",
  "4xl": "py-16",
};

type TextLayout = "default" | "inline-flex" | "flex" | "inline-block";
type TextGap = "none" | "1" | "1.5" | "2" | "3";
type TextShadow = "none" | "sm" | "md" | "lg" | "2xl";

/**
 * Shared layout class strings — referenced from TEXT_LAYOUT_MAP,
 * LABEL_LAYOUT_MAP, and SPAN_LAYOUT_MAP below. Extracting them as constants
 * keeps `audit-code-quality/REPEATED_STRING` at strict-zero (the audit fires
 * when the same human-readable className appears ≥3 times across the file).
 */
const CLS_INLINE_FLEX = "inline-flex items-center";
const CLS_FLEX = "flex items-center";

const TEXT_LAYOUT_MAP: Record<TextLayout, string> = {
  default: "",
  "inline-flex": CLS_INLINE_FLEX,
  flex: CLS_FLEX,
  "inline-block": "inline-block",
};

const TEXT_GAP_MAP: Record<TextGap, string> = {
  none: "",
  "1": "gap-1",
  "1.5": "gap-1.5",
  "2": "gap-2",
  "3": "gap-3",
};

const TEXT_SHADOW_MAP: Record<TextShadow, string> = DROP_SHADOW_MAP;

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: "primary" | "secondary" | "muted" | "error" | "success" | "none";
  color?: ColorVariant;
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "8xl";
  smSize?: HeadingSize;
  mdSize?: HeadingSize;
  lgSize?: HeadingSize;
  xlSize?: HeadingSize;
  weight?: "light" | "normal" | "medium" | "semibold" | "bold";
  transform?: TextTransform;
  truncate?: TextTruncate;
  numeric?: boolean;
  italic?: boolean;
  family?: FontFamily;
  align?: TextAlign;
  gradient?: TextGradient;
  /** Vertical padding — used for empty-state Text wrappers. */
  paddingY?: TextPaddingY;
  /** Horizontal padding — use instead of raw `px-*` className. */
  paddingX?: XPaddingKey;
  /** Border radius — use instead of raw `rounded-*` className. */
  rounded?: RoundedKey;
  /** Layout — `inline-flex` / `flex` for icon + label compositions. */
  layout?: TextLayout;
  /** Flex gap between children (only when `layout` is `inline-flex` / `flex`). */
  gap?: TextGap;
  /** Drop-shadow preset for over-image / hero-section text. */
  shadow?: TextShadow;
  /** Override the rendered element. Defaults to `p`. */
  as?: React.ElementType;
  children: React.ReactNode;
}

export function Text({
  variant = "primary",
  color,
  size = "base",
  smSize,
  mdSize,
  lgSize,
  xlSize,
  weight = "normal",
  transform,
  truncate,
  numeric,
  italic,
  family,
  align,
  gradient,
  paddingY,
  paddingX,
  rounded,
  layout,
  gap,
  shadow,
  className = "",
  as: Tag = "p",
  children,
  ...props
}: TextProps) {
  const resolvedColor = color ?? variant;
  return (
    <Tag
      className={[
        "appkit-text",
        TYPOGRAPHY.textSize[size],
        responsiveSizeClass("sm:", smSize),
        responsiveSizeClass("md:", mdSize),
        responsiveSizeClass("lg:", lgSize),
        responsiveSizeClass("xl:", xlSize),
        TYPOGRAPHY.textWeight[weight],
        TYPOGRAPHY.colorVariant[resolvedColor],
        ...shapingClasses({ transform, truncate, numeric, italic, family, align, gradient }),
        paddingY ? TEXT_PADDING_Y_MAP[paddingY] : "",
        paddingX ? X_ONLY_MAP[paddingX] : "",
        rounded ? ROUNDED_MAP[rounded] : "",
        layout ? TEXT_LAYOUT_MAP[layout] : "",
        gap ? TEXT_GAP_MAP[gap] : "",
        shadow ? TEXT_SHADOW_MAP[shadow] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}

// --- Label --------------------------------------------------------------------

type LabelLayout = "inline" | "inline-flex" | "flex" | "flex-start" | "flex-col-center";

const LABEL_LAYOUT_MAP: Record<LabelLayout, string> = {
  inline: "",
  "inline-flex": CLS_INLINE_FLEX,
  flex: CLS_FLEX,
  /** Flex container with `items-start` cross-axis alignment — for checkbox + multi-line description rows. */
  "flex-start": "flex items-start",
  /** Flex column with center cross-axis + main-axis alignment — for upload drop-zone labels. */
  "flex-col-center": "flex flex-col items-center justify-center",
};

type LabelGap = "none" | "xs" | "sm" | "md" | "lg";

const LABEL_GAP_MAP: Record<LabelGap, string> = {
  none: "",
  xs: "gap-1",
  sm: "gap-1.5",
  md: "gap-2",
  lg: "gap-3",
};

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  /** Optional size override — defaults to `sm` (the existing label sizing). */
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "8xl";
  /** Optional weight override — defaults to the label's medium weight. */
  weight?: "light" | "normal" | "medium" | "semibold" | "bold";
  color?: ColorVariant;
  transform?: TextTransform;
  align?: TextAlign;
  /** Display + cross-axis alignment. flex variants auto-apply items-center. */
  layout?: LabelLayout;
  /** Gap between children. Only takes effect when `layout` is set to a flex variant. */
  gap?: LabelGap;
  /** Border radius — replaces consumer `rounded-*` className. */
  rounded?: RoundedKey;
  /** Padding — replaces consumer `p-*` className. */
  padding?: PaddingKey;
  children: React.ReactNode;
}

export function Label({
  required,
  size,
  weight,
  color,
  transform,
  align,
  layout,
  gap,
  rounded,
  padding,
  className = "",
  children,
  ...props
}: LabelProps) {
  return (
    <label
      className={[
        "appkit-label",
        size ? TYPOGRAPHY.textSize[size] : "",
        weight ? TYPOGRAPHY.textWeight[weight] : "",
        color ? TYPOGRAPHY.colorVariant[color] : "",
        transform && transform !== "none" ? `appkit-text--transform-${transform}` : "",
        align ? `appkit-text--align-${align}` : "",
        layout ? LABEL_LAYOUT_MAP[layout] : "",
        gap ? LABEL_GAP_MAP[gap] : "",
        rounded ? ROUNDED_MAP[rounded] : "",
        padding ? PADDING_MAP[padding] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
      {required && <span className="appkit-label__required">*</span>}
    </label>
  );
}

// --- Caption -----------------------------------------------------------------

interface CaptionProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** "default" — muted grey (default); "accent" — indigo, semibold; "inverse" — light indigo for use on dark indigo backgrounds */
  variant?: "default" | "accent" | "inverse";
  /** Optional colour variant override. */
  color?: ColorVariant;
  /** Optional typography weight override. */
  weight?: "light" | "normal" | "medium" | "semibold" | "bold";
  children: React.ReactNode;
}

export function Caption({
  variant = "default",
  color,
  weight,
  className = "",
  children,
  ...props
}: CaptionProps) {
  const variantClasses = {
    default: "appkit-caption--default",
    accent: "appkit-caption--accent",
    inverse: "appkit-caption--inverse",
  };

  return (
    <span
      className={[
        "appkit-caption",
        variantClasses[variant],
        color ? TYPOGRAPHY.colorVariant[color] : "",
        weight ? TYPOGRAPHY.textWeight[weight] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}

// --- Span ---------------------------------------------------------------------
/**
 * Inline wrapper for styled text fragments. Use instead of a raw `<span>`.
 * When `variant` is "inherit" (default) the element carries no colour classes
 * so it blends with its parent — perfect for purely structural/CSS wrappers.
 *
 * @example
 * ```tsx
 * <Span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
 * Highlighted
 * </Span>
 *
 * <Span variant="error" weight="semibold">Required</Span>
 * ```
 */
/** Inline-decorations allowed on Span (pill chips, code-like wraps, etc). */
type SpanRounded = "none" | "default" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
type SpanBorder = "none" | "default" | "subtle" | "strong";
type SpanPadding = "none" | "2xs" | "x-xs" | "x-sm" | "x-md" | "y-2xs" | "y-xs" | "y-sm" | "inline-sm" | "inline" | "pill-2xs" | "pill-xs" | "pill-sm" | "pill-sm-tall" | "pill-md" | "pill-lg";

const SPAN_BORDER_MAP: Record<SpanBorder, string> = {
  none: "",
  default: "border border-zinc-200 dark:border-slate-700",
  subtle: "border border-zinc-100 dark:border-zinc-800",
  strong: "border border-zinc-300 dark:border-slate-600",
};
type SpanBg = "none" | "muted" | "subtle" | "default" | "success-surface" | "danger-surface" | "warning-surface" | "info-surface" | "overlay-xs" | "overlay-sm" | "overlay-md" | "overlay-lg" | "overlay-xl";

const SPAN_ROUNDED_MAP: Record<SpanRounded, string> = {
  none: "",
  default: "rounded",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};
const SPAN_PADDING_MAP: Record<SpanPadding, string> = {
  none: "",
  "2xs": "p-2",
  "x-xs": "px-2",
  "x-sm": "px-3",
  "x-md": "px-4",
  "y-2xs": "py-1",
  "y-xs": "py-2",
  "y-sm": "py-3",
  "inline-sm": "px-2 py-0.5",
  inline: "px-2 py-1",
  "pill-2xs": "px-1.5 py-0.5",
  "pill-xs": "px-2 py-0.5",
  "pill-sm": "px-2.5 py-0.5",
  "pill-sm-tall": "px-2.5 py-1",
  "pill-md": "px-3 py-1",
  "pill-lg": "px-4 py-1.5",
};
const SPAN_BG_MAP: Record<SpanBg, string> = {
  none: "",
  muted: "bg-[var(--appkit-color-bg)]",
  subtle: "bg-[var(--appkit-color-border-subtle)]",
  default: "bg-[var(--appkit-color-surface)]",
  "success-surface": "bg-[var(--appkit-color-success-surface)]",
  "danger-surface": "bg-[var(--appkit-color-error-surface)]",
  "warning-surface": "bg-[var(--appkit-color-warning-surface)]",
  "info-surface": "bg-[var(--appkit-color-info-surface)]",
  "overlay-xs": "bg-black/40",
  "overlay-sm": "bg-black/50",
  "overlay-md": "bg-black/55",
  "overlay-lg": "bg-black/60",
  "overlay-xl": "bg-black/70",
};

type SpanLayout = "inline" | "inline-flex" | "flex" | "inline-flex-center" | "flex-center" | "inline-block" | "block";

const SPAN_LAYOUT_MAP: Record<SpanLayout, string> = {
  inline: "",
  "inline-flex": CLS_INLINE_FLEX,
  flex: CLS_FLEX,
  "inline-flex-center": `${CLS_INLINE_FLEX} justify-center`,
  "flex-center": `${CLS_FLEX} justify-center`,
  "inline-block": "inline-block",
  block: "block",
};

type SpanGap = "none" | "2xs" | "xs" | "sm" | "md" | "lg";

const SPAN_GAP_MAP: Record<SpanGap, string> = {
  none: "",
  "2xs": "gap-0.5",
  xs: "gap-1",
  sm: "gap-1.5",
  md: "gap-2",
  lg: "gap-3",
};

type SpanShadow = "none" | "sm" | "md" | "lg" | "2xl" | "default";

const SPAN_SHADOW_MAP: Record<SpanShadow, string> = {
  none: "",
  default: "shadow",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  "2xl": "shadow-2xl",
};

interface SpanProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Colour variant. "inherit" (default) applies no colour class. */
  variant?:
    | "inherit"
    | "primary"
    | "secondary"
    | "muted"
    | "error"
    | "success"
    | "accent";
  /**
   * Display + cross-axis alignment preset.
   * - `"inline-flex"` → `inline-flex items-center` (most chip patterns)
   * - `"flex"` → `flex items-center` (block-level flex)
   * - `"inline-block"` / `"block"` → display only
   * - `"inline"` (default) → no display class
   */
  layout?: SpanLayout;
  /** Gap between flex children. Only takes effect when `layout` is set to a flex variant. */
  gap?: SpanGap;
  color?: ColorVariant;
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "8xl";
  smSize?: HeadingSize;
  mdSize?: HeadingSize;
  lgSize?: HeadingSize;
  xlSize?: HeadingSize;
  weight?: "light" | "normal" | "medium" | "semibold" | "bold";
  transform?: TextTransform;
  truncate?: TextTruncate;
  numeric?: boolean;
  italic?: boolean;
  family?: FontFamily;
  align?: TextAlign;
  gradient?: TextGradient;
  /** Optional pill-like decoration. */
  rounded?: SpanRounded;
  padding?: SpanPadding;
  surface?: SpanBg;
  border?: SpanBorder;
  /** Box shadow preset for Span overlays (e.g. toggle thumb). */
  shadow?: SpanShadow;
  children?: React.ReactNode;
}

export const Span = React.forwardRef<HTMLSpanElement, SpanProps>(function Span({
  variant = "inherit",
  color,
  size,
  smSize,
  mdSize,
  lgSize,
  xlSize,
  weight,
  transform,
  truncate,
  numeric,
  italic,
  family,
  align,
  gradient,
  rounded,
  padding,
  surface,
  border,
  layout,
  gap,
  shadow,
  className = "",
  children,
  ...props
}: SpanProps, ref) {
  const resolvedColor = color ?? variant;
  const classes = [
    "appkit-span",
    size ? TYPOGRAPHY.textSize[size] : "",
    responsiveSizeClass("sm:", smSize),
    responsiveSizeClass("md:", mdSize),
    responsiveSizeClass("lg:", lgSize),
    responsiveSizeClass("xl:", xlSize),
    weight ? TYPOGRAPHY.textWeight[weight] : "",
    TYPOGRAPHY.colorVariant[resolvedColor],
    ...shapingClasses({ transform, truncate, numeric, italic, family, align, gradient }),
    rounded ? SPAN_ROUNDED_MAP[rounded] : "",
    padding ? SPAN_PADDING_MAP[padding] : "",
    surface ? SPAN_BG_MAP[surface] : "",
    border ? SPAN_BORDER_MAP[border] : "",
    layout ? SPAN_LAYOUT_MAP[layout] : "",
    gap ? SPAN_GAP_MAP[gap] : "",
    shadow ? SPAN_SHADOW_MAP[shadow] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span ref={ref} className={classes} {...props}>
      {children}
    </span>
  );
});
