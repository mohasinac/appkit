"use client";

import React, { useState } from "react";
import { Modal } from "../../../ui/components/Modal";
import { Button } from "../../../ui/components/Button";
import { Row, Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { normalizeError } from "../../../errors/normalize";

/**
 * Set one stock quantity across a selection — C3's bulk stock action.
 *
 * Deliberately a near-copy of `PhysicalLocationModal`'s shape rather than a
 * shared "bulk field" abstraction: two copies is observation, three is a
 * pattern (Duplication Framework, Rule of Three), and the two differ in the one
 * place that matters — this one has to explain reservations.
 */

export interface BulkStockModalProps {
  count: number;
  onSave: (stockQuantity: number) => void | Promise<void>;
  onClose: () => void;
  busy?: boolean;
}

export function BulkStockModal({ count, onSave, onClose, busy = false }: BulkStockModalProps) {
  const [raw, setRaw] = useState("");

  return (
    <Modal isOpen onClose={onClose} title={`Set stock for ${count} listing${count === 1 ? "" : "s"}`}>
      <Form onSubmit={(e) => e.preventDefault()}>
        {({ setFieldError, clearErrors }) => (
          <Stack gap="md">
            <FieldInput
              name="stockQuantity"
              type="number"
              label="Stock quantity"
              required
              min={0}
              value={raw}
              onChange={setRaw}
              placeholder="e.g. 10"
            />
            <Text size="xs" color="muted">
              Applied to every selected listing. Enter 0 to mark them all out of
              stock.
            </Text>

            {/*
              🛑 This paragraph is the reason the modal exists rather than an
              inline prompt. `availableQuantity` is not `stockQuantity` — the
              gap between them is units held by placed-but-unpaid orders — so a
              seller who sets 12 and then sees 9 available has not hit a bug,
              and is otherwise certain to report one.
            */}
            <Text size="xs" color="muted">
              Units already reserved by unpaid orders stay reserved, so a
              listing with 3 held will show 3 fewer as available until those
              orders are paid or they lapse.
            </Text>

            <Row gap="sm" justify="end">
              <Button variant="secondary" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="submit"
                action={ACTIONS.STORE["set-stock"]}
                isLoading={busy}
                onClick={async () => {
                  clearErrors();
                  const n = Number(raw.trim());
                  /*
                   * Mirrors the route's own validation rather than trusting it
                   * to explain itself: a 400 renders as a toast, which loses
                   * which field was wrong. `raw.trim() === ""` is checked
                   * first because `Number("")` is 0 — a silent, plausible,
                   * wrong answer.
                   */
                  if (raw.trim() === "" || !Number.isInteger(n) || n < 0) {
                    setFieldError("stockQuantity", "Enter a whole number of 0 or more.");
                    return;
                  }
                  if (n > 100_000) {
                    setFieldError("stockQuantity", "That looks like a typo — the maximum is 100,000.");
                    return;
                  }
                  /*
                   * 🛑 Caught HERE even though the caller already catches and
                   * toasts. Relying on that is an unwritten contract: a second
                   * caller that lets its promise reject would leave this modal
                   * open, spinning, with no message — and nothing would say so.
                   * The error lands on the field because that is where the user
                   * is looking, matching `PhysicalLocationModal`.
                   */
                  try {
                    await onSave(n);
                  } catch (err) {
                    setFieldError(
                      "stockQuantity",
                      normalizeError(err).message || "Could not set stock. Please try again.",
                    );
                  }
                }}
              >
                Set stock
              </Button>
            </Row>
          </Stack>
        )}
      </Form>
    </Modal>
  );
}
