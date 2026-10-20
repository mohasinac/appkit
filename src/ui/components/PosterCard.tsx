import React from "react";

/**
 * PosterCard — an image-led tile: artwork fills the card, a scrim carries the
 * type, links sit as chips on the dark end.
 *
 * 🛑 The artwork is a `media` SLOT, not a `src` prop, and that is deliberate.
 * This file lives in `ui/components/`, and reaching down into
 * `features/media/MediaImage` from here would invert the layering and put a
 * feature module on the import chain of every consumer of the UI barrel — the
 * shape Root Cause #6/#18 is about. Taking a node instead lets the homepage
 * pass `<MediaImage>` and the category tile pass `next/image`, each with the
 * `sizes` hint that is right for its own grid.
 *
 * The caller wraps it in its own `<Link>`/`<a>` when the WHOLE card is one
 * destination (the category tile), or leaves it inert and lets the chips be
 * the links (the systems matrix). It is never both: a card that is a link and
 * also contains links nests interactive content, which no browser resolves the
 * way the markup implies.
 */

/* ── Class names ──────────────────────────────────────────────────────────
 *
 * Exported because two consumers compose their own inner markup (the matrix
 * renders a chip per taxonomy link, the tile renders a count), and a literal
 * typed at the call site is a class `audit-dead-css-classes` would have to
 * find by luck.
 */
export const POSTER_CLASS = {
  root: "appkit-poster",
  tall: "appkit-poster--tall",
  compact: "appkit-poster--compact",
  media: "appkit-poster__media",
  scrim: "appkit-poster__scrim",
  body: "appkit-poster__body",
  eyebrow: "appkit-poster__eyebrow",
  title: "appkit-poster__title",
  text: "appkit-poster__text",
  meta: "appkit-poster__meta",
  chips: "appkit-poster__chips",
  chip: "appkit-poster__chip",
  chipKey: "appkit-poster__chip--key",
  grid: "appkit-poster-grid",
  grid1: "appkit-poster-grid--1",
  grid2: "appkit-poster-grid--2",
  grid3: "appkit-poster-grid--3",
  grid4: "appkit-poster-grid--4",
} as const;

export type PosterCardHeight = "compact" | "default" | "tall";

const HEIGHT_CLASS: Record<PosterCardHeight, string> = {
  compact: POSTER_CLASS.compact,
  default: "",
  tall: POSTER_CLASS.tall,
};

export interface PosterCardProps {
  /** The artwork. Rendered into an absolutely-positioned fill box. */
  media?: React.ReactNode;
  /** Small uppercase label above the title — a date range, a count, an era. */
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  /** One short paragraph. Clamped to three lines by the stylesheet. */
  text?: React.ReactNode;
  /** A line below the body — an item count, a price band. */
  meta?: React.ReactNode;
  /** The chip row. Pass `<PosterChip>`s. */
  chips?: React.ReactNode;
  height?: PosterCardHeight;
  className?: string;
}

export function PosterCard({
  media,
  eyebrow,
  title,
  text,
  meta,
  chips,
  height = "default",
  className = "",
}: PosterCardProps) {
  const classes = [POSTER_CLASS.root, HEIGHT_CLASS[height], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {/*
        Rendered even when `media` is undefined. The scrim is what makes white
        ink legible, and a card that loses its artwork (a 404 on the asset, a
        row with no cover) must still be readable rather than white-on-black-
        on-nothing — the base colour behind it is the same near-black.
      */}
      {media ? <div className={POSTER_CLASS.media}>{media}</div> : null}
      <div className={POSTER_CLASS.scrim} aria-hidden="true" />

      <div className={POSTER_CLASS.body}>
        {eyebrow ? <span className={POSTER_CLASS.eyebrow}>{eyebrow}</span> : null}
        {title ? <h3 className={POSTER_CLASS.title}>{title}</h3> : null}
        {text ? <p className={POSTER_CLASS.text}>{text}</p> : null}
        {meta ? <span className={POSTER_CLASS.meta}>{meta}</span> : null}
        {chips ? <div className={POSTER_CLASS.chips}>{chips}</div> : null}
      </div>
    </div>
  );
}

export interface PosterChipProps {
  href?: string;
  /** Solid-fill emphasis, for the one or two widest destinations on a card. */
  emphasis?: "glass" | "solid";
  target?: "_blank" | "_self";
  children: React.ReactNode;
}

/**
 * One chip. Renders an `<a>` when it has an `href` and a `<span>` otherwise,
 * so a non-navigating chip is not announced as a link.
 *
 * 🛑 A plain `<a>`, not `next/link`, because `PosterCard` lives in the UI layer
 * and must not pull a framework router into every consumer of the barrel — the
 * same reason `media` is a slot. Consumers that want client-side navigation
 * compose their own link around the chip classes via `POSTER_CLASS`.
 */
export function PosterChip({
  href,
  emphasis = "glass",
  target,
  children,
}: PosterChipProps) {
  const classes = [POSTER_CLASS.chip, emphasis === "solid" ? POSTER_CLASS.chipKey : ""]
    .filter(Boolean)
    .join(" ");

  if (!href) return <span className={classes}>{children}</span>;

  return (
    <a
      href={href}
      className={classes}
      target={target ?? "_self"}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

/* ── The no-artwork sibling ───────────────────────────────────────────────
 *
 * Lives in this file, not at the call site, for one mechanical reason: raw
 * `<div>`/`<span>`/`<h3>`/`<p>` are blocked outside the primitive source
 * directories by `audit-html-wrappers`, and `features/homepage/` is not one.
 * The two cards are also one decision — a `custom-cards` section can mix cards
 * that have an image with cards that do not, and they have to read as one row.
 */

export const PLAIN_CLASS = {
  root: "appkit-plain-card",
  eyebrow: "appkit-plain-card__eyebrow",
  title: "appkit-plain-card__title",
  text: "appkit-plain-card__text",
  chips: "appkit-plain-card__chips",
  chip: "appkit-chip",
  chipKey: "appkit-chip--key",
} as const;

export interface PlainCardProps {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  text?: React.ReactNode;
  chips?: React.ReactNode;
  /** Anything that has to sit below the chip row — an embedded form. */
  footer?: React.ReactNode;
  className?: string;
}

export function PlainCard({
  eyebrow,
  title,
  text,
  chips,
  footer,
  className = "",
}: PlainCardProps) {
  const classes = [PLAIN_CLASS.root, className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      {eyebrow ? <span className={PLAIN_CLASS.eyebrow}>{eyebrow}</span> : null}
      {title ? <h3 className={PLAIN_CLASS.title}>{title}</h3> : null}
      {text ? <p className={PLAIN_CLASS.text}>{text}</p> : null}
      {chips ? <div className={PLAIN_CLASS.chips}>{chips}</div> : null}
      {footer}
    </div>
  );
}

export interface PosterGridProps {
  columns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

const GRID_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: POSTER_CLASS.grid1,
  2: POSTER_CLASS.grid2,
  3: POSTER_CLASS.grid3,
  4: POSTER_CLASS.grid4,
};

/** 1 → 2 → N. See the note on `.appkit-poster-grid` for why not `Grid cols="cards"`. */
export function PosterGrid({ columns = 4, children, className = "" }: PosterGridProps) {
  const classes = [POSTER_CLASS.grid, GRID_CLASS[columns], className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
