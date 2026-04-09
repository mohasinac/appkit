import React from "react";

/**
 * UI_THEME — inlined subset of the app-level THEME_CONSTANTS.
 * Consumer apps can override by passing `className` on each component.
 * Full THEME_CONSTANTS lives in the host app (`@/constants`).
 */
const UI_THEME = {
  typography: {
    h1: "text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight font-display",
    h2: "text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight font-display",
    h3: "text-xl md:text-2xl lg:text-3xl font-bold tracking-tight font-display",
    h4: "text-lg md:text-xl lg:text-2xl font-bold font-display",
    h5: "text-base md:text-lg lg:text-xl font-medium",
    h6: "text-sm md:text-base lg:text-lg font-medium",
    body: "text-base lg:text-lg",
    small: "text-sm lg:text-base",
    xs: "text-xs lg:text-sm",
  },
  themed: {
    textPrimary: "text-zinc-900 dark:text-zinc-50",
    textSecondary: "text-zinc-500 dark:text-zinc-400",
    textMuted: "text-zinc-400 dark:text-zinc-500",
    textError: "text-red-600 dark:text-red-400",
    textSuccess: "text-emerald-600 dark:text-emerald-400",
  },
  colors: {
    form: {
      required: "text-red-500",
    },
  },
} as const;

// ─── Heading ─────────────────────────────────────────────────────────────────

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  variant?: "primary" | "secondary" | "muted" | "none";
  children: React.ReactNode;
}

export function Heading({
  level = 1,
  variant = "primary",
  className = "",
  children,
  ...props
}: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  const { typography, themed } = UI_THEME;

  const sizeClasses = {
    1: typography.h1,
    2: typography.h2,
    3: typography.h3,
    4: typography.h4,
    5: typography.h5,
    6: typography.h6,
  };

  const variantClasses = {
    primary: themed.textPrimary,
    secondary: themed.textSecondary,
    muted: themed.textMuted,
    none: "",
  };

  return (
    <Tag
      className={`${sizeClasses[level]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ─── Text ─────────────────────────────────────────────────────────────────────

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: "primary" | "secondary" | "muted" | "error" | "success" | "none";
  size?: "xs" | "sm" | "base" | "lg" | "xl";
  weight?: "normal" | "medium" | "semibold" | "bold";
  children: React.ReactNode;
}

export function Text({
  variant = "primary",
  size = "base",
  weight = "normal",
  className = "",
  children,
  ...props
}: TextProps) {
  const { typography, themed } = UI_THEME;

  const sizeClasses = {
    xs: typography.xs,
    sm: typography.small,
    base: typography.body,
    lg: "text-lg",
    xl: "text-xl",
  };

  const weightClasses = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  const variantClasses = {
    primary: themed.textPrimary,
    secondary: themed.textSecondary,
    muted: themed.textMuted,
    error: themed.textError,
    success: themed.textSuccess,
    none: "",
  };

  return (
    <p
      className={`${sizeClasses[size]} ${weightClasses[weight]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

export function Label({
  required,
  className = "",
  children,
  ...props
}: LabelProps) {
  const { themed, typography, colors } = UI_THEME;
  return (
    <label
      className={`block ${typography.small} font-medium ${themed.textSecondary} mb-1.5 ${className}`}
      {...props}
    >
      {children}
      {required && <span className={`${colors.form.required} ml-1`}>*</span>}
    </label>
  );
}

// ─── Caption ─────────────────────────────────────────────────────────────────

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
  const { themed, typography } = UI_THEME;

  const variantClasses = {
    default: themed.textMuted,
    accent: "text-primary font-semibold",
    inverse: "text-primary/40",
  };

  return (
    <span
      className={`${typography.xs} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

// ─── Span ─────────────────────────────────────────────────────────────────────
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
  size?: "xs" | "sm" | "base" | "lg" | "xl";
  weight?: "normal" | "medium" | "semibold" | "bold";
  children?: React.ReactNode;
}

export function Span({
  variant = "inherit",
  size,
  weight,
  className = "",
  children,
  ...props
}: SpanProps) {
  const { themed, typography } = UI_THEME;

  const variantClasses: Record<NonNullable<SpanProps["variant"]>, string> = {
    inherit: "",
    primary: themed.textPrimary,
    secondary: themed.textSecondary,
    muted: themed.textMuted,
    error: themed.textError,
    success: themed.textSuccess,
    accent: "text-primary",
  };

  const sizeClasses: Record<NonNullable<SpanProps["size"]>, string> = {
    xs: typography.xs,
    sm: typography.small,
    base: typography.body,
    lg: "text-lg",
    xl: "text-xl",
  };

  const weightClasses: Record<NonNullable<SpanProps["weight"]>, string> = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  const classes = [
    size ? sizeClasses[size] : "",
    weight ? weightClasses[weight] : "",
    variantClasses[variant],
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
