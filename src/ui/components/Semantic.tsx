import React from "react";

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
 * Semantic `<section>` element.
 * Use for thematically grouped content that would appear in an outline.
 * Prefer this over a plain `<div>` when the block has a heading.
 */
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className = "", children, ...props }, ref) => (
    <section className={className} ref={ref} {...props}>
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
export interface ArticleProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

export function Article({ className = "", children, ...props }: ArticleProps) {
  return (
    <article className={className} {...props}>
      {children}
    </article>
  );
}

// --- Main ---------------------------------------------------------------------
/**
 * Semantic `<main>` element.
 * Wraps the primary content of the document. Should appear only once per page.
 */
export interface MainProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Main({ className = "", children, ...props }: MainProps) {
  return (
    <main className={className} {...props}>
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
export interface AsideProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const Aside = React.forwardRef<HTMLElement, AsideProps>(
  ({ className = "", children, ...props }, ref) => (
    <aside className={className} ref={ref} {...props}>
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
export interface BlockHeaderProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function BlockHeader({
  className = "",
  children,
  ...props
}: BlockHeaderProps) {
  return (
    <header className={className} {...props}>
      {children}
    </header>
  );
}

// --- Footer (block-level) -----------------------------------------------------
/**
 * Semantic `<footer>` element for block-level component footers.
 * Use inside `Section`, `Article`, or card bodies — NOT as the page-level footer.
 */
export interface BlockFooterProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function BlockFooter({
  className = "",
  children,
  ...props
}: BlockFooterProps) {
  return (
    <footer className={className} {...props}>
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
export interface UlProps extends React.HTMLAttributes<HTMLUListElement> {
  children: React.ReactNode;
}

export function Ul({ className = "", children, ...props }: UlProps) {
  return (
    <ul className={className} {...props}>
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
  children: React.ReactNode;
}

export function Ol({ className = "", children, ...props }: OlProps) {
  return (
    <ol className={className} {...props}>
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

// --- Header / Footer — convenience aliases ------------------------------------
/**
 * Aliases for `BlockHeader` and `BlockFooter`.
 * Use when importing from the standard `<Header>` / `<Footer>` names.
 */
export type HeaderProps = BlockHeaderProps;
export const Header = BlockHeader;
export type FooterProps = BlockFooterProps;
export const Footer = BlockFooter;
