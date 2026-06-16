"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Div, Form, FormActions, Input, Label, Select, SideDrawer, Stack, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

// --- Types -------------------------------------------------------------------

export interface AdminOrderEditorViewProps {
  open: boolean;
  onClose: () => void;
  orderId?: string;
  orderLabel?: string;
  currentStatus?: string;
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
}: AdminOrderEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [status, setStatus] = React.useState(currentStatus ?? "pending");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [carrier, setCarrier] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [refundAmount, setRefundAmount] = React.useState("");

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
      const payload: Record<string, unknown> = {
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
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to update order.", "error");
    },
  });

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
        }}
        className="p-4" spacing="md"
      >
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
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
