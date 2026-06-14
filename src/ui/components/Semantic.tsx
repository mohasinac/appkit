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
 *   <Section className="py-12">
 *     <Article>...</Article>
 *   </Section>
 *   <Aside className="w-64 shrink-0">...</Aside>
 * </Main>
 *
 * <Nav aria-label="Main navigation">
 *   <Ul className="flex gap-4">
 *     <Li>Products</Li>
 *   </Ul>
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

export interface SectionProps extends React.HTMLAttributes<HTMLElement>, SurfaceProps {
  /**
   * Themed background tone. Defaults to `"plain"`. Use `"page-header"` for
   * subtle gradient page-headers, `"hero"` for radial mesh hero backgrounds,
   * `"accent-banner"` for primary→secondary brand banners.
   */
  tone?: SectionTone;
  children: React.ReactNode;
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ tone = "plain", className = "", surface, padding, rounded, border, shadow, children, ...props }, ref) => (
    <section
      className={[
        SECTION_TONE_MAP[tone],
        buildSurfaceClasses({ surface, padding, rounded, border, shadow }),
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
  children?: React.ReactNode;
}

export function Article({ className = "", surface, padding, rounded, border, shadow, children, ...props }: ArticleProps) {
  return (
    <article className={[buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className].filter(Boolean).join(" ")} {...props}>
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
  children: React.ReactNode;
}

export function Main({ className = "", surface, padding, rounded, border, shadow, children, ...props }: MainProps) {
  return (
    <main className={[buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className].filter(Boolean).join(" ")} {...props}>
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
  children: React.ReactNode;
}

export const Aside = React.forwardRef<HTMLElement, AsideProps>(
  ({ className = "", surface, padding, rounded, border, shadow, children, ...props }, ref) => (
    <aside className={[buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className].filter(Boolean).join(" ")} ref={ref} {...props}>
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
export interface NavProps extends React.HTMLAttributes<HTMLElement> {
  /** REQUIRED — describes the purpose of this navigation region for screen readers. */
  "aria-label": string;
  children: React.ReactNode;
}

export function Nav({ className = "", children, ...props }: NavProps) {
  return (
    <nav className={className} {...props}>
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
 *   <BlockHeader className="mb-4">
 *     <Heading level={2}>Post title</Heading>
 *   </BlockHeader>
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
 *   <Li>Item one</Li>
 *   <Li>Item two</Li>
 * </Ul>
 * ```
 */
/** Marker presets for `<Ul>` / `<Ol>`. */
export type ListMarker = "disc" | "decimal" | "none" | "check" | "arrow";
/** Spacing between list items. */
export type ListSpacing = "tight" | "comfortable" | "loose" | "none";

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

export interface UlProps extends React.HTMLAttributes<HTMLUListElement> {
  /** Marker style — replaces consumer `list-disc`/`list-none` className. */
  marker?: ListMarker;
  /** Vertical spacing between items — replaces consumer `space-y-N`. */
  spacing?: ListSpacing;
  children: React.ReactNode;
}

export function Ul({ marker, spacing, className = "", children, ...props }: UlProps) {
  return (
    <ul
      className={[
        marker ? LIST_MARKER_MAP[marker] : "",
        spacing ? LIST_SPACING_MAP[spacing] : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </ul>
  );
}

// --- Ol ----------------------------------------------------------------------
/**
 * Semantic `<ol>` (ordered list) element.
 *
 * @example
 * ```tsx
 * <Ol className="list-decimal pl-4 space-y-1">
 *   <Li>Step one</Li>
 *   <Li>Step two</Li>
 * </Ol>
 * ```
 */
export interface OlProps extends React.HTMLAttributes<HTMLOListElement> {
  /** Marker style — defaults to `"decimal"` for ordered lists. */
  marker?: ListMarker;
  /** Vertical spacing between items — replaces consumer `space-y-N`. */
  spacing?: ListSpacing;
  children: React.ReactNode;
}

export function Ol({ marker = "decimal", spacing, className = "", children, ...props }: OlProps) {
  return (
    <ol
      className={[
        LIST_MARKER_MAP[marker],
        spacing ? LIST_SPACING_MAP[spacing] : "",
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
export interface LiProps extends React.LiHTMLAttributes<HTMLLIElement> {
  children: React.ReactNode;
}

export function Li({ className = "", children, ...props }: LiProps) {
  return (
    <li className={className} {...props}>
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

export interface TheadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function Thead({ className = "", children, ...props }: TheadProps) {
  return (
    <thead className={["appkit-thead", className].filter(Boolean).join(" ")} {...props}>
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

export interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hover?: boolean;
  children: React.ReactNode;
}

export function Tr({ hover = false, className = "", children, ...props }: TrProps) {
  return (
    <tr className={["appkit-tr", hover ? "appkit-tr--hover" : "", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </tr>
  );
}

type CellAlign = "left" | "center" | "right";

export interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: CellAlign;
  children?: React.ReactNode;
}

export function Th({ align, className = "", children, ...props }: ThProps) {
  return (
    <th className={["appkit-th", align ? `text-${align}` : "", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </th>
  );
}

export interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: CellAlign;
  children?: React.ReactNode;
}

export function Td({ align, className = "", children, ...props }: TdProps) {
  return (
    <td className={["appkit-td", align ? `text-${align}` : "", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </td>
  );
}

// --- Code / Pre ---------------------------------------------------------------

export interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  color?: "default" | "primary" | "error" | "success";
  children: React.ReactNode;
}

const CODE_COLOR_MAP: Record<NonNullable<CodeProps["color"]>, string> = {
  default: "appkit-code--default",
  primary: "appkit-code--primary",
  error: "appkit-code--error",
  success: "appkit-code--success",
};

export function Code({ color = "default", className = "", children, ...props }: CodeProps) {
  return (
    <code className={["appkit-code", CODE_COLOR_MAP[color], className].filter(Boolean).join(" ")} {...props}>
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
  children: React.ReactNode;
}

export function Dl({ variant = "stacked", className = "", surface, padding, rounded, border, shadow, children, ...props }: DlProps) {
  return (
    <dl className={["appkit-dl", variant === "inline" ? "appkit-dl--inline" : "appkit-dl--stacked", buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className].filter(Boolean).join(" ")} {...props}>
      {children}
    </dl>
  );
}

export interface DtProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Dt({ className = "", children, ...props }: DtProps) {
  return (
    <dt className={["appkit-dt", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </dt>
  );
}

export interface DdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Dd({ className = "", children, ...props }: DdProps) {
  return (
    <dd className={["appkit-dd", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </dd>
  );
}
