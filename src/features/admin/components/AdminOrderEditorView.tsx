"use client";

import { useApiMutation, type FirestoreDocument } from "@mohasinac/appkit/client";
import React, { useState } from "react";
import { normalizeError } from "../../../errors/normalize";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Div, Form, FormActions, Input, Label, Select, SideDrawer, Stack, Text, Textarea, useToast } from "../../../ui";
import { MediaImage } from "../../media";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { toCurrency } from "../hooks/useAdminListingData";

// --- Types -------------------------------------------------------------------

export interface AdminOrderItemRow {
  productId: string;
  title: string;
  image?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface AdminOrderEditorViewProps {
  open: boolean;
  onClose: () => void;
  orderId?: string;
  orderLabel?: string;
  currentStatus?: string;
  items?: AdminOrderItemRow[];
  paymentProofUrl?: string;
  paymentTransactionId?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  displayedUpiId?: string;
  buyerReportedUpiId?: string;
  paymentUpiMismatch?: boolean;
  buyerMarkedPaid?: boolean;
  buyerFraudAgreementAccepted?: boolean;
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
  items,
  paymentProofUrl,
  paymentTransactionId,
  paymentMethod,
  paymentStatus,
  displayedUpiId,
  buyerReportedUpiId,
  paymentUpiMismatch,
  buyerMarkedPaid,
  buyerFraudAgreementAccepted,
}: AdminOrderEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [status, setStatus] = React.useState(currentStatus ?? "pending");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [carrier, setCarrier] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [refundAmount, setRefundAmount] = React.useState("");
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [reviewNote, setReviewNote] = React.useState("");
  const [isRequestingReupload, setIsRequestingReupload] = useState(false);
  const [isRejectingFraud, setIsRejectingFraud] = useState(false);

  const isCashOrUpi = paymentMethod === "cash" || paymentMethod === "upi_manual";
  const needsVerification = isCashOrUpi && paymentStatus === "pending";

  React.useEffect(() => {
    if (open) {
      setStatus(currentStatus ?? "pending");
      setTrackingNumber("");
      setCarrier("");
      setNotes("");
      setRefundAmount("");
      setReviewNote("");
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
        const amount = Math.round(parseFloat(refundAmount) * 100) / 100;
        if (!isNaN(amount) && amount > 0) payload.refundAmount = amount;
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
      await apiClient.patch(ADMIN_ENDPOINTS.ORDER_PAYMENT_VERIFY(orderId), {});
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

  const handleRequestReupload = async () => {
    if (!orderId || !reviewNote.trim()) return;
    setIsRequestingReupload(true);
    try {
      await apiClient.patch(ADMIN_ENDPOINTS.ORDER_PAYMENT_REUPLOAD(orderId), { note: reviewNote });
      showToast("Re-upload requested. The buyer has 15 more minutes.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      onClose();
    } catch (err) {
      void normalizeError(err);
      showToast((err as Error)?.message ?? "Failed to request re-upload.", "error");
    } finally {
      setIsRequestingReupload(false);
    }
  };

  const handleRejectFraud = async () => {
    if (!orderId || !reviewNote.trim()) return;
    setIsRejectingFraud(true);
    try {
      await apiClient.patch(ADMIN_ENDPOINTS.ORDER_PAYMENT_REJECT_FRAUD(orderId), { note: reviewNote });
      showToast("Order cancelled and account suspended for 7 days.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      onClose();
    } catch (err) {
      void normalizeError(err);
      showToast((err as Error)?.message ?? "Failed to reject payment.", "error");
    } finally {
      setIsRejectingFraud(false);
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
        {items && items.length > 0 && (
          <Stack gap="xs">
            <Label size="sm" weight="medium" color="primary">
              Items ({items.length})
            </Label>
            <Div className="divide-y divide-[var(--appkit-color-border)] border border-[var(--appkit-color-border)]" rounded="lg">
              {items.map((item, i) => (
                <Div key={item.productId || i} layout="flex" align="center" gap="3" padding="sm">
                  <Div className="h-10 w-10 shrink-0" rounded="md" overflow="hidden">
                    <MediaImage src={item.image} alt={item.title} size="thumbnail" />
                  </Div>
                  <Div className="min-w-0 flex-1">
                    <Text size="sm" className="truncate" weight="medium">{item.title}</Text>
                    <Text size="xs" color="muted">Qty: {item.quantity} × {toCurrency(item.unitPrice)}</Text>
                  </Div>
                  <Text size="sm" className="shrink-0" weight="semibold">{toCurrency(item.totalPrice)}</Text>
                </Div>
              ))}
            </Div>
          </Stack>
        )}

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
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Reason for status change, escalation notes…"
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
                  <Stack gap="xs">
                    {(displayedUpiId || buyerReportedUpiId) && (
                      <Stack gap="xs">
                        <Text size="xs" color="muted">
                          Expected UPI: <Text as="span" size="xs" weight="medium">{displayedUpiId || "—"}</Text>
                          {" · "}Buyer reported: <Text as="span" size="xs" weight="medium">{buyerReportedUpiId || "—"}</Text>
                        </Text>
                        {paymentUpiMismatch && (
                          <Div rounded="lg" padding="inlineSm" className="border border-error/20" surface="danger-surface">
                            <Text size="xs" className="text-error" weight="semibold">
                              UPI mismatch — buyer-reported ID doesn't match the one shown for this order.
                            </Text>
                          </Div>
                        )}
                      </Stack>
                    )}
                    <Text size="xs" color="muted">
                      Buyer marked as paid: <Text as="span" size="xs" weight="medium">{buyerMarkedPaid ? "Yes" : "No"}</Text>
                      {" · "}Fraud agreement accepted: <Text as="span" size="xs" weight="medium">{buyerFraudAgreementAccepted ? "Yes" : "No"}</Text>
                    </Text>
                    <Stack gap="xs">
                      <Label size="sm" weight="medium" color="primary">
                        Review note (required for re-upload / reject)
                      </Label>
                      <Textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        rows={2}
                        placeholder="e.g. Screenshot is blurry — amount not readable / UPI ID doesn't match order"
                      />
                    </Stack>
                    <Button
                      type="button"
                      action={ACTIONS.ADMIN["verify-payment"]}
                      onClick={handleVerifyPayment}
                      isLoading={isVerifyingPayment}
                      disabled={isVerifyingPayment}
                      variant="primary"
                      className="w-full"
                    />
                    <Button
                      type="button"
                      action={ACTIONS.ADMIN["request-payment-reupload"]}
                      onClick={handleRequestReupload}
                      isLoading={isRequestingReupload}
                      disabled={isRequestingReupload || !reviewNote.trim()}
                      variant="secondary"
                      className="w-full"
                    />
                    <Button
                      type="button"
                      action={ACTIONS.ADMIN["reject-payment-fraud"]}
                      onClick={handleRejectFraud}
                      isLoading={isRejectingFraud}
                      disabled={isRejectingFraud || !reviewNote.trim()}
                      variant="danger"
                      className="w-full"
                    />
                  </Stack>
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
