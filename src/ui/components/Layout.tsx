import React from "react";

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
 * <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 * <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 * <div className="flex flex-row items-center justify-between gap-2">
 * <div className="flex flex-col gap-4">
 *
 * // After
 * <Container>
 * <Grid cols={3} gap="md">
 * <Row justify="between" gap="sm">
 * <Stack gap="md">
 * ```
 */

// ─── Token maps ──────────────────────────────────────────────────────────────

/**
 * Gap tokens — maps to `gap-*` Tailwind classes.
 * Mirrors THEME_CONSTANTS.spacing.gap in the host app.
 */
const GAP_MAP = {
  none: "",
  px: "gap-px",
  xs: "gap-1",
  sm: "gap-2",
  "2.5": "gap-2.5",
  "3": "gap-3",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
  "2xl": "gap-12",
} as const;

export type GapKey = keyof typeof GAP_MAP;

/**
 * Page container sizes.
 * Mirrors THEME_CONSTANTS.page.container in the host app.
 */
const CONTAINER_MAP = {
  /** `max-w-3xl` — blog posts, legal / policy pages */
  sm: "max-w-3xl mx-auto px-4 sm:px-6 lg:px-8",
  /** `max-w-4xl` — narrow content, contact, about */
  md: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8",
  /** `max-w-5xl` — medium content, checkout, help */
  lg: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8",
  /** `max-w-6xl` — product detail, cart */
  xl: "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8",
  /** `max-w-7xl` — main content grids (default) */
  "2xl": "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  /** `max-w-screen-2xl` — full-bleed wide content */
  full: "max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8",
  /** `max-w-screen-2xl` — wide store/seller layouts (compact px) */
  wide: "max-w-screen-2xl mx-auto px-4 sm:px-6",
  /** `max-w-[1920px]` — ultra-wide / 4K displays */
  ultra: "max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8",
} as const;

export type ContainerSize = keyof typeof CONTAINER_MAP;

export type ContainerSizeValue = (typeof CONTAINER_MAP)[ContainerSize];

/**
 * Responsive grid column presets.
 * Mirrors THEME_CONSTANTS.grid in the host app.
 */
export const GRID_MAP = {
  /** Single column */
  1: "grid grid-cols-1",
  /** 1 → 2 */
  2: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2",
  /** 1 → 2 → 3 → 4 on widescreen */
  3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4",
  /** 1 → 2 → 3 → 4 → 5 on widescreen */
  4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
  /** 1 → 2 → 3 → 4 → 5 */
  5: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5",
  /** 2 → 3 → 4 → 5 → 6 */
  6: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
  /**
   * Generic card grid — 1 col on portrait mobile → 5 on ultrawide.
   * Starts at 1 so product cards are readable even on 320 px handsets.
   */
  cards:
    "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5",
  /** Auto-fill product cards — min 200 px */
  productCards: "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6",
  /** Auto-fill store cards — min 220 px */
  storeCards: "grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6",
  /** Auto-fill category tiles — min 130 px */
  categoryCards: "grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-4",
  /** Auto-fill coupon/promo cards — min 264 px */
  couponCards: "grid grid-cols-[repeat(auto-fill,minmax(264px,1fr))] gap-6",
  /** Auto-fill address / wide cards — min 300 px */
  addressCards: "grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4",
  /** Auto-fill KPI/stat tiles — min 180 px */
  statTiles: "grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4",
  /** Auto-fill account nav tiles — min 160 px */
  navTiles: "grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4",
  /** Equal halves on md+ */
  halves: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2",
  /** 2fr / 1fr split on md+ */
  twoThird: "grid grid-cols-1 md:grid-cols-[2fr_1fr]",
  /** 1fr / 2fr split on md+ */
  oneThird: "grid grid-cols-1 md:grid-cols-[1fr_2fr]",
  /** Fixed 280px left sidebar + 1fr on lg+ */
  sidebar: "grid grid-cols-1 lg:grid-cols-[280px_1fr]",
  /** 1fr + fixed 280px right sidebar on lg+ */
  sidebarRight: "grid grid-cols-1 lg:grid-cols-[1fr_280px]",
  /** Fixed 320px left sidebar + 1fr on lg+ (admin layout) */
  sidebarWide: "grid grid-cols-1 lg:grid-cols-[320px_1fr]",
  /** CSS auto-fill, min 200px columns */
  autoSm: "grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))]",
  /** CSS auto-fill, min 280px columns */
  autoMd: "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))]",
  /** CSS auto-fill, min 360px columns */
  autoLg: "grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))]",
} as const;

export type GridCols = keyof typeof GRID_MAP;

// Alignment helpers shared across Stack and Row
const ITEMS_MAP = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
} as const;

type ItemsAlign = keyof typeof ITEMS_MAP;

const JUSTIFY_MAP = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
} as const;

type JustifyContent = keyof typeof JUSTIFY_MAP;

// ─── Container ────────────────────────────────────────────────────────────────

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
export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Max-width breakpoint preset.
   * - `sm`    → `max-w-3xl`       (blog / policy)
   * - `md`    → `max-w-4xl`       (contact / about)
   * - `lg`    → `max-w-5xl`       (checkout / help)
   * - `xl`    → `max-w-6xl`       (product detail / cart)
   * - `2xl`   → `max-w-7xl`       (main content grids — **default**)
   * - `full`  → `max-w-screen-2xl` (full-bleed)
   * - `wide`  → `max-w-screen-2xl` (compact px, no lg step)
   * - `ultra` → `max-w-[1920px]`  (ultra-wide / 4K displays)
   */
  size?: ContainerSize;
  /** Render as a different element (e.g. `"main"`, `"section"`). Defaults to `"div"`. */
  as?: React.ElementType;
  children?: React.ReactNode;
}

export function Container({
  size = "2xl",
  as,
  className = "",
  children,
  ...props
}: ContainerProps) {
  const Tag = (as ?? "div") as React.ElementType;
  return (
    <Tag
      className={[CONTAINER_MAP[size], className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ─── Stack ────────────────────────────────────────────────────────────────────

/**
 * Vertical flex column. Use instead of `<div className="flex flex-col gap-4">`.
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
export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  /** Space between children. Defaults to `"md"` (`gap-4`). */
  gap?: GapKey;
  /** Centers children on both axes (`items-center justify-center`). */
  centered?: boolean;
  /** Cross-axis (horizontal) alignment. Defaults to `"stretch"`. */
  align?: Extract<ItemsAlign, "start" | "center" | "end" | "stretch">;
  /** Render as a different element. Defaults to `"div"`. */
  as?: React.ElementType;
  children?: React.ReactNode;
}

export function Stack({
  gap = "md",
  centered = false,
  align = "stretch",
  as,
  className = "",
  children,
  ...props
}: StackProps) {
  const Tag = (as ?? "div") as React.ElementType;
  const classes = [
    "flex flex-col",
    GAP_MAP[gap],
    centered ? "items-center justify-center" : "",
    !centered && align !== "stretch" ? ITEMS_MAP[align] : "",
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

// ─── Row ─────────────────────────────────────────────────────────────────────

/**
 * Horizontal flex row. Use instead of `<div className="flex items-center gap-3">`.
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
export interface RowProps extends React.HTMLAttributes<HTMLElement> {
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
  /** Render as a different element. Defaults to `"div"`. */
  as?: React.ElementType;
  children?: React.ReactNode;
}

export function Row({
  gap = "md",
  centered = false,
  align = "center",
  justify = "start",
  wrap = false,
  as,
  className = "",
  children,
  ...props
}: RowProps) {
  const Tag = (as ?? "div") as React.ElementType;
  const classes = [
    "flex flex-row",
    centered ? "items-center justify-center" : ITEMS_MAP[align],
    !centered && justify !== "start" ? JUSTIFY_MAP[justify] : "",
    GAP_MAP[gap],
    wrap ? "flex-wrap" : "",
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

// ─── Grid ─────────────────────────────────────────────────────────────────────

/**
 * Responsive CSS grid. Use instead of `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">`.
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
export interface GridProps extends React.HTMLAttributes<HTMLElement> {
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
  className = "",
  children,
  ...props
}: GridProps) {
  const Tag = (as ?? "div") as React.ElementType;
  // When cols is omitted callers supply grid-cols-* themselves via className.
  const baseClass = cols !== undefined ? GRID_MAP[cols] : "grid";
  const classes = [baseClass, GAP_MAP[gap], className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
}
