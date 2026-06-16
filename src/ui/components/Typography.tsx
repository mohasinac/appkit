import React from "react";

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

type HeadingSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";

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

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: "primary" | "secondary" | "muted" | "error" | "success" | "none";
  color?: ColorVariant;
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  weight?: "light" | "normal" | "medium" | "semibold" | "bold";
  transform?: TextTransform;
  truncate?: TextTruncate;
  numeric?: boolean;
  italic?: boolean;
  family?: FontFamily;
  align?: TextAlign;
  gradient?: TextGradient;
  /** Override the rendered element. Defaults to `p`. */
  as?: React.ElementType;
  children: React.ReactNode;
}

export function Text({
  variant = "primary",
  color,
  size = "base",
  weight = "normal",
  transform,
  truncate,
  numeric,
  italic,
  family,
  align,
  gradient,
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
        TYPOGRAPHY.textWeight[weight],
        TYPOGRAPHY.colorVariant[resolvedColor],
        ...shapingClasses({ transform, truncate, numeric, italic, family, align, gradient }),
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

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  /** Optional size override — defaults to `sm` (the existing label sizing). */
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  /** Optional weight override — defaults to the label's medium weight. */
  weight?: "light" | "normal" | "medium" | "semibold" | "bold";
  color?: ColorVariant;
  transform?: TextTransform;
  align?: TextAlign;
  children: React.ReactNode;
}

export function Label({
  required,
  size,
  weight,
  color,
  transform,
  align,
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
  children: React.ReactNode;
}

export function Caption({
  variant = "default",
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
      className={["appkit-caption", variantClasses[variant], className]
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
 *   Highlighted
 * </Span>
 *
 * <Span variant="error" weight="semibold">Required</Span>
 * ```
 */
/** Inline-decorations allowed on Span (pill chips, code-like wraps, etc). */
type SpanRounded = "none" | "default" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
type SpanPadding = "none" | "x-xs" | "x-sm" | "x-md" | "y-2xs" | "y-xs" | "y-sm" | "inline-sm" | "inline";
type SpanBg = "none" | "muted" | "subtle" | "default";

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
  "x-xs": "px-2",
  "x-sm": "px-3",
  "x-md": "px-4",
  "y-2xs": "py-1",
  "y-xs": "py-2",
  "y-sm": "py-3",
  "inline-sm": "px-2 py-0.5",
  inline: "px-2 py-1",
};
const SPAN_BG_MAP: Record<SpanBg, string> = {
  none: "",
  muted: "bg-[var(--appkit-color-bg)]",
  subtle: "bg-[var(--appkit-color-border-subtle)]",
  default: "bg-[var(--appkit-color-surface)]",
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
  color?: ColorVariant;
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
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
  children?: React.ReactNode;
}

export function Span({
  variant = "inherit",
  color,
  size,
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
  className = "",
  children,
  ...props
}: SpanProps) {
  const resolvedColor = color ?? variant;
  const classes = [
    "appkit-span",
    size ? TYPOGRAPHY.textSize[size] : "",
    weight ? TYPOGRAPHY.textWeight[weight] : "",
    TYPOGRAPHY.colorVariant[resolvedColor],
    ...shapingClasses({ transform, truncate, numeric, italic, family, align, gradient }),
    rounded ? SPAN_ROUNDED_MAP[rounded] : "",
    padding ? SPAN_PADDING_MAP[padding] : "",
    surface ? SPAN_BG_MAP[surface] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
