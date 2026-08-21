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
        onSubmit={(e) => {
          e.preventDefault();
          markPaid.mutate();
        }} spacing="md">
        <Input
          label="Transaction / reference ID"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          placeholder="UTR, UPI ref, or bank transfer ID (optional)"
        />
        <FormActions align="right">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={markPaid.isPending}>
            {markPaid.isPending ? "Saving..." : "Confirm paid"}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
}
