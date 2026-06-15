import type { AnchorHTMLAttributes, ReactNode } from "react";

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
  | "inverse";

export type AnchorUnderline = "none" | "hover" | "always";

export interface AnchorProps
  extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
  /** Colour tone. Defaults to `"brand"`. */
  tone?: AnchorTone;
  /** Underline behaviour. Defaults to `"hover"`. */
  underline?: AnchorUnderline;
  /**
   * Treat as an external link. Default is auto-detected from the href shape:
   *   - `http(s)://` → external
   *   - `mailto:` / `tel:` / `sms:` → external (but no rel/target rewrite)
   *   - `#fragment` → same-page
   * Pass `external={false}` to render an in-app anchor (e.g. `<a href="#…">`).
   */
  external?: boolean;
  /**
   * Escape hatch for behaviour-coupled utility classes (layout overrides,
   * state-driven classes like `group`, structural card-link styling).
   * Variant slots (tone/underline) own the visual styling; this extends them.
   */
  className?: string;
}

const TONE_CLS: Record<AnchorTone, string> = {
  default: "text-[var(--appkit-color-text)]",
  muted: "text-[var(--appkit-color-text-muted)]",
  brand: "text-[var(--appkit-color-primary)] hover:text-[var(--appkit-color-primary-600)]",
  accent: "text-[var(--appkit-color-secondary)] hover:text-[var(--appkit-color-secondary-600)]",
  danger: "text-[var(--appkit-color-error)] hover:text-[var(--appkit-color-error-hover)]",
  success: "text-[var(--appkit-color-success)]",
  inverse: "text-[var(--appkit-color-text-on-primary)]",
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

export function Anchor({
  href,
  children,
  tone = "brand",
  underline = "hover",
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
      // audit-variant-ok: Anchor is the catalogued primitive for external
      // links. Tone + underline come from typed enums; className is the
      // escape hatch for behaviour-coupled utility classes only.
      className={`${TONE_CLS[tone]} ${UNDERLINE_CLS[underline]} transition-colors${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {children}
    </a>
  );
}
