"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Div, Heading, Row, Stack, Text } from "../../../ui";
import { Button } from "../../../ui/components/Button";
import { ROUTES } from "../../../next/routing/route-map";

const __P = {
  p6: "p-6",
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
  const [copied, setCopied] = useState(false);
  const href = filterParam
    ? `${ROUTES.PUBLIC.PRODUCTS}?${encodeURIComponent(filterParam.key)}=${encodeURIComponent(filterParam.value)}`
    : String(ROUTES.PUBLIC.PRODUCTS);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — leave button as-is */
    }
  };

  return (
    <Div className={`rounded-2xl border border-zinc-200 dark:border-zinc-700 ${__P.p6}`}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={2} weight="semibold" size="2xl">
            {title}
          </Heading>
          {offerDescription ? (
            <Text className="text-zinc-600 dark:text-zinc-400" size="sm">
              {offerDescription}
            </Text>
          ) : null}
        </Stack>

        <Row className="bg-zinc-50 dark:bg-zinc-900 px-4 py-3" align="center" gap="3" rounded="lg">
          <code className="flex-1 font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {couponCode}
          </code>
          <Button type="button" variant="outline" onClick={copyCode}>
            {copied ? "Copied!" : "Copy code"}
          </Button>
        </Row>

        <Div>
          <Link href={href}>
            <Button variant="primary">Apply at checkout</Button>
          </Link>
        </Div>
      </Stack>
    </Div>
  );
}
