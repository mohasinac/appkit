"use client";
import React from "react";
import Link from "next/link";
import { Div } from "../../../ui/components/Div";
import { Heading, Text } from "../../../ui/components/Typography";
import { Stack } from "../../../ui/components/Layout";
import { Button } from "../../../ui/components/Button";
import { ROUTES } from "../../../next/routing/route-map";
import { CouponCodeCopyRow } from "../../promotions/components/CouponCodeCopyRow";

const __P = {
  p6: "p-[var(--appkit-space-6)]",
} as const;

export interface EventOfferCardProps {
  /** Coupon code to copy. */
  couponCode: string;
  /** Description of what the coupon does. */
  offerDescription?: string;
  /** Headline. */
  title?: string;
  /** Optional filter param for the CTA — e.g. {key: "category", value: "trading-cards"}. */
  filterParam?: { key: string; value: string };
}

/**
 * `EventOfferCard` — W1-18 — offer event UI noted as missing in the plan.
 * Renders a coupon code with copy-to-clipboard + a CTA to the filtered
 * products page.
 */
export function EventOfferCard({
  couponCode,
  offerDescription,
  title = "Exclusive offer",
  filterParam,
}: EventOfferCardProps) {
  const href = filterParam
    ? `${ROUTES.PUBLIC.PRODUCTS}?${encodeURIComponent(filterParam.key)}=${encodeURIComponent(filterParam.value)}`
    : String(ROUTES.PUBLIC.PRODUCTS);

  return (
    <Div className={`${__P.p6}`} rounded="2xl" border="default">
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={2} weight="semibold" size="2xl">
            {title}
          </Heading>
          {offerDescription ? (
            <Text size="sm" color="muted">
              {offerDescription}
            </Text>
          ) : null}
        </Stack>

        <CouponCodeCopyRow code={couponCode} ariaContext={title} />

        <Div>
          <Link href={href}>
            <Button variant="primary">Apply at checkout</Button>
          </Link>
        </Div>
      </Stack>
    </Div>
  );
}
