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
  },
  textWeight: {
    normal: "appkit-font--normal",
    medium: "appkit-font--medium",
    semibold: "appkit-font--semibold",
    bold: "appkit-font--bold",
  },
  colorVariant: {
    primary: "appkit-color--primary",
    secondary: "appkit-color--secondary",
    muted: "appkit-color--muted",
    error: "appkit-color--error",
    success: "appkit-color--success",
    none: "",
    inherit: "",
    accent: "appkit-color--accent",
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

  return (
    <Tag
      className={[
        "appkit-heading",
        TYPOGRAPHY.headingLevel[level],
        TYPOGRAPHY.colorVariant[variant],
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

// ─── Text ─────────────────────────────────────────────────────────────────────

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: "primary" | "secondary" | "muted" | "error" | "success" | "none";
  size?: "xs" | "sm" | "base" | "lg" | "xl";
  weight?: "normal" | "medium" | "semibold" | "bold";
  /** Override the rendered element. Defaults to `p`. */
  as?: React.ElementType;
  children: React.ReactNode;
}

export function Text({
  variant = "primary",
  size = "base",
  weight = "normal",
  className = "",
  as: Tag = "p",
  children,
  ...props
}: TextProps) {
  return (
    <Tag
      className={[
        "appkit-text",
        TYPOGRAPHY.textSize[size],
        TYPOGRAPHY.textWeight[weight],
        TYPOGRAPHY.colorVariant[variant],
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
  return (
    <label
      className={["appkit-label", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
      {required && <span className="appkit-label__required">*</span>}
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
  const variantClasses: Record<NonNullable<SpanProps["variant"]>, string> = {
    inherit: "",
    primary: "appkit-color--primary",
    secondary: "appkit-color--secondary",
    muted: "appkit-color--muted",
    error: "appkit-color--error",
    success: "appkit-color--success",
    accent: "appkit-color--accent",
  };

  const sizeClasses: Record<NonNullable<SpanProps["size"]>, string> = {
    xs: "appkit-text--xs",
    sm: "appkit-text--sm",
    base: "appkit-text--base",
    lg: "appkit-text--lg",
    xl: "appkit-text--xl",
  };

  const weightClasses: Record<NonNullable<SpanProps["weight"]>, string> = {
    normal: "appkit-font--normal",
    medium: "appkit-font--medium",
    semibold: "appkit-font--semibold",
    bold: "appkit-font--bold",
  };

  const classes = [
    "appkit-span",
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
