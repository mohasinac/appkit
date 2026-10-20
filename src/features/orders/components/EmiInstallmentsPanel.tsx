"use client";

import React, { useState } from "react";
import { Badge, Button, Div, Form, Row, Stack, Text, useToast } from "../../../ui";
import { FieldInput } from "../../../ui/forms";
import { formatCurrency } from "../../../utils/number.formatter";
import type { EmiInstallment } from "../schemas/firestore";

/**
 * The buyer's own EMI schedule, with a way to pay any unpaid instalment.
 *
 * 🛑 Why this exists: EMI was write-only from the buyer's side. The schedule
 * was recorded on the order and the only mutator was the SELLER's
 * `markEmiInstallmentPaid`, so a buyer could neither see what was outstanding
 * nor do anything about it — they waited to be chased. `EmiInstallment` has
 * carried `transactionId` and `proofUrl` described as "buyer-uploaded" the
 * whole time, which is the tell that the surface was missing, not the model.
 *
 * 🛑 **Any unpaid instalment is payable, at any time.** There is deliberately
 * no due-date gate: the due date is when we will chase, never the earliest a
 * buyer may pay. Someone clearing the plan early reduces our exposure, and
 * `emiComplete` — which gates shipment — should be able to flip early too.
 * If a bounded window ever seems necessary, that is a policy change and
 * belongs in the action, not re-added here as a disabled button.
 */

/** Derived, never stored — see `submitEmiInstallmentPaymentAction`. */
type InstallmentState = "paid" | "awaiting-review" | "payable";

function stateOf(i: EmiInstallment): InstallmentState {
  if (i.status === "paid") return "paid";
  // A reference the buyer submitted but nobody has confirmed. The status
  // field cannot express this: an instalment is created "pending" and stays
  // "pending" until it is paid, so the presence of a reference is the signal.
  if (i.transactionId) return "awaiting-review";
  return "payable";
}

const STATE_LABEL: Record<InstallmentState, string> = {
  paid: "Paid",
  "awaiting-review": "Awaiting confirmation",
  payable: "Due",
};

export interface EmiInstallmentsPanelProps {
  orderId: string;
  installments: readonly EmiInstallment[];
  /** Sum of unpaid instalments, as recorded on the order. */
  remainingBalance?: number;
  currency?: string;
  /**
   * Submits one instalment. Supplied by the consumer so this component does
   * no fetching of its own — the same slot shape the rest of the orders
   * feature uses.
   */
  onSubmit: (input: { installmentIndex: number; transactionId: string }) => Promise<void>;
}

export function EmiInstallmentsPanel({
  orderId,
  installments,
  remainingBalance,
  currency = "INR",
  onSubmit,
}: EmiInstallmentsPanelProps) {
  const { showToast } = useToast();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const money = (value: number) => formatCurrency(value, currency);
  const ordered = [...installments].sort((a, b) => a.index - b.index);
  const outstanding = ordered.filter((i) => i.status !== "paid").length;

  const submit = async (index: number) => {
    setIsSubmitting(true);
    try {
      await onSubmit({ installmentIndex: index, transactionId: reference.trim() });
      showToast("Payment reference submitted — the seller will confirm it.", "success");
      setOpenIndex(null);
      setReference("");
    } catch {
      // The action's own message is surfaced by the caller's error mapping;
      // this only has to stop the panel pretending the submission landed.
      showToast("Couldn't submit that payment. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Div surface="card" border="default" rounded="lg" padding="md">
      <Stack gap="sm">
        <Row align="center" justify="between" gap="sm">
          <Text weight="semibold">Your EMI plan</Text>
          {remainingBalance !== undefined && remainingBalance > 0 && (
            <Text size="sm" color="muted">
              {money(remainingBalance)} outstanding across {outstanding} instalment
              {outstanding === 1 ? "" : "s"}
            </Text>
          )}
        </Row>

        <Text size="xs" color="muted">
          You can pay any instalment whenever you like, including ahead of its due
          date — paying early settles the plan sooner and does not cost more.
        </Text>

        <Stack gap="xs">
          {ordered.map((inst) => {
            const state = stateOf(inst);
            const due = inst.dueDate ? new Date(inst.dueDate) : null;
            return (
              <Div key={inst.index} border="default" rounded="md" padding="sm">
                <Row align="center" justify="between" gap="sm" className="min-w-0">
                  <Stack gap="xs" className="min-w-0">
                    <Text size="sm" weight="medium">
                      Instalment {inst.index} · {money(inst.amount)}
                    </Text>
                    <Text size="xs" color="muted">
                      {due ? `Due ${due.toLocaleDateString()}` : "No due date recorded"}
                    </Text>
                  </Stack>
                  <Row align="center" gap="xs" className="flex-shrink-0">
                    <Badge variant={state === "paid" ? "success" : state === "awaiting-review" ? "warning" : "default"}>
                      {STATE_LABEL[state]}
                    </Badge>
                    {state === "payable" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setOpenIndex(openIndex === inst.index ? null : inst.index);
                          setReference("");
                        }}
                      >
                        {openIndex === inst.index ? "Cancel" : "Pay now"}
                      </Button>
                    )}
                  </Row>
                </Row>

                {openIndex === inst.index && (
                  <Div className="mt-3">
                    <Form onSubmit={(e: React.FormEvent) => e.preventDefault()}>
                      {() => (
                        <Stack gap="sm">
                          <Text size="xs" color="muted">
                            Transfer {money(inst.amount)} to the seller, then enter the
                            UTR or reference number so they can confirm it.
                          </Text>
                          <FieldInput
                            name={`emi-reference-${orderId}-${inst.index}`}
                            label="UTR / reference number"
                            required
                            value={reference}
                            onChange={setReference}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            isLoading={isSubmitting}
                            disabled={reference.trim().length === 0 || isSubmitting}
                            onClick={() => { void submit(inst.index); }}
                          >
                            Submit payment reference
                          </Button>
                        </Stack>
                      )}
                    </Form>
                  </Div>
                )}
              </Div>
            );
          })}
        </Stack>
      </Stack>
    </Div>
  );
}
