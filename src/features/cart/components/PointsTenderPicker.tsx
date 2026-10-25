"use client";

import React from "react";
import { Div } from "../../../ui/components/Div";
import { Row, Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { IconBox } from "../../../ui/components/IconBox";
import { Icon } from "../../../ui/components/Icon";
import { FieldCheckbox } from "../../../ui/forms/FieldCheckbox";
import { formatCurrency } from "../../../utils/number.formatter";

/**
 * "Pay with my points" — one checkbox for the whole cart (D46/D47).
 *
 * ## Why ONE control for the cart, where add-ons get one per store
 *
 * An add-on is a thing the buyer buys from a particular seller, so choosing it
 * per seller is the only coherent shape. Points are the buyer's own balance:
 * they do not belong to a seller, and asking "how many of your points would you
 * like to spend at each of these three shops" is a question nobody wants to
 * answer. So the buyer opts in once and the server spends what it can, in group
 * order, at the sellers who accept them (decision 22).
 *
 * ## 🛑 A checkbox and NOT a number input, deliberately
 *
 * Decision 24: tick it and as many points as the 50% cap allows are applied;
 * whatever cannot be applied stays in the balance for a later order. Nothing is
 * forfeited, so there is no amount worth agonising over — and more importantly,
 * an amount the client can send is an amount the client can lie about. The
 * figure is always derived server-side from the live balance.
 *
 * ## It renders nothing when there is nothing to offer
 *
 * A zero balance gets no control at all rather than a disabled one. A disabled
 * checkbox beside "0 points" is an advertisement, and the place to advertise
 * the programme is the points page, not the cart of somebody who cannot use it.
 */

export interface PointsTenderPickerProps {
  /** Current cart flag. */
  value: boolean;
  onChange: (next: boolean) => void;
  /**
   * The buyer's live balance, in points (1 point = ₹1).
   *
   * 🛑 Zero when the cart has not opted in, because the server only reads a
   * balance it is going to use — so this cannot be relied on to decide whether
   * to RENDER. `hasBalance` below exists for that.
   */
  balance: number;
  /**
   * Points actually applied to this cart, from the server preview. Undefined
   * while the preview is in flight.
   */
  applied?: number;
  /**
   * Whether the buyer has ANY points, independent of the opt-in state.
   *
   * Separate from `balance` for the reason above: with the toggle off the
   * preview returns `pointsBalance: 0`, so a control gated on `balance > 0`
   * could never be switched back on once switched off — a one-way door, the
   * `BackToTop` failure in Root Cause #41.
   */
  hasBalance: boolean;
  /** No store in the cart accepts points — the control says so instead of hiding. */
  noAcceptingStore?: boolean;
  currency?: string;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
}

export function PointsTenderPicker({
  value,
  onChange,
  balance,
  applied,
  hasBalance,
  noAcceptingStore = false,
  currency = "INR",
  disabled = false,
  disabledReason,
  className = "",
}: PointsTenderPickerProps) {
  if (!hasBalance) return null;

  const shownBalance = value ? balance : 0;

  return (
    <Div surface="muted" rounded="lg" padding="sm" className={className}>
      <Stack gap="xs">
        <Row align="center" gap="sm" className="min-w-0">
          <IconBox size="sm" tone="brand" rounded="lg">
            <Icon name="points" size="sm" />
          </IconBox>
          <Div className="min-w-0 flex-1">
            <FieldCheckbox
              name="useAllPoints"
              label="Pay with my points"
              checked={value}
              onChange={onChange}
              disabled={disabled || noAcceptingStore}
            />
          </Div>
        </Row>

        {/*
          🛑 Every branch below states a FACT, never an encouragement. The one
          thing this control must not do is imply a discount it cannot deliver:
          the cap, the per-seller opt-in and the balance all bound it, and a
          buyer who ticks the box expecting their whole balance to clear the
          order and sees half of it applied has been misled by the label rather
          than by the arithmetic.
        */}
        {noAcceptingStore ? (
          <Text size="xs" color="muted">
            Points cannot be used with the seller(s) in this cart.
          </Text>
        ) : disabled && disabledReason ? (
          <Text size="xs" color="muted">
            {disabledReason}
          </Text>
        ) : value && applied !== undefined ? (
          applied > 0 ? (
            <Text size="xs" color="muted">
              {applied.toLocaleString("en-IN")} points applied ({formatCurrency(applied, currency)})
              {shownBalance > applied
                ? ` · ${(shownBalance - applied).toLocaleString("en-IN")} left over`
                : ""}
            </Text>
          ) : (
            <Text size="xs" color="muted">
              No points could be applied to this order.
            </Text>
          )
        ) : (
          <Text size="xs" color="muted">
            Up to half of an order can be paid with points.
          </Text>
        )}
      </Stack>
    </Div>
  );
}
