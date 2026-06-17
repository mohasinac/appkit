import React from "react";
import type { SurfaceProps } from "./surface-tokens";
import { buildSurfaceClasses } from "./surface-tokens";

/**
 * Semantic HTML Wrapper Components
 *
 * Thin wrappers around HTML5 semantic elements.
 * Using these instead of raw tags enables:
 *   - Future one-place theming (add default padding/colour here, it applies everywhere)
 *   - Enforced accessibility attributes (Nav requires aria-label)
 *   - Consistent documentation / IDE autocomplete
 *   - Clean migration path if element defaults change
 *
 * All components pass through every standard HTML attribute via `...props`.
 * Style via `className` using Tailwind CSS classes.
 *
 * @example
 * ```tsx
 * import { Section, Article, Main, Aside, Nav, Ul, Ol, Li } from '..';
 *
 * <Main className="max-w-7xl mx-auto px-4">
 * <Section className="py-12">
 * <Article>...</Article>
 * </Section>
 * <Aside className="w-64 shrink-0">...</Aside>
 * </Main>
 *
 * <Nav aria-label="Main navigation">
 * <Ul className="flex gap-4">
 * <Li>Products</Li>
 * </Ul>
 * </Nav>
 * ```
 */

// --- Section -----------------------------------------------------------------
/**
 * Semantic `<section data-section="semantic-section-595">` element.
 * Use for thematically grouped content that would appear in an outline.
 * Prefer this over a plain `<div data-section="semantic-div-596">` when the block has a heading.
 */
/**
 * Themed gradient tones for Section. Each tone resolves to a
 * `--appkit-gradient-*` CSS variable so admin custom themes restyle the
 * section without consumer changes.
 */
export type SectionTone = "plain" | "page-header" | "hero" | "accent-banner";

const SECTION_TONE_MAP: Record<SectionTone, string> = {
  plain: "",
  "page-header": "appkit-section--tone-page-header",
  hero: "appkit-section--tone-hero",
  "accent-banner": "appkit-section--tone-accent-banner",
};

type SemanticColor = "default" | "primary" | "muted" | "faint" | "inverse" | "success" | "warning" | "error" | "info";

const SEMANTIC_COLOR_MAP: Record<SemanticColor, string> = {
  default: "",
  primary: "appkit-color--primary",
  muted: "appkit-color--muted",
  faint: "appkit-color--faint",
  inverse: "appkit-color--inverse",
  success: "appkit-color--success",
  warning: "appkit-color--warning",
  error: "appkit-color--error",
  info: "appkit-color--info",
};

export interface SectionProps extends React.HTMLAttributes<HTMLElement>, SurfaceProps {
  /**
   * Themed background tone. Defaults to `"plain"`. Use `"page-header"` for
   * subtle gradient page-headers, `"hero"` for radial mesh hero backgrounds,
   * `"accent-banner"` for primary→secondary brand banners.
   */
  tone?: SectionTone;
  color?: SemanticColor;
  children: React.ReactNode;
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ tone = "plain", color, className = "", surface, padding, rounded, border, shadow, children, ...props }, ref) => (
    <section
      className={[
        SECTION_TONE_MAP[tone],
        buildSurfaceClasses({ surface, padding, rounded, border, shadow }),
        color ? SEMANTIC_COLOR_MAP[color] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      ref={ref as React.Ref<HTMLElement>}
      {...props}
    >
      {children}
    </section>
  ),
);
Section.displayName = "Section";

// --- Article -----------------------------------------------------------------
/**
 * Semantic `<article>` element.
 * Use for self-contained compositions: blog posts, product cards, reviews, forum posts.
 */
export interface ArticleProps extends React.HTMLAttributes<HTMLElement>, SurfaceProps {
  color?: SemanticColor;
  children?: React.ReactNode;
}

export function Article({ className = "", surface, padding, rounded, border, shadow, color, children, ...props }: ArticleProps) {
  return (
    <article className={[buildSurfaceClasses({ surface, padding, rounded, border, shadow }), color ? SEMANTIC_COLOR_MAP[color] : "", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </article>
  );
}

// --- Main ---------------------------------------------------------------------
/**
 * Semantic `<main>` element.
 * Wraps the primary content of the document. Should appear only once per page.
 */
export interface MainProps extends React.HTMLAttributes<HTMLElement>, SurfaceProps {
  color?: SemanticColor;
  children: React.ReactNode;
}

export function Main({ className = "", surface, padding, rounded, border, shadow, color, children, ...props }: MainProps) {
  return (
    <main className={[buildSurfaceClasses({ surface, padding, rounded, border, shadow }), color ? SEMANTIC_COLOR_MAP[color] : "", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </main>
  );
}

// --- Aside --------------------------------------------------------------------
/**
 * Semantic `<aside>` element.
 * Use for supplementary content tangentially related to the main content:
 * sidebars, callout boxes, related-link panels.
 */
export interface AsideProps extends React.HTMLAttributes<HTMLElement>, SurfaceProps {
  color?: SemanticColor;
  children: React.ReactNode;
}

export const Aside = React.forwardRef<HTMLElement, AsideProps>(
  ({ className = "", surface, padding, rounded, border, shadow, color, children, ...props }, ref) => (
    <aside className={[buildSurfaceClasses({ surface, padding, rounded, border, shadow }), color ? SEMANTIC_COLOR_MAP[color] : "", className].filter(Boolean).join(" ")} ref={ref} {...props}>
      {children}
    </aside>
  ),
);
Aside.displayName = "Aside";

// --- Nav ---------------------------------------------------------------------
/**
 * Semantic `<nav>` element with enforced `aria-label`.
 *
 * Every `<nav>` on a page MUST have a unique `aria-label` so assistive
 * technologies can distinguish between multiple navigation landmarks.
 *
 * @example
 * ```tsx
 * <Nav aria-label="Breadcrumb">...</Nav>
 * <Nav aria-label="Product categories">...</Nav>
 * ```
 */
export interface NavProps extends React.HTMLAttributes<HTMLElement>, SurfaceProps {
  /** REQUIRED — describes the purpose of this navigation region for screen readers. */
  "aria-label": string;
  /** Vertical spacing between top-level children. */
  spacing?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  /** Colour cascaded onto nav children. */
  color?: "default" | "primary" | "muted" | "faint";
  children: React.ReactNode;
}

const NAV_SPACING_MAP: Record<NonNullable<NavProps["spacing"]>, string> = {
  none: "",
  xs: "space-y-1",
  sm: "space-y-2",
  md: "space-y-3",
  lg: "space-y-4",
  xl: "space-y-6",
};

const NAV_COLOR_MAP: Record<NonNullable<NavProps["color"]>, string> = {
  default: "",
  primary: "appkit-color--primary",
  muted: "appkit-color--muted",
  faint: "appkit-color--faint",
};

export function Nav({ surface, padding, rounded, border, shadow, spacing, color, className = "", children, ...props }: NavProps) {
  return (
    <nav
      className={[
        buildSurfaceClasses({ surface, padding, rounded, border, shadow }),
        spacing ? NAV_SPACING_MAP[spacing] : "",
        color ? NAV_COLOR_MAP[color] : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </nav>
  );
}

// --- Header (block-level) -----------------------------------------------------
/**
 * Semantic `<header>` element for block-level component headers.
 * Use inside `Section`, `Article`, or card bodies — NOT as the page-level header.
 *
 * @example
 * ```tsx
 * <Article>
 * <BlockHeader className="mb-4">
 * <Heading level={2}>Post title</Heading>
 * </BlockHeader>
 * </Article>
 * ```
 */
export interface BlockHeaderProps extends React.HTMLAttributes<HTMLElement>, SurfaceProps {
  children: React.ReactNode;
}

export function BlockHeader({
  className = "",
  surface,
  padding,
  rounded,
  border,
  shadow,
  children,
  ...props
}: BlockHeaderProps) {
  return (
    <header className={[buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className].filter(Boolean).join(" ")} {...props}>
      {children}
    </header>
  );
}

// --- Footer (block-level) -----------------------------------------------------
/**
 * Semantic `<footer>` element for block-level component footers.
 * Use inside `Section`, `Article`, or card bodies — NOT as the page-level footer.
 */
export interface BlockFooterProps extends React.HTMLAttributes<HTMLElement>, SurfaceProps {
  children: React.ReactNode;
}

export function BlockFooter({
  className = "",
  surface,
  padding,
  rounded,
  border,
  shadow,
  children,
  ...props
}: BlockFooterProps) {
  return (
    <footer className={[buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className].filter(Boolean).join(" ")} {...props}>
      {children}
    </footer>
  );
}

// --- Ul ----------------------------------------------------------------------
/**
 * Semantic `<ul>` (unordered list) element.
 *
 * @example
 * ```tsx
 * <Ul className="space-y-2">
 * <Li>Item one</Li>
 * <Li>Item two</Li>
 * </Ul>
 * ```
 */
/** Marker presets for `<Ul>` / `<Ol>`. */
export type ListMarker = "disc" | "decimal" | "none" | "check" | "arrow";
/** Spacing between list items. */
export type ListSpacing = "tight" | "comfortable" | "loose" | "none";
/** Indent (left padding) applied to the list for marker visibility. */
export type ListIndent = "none" | "sm" | "md" | "lg" | "xl";
/** Typography size cascaded onto list items. */
export type ListSize = "xs" | "sm" | "base" | "lg";
/** Colour variant cascaded onto list items. */
export type ListColor = "default" | "primary" | "muted" | "faint";

const LIST_MARKER_MAP: Record<ListMarker, string> = {
  disc: "appkit-list--marker-disc",
  decimal: "appkit-list--marker-decimal",
  none: "appkit-list--marker-none",
  check: "appkit-list--marker-check",
  arrow: "appkit-list--marker-arrow",
};

const LIST_SPACING_MAP: Record<ListSpacing, string> = {
  none: "",
  tight: "appkit-list--spacing-tight",
  comfortable: "appkit-list--spacing-comfortable",
  loose: "appkit-list--spacing-loose",
};

const LIST_INDENT_MAP: Record<ListIndent, string> = {
  none: "",
  sm: "pl-2",
  md: "pl-4",
  lg: "pl-5",
  xl: "pl-6",
};

const LIST_SIZE_MAP: Record<ListSize, string> = {
  xs: "appkit-text--xs",
  sm: "appkit-text--sm",
  base: "appkit-text--base",
  lg: "appkit-text--lg",
};

const LIST_COLOR_MAP: Record<ListColor, string> = {
  default: "",
  primary: "appkit-color--primary",
  muted: "appkit-color--muted",
  faint: "appkit-color--faint",
};

type UlPaddingX = "none" | "x-xs" | "x-sm" | "x-md" | "x-lg";
type UlPaddingY = "none" | "y-2xs" | "y-xs" | "y-sm" | "y-md" | "y-lg" | "y-bottom-xs";

const UL_PADDING_X_MAP: Record<UlPaddingX, string> = {
  none: "",
  "x-xs": "px-2",
  "x-sm": "px-3",
  "x-md": "px-4",
  "x-lg": "px-6",
};
const UL_PADDING_Y_MAP: Record<UlPaddingY, string> = {
  none: "",
  "y-2xs": "py-1",
  "y-xs": "py-2",
  "y-sm": "py-3",
  "y-md": "py-4",
  "y-lg": "py-6",
  "y-bottom-xs": "pb-1",
};

export interface UlProps extends React.HTMLAttributes<HTMLUListElement> {
  /** Marker style — replaces consumer `list-disc`/`list-none` className. */
  marker?: ListMarker;
  /** Vertical spacing between items — replaces consumer `space-y-N`. */
  spacing?: ListSpacing;
  /** Left padding — replaces consumer `pl-N`. */
  indent?: ListIndent;
  /** Horizontal padding — replaces consumer `px-N` className on list shells. */
  paddingX?: UlPaddingX;
  /** Vertical padding — replaces consumer `py-N`/`pb-N` className on list shells. */
  paddingY?: UlPaddingY;
  /** Typography size cascaded onto list items. */
  size?: ListSize;
  /** Colour variant cascaded onto list items. */
  color?: ListColor;
  children: React.ReactNode;
}

export const Ul = React.forwardRef<HTMLUListElement, UlProps>(
  ({ marker, spacing, indent, paddingX, paddingY, size, color, className = "", children, ...props }, ref) => (
    <ul
      ref={ref}
      className={[
        marker ? LIST_MARKER_MAP[marker] : "",
        spacing ? LIST_SPACING_MAP[spacing] : "",
        indent ? LIST_INDENT_MAP[indent] : "",
        paddingX ? UL_PADDING_X_MAP[paddingX] : "",
        paddingY ? UL_PADDING_Y_MAP[paddingY] : "",
        size ? LIST_SIZE_MAP[size] : "",
        color ? LIST_COLOR_MAP[color] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </ul>
  ),
);
Ul.displayName = "Ul";

// --- Ol ----------------------------------------------------------------------
/**
 * Semantic `<ol>` (ordered list) element.
 *
 * @example
 * ```tsx
 * <Ol className="list-decimal pl-4 space-y-1">
 * <Li>Step one</Li>
 * <Li>Step two</Li>
 * </Ol>
 * ```
 */
export interface OlProps extends React.HTMLAttributes<HTMLOListElement> {
  /** Marker style — defaults to `"decimal"` for ordered lists. */
  marker?: ListMarker;
  /** Vertical spacing between items — replaces consumer `space-y-N`. */
  spacing?: ListSpacing;
  /** Left padding — replaces consumer `pl-N`. */
  indent?: ListIndent;
  /** Typography size cascaded onto list items. */
  size?: ListSize;
  /** Colour variant cascaded onto list items. */
  color?: ListColor;
  children: React.ReactNode;
}

export function Ol({ marker = "decimal", spacing, indent, size, color, className = "", children, ...props }: OlProps) {
  return (
    <ol
      className={[
        LIST_MARKER_MAP[marker],
        spacing ? LIST_SPACING_MAP[spacing] : "",
        indent ? LIST_INDENT_MAP[indent] : "",
        size ? LIST_SIZE_MAP[size] : "",
        color ? LIST_COLOR_MAP[color] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </ol>
  );
}

// --- Li ----------------------------------------------------------------------
/**
 * Semantic `<li>` (list item) element. Use inside `Ul` or `Ol`.
 */
type LiLayout = "default" | "flex" | "flex-start" | "flex-center";
type LiGap = "none" | "1" | "2" | "3" | "4";

const LI_LAYOUT_MAP: Record<LiLayout, string> = {
  default: "",
  flex: "flex",
  "flex-start": "flex items-start",
  "flex-center": "flex items-center",
};

const LI_GAP_MAP: Record<LiGap, string> = {
  none: "",
  "1": "gap-1",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
};

export interface LiProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** Layout / alignment preset. Replaces raw `flex items-center` / `flex items-start` className. */
  layout?: LiLayout;
  /** Gap between children (for `layout="flex*"`). */
  gap?: LiGap;
  children: React.ReactNode;
}

export function Li({ layout, gap, className = "", children, ...props }: LiProps) {
  const classes = [
    layout ? LI_LAYOUT_MAP[layout] : "",
    gap ? LI_GAP_MAP[gap] : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <li className={classes} {...props}>
      {children}
    </li>
  );
}

// --- Table family -------------------------------------------------------------

type TableVariant = "default" | "striped" | "bordered";
type TableSize = "sm" | "md" | "lg";

const TABLE_VARIANT_MAP: Record<TableVariant, string> = {
  default: "appkit-table--default",
  striped: "appkit-table--striped",
  bordered: "appkit-table--bordered",
};

const TABLE_SIZE_MAP: Record<TableSize, string> = {
  sm: "appkit-table--sm",
  md: "appkit-table--md",
  lg: "appkit-table--lg",
};

export interface TableProps extends Omit<React.TableHTMLAttributes<HTMLTableElement>, "border">, SurfaceProps {
  variant?: TableVariant;
  size?: TableSize;
  stickyHeader?: boolean;
  children: React.ReactNode;
}

export function Table({ variant = "default", size = "md", stickyHeader = false, className = "", surface, padding, rounded, border, shadow, children, ...props }: TableProps) {
  return (
    <table
      className={["appkit-table", TABLE_VARIANT_MAP[variant], TABLE_SIZE_MAP[size], stickyHeader ? "appkit-table--sticky-header" : "", buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </table>
  );
}

type TheadSurface = "none" | "default" | "muted" | "subtle";

const THEAD_SURFACE_MAP: Record<TheadSurface, string> = {
  none: "",
  default: "bg-[var(--appkit-color-surface)]",
  muted: "bg-[var(--appkit-color-bg)]",
  subtle: "bg-[var(--appkit-color-surface-elevated)]",
};

export interface TheadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  /** Background tone for the header row. */
  surface?: TheadSurface;
  children: React.ReactNode;
}

export function Thead({ surface, className = "", children, ...props }: TheadProps) {
  return (
    <thead
      className={[
        "appkit-thead",
        surface ? THEAD_SURFACE_MAP[surface] : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </thead>
  );
}

export interface TbodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function Tbody({ className = "", children, ...props }: TbodyProps) {
  return (
    <tbody className={["appkit-tbody", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </tbody>
  );
}

type TrBorder = "none" | "default" | "subtle" | "strong";

const TR_BORDER_MAP: Record<TrBorder, string> = {
  none: "",
  default: "border-b border-[var(--appkit-color-border)]",
  subtle: "border-b border-[var(--appkit-color-border-subtle)]",
  strong: "border-b border-[var(--appkit-color-border-strong)]",
};

type TrSurface = "none" | "default" | "muted" | "subtle";

const TR_SURFACE_MAP: Record<TrSurface, string> = {
  none: "",
  default: "bg-[var(--appkit-color-surface)]",
  muted: "bg-[var(--appkit-color-bg)]",
  subtle: "bg-[var(--appkit-color-surface-elevated)]",
};

export interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hover?: boolean;
  border?: TrBorder;
  surface?: TrSurface;
  children: React.ReactNode;
}

export function Tr({ hover = false, border, surface, className = "", children, ...props }: TrProps) {
  return (
    <tr
      className={[
        "appkit-tr",
        hover ? "appkit-tr--hover" : "",
        border ? TR_BORDER_MAP[border] : "",
        surface ? TR_SURFACE_MAP[surface] : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </tr>
  );
}

type CellAlign = "left" | "center" | "right";

type CellTypographySize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
type CellTypographyWeight = "normal" | "medium" | "semibold" | "bold";
type CellPadding = "none" | "xs" | "xs-tall" | "xs-3" | "sm" | "sm-tall" | "md" | "lg" | "lg-tight" | "lg-3" | "compact";
type CellColor = "default" | "primary" | "muted" | "faint" | "success" | "warning" | "error" | "info";

const CELL_PADDING_MAP: Record<CellPadding, string> = {
  none: "",
  xs: "px-2 py-1",
  "xs-tall": "px-2 py-2",
  "xs-3": "px-2 py-3",
  sm: "px-3 py-2",
  "sm-tall": "px-3 py-4",
  md: "px-4 py-3",
  lg: "px-6 py-4",
  "lg-tight": "px-6 py-2",
  "lg-3": "px-6 py-3",
  compact: "px-2 py-1.5",
};

const CELL_COLOR_MAP: Record<CellColor, string> = {
  default: "",
  primary: "appkit-color--primary",
  muted: "appkit-color--muted",
  faint: "appkit-color--faint",
  success: "appkit-color--success",
  warning: "appkit-color--warning",
  error: "appkit-color--error",
  info: "appkit-color--info",
};

export interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: CellAlign;
  size?: CellTypographySize;
  weight?: CellTypographyWeight;
  padding?: CellPadding;
  color?: CellColor;
  children?: React.ReactNode;
}

const CELL_SIZE_MAP: Record<CellTypographySize, string> = {
  xs: "appkit-text--xs",
  sm: "appkit-text--sm",
  base: "appkit-text--base",
  lg: "appkit-text--lg",
  xl: "appkit-text--xl",
  "2xl": "appkit-text--2xl",
};

const CELL_WEIGHT_MAP: Record<CellTypographyWeight, string> = {
  normal: "appkit-font--normal",
  medium: "appkit-font--medium",
  semibold: "appkit-font--semibold",
  bold: "appkit-font--bold",
};

export function Th({ align, size, weight, padding, color, className = "", children, ...props }: ThProps) {
  return (
    <th
      className={[
        "appkit-th",
        align ? `text-${align}` : "",
        size ? CELL_SIZE_MAP[size] : "",
        weight ? CELL_WEIGHT_MAP[weight] : "",
        padding ? CELL_PADDING_MAP[padding] : "",
        color ? CELL_COLOR_MAP[color] : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </th>
  );
}

export interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: CellAlign;
  size?: CellTypographySize;
  weight?: CellTypographyWeight;
  padding?: CellPadding;
  color?: CellColor;
  children?: React.ReactNode;
}

export function Td({ align, size, weight, padding, color, className = "", children, ...props }: TdProps) {
  return (
    <td
      className={[
        "appkit-td",
        align ? `text-${align}` : "",
        size ? CELL_SIZE_MAP[size] : "",
        weight ? CELL_WEIGHT_MAP[weight] : "",
        padding ? CELL_PADDING_MAP[padding] : "",
        color ? CELL_COLOR_MAP[color] : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </td>
  );
}

// --- Code / Pre ---------------------------------------------------------------

type CodeSize = "xs" | "sm" | "base";
type CodePadding = "none" | "xs" | "sm" | "inline";
type CodeRounded = "none" | "default" | "sm" | "md" | "lg";
type CodeSurface = "none" | "muted" | "subtle" | "default";

export interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  color?: "default" | "primary" | "error" | "success";
  size?: CodeSize;
  padding?: CodePadding;
  rounded?: CodeRounded;
  surface?: CodeSurface;
  children: React.ReactNode;
}

const CODE_COLOR_MAP: Record<NonNullable<CodeProps["color"]>, string> = {
  default: "appkit-code--default",
  primary: "appkit-code--primary",
  error: "appkit-code--error",
  success: "appkit-code--success",
};

const CODE_SIZE_MAP: Record<CodeSize, string> = {
  xs: "appkit-text--xs",
  sm: "appkit-text--sm",
  base: "appkit-text--base",
};

const CODE_PADDING_MAP: Record<CodePadding, string> = {
  none: "",
  xs: "px-1",
  sm: "px-1.5 py-0.5",
  inline: "px-1 py-0.5",
};

const CODE_ROUNDED_MAP: Record<CodeRounded, string> = {
  none: "",
  default: "rounded",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
};

const CODE_SURFACE_MAP: Record<CodeSurface, string> = {
  none: "",
  muted: "bg-[var(--appkit-color-bg)]",
  subtle: "bg-[var(--appkit-color-border-subtle)]",
  default: "bg-[var(--appkit-color-surface)]",
};

export function Code({ color = "default", size, padding, rounded, surface, className = "", children, ...props }: CodeProps) {
  return (
    <code
      className={[
        "appkit-code",
        CODE_COLOR_MAP[color],
        size ? CODE_SIZE_MAP[size] : "",
        padding ? CODE_PADDING_MAP[padding] : "",
        rounded ? CODE_ROUNDED_MAP[rounded] : "",
        surface ? CODE_SURFACE_MAP[surface] : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </code>
  );
}

export interface PreProps extends React.HTMLAttributes<HTMLPreElement>, SurfaceProps {
  children: React.ReactNode;
}

export function Pre({ className = "", surface, padding, rounded, border, shadow, children, ...props }: PreProps) {
  return (
    <pre className={["appkit-pre", buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className].filter(Boolean).join(" ")} {...props}>
      {children}
    </pre>
  );
}

// --- Blockquote ---------------------------------------------------------------

export interface BlockquoteProps extends React.BlockquoteHTMLAttributes<HTMLQuoteElement>, SurfaceProps {
  color?: "default" | "primary" | "info" | "warning";
  children: React.ReactNode;
}

const BLOCKQUOTE_COLOR_MAP: Record<NonNullable<BlockquoteProps["color"]>, string> = {
  default: "appkit-blockquote--default",
  primary: "appkit-blockquote--primary",
  info: "appkit-blockquote--info",
  warning: "appkit-blockquote--warning",
};

export function Blockquote({ color = "default", className = "", surface, padding, rounded, border, shadow, children, ...props }: BlockquoteProps) {
  return (
    <blockquote className={["appkit-blockquote", BLOCKQUOTE_COLOR_MAP[color], buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className].filter(Boolean).join(" ")} {...props}>
      {children}
    </blockquote>
  );
}

// --- Figure / Figcaption ------------------------------------------------------

export interface FigureProps extends React.HTMLAttributes<HTMLElement>, SurfaceProps {
  children: React.ReactNode;
}

export function Figure({ className = "", surface, padding, rounded, border, shadow, children, ...props }: FigureProps) {
  return (
    <figure className={["appkit-figure", buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className].filter(Boolean).join(" ")} {...props}>
      {children}
    </figure>
  );
}

export interface FigcaptionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Figcaption({ className = "", children, ...props }: FigcaptionProps) {
  return (
    <figcaption className={["appkit-figcaption", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </figcaption>
  );
}

// --- Dl / Dt / Dd (description list) -----------------------------------------

type DlVariant = "stacked" | "inline";

export interface DlProps extends React.HTMLAttributes<HTMLDListElement>, SurfaceProps {
  variant?: DlVariant;
  /**
   * Render a themed top-border between adjacent dt/dd term pairs — replaces
   * the consumer `divide-y divide-zinc-100 dark:divide-zinc-800` className
   * pattern. Tokens flow through `var(--appkit-color-border)`.
   */
  divide?: boolean | "default" | "subtle";
  children: React.ReactNode;
}

export function Dl({ variant = "stacked", divide, className = "", surface, padding, rounded, border, shadow, children, ...props }: DlProps) {
  const divideCls = divide
    ? divide === "subtle"
      ? "appkit-stack--divide-subtle"
      : "appkit-stack--divide"
    : "";
  return (
    <dl className={["appkit-dl", variant === "inline" ? "appkit-dl--inline" : "appkit-dl--stacked", divideCls, buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className].filter(Boolean).join(" ")} {...props}>
      {children}
    </dl>
  );
}

type DtDdColor = "default" | "primary" | "muted" | "faint";
type DtDdWeight = "normal" | "medium" | "semibold" | "bold";

const DT_DD_COLOR_MAP: Record<DtDdColor, string> = {
  default: "",
  primary: "appkit-color--primary",
  muted: "appkit-color--muted",
  faint: "appkit-color--faint",
};

const DT_DD_WEIGHT_MAP: Record<DtDdWeight, string> = {
  normal: "appkit-font--normal",
  medium: "appkit-font--medium",
  semibold: "appkit-font--semibold",
  bold: "appkit-font--bold",
};

export interface DtProps extends React.HTMLAttributes<HTMLElement> {
  color?: DtDdColor;
  weight?: DtDdWeight;
  children: React.ReactNode;
}

export function Dt({ color, weight, className = "", children, ...props }: DtProps) {
  return (
    <dt
      className={[
        "appkit-dt",
        color ? DT_DD_COLOR_MAP[color] : "",
        weight ? DT_DD_WEIGHT_MAP[weight] : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </dt>
  );
}

export interface DdProps extends React.HTMLAttributes<HTMLElement> {
  color?: DtDdColor;
  weight?: DtDdWeight;
  children: React.ReactNode;
}

export function Dd({ color, weight, className = "", children, ...props }: DdProps) {
  return (
    <dd
      className={[
        "appkit-dd",
        color ? DT_DD_COLOR_MAP[color] : "",
        weight ? DT_DD_WEIGHT_MAP[weight] : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </dd>
  );
}
