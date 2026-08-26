"use client";

/**
 * QuantityStepper — the canonical −/+ quantity control.
 *
 * There was no primitive for this; the pattern was hand-rolled inside
 * `CartItemRow` and the grouped-cart-line work needed three more copies, which
 * is the Rule of Three. Every consumer now shares one set of tokens, one
 * clamping rule and one a11y contract.
 *
 * Deliberately NOT built on `<input type="number">`:
 *  - it would trip `audit-raw-form-input` (Rule #9), and
 *  - a free-text numeric field needs its own parse/clamp/validation story on
 *    every call site. Two buttons cannot produce an out-of-range value.
 * If typed entry is ever genuinely wanted, it belongs in a `<Form>` with a
 * `<FieldInput type="number">`, not here.
 *
 * `min` is the meaningful variant between the two line kinds:
 *  - `min={1}` — a normal quantity; you remove the line to get rid of it.
 *  - `min={0}` — a member inside a group line, where 0 legitimately means
 *    "drop this member from my selection".
 */

import React from "react";
import { Button } from "./Button";
import { Row } from "./Layout";
import { Span } from "./Typography";

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Lowest reachable value. See the note above on 0 vs 1. Default 1. */
  min?: number;
  /** Highest reachable value — pass the stock ceiling. Omit for unbounded. */
  max?: number;
  disabled?: boolean;
  /** Dims and blocks interaction while a mutation is in flight. */
  isBusy?: boolean;
  size?: "sm" | "md";
  /** Describes WHAT is being counted, e.g. `Quantity for Dragoon F`. */
  ariaLabel?: string;
  decrementLabel?: string;
  incrementLabel?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  isBusy = false,
  size = "sm",
  ariaLabel,
  decrementLabel = "Decrease quantity",
  incrementLabel = "Increase quantity",
}: QuantityStepperProps) {
  const canDecrement = !disabled && value > min;
  const canIncrement = !disabled && (max === undefined || value < max);

  // Clamp here rather than trusting the caller: every consumer would otherwise
  // re-derive the same two bounds checks in its own handler.
  const step = (delta: number) => {
    const next = value + delta;
    if (next < min) return;
    if (max !== undefined && next > max) return;
    onChange(next);
  };

  return (
    <Row
      gap="sm"
      align="center"
      role="group"
      aria-label={ariaLabel}
      className={`appkit-qty-stepper appkit-qty-stepper--${size}${isBusy ? " appkit-qty-stepper--busy" : ""}`}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        rounded="full"
        onClick={() => step(-1)}
        disabled={!canDecrement}
        aria-label={decrementLabel}
        className="appkit-qty-stepper__btn"
      >
        −
      </Button>
      {/* aria-live so a screen reader announces the new count after a press —
          the buttons themselves keep a static label. */}
      <Span aria-live="polite" className="appkit-qty-stepper__value">
        {value}
      </Span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        rounded="full"
        onClick={() => step(1)}
        disabled={!canIncrement}
        aria-label={incrementLabel}
        className="appkit-qty-stepper__btn"
      >
        +
      </Button>
    </Row>
  );
}
