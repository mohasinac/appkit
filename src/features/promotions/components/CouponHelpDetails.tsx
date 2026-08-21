"use client";

import React from "react";
import { Details, Summary, Stack, Text, Ul, Li, Span } from "../../../ui";
import { COUPON_HELP } from "../constants/coupon-help";

export interface CouponHelpDetailsProps {
  /**
   * Show the note explaining that coupons are re-checked at order placement.
   * Only meaningful where an order is actually about to be placed, so it is
   * off by default and enabled at checkout.
   */
  showRevalidationNote?: boolean;
  defaultOpen?: boolean;
  /** Collapses sibling <Details> sharing the same name (browser-native). */
  name?: string;
}

function HelpSection({ heading, items }: { heading: string; items: readonly string[] }) {
  return (
    <Stack gap="dense">
      <Text size="sm" weight="semibold">
        {heading}
      </Text>
      <Ul marker="disc" indent="md" spacing="tight" size="sm">
        {items.map((item) => (
          <Li key={item} color="muted">
            {item}
          </Li>
        ))}
      </Ul>
    </Stack>
  );
}

/**
 * Expandable "How coupons work" explainer. Collapsed by default so it never
 * competes with the coupon input it sits beside.
 *
 * All copy comes from COUPON_HELP so the cart, checkout and public coupons
 * listing render identical text.
 */
export function CouponHelpDetails({
  showRevalidationNote = false,
  defaultOpen = false,
  name,
}: CouponHelpDetailsProps) {
  return (
    <Details tone="card" padding="none" defaultOpen={defaultOpen} name={name}>
      <Summary
        paddingX="x-md"
        paddingY="y-md"
        size="sm"
        weight="semibold"
        layout="flex"
        align="center"
        justify="between"
      >
        <Span>{COUPON_HELP.title}</Span>
        <Span size="xs" color="muted">
          Stacking rules
        </Span>
      </Summary>
      <Stack gap="comfortable" padding="md">
        <HelpSection
          heading={COUPON_HELP.stackingHeading}
          items={COUPON_HELP.stackingRules}
        />
        <HelpSection
          heading={COUPON_HELP.applicationHeading}
          items={COUPON_HELP.applicationRules}
        />
        <HelpSection
          heading={COUPON_HELP.failureHeading}
          items={COUPON_HELP.failureReasons}
        />
        {showRevalidationNote && (
          <Text size="xs" color="muted">
            {COUPON_HELP.revalidationNote}
          </Text>
        )}
      </Stack>
    </Details>
  );
}
