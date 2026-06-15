"use client";
import React from "react";
import Link from "next/link";
import { Div, Heading, Span, Stack, Text } from "../../../ui";
import { Button } from "../../../ui/components/Button";
import { ROUTES } from "../../../next/routing/route-map";

const __P = {
  p6: "p-6",
} as const;

export interface EventSaleBannerProps {
  /** Discount percent (e.g. 20 = 20% off). */
  discountPercent?: number;
  /** Coupon code (when the sale is gated by a code). */
  couponCode?: string;
  /** Sale headline override. */
  title?: string;
  /** Sale subheading override. */
  subtitle?: string;
  /** Filter the catalog page to a specific category / tag. */
  filterParam?: { key: string; value: string };
}

/**
 * `EventSaleBanner` — W1-18 — sale event UI noted as missing in the plan.
 * Renders a hero banner with the discount, optional coupon, and a CTA to the
 * filtered products catalog.
 */
export function EventSaleBanner({
  discountPercent,
  couponCode,
  title,
  subtitle,
  filterParam,
}: EventSaleBannerProps) {
  const headline =
    title ?? (discountPercent ? `${discountPercent}% off, today only` : "Special sale");
  const href = filterParam
    ? `${ROUTES.PUBLIC.PRODUCTS}?${encodeURIComponent(filterParam.key)}=${encodeURIComponent(filterParam.value)}`
    : `${ROUTES.PUBLIC.PRODUCTS}?onSale=true`;

  return (
    <Div className={`rounded-2xl bg-gradient-to-br from-[var(--appkit-color-primary)] to-[var(--appkit-color-secondary)] ${__P.p6} text-white shadow-lg`}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={2} className="text-3xl" weight="bold">
            {headline}
          </Heading>
          {subtitle ? <Text className="text-white/90" size="base">{subtitle}</Text> : null}
        </Stack>
        {couponCode ? (
          <Div className="inline-flex items-center gap-3 bg-white/10 px-4 py-2 backdrop-blur" rounded="lg">
            <Span size="xs" className="tracking-wide opacity-80" transform="uppercase">Code</Span>
            <Span size="lg" weight="bold" className="font-mono">{couponCode}</Span>
          </Div>
        ) : null}
        <Div>
          <Link href={href}>
            <Button variant="secondary">Shop the sale</Button>
          </Link>
        </Div>
      </Stack>
    </Div>
  );
}
