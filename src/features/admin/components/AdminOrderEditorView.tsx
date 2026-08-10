"use client";

import { useApiMutation, type FirestoreDocument } from "@mohasinac/appkit/client";
import React, { useState } from "react";
import { normalizeError } from "../../../errors/normalize";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Div, Form, FormActions, Input, Label, Select, SideDrawer, Stack, Text, useToast } from "../../../ui";
import { MediaImage } from "../../media";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";

// --- Types -------------------------------------------------------------------

export interface AdminOrderEditorViewProps {
  open: boolean;
  onClose: () => void;
  orderId?: string;
  orderLabel?: string;
  currentStatus?: string;
  paymentProofUrl?: string;
  paymentTransactionId?: string;
  paymentMethod?: string;
  paymentStatus?: string;
}

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Refunded", value: "refunded" },
  { label: "Return requested", value: "return_requested" },
];

const CARRIER_OPTIONS = [
  { label: "Select carrier…", value: "" },
  { label: "Delhivery", value: "Delhivery" },
  { label: "BlueDart", value: "BlueDart" },
  { label: "DTDC", value: "DTDC" },
  { label: "Ekart", value: "Ekart" },
  { label: "India Post", value: "India Post" },
  { label: "Other", value: "Other" },
];

// --- Component ---------------------------------------------------------------

export function AdminOrderEditorView({
  open,
  onClose,
  orderId,
  orderLabel,
  currentStatus,
  paymentProofUrl,
  paymentTransactionId,
  paymentMethod,
  paymentStatus,
}: AdminOrderEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [status, setStatus] = React.useState(currentStatus ?? "pending");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [carrier, setCarrier] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [refundAmount, setRefundAmount] = React.useState("");
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const isCashOrUpi = paymentMethod === "cash" || paymentMethod === "upi_manual";
  const needsVerification = isCashOrUpi && paymentStatus === "pending";

  React.useEffect(() => {
    if (open) {
      setStatus(currentStatus ?? "pending");
      setTrackingNumber("");
      setCarrier("");
      setNotes("");
      setRefundAmount("");
    }
  }, [open, currentStatus]);

  const saveMutation = useApiMutation({
    mutationFn: async () => {
      const payload: FirestoreDocument = {
        status,
        notes: notes || undefined,
      };
      if (trackingNumber) payload.trackingNumber = trackingNumber;
      if (carrier) payload.carrier = carrier;
      if (refundAmount) {
        const paise = Math.round(parseFloat(refundAmount) * 100);
        if (!isNaN(paise) && paise > 0) payload.refundAmount = paise;
      }
      await apiClient.patch(ADMIN_ENDPOINTS.ORDER_BY_ID(orderId!), payload);
    },
    onSuccess: () => {
      showToast("Order updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      onClose();
    },
    onError: (err: Error) => {
      showToast((err as Error)?.message ?? "Failed to update order.", "error");
    },
  });

  const handleVerifyPayment = async () => {
    if (!orderId) return;
    setIsVerifyingPayment(true);
    try {
      await apiClient.patch(`/api/admin/orders/${orderId}/payment-verify`, {});
      showToast("Payment verified. Order moved to Processing.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      onClose();
    } catch (err) {
      void normalizeError(err);
      showToast((err as Error)?.message ?? "Failed to verify payment.", "error");
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  return (
    <SideDrawer
      isOpen={open}
      onClose={onClose}
      title={orderLabel ? `Order: ${orderLabel}` : "Update Order"}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }} spacing="md" padding="md">
        <Select
          label="Order status"
          options={STATUS_OPTIONS}
          value={status}
          onValueChange={setStatus}
        />

        <Input
          label="Tracking number (optional)"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="e.g. DEL1234567890IN"
        />

        <Select
          label="Carrier (optional)"
          options={CARRIER_OPTIONS}
          value={carrier}
          onValueChange={setCarrier}
        />

        <Stack gap="xs">
          <Label size="sm" weight="medium" color="primary">
            Internal note (optional)
          </Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Reason for status change, escalation notes…"
            className="w-full rounded-lg border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] text-[var(--appkit-color-text)] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </Stack>

        {(status === "refunded" || status === "return_requested") && (
          <Input
            label="Refund amount ₹ (optional)"
            type="number"
            min="0"
            step="0.01"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder="e.g. 499.00"
          />
        )}

        {isCashOrUpi && (
          <Stack gap="xs">
            <Label size="sm" weight="medium" color="primary">Payment Proof</Label>
            {paymentProofUrl ? (
              <Stack gap="xs">
                <Div border="default" rounded="lg" overflow="hidden">
                  <MediaImage
                    src={paymentProofUrl}
                    alt="Payment screenshot"
                    size="card"
                  />
                </Div>
                {paymentTransactionId && (
                  <Text size="xs" color="muted">UTR: <Text as="span" size="xs" weight="medium">{paymentTransactionId}</Text></Text>
                )}
                {needsVerification && (
                  <Button
                    type="button"
                    action={ACTIONS.ADMIN["verify-payment"]}
                    onClick={handleVerifyPayment}
                    isLoading={isVerifyingPayment}
                    disabled={isVerifyingPayment}
                    variant="primary"
                    className="mt-1 w-full"
                  />
                )}
                {!needsVerification && paymentStatus === "paid" && (
                  <Div rounded="lg" padding="inlineSm" className="border border-success/20" surface="success-surface">
                    <Text size="xs" className="text-success" weight="medium">Payment verified</Text>
                  </Div>
                )}
              </Stack>
            ) : (
              <Text size="xs" color="faint">No proof uploaded yet.</Text>
            )}
          </Stack>
        )}

        <FormActions align="right">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={saveMutation.isPending}
            disabled={!orderId || saveMutation.isPending}
          >
            Save changes
          </Button>
        </FormActions>
      </Form>
    </SideDrawer>
  );
}
