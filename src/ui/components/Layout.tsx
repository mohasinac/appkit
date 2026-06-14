import React from "react";
import type { SurfaceProps } from "./surface-tokens";
import { buildSurfaceClasses } from "./surface-tokens";

/**
 * Layout Primitives — Container, Stack, Row, Grid
 *
 * Thin component wrappers that turn semantic prop names into the correct
 * Tailwind class strings from the app's THEME_CONSTANTS token map.
 * Eliminates repeated inline class strings like "grid grid-cols-1 sm:grid-cols-2
 * lg:grid-cols-3 gap-4" and "flex flex-row items-center justify-between gap-2".
 *
 * Token maps are inlined here (like UI_THEME in Typography.tsx) so the package
 * stays independent of the host app's @/constants import path.
 *
 * @example
 * ```tsx
 * // Before
 * <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" data-section="layout-div-531">
 * <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-section="layout-div-532">
 * <div className="flex flex-row items-center justify-between gap-2" data-section="layout-div-533">
 * <div className="flex flex-col gap-4" data-section="layout-div-534">
 *
 * // After
 * <Container>
 * <Grid cols={3} gap="md">
 * <Row justify="between" gap="sm">
 * <Stack gap="md">
 * ```
 */

// --- Token maps --------------------------------------------------------------

/**
 * Gap tokens — maps to compiled `.appkit-gap--*` rules in `Layout.style.css`.
 *
 * The variant catalogue ships the canonical names (`dense`, `comfortable`,
 * `loose`, `section`, `hero`) alongside the legacy scalar names so existing
 * call sites keep working while new code adopts the catalogue tokens.
 */
const GAP_MAP = {
  none: "",
  px: "appkit-gap--px",
  xs: "appkit-gap--xs",
  sm: "appkit-gap--sm",
  "2.5": "appkit-gap--2-5",
  "3": "appkit-gap--3",
  md: "appkit-gap--md",
  "5": "appkit-gap--5",
  lg: "appkit-gap--lg",
  xl: "appkit-gap--xl",
  "2xl": "appkit-gap--2xl",
  // Catalogue aliases — preferred by the variant audit.
  dense: "appkit-gap--dense",
  comfortable: "appkit-gap--comfortable",
  loose: "appkit-gap--loose",
  section: "appkit-gap--section",
  hero: "appkit-gap--hero",
} as const;

export type GapKey = keyof typeof GAP_MAP;

/**
 * Portal context for view shells.
 * Sets appropriate managed-state and layout defaults per portal type.
 *
 * - `admin`  — full management UI: search, selection, isDashboard enabled by default
 * - `seller` — seller dashboard: search, selection enabled by default
 * - `user`   — account/order pages: search enabled, selection disabled by default
 * - `public` — public-facing pages: no managed state by default
 */
export type ViewPortal = "admin" | "seller" | "user" | "public";

/**
 * Page container sizes.
 * Mirrors THEME_CONSTANTS.page.container in the host app.
 */
const CONTAINER_MAP = {
  /** `max-w-3xl` — blog posts, legal / policy pages */
  sm: "appkit-container--sm",
  /** `max-w-4xl` — narrow content, contact, about */
  md: "appkit-container--md",
  /** `max-w-5xl` — medium content, checkout, help */
  lg: "appkit-container--lg",
  /** `max-w-6xl` — product detail, cart */
  xl: "appkit-container--xl",
  /** `max-w-7xl` — main content grids (default) */
  "2xl": "appkit-container--2xl",
  /** `max-w-screen-2xl` — full-bleed wide content */
  full: "appkit-container--full",
  /** `max-w-screen-2xl` — wide store/seller layouts (compact px) */
  wide: "appkit-container--wide",
  /** `max-w-[1920px]` — ultra-wide / 4K displays */
  ultra: "appkit-container--ultra",
} as const;

export type ContainerSize = keyof typeof CONTAINER_MAP;

export type ContainerSizeValue = (typeof CONTAINER_MAP)[ContainerSize];

/**
 * Responsive grid column presets.
 * Mirrors THEME_CONSTANTS.grid in the host app.
 */
export const GRID_MAP = {
  /** Single column */
  1: "appkit-grid appkit-grid--1",
  /** 1 → 2 */
  2: "appkit-grid appkit-grid--2",
  /** 1 → 2 → 3 → 4 on widescreen */
  3: "appkit-grid appkit-grid--3",
  /** 1 → 2 → 3 → 4 → 5 on widescreen */
  4: "appkit-grid appkit-grid--4",
  /** 1 → 2 → 3 → 4 → 5 */
  5: "appkit-grid appkit-grid--5",
  /** 2 → 3 → 4 → 5 → 6 */
  6: "appkit-grid appkit-grid--6",
  /**
   * Generic card grid — 1 col on portrait mobile → 5 on ultrawide.
   * Starts at 1 so product cards are readable even on 320 px handsets.
   */
  cards: "appkit-grid appkit-grid--cards",
  /** Auto-fill product cards — min 200 px */
  productCards: "appkit-grid appkit-grid--product-cards",
  /** Auto-fill product cards (compact) — min 220 px */
  productCardsCompact: "appkit-grid appkit-grid--product-cards-compact",
  /** Auto-fill store cards — min 220 px */
  storeCards: "appkit-grid appkit-grid--store-cards",
  /** Auto-fill category tiles — min 130 px */
  categoryCards: "appkit-grid appkit-grid--category-cards",
  /** Auto-fill coupon/promo cards — min 264 px */
  couponCards: "appkit-grid appkit-grid--coupon-cards",
  /** Auto-fill address / wide cards — min 300 px */
  addressCards: "appkit-grid appkit-grid--address-cards",
  /** Auto-fill KPI/stat tiles — min 180 px */
  statTiles: "appkit-grid appkit-grid--stat-tiles",
  /** Auto-fill account nav tiles — min 160 px */
  navTiles: "appkit-grid appkit-grid--nav-tiles",
  /** Equal halves on md+ */
  halves: "appkit-grid appkit-grid--halves",
  /** 2fr / 1fr split on md+ */
  twoThird: "appkit-grid appkit-grid--two-third",
  /** 1fr / 2fr split on md+ */
  oneThird: "appkit-grid appkit-grid--one-third",
  /** Fixed 280px left sidebar + 1fr on lg+ */
  sidebar: "appkit-grid appkit-grid--sidebar",
  /** 1fr + fixed 280px right sidebar on lg+ */
  sidebarRight: "appkit-grid appkit-grid--sidebar-right",
  /** Fixed 320px left sidebar + 1fr on lg+ (admin layout) */
  sidebarWide: "appkit-grid appkit-grid--sidebar-wide",
  /** Product detail triplet: gallery | info | actions sidebar */
  productDetailTriplet: "appkit-grid appkit-grid--product-detail-triplet",
  /** 2-column split (media | content) — flex row on md+, custom CSS (no cascade conflict) */
  detailSplit: "appkit-grid appkit-grid--detail-split",
  /** CSS auto-fill, min 200px columns */
  autoSm: "appkit-grid appkit-grid--auto-sm",
  /** CSS auto-fill, min 280px columns */
  autoMd: "appkit-grid appkit-grid--auto-md",
  /** CSS auto-fill, min 360px columns */
  autoLg: "appkit-grid appkit-grid--auto-lg",
} as const;

export type GridCols = keyof typeof GRID_MAP;

// Alignment helpers shared across Stack and Row
const ITEMS_MAP = {
  start: "appkit-items--start",
  center: "appkit-items--center",
  end: "appkit-items--end",
  stretch: "appkit-items--stretch",
  baseline: "appkit-items--baseline",
} as const;

type ItemsAlign = keyof typeof ITEMS_MAP;

const JUSTIFY_MAP = {
  start: "appkit-justify--start",
  center: "appkit-justify--center",
  end: "appkit-justify--end",
  between: "appkit-justify--between",
  around: "appkit-justify--around",
  evenly: "appkit-justify--evenly",
} as const;

type JustifyContent = keyof typeof JUSTIFY_MAP;

// --- Container ----------------------------------------------------------------

/**
 * Page-level container with max-width + centering + responsive horizontal padding.
 * Replaces repeated `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` strings.
 *
 * @example
 * ```tsx
 * <Container>...</Container>                   // max-w-7xl (default)
 * <Container size="lg">...</Container>         // max-w-5xl
 * <Container size="full" as="main">...</Container>
 * ```
 */
export interface ContainerProps extends React.HTMLAttributes<HTMLElement>, SurfaceProps {
  size?: ContainerSize;
  /** Render as a different element (e.g. `"main"`, `"section"`). Defaults to `"div"`. */
  as?: React.ElementType;
  children?: React.ReactNode;
}

export function Container({
  size = "2xl",
  as,
  surface,
  padding,
  rounded,
  border,
  shadow,
  className = "",
  children,
  ...props
}: ContainerProps) {
  const Tag = (as ?? "div") as React.ElementType;
  return (
    <Tag
      className={["appkit-container", CONTAINER_MAP[size], buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}

// --- Stack --------------------------------------------------------------------

/**
 * Vertical flex column. Use instead of `<div className="flex flex-col gap-4" data-section="layout-div-535">`.
 *
 * @example
 * ```tsx
 * <Stack gap="sm">
 *   <Text>Line one</Text>
 *   <Text>Line two</Text>
 * </Stack>
 *
 * // As a list
 * <Stack as="ul" gap="xs">
 *   <Li>Item</Li>
 * </Stack>
 * ```
 */
export interface StackProps extends React.HTMLAttributes<HTMLElement>, SurfaceProps {
  /** Space between children. Defaults to `"md"` (`gap-4`). */
  gap?: GapKey;
  /** Centers children on both axes (`items-center justify-center`). */
  centered?: boolean;
  /** Cross-axis (horizontal) alignment. Defaults to `"stretch"`. */
  align?: Extract<ItemsAlign, "start" | "center" | "end" | "stretch">;
  /**
   * Render a themed top-border between adjacent children. `true` / `"default"`
   * uses the active theme's border colour; `"subtle"` uses border-subtle.
   * Replaces the recurrent `divide-y divide-zinc-200 dark:divide-zinc-700`
   * className pattern (which bypasses theme tokens).
   */
  divide?: boolean | "default" | "subtle";
  /** Render as a different element. Defaults to `"div"`. */
  as?: React.ElementType;
  children?: React.ReactNode;
}

function resolveDivideClass(divide: StackProps["divide"], axis: "stack" | "row"): string {
  if (!divide) return "";
  const base = `appkit-${axis}--divide`;
  return divide === "subtle" ? `${base}-subtle` : base;
}

export function Stack({
  gap = "md",
  centered = false,
  align = "stretch",
  divide,
  as,
  surface,
  padding,
  rounded,
  border,
  shadow,
  className = "",
  children,
  ...props
}: StackProps) {
  const Tag = (as ?? "div") as React.ElementType;
  const classes = [
    "appkit-stack",
    GAP_MAP[gap],
    centered ? "appkit-stack--centered" : "",
    !centered && align !== "stretch" ? ITEMS_MAP[align] : "",
    resolveDivideClass(divide, "stack"),
    buildSurfaceClasses({ surface, padding, rounded, border, shadow }),
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
}

// --- Row ---------------------------------------------------------------------

/**
 * Horizontal flex row. Use instead of `<div className="flex items-center gap-3" data-section="layout-div-536">`.
 *
 * @example
 * ```tsx
 * <Row gap="sm" justify="between">
 *   <Heading level={3}>Title</Heading>
 *   <Button>Action</Button>
 * </Row>
 *
 * <Row gap="xs" wrap>
 *   <Badge>tag</Badge>
 *   <Badge>other</Badge>
 * </Row>
 * ```
 */
export interface RowProps extends React.HTMLAttributes<HTMLElement>, SurfaceProps {
  /** Space between children. Defaults to `"md"` (`gap-4`). */
  gap?: GapKey;
  /** Centers children on both axes (`items-center justify-center`). */
  centered?: boolean;
  /** Cross-axis (vertical) alignment. Defaults to `"center"`. */
  align?: ItemsAlign;
  /** Main-axis (horizontal) distribution. Defaults to `"start"`. */
  justify?: JustifyContent;
  /** Allow children to wrap onto multiple lines. */
  wrap?: boolean;
  /**
   * Render a themed left-border between adjacent children. `true` / `"default"`
   * uses the active theme's border colour; `"subtle"` uses border-subtle.
   * Replaces the recurrent `divide-x divide-zinc-200 dark:divide-zinc-700`
   * className pattern (which bypasses theme tokens).
   */
  divide?: boolean | "default" | "subtle";
  /** Render as a different element. Defaults to `"div"`. */
  as?: React.ElementType;
  /** Forwarded to the underlying element when `as="button"`. */
  type?: "button" | "submit" | "reset";
  /** Forwarded to the underlying element when `as="button"` or similar. */
  disabled?: boolean;
  children?: React.ReactNode;
}

export function Row({
  gap = "md",
  centered = false,
  align = "center",
  justify = "start",
  wrap = false,
  divide,
  as,
  surface,
  padding,
  rounded,
  border,
  shadow,
  className = "",
  children,
  ...props
}: RowProps) {
  const Tag = (as ?? "div") as React.ElementType;
  const classes = [
    "appkit-row",
    centered ? "appkit-row--centered" : align !== "center" ? ITEMS_MAP[align] : "",
    !centered && justify !== "start" ? JUSTIFY_MAP[justify] : "",
    GAP_MAP[gap],
    wrap ? "appkit-row--wrap" : "",
    resolveDivideClass(divide, "row"),
    buildSurfaceClasses({ surface, padding, rounded, border, shadow }),
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
}

// --- Grid ---------------------------------------------------------------------

/**
 * Responsive CSS grid. Use instead of `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-section="layout-div-537">`.
 *
 * @example
 * ```tsx
 * <Grid cols={3} gap="md">
 *   <ProductCard />
 *   <ProductCard />
 * </Grid>
 *
 * <Grid cols="sidebar" gap="lg">
 *   <Aside>Filters</Aside>
 *   <Main>Results</Main>
 * </Grid>
 * ```
 */
export interface GridProps extends React.HTMLAttributes<HTMLElement>, SurfaceProps {
  /**
   * Column preset.
   * - Numbers `1`–`6` → mobile-first responsive stacks
   * - `"halves"` → equal 2-col on md+
   * - `"sidebar"` / `"sidebarRight"` / `"sidebarWide"` → fixed+flexible splits
   * - `"twoThird"` / `"oneThird"` → 2fr/1fr splits
   * - `"autoSm"` / `"autoMd"` / `"autoLg"` → CSS auto-fill grids
   * - Omit (or `undefined`) to use a raw `grid` base and supply columns via
   *   the `className` prop directly (e.g. `className="grid-cols-2"`). Useful
   *   for fixed non-responsive column counts (form field pairs, button rows).
   */
  cols?: GridCols;
  /** Space between grid cells. Defaults to `"md"` (`gap-4`). */
  gap?: GapKey;
  /** Render as a different element. Defaults to `"div"`. */
  as?: React.ElementType;
  children?: React.ReactNode;
}

export function Grid({
  cols,
  gap = "md",
  as,
  surface,
  padding,
  rounded,
  border,
  shadow,
  className = "",
  children,
  ...props
}: GridProps) {
  const Tag = (as ?? "div") as React.ElementType;
  const baseClass = cols !== undefined ? GRID_MAP[cols] : "appkit-grid";
  const classes = [baseClass, GAP_MAP[gap], buildSurfaceClasses({ surface, padding, rounded, border, shadow }), className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
}
