import type { AnchorHTMLAttributes, ReactNode } from "react";
import { PADDING_MAP, type PaddingKey, ROUNDED_MAP, type RoundedKey, SHADOW_MAP, type ShadowKey, SURFACE_MAP, type SurfaceKey } from "./surface-tokens";

export type AnchorWeight = "normal" | "medium" | "semibold" | "bold";

const ANCHOR_WEIGHT_CLS: Record<AnchorWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

export type AnchorGap = "none" | "2xs" | "xs" | "sm" | "md" | "lg";

const ANCHOR_GAP_CLS: Record<AnchorGap, string> = {
  none: "",
  "2xs": "gap-0.5",
  xs: "gap-1",
  sm: "gap-1.5",
  md: "gap-2",
  lg: "gap-3",
};

/**
 * Anchor — primitive for **external** links, `mailto:`, and `tel:` URLs.
 *
 * Internal Next.js routes go through `<TextLink>` (which wraps `next-intl`'s
 * `Link`). This primitive is the only place a raw `<a>` is allowed at a
 * consumer call site — the variant catalogue forbids `<a>` everywhere else.
 *
 * The audit will steer call sites to `<TextLink>` vs `<Anchor>` based on the
 * `href` shape (`http(s)://…`, `mailto:`, `tel:`, `#fragment` → `Anchor`;
 * everything else → `TextLink`).
 */
export type AnchorTone =
  | "default"
  | "muted"
  | "brand"
  | "accent"
  | "danger"
  | "success"
  | "inverse"
  /** No colour applied — for card/button-style anchors that fully own their own colour via `className`. */
  | "none";

export type AnchorUnderline = "none" | "hover" | "always";
export type AnchorSize = "xs" | "sm" | "base" | "lg";

const ANCHOR_SIZE_CLS: Record<AnchorSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

export interface AnchorProps
  extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
  /** Colour tone. Defaults to `"brand"`. */
  tone?: AnchorTone;
  /** Underline behaviour. Defaults to `"hover"`. */
  underline?: AnchorUnderline;
  /** Typography size. */
  size?: AnchorSize;
  /** Typography weight. */
  weight?: AnchorWeight;
  /** Background surface — for card/banner-style anchors. Replaces consumer `bg-*` className. */
  surface?: SurfaceKey;
  /**
   * Treat as an external link. Default is auto-detected from the href shape:
   *   - `http(s)://` → external
   *   - `mailto:` / `tel:` / `sms:` → external (but no rel/target rewrite)
   *   - `#fragment` → same-page
   * Pass `external={false}` to render an in-app anchor (e.g. `<a href="#…">`).
   */
  external?: boolean;
  /** Border radius — replaces consumer `rounded-*` className. */
  rounded?: RoundedKey;
  /** Box shadow — replaces consumer `shadow-*` className. */
  shadow?: ShadowKey;
  /** Display layout. `"inline-flex"` and `"flex"` include `items-center` automatically. */
  layout?: "inline-flex" | "flex";
  /** Padding — for card/banner-style anchors. Replaces consumer `p*-*` className. */
  padding?: PaddingKey;
  /** Gap between flex children — only meaningful with `layout`. Replaces consumer `gap-*` className. */
  gap?: AnchorGap;
  /** Themed hover background — replaces consumer `hover:bg-*` className on card-style anchors. */
  hoverSurface?: "none" | "subtle";
  /**
   * Escape hatch for behaviour-coupled utility classes (layout overrides,
   * state-driven classes like `group`, structural card-link styling).
   * Variant slots (tone/underline) own the visual styling; this extends them.
   */
  className?: string;
}

const ANCHOR_HOVER_SURFACE_CLS: Record<"none" | "subtle", string> = {
  none: "",
  subtle: "hover:bg-[var(--appkit-color-border-subtle)]",
};

const TONE_CLS: Record<AnchorTone, string> = {
  default: "text-[var(--appkit-color-text)]",
  muted: "text-[var(--appkit-color-text-muted)]",
  brand: "text-[var(--appkit-color-primary)] hover:text-[var(--appkit-color-primary-600)]",
  accent: "text-[var(--appkit-color-secondary)] hover:text-[var(--appkit-color-secondary-600)]",
  danger: "text-[var(--appkit-color-error)] hover:text-[var(--appkit-color-error-hover)]",
  success: "text-[var(--appkit-color-success)]",
  inverse: "text-[var(--appkit-color-text-on-primary)]",
  none: "",
};

const UNDERLINE_CLS: Record<AnchorUnderline, string> = {
  none: "no-underline",
  hover: "no-underline hover:underline underline-offset-2",
  always: "underline underline-offset-2",
};

const PROTOCOL_RX = /^(?:https?:|mailto:|tel:|sms:)/i;

function isExternalShape(href: string): boolean {
  return PROTOCOL_RX.test(href);
}

function isHttpProtocol(href: string): boolean {
  return /^https?:/i.test(href);
}

const ANCHOR_LAYOUT_CLS: Record<"inline-flex" | "flex", string> = {
  "inline-flex": "inline-flex items-center",
  flex: "flex items-center",
};

export function Anchor({
  href,
  children,
  tone = "brand",
  underline = "hover",
  size,
  weight,
  surface,
  rounded,
  shadow,
  layout,
  padding,
  gap,
  hoverSurface,
  external,
  rel,
  target,
  className,
  ...rest
}: AnchorProps) {
  const resolvedExternal = external ?? isExternalShape(href);
  const isHttp = isHttpProtocol(href);
  const computedTarget = target ?? (resolvedExternal && isHttp ? "_blank" : undefined);
  const computedRel =
    rel ??
    (resolvedExternal && isHttp ? "noopener noreferrer" : undefined);

  return (
    <a
      href={href}
      target={computedTarget}
      rel={computedRel}
      // links. Tone + underline come from typed enums; className is the
      // escape hatch for behaviour-coupled utility classes only.
      className={[
        TONE_CLS[tone],
        UNDERLINE_CLS[underline],
        size ? ANCHOR_SIZE_CLS[size] : "",
        weight ? ANCHOR_WEIGHT_CLS[weight] : "",
        surface ? SURFACE_MAP[surface] : "",
        rounded ? ROUNDED_MAP[rounded] : "",
        shadow ? SHADOW_MAP[shadow] : "",
        layout ? ANCHOR_LAYOUT_CLS[layout] : "",
        padding ? PADDING_MAP[padding] : "",
        gap ? ANCHOR_GAP_CLS[gap] : "",
        hoverSurface ? ANCHOR_HOVER_SURFACE_CLS[hoverSurface] : "",
        "transition-colors",
        className ?? "",
      ].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </a>
  );
}
