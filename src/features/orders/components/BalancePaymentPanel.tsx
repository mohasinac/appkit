"use client";

/**
 * D55 — the buyer's panel for paying a pre-order balance.
 *
 * ## 🛑 This exists because the figure was already on screen
 *
 * `OrderProvenanceCard` has printed "Balance due ₹X" on every pre-order since
 * Part 2, and nothing in the product could accept that money. A buyer who
 * reads an amount owed and finds no control does not conclude "the feature is
 * coming" — they conclude the site is broken, and the seller waiting on the
 * money has no way to chase it.
 *
 * ## Why it is NOT a second page
 *
 * The deposit's proof upload is its own route (`/user/orders/[id]/payment`)
 * because it runs against a 15-minute window with a countdown, a UPI address
 * to copy and a fraud declaration — a task with its own screen. The balance
 * has a 7-day window and no countdown, so sending the buyer somewhere else to
 * fill in two fields would add a navigation and a back button for nothing.
 *
 * ## The four states
 *
 * | `balance.status` | What the buyer sees |
 * |---|---|
 * | absent | NOTHING — the seller has not opened collection; the goods do not exist yet |
 * | `awaiting` / `rejected` | the form, with the rejection note when there is one |
 * | `submitted` | "under review", no form |
 * | `paid` | a confirmation line and the reference |
 *
 * 🛑 The absent case rendering nothing is the load-bearing one. A pre-order's
 * premise is that the item has not been made yet, so a payable-looking balance
 * before the seller opens it would be asking the buyer to fund inventory.
 */

import { useState } from "react";
import type { Order } from "../types";
import { Button } from "../../../ui/components/Button";
import { Div, Row, Stack } from "../../../ui/components/Layout";
import { Text, Span } from "../../../ui/components/Typography";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { MediaUploadField } from "../../media/upload/MediaUploadField";
import { balanceProofSchema } from "../schemas/balance";
import { formatCurrency } from "../../../utils/number.formatter";

export interface BalancePaymentPanelProps {
  order: Pick<Order, "id" | "balance" | "currency">;
  /** Uploads one file and resolves to the stored `/media/…` slug. */
  onUpload: (file: File) => Promise<string>;
  /** POSTs to `/api/orders/{id}/balance-proof`. Throws on failure. */
  onSubmit: (input: { proofUrl: string; transactionId: string }) => Promise<void>;
}

function dueText(dueBy?: string): string {
  if (!dueBy) return "";
  const d = new Date(dueBy);
  if (Number.isNaN(d.getTime())) return "";
  return ` Due by ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`;
}

export function BalancePaymentPanel({ order, onUpload, onSubmit }: BalancePaymentPanelProps) {
  const [proofUrl, setProofUrl] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [isPending, setIsPending] = useState(false);

  const balance = order.balance;
  // Nothing to collect yet — see the header. Not an empty card, no card.
  if (!balance) return null;

  const amount = formatCurrency(balance.amount, order.currency);

  if (balance.status === "paid") {
    return (
      <Div surface="card" padding="md" className="mt-4">
        <Span
          layout="inline-flex"
          color="success"
          surface="success-surface"
          weight="semibold"
          className="text-[10px]"
          rounded="full"
          padding="pill-xs"
        >
          Balance paid
        </Span>
        <Text className="mt-1" color="muted" size="xs">
          {amount} received. This order is ready to ship.
          {balance.transactionId ? ` Reference: ${balance.transactionId}` : ""}
        </Text>
      </Div>
    );
  }

  if (balance.status === "submitted") {
    return (
      <Div surface="card" padding="md" className="mt-4">
        <Span
          layout="inline-flex"
          color="info"
          surface="info-surface"
          weight="semibold"
          className="text-[10px]"
          rounded="full"
          padding="pill-xs"
        >
          Balance under review
        </Span>
        <Text className="mt-1" color="muted" size="xs">
          We have your proof for {amount}. Our team checks it against the
          reference you gave, and the order ships once it clears.
        </Text>
      </Div>
    );
  }

  const rejected = balance.status === "rejected";

  const handleSubmit = async () => {
    setIsPending(true);
    try {
      await onSubmit({ proofUrl, transactionId: transactionId.trim() });
    } finally {
      /*
       * Cleared even on failure. The caller surfaces the error; leaving the
       * button spinning forever is how a recoverable 400 reads as a hang.
       */
      setIsPending(false);
    }
  };

  return (
    <Div surface="card" padding="md" className="mt-4">
      <Stack gap="md">
        <Div>
          <Span
            layout="inline-flex"
            color={rejected ? "error" : "warning"}
            surface={rejected ? "danger-surface" : "warning-surface"}
            weight="semibold"
            className="text-[10px]"
            rounded="full"
            padding="pill-xs"
          >
            {rejected ? "Balance proof needs correction" : "Balance due"}
          </Span>
          <Text className="mt-1" color="muted" size="xs">
            {rejected
              ? /*
                 * The note is REQUIRED on a rejection server-side, so the
                 * fallback here should effectively never render — it exists
                 * because a row written before that rule would otherwise say
                 * nothing at all, which is the one thing a rejection must not do.
                 */
                balance.reviewNote
                ? `Our team could not accept the last proof: ${balance.reviewNote}`
                : "Our team could not accept the last proof. Please send a clearer screenshot."
              : `Your item is ready. Pay the remaining ${amount} and upload the receipt.${dueText(balance.dueBy)}`}
          </Text>
        </Div>

        <Form schema={balanceProofSchema} onSubmit={(e) => e.preventDefault()}>
          {() => (
            <Stack gap="md">
              <FormErrorSummary />
              {/*
               * 🛑 `showYoutube` / `showExternal` default to TRUE — without
               * turning them off, "YouTube" and "External URL" are offered as
               * ways to prove a payment. `accept` constrains the file picker
               * only, so it reads like a guarantee and is not one. Proof has
               * to be an artefact we hold, not a link that can 404 after an
               * admin approved money against it.
               */}
              <MediaUploadField
                label="Payment screenshot (JPG/PNG/PDF)"
                value={proofUrl}
                onChange={setProofUrl}
                onUpload={onUpload}
                kind="image"
                accept="image/*,application/pdf"
                showYoutube={false}
                showExternal={false}
                helperText="The confirmation screen from your bank or UPI app."
              />
              <FieldInput
                name="transactionId"
                label="UTR / Transaction reference"
                required
                value={transactionId}
                onChange={(value: string) => setTransactionId(value)}
                placeholder="e.g. 123456789012"
                hint="Required — it is the only thing our team can check the payment against. A screenshot on its own is a picture."
              />
              <Row gap="3">
                <Button
                  type="button"
                  variant="primary"
                  disabled={isPending || !proofUrl || transactionId.trim().length < 4}
                  onClick={handleSubmit}
                  paddingX="md"
                  paddingY="sm"
                  textSize="sm"
                  weight="semibold"
                >
                  {isPending ? "Sending…" : rejected ? "Re-send proof" : "Submit payment proof"}
                </Button>
              </Row>
            </Stack>
          )}
        </Form>
      </Stack>
    </Div>
  );
}
