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
} as const;

export type GapKey = keyof typeof GAP_MAP;

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
      className={["appkit-container", CONTAINER_MAP[size], className]
        .filter(Boolean)
        .join(" ")}
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
    "appkit-stack",
    GAP_MAP[gap],
    centered ? "appkit-stack--centered" : "",
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
    "appkit-row",
    centered ? "appkit-row--centered" : ITEMS_MAP[align],
    !centered && justify !== "start" ? JUSTIFY_MAP[justify] : "",
    GAP_MAP[gap],
    wrap ? "appkit-row--wrap" : "",
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
  const baseClass = cols !== undefined ? GRID_MAP[cols] : "appkit-grid";
  const classes = [baseClass, GAP_MAP[gap], className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
}
