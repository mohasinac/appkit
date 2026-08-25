"use client";

/**
 * AdminPayoutMarkPaidModal — the single "mark payout as paid" form + mutation,
 * shared by the payouts list row action and the standalone payout detail
 * page so the two surfaces can't drift (same class of fix as
 * SellerOrderDetailPanel for orders — see CLAUDE.md Root Cause list).
 */

import { useState } from "react";
import { useApiMutation } from "@mohasinac/appkit/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Form, FormActions, Input, Modal, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { payoutMarkPaidSchema } from "../schemas/small-forms";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { applyZodIssues } from "../../../ui/forms/FormShell";

export interface AdminPayoutMarkPaidModalProps {
  isOpen: boolean;
  payoutId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdminPayoutMarkPaidModal({ isOpen, payoutId, onClose, onSuccess }: AdminPayoutMarkPaidModalProps) {
  const [transactionId, setTransactionId] = useState("");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const markPaid = useApiMutation({
    mutationFn: () => {
      if (!payoutId) throw new Error("No payout selected");
      return apiClient.patch(ADMIN_ENDPOINTS.PAYOUT_BY_ID(payoutId), {
        status: "paid",
        transactionId: transactionId.trim() || undefined,
      });
    },
    onSuccess: () => {
      showToast("Payout marked as paid.", "success");
      setTransactionId("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "payouts", "listing"] });
      onSuccess?.();
      onClose();
    },
    onError: () => {
      showToast("Failed to update payout.", "error");
    },
  });

  const handleClose = () => {
    setTransactionId("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Mark payout as paid">
      <Form
        schema={payoutMarkPaidSchema}
        onSubmit={(e) => e.preventDefault()}
        spacing="md"
      >
        {({ setFieldError, clearErrors }) => (
          <>
            <FormErrorSummary />
            <FieldInput
              name="transactionId"
              label="Transaction / reference ID"
              required
              value={transactionId}
              onChange={setTransactionId}
              placeholder="UTR, UPI ref, or bank transfer ID"
            />
            <FormActions align="right">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={markPaid.isPending}
                onClick={() => {
                  clearErrors();
                  // The reference used to be optional and its placeholder even
                  // said so — which left payouts marked paid with nothing to
                  // reconcile them against.
                  const parsed = payoutMarkPaidSchema.safeParse({ transactionId });
                  if (!parsed.success) {
                    applyZodIssues(parsed.error.issues, setFieldError);
                    return;
                  }
                  markPaid.mutate();
                }}
              >
                {markPaid.isPending ? "Saving..." : "Confirm paid"}
              </Button>
            </FormActions>
          </>
        )}
      </Form>
    </Modal>
  );
}
