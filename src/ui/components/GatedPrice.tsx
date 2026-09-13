"use client";

import React from "react";
import { Span } from "./Typography";
import { Row } from "./Layout";
import { ROUTES } from "../../next/routing/route-map";
import { getDefaultCurrency } from "../../core/baseline-resolver";
import { formatCurrency, formatPercentage } from "../../utils/number.formatter";
import { useCanSeePrices } from "../../react/hooks/useCanSeePrices";

/**
 * 🛑 CONTRACT WITH THE STRUCTURED DATA — do not rename.
 *
 * The Product/Auction JSON-LD declares this exact selector in its paywalled
 * content markup (`hasPart.cssSelector`, see `appkit/src/seo/json-ld.ts`), which
 * is what tells Google the page legitimately carries an `offers.price` that an
 * anonymous visitor cannot see. Rename this and the selector silently matches
 * nothing, which reads to a crawler as an undeclared content mismatch.
 *
 * It is rendered in EVERY state — signed in, signed out and resolving — because
 * the markup describes the region, not the refusal.
 */
export const GATED_PRICE_CLASS = "appkit-gated-price";

export interface GatedPriceProps {
  /** The amount to show once the viewer is allowed to see it. */
  amount?: number;
  currency?: string;
  /** Struck-through "was" price; a discount badge is derived from the pair. */
  originalAmount?: number;
  variant?: "compact" | "detail";
  className?: string;
  /**
   * Copy for the signed-out state. Default: "Sign in to see price". Override
   * when the amount isn't a price — "Sign in to see the current bid".
   */
  label?: string;
  /**
   * Arbitrary money content to gate, for the sites that don't render a bare
   * amount ("Buy Now — ₹1,200", "min increment ₹100", a composite row). When
   * given, `amount` is ignored and this is what renders once allowed.
   */
  children?: React.ReactNode;
}

const DEFAULT_LABEL = "Sign in to see price";

/**
 * Renders its children only when the viewer may see prices; renders NOTHING
 * otherwise — no prompt, no placeholder.
 *
 * For SECONDARY money details that sit beside an already-gated primary amount:
 * a handling fee, a deposit note, a "you save ₹X" line, a min-bid increment.
 * Those read as broken copy when gated in place ("min increment Sign in to see
 * price"), and the prompt is already on screen one line up, so repeating it is
 * noise rather than an affordance.
 *
 * 🛑 Do NOT use this for a listing's primary price. A card whose price row
 * simply vanishes reads as a rendering bug, and its height stops matching its
 * neighbours — use `<GatedPrice>` there, which keeps the row and explains it.
 *
 * Renders nothing while the session resolves, so a signed-in viewer sees these
 * appear rather than flash the wrong state.
 */
export function PricesOnly({ children }: { children: React.ReactNode }) {
  const { canSeePrices } = useCanSeePrices();
  if (!canSeePrices) return null;
  return <>{children}</>;
}

/**
 * A money amount that only signed-in visitors may read.
 *
 * Three states, and the middle one is the whole reason this is a component
 * rather than an inline `user ? price : prompt` at each call site — see
 * `useCanSeePrices` for why "resolving" must not render the prompt.
 *
 * The amount is still present in the page payload and in the structured data;
 * this gates the RENDER. Withholding it from the response entirely would mean
 * fetching prices separately on every listing page — deliberately out of scope.
 */
export function GatedPrice({
  amount,
  currency = getDefaultCurrency(),
  originalAmount,
  variant = "compact",
  className,
  label = DEFAULT_LABEL,
  children,
}: GatedPriceProps) {
  const { canSeePrices, isAuthResolving } = useCanSeePrices();

  const rootClass = `${GATED_PRICE_CLASS} ${className ?? ""}`.trim();

  if (isAuthResolving) {
    return (
      <Span
        className={`${rootClass} appkit-gated-price__pending`}
        aria-hidden="true"
      />
    );
  }

  if (!canSeePrices) {
    return (
      <a
        href={String(ROUTES.AUTH.LOGIN)}
        className={`${rootClass} appkit-gated-price__prompt`}
      >
        {label}
      </a>
    );
  }

  if (children !== undefined) {
    return <Span className={rootClass}>{children}</Span>;
  }

  if (amount === undefined) return null;

  const hasDiscount = originalAmount !== undefined && originalAmount > amount;
  const discountPct = hasDiscount ? (originalAmount - amount) / originalAmount : 0;

  const priceClass =
    variant === "detail"
      ? "appkit-price-display__price appkit-price-display__price--detail"
      : "appkit-price-display__price appkit-price-display__price--compact";
  const originalClass =
    variant === "detail"
      ? "appkit-price-display__original appkit-price-display__original--detail"
      : "appkit-price-display__original appkit-price-display__original--compact";

  return (
    <Row wrap align="baseline" gap="xs" className={`appkit-price-display ${rootClass}`}>
      <Span className={priceClass}>{formatCurrency(amount, currency)}</Span>
      {hasDiscount && (
        <>
          <Span className={originalClass}>
            {formatCurrency(originalAmount, currency)}
          </Span>
          <Span className="appkit-price-display__discount">
            -{formatPercentage(discountPct, 0)}
          </Span>
        </>
      )}
    </Row>
  );
}
