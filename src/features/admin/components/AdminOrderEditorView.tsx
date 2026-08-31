"use client";

import { OrderAddonBadges, type OrderAddonBadgesOrder } from "../../orders/components/OrderAddonBadges";
import { isManualPaymentMethod } from "../../orders/constants/payment-window";
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
import {
  adminOrderUpdateSchema,
  type AdminOrderUpdateValues,
} from "../schemas/admin-ops-forms";
import {
  SectionForm,
  useSectionFormNav,
  buildSectionsFromSchema,
  visibleValues,
} from "../../shell";
import { useFormShellState, FormShellContext } from "../../../ui/forms";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { ValidationError } from "../../../errors/validation-error";

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
  /**
   * Which way a prior review went, if any. Without this the panel cannot tell
   * "awaiting verification" from "already rejected" and re-offers live
   * Verify/Reject buttons on a decided order.
   */
  paymentReviewOutcome?: string;
  /**
   * Paid add-ons + applied coupon for this order. Operational, not decorative:
   * `whatsappNotifyAddon` is who a status change should message, and the
   * coupon is what an admin needs when reconciling a discounted order.
   */
  addons?: OrderAddonBadgesOrder;
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
  paymentReviewOutcome,
  addons,
}: AdminOrderEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [draft, setDraft] = React.useState<AdminOrderUpdateValues>({
    status: (currentStatus ?? "pending") as AdminOrderUpdateValues["status"],
    trackingNumber: "",
    carrier: "",
    notes: "",
  });
  /*
   * `refundAmount` carries a `when` in the schema — it is only meaningful on a
   * refunding status — so the control appears and disappears with the status
   * select, and `visibleValues()` drops the value when it disappears. The page
   * used to gate the input with the same condition written a second time in
   * JSX; now the schema is the single place that rule lives.
   */
  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<AdminOrderUpdateValues>(adminOrderUpdateSchema, {
        options: { status: STATUS_OPTIONS, carrier: CARRIER_OPTIONS },
      }),
    [],
  );
  const nav = useSectionFormNav(sections, draft, { scope: "admin:order-editor" });
  const form = useFormShellState(adminOrderUpdateSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  /*
   * 🛑 `reviewNote` belongs to the PAYMENT REVIEW actions, not to "Save
   * changes". It is not in `adminOrderUpdateSchema` and never reaches the
   * order-update payload — an admin who typed a note and pressed Save lost it
   * silently. The label and the panel heading now say which buttons consume it;
   * the structural fix (two forms, two surfaces) is the tabbing in W8.
   */
  const [reviewNote, setReviewNote] = React.useState("");
  const [reviewNoteError, setReviewNoteError] = React.useState<string | null>(null);
  const [isRequestingReupload, setIsRequestingReupload] = useState(false);
  const [isRejectingFraud, setIsRejectingFraud] = useState(false);

  // This used to inline `paymentMethod === "cash" || === "upi_manual"`, which
  // omitted `emi` — so the whole proof panel never rendered for an EMI order and
  // an admin had no way to verify one, even though the list row said "Awaiting
  // verification". Use the shared predicate, which is the single source of truth
  // for the manual-payment set.
  const isManualPayment = isManualPaymentMethod(paymentMethod ?? "");
  const isVerified = paymentStatus === "paid";
  const isRejected = paymentReviewOutcome === "rejected_fraud";
  const isReuploadRequested = paymentReviewOutcome === "reupload_requested";
  // Only an undecided, unpaid manual order is actionable. Gating on
  // `paymentStatus === "pending"` alone re-offered live Verify/Reject buttons on
  // an order that had already been rejected or sent back for re-upload.
  const needsVerification =
    isManualPayment && !isVerified && !isRejected && Boolean(paymentProofUrl);

  React.useEffect(() => {
    if (open) {
      setDraft({
        status: (currentStatus ?? "pending") as AdminOrderUpdateValues["status"],
        trackingNumber: "",
        carrier: "",
        notes: "",
      });
      setReviewNote("");
    }
  }, [open, currentStatus]);

  const saveMutation = useApiMutation({
    errorMessage: "Failed to update order.",
    mutationFn: async () => {
      // Built from `visibleValues`, so a refund amount typed and then hidden by
      // a status change cannot travel with the request.
      const v = visibleValues(adminOrderUpdateSchema, draft) as AdminOrderUpdateValues;
      const payload: FirestoreDocument = {
        status: v.status,
        notes: v.notes || undefined,
      };
      if (v.trackingNumber) payload.trackingNumber = v.trackingNumber;
      if (v.carrier) payload.carrier = v.carrier;
      if (v.refundAmount !== undefined && String(v.refundAmount).trim() !== "") {
        /*
         * Parsed through the schema, which coerces, requires > 0 and caps the
         * magnitude. It used to be `parseFloat` guarded by `!isNaN && > 0` with
         * no else — so typing "abc" or "-5" DROPPED the refund silently and the
         * save reported success with nothing recorded. A refund that does not
         * parse must stop the save, not disappear from it.
         */
        const parsed = adminOrderUpdateSchema.shape.refundAmount.safeParse(v.refundAmount);
        if (!parsed.success) {
          throw new ValidationError(
            parsed.error.issues[0]?.message ?? "Enter the refund amount as a number.",
          );
        }
        payload.refundAmount = Math.round((parsed.data as number) * 100) / 100;
      }
      await apiClient.patch(ADMIN_ENDPOINTS.ORDER_BY_ID(orderId!), payload);
    },
    onSuccess: () => {
      showToast("Order updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      onClose();
    },
  });

  /** Typing clears the "note required" error the two review actions raise. */
  const handleReviewNoteChange = (value: string) => {
    setReviewNote(value);
    if (reviewNoteError) setReviewNoteError(null);
  };

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
      showToast("Failed to verify payment.", "error");
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const handleRequestReupload = async () => {
    if (!orderId) return;
    // Both review actions used to `return` silently on an empty note, so the
    // button did nothing and said nothing. Say what is missing.
    if (!reviewNote.trim()) {
      setReviewNoteError("Write a note explaining what the buyer needs to re-upload.");
      return;
    }
    setReviewNoteError(null);
    setIsRequestingReupload(true);
    try {
      await apiClient.patch(ADMIN_ENDPOINTS.ORDER_PAYMENT_REUPLOAD(orderId), { note: reviewNote });
      showToast("Re-upload requested. The buyer has 15 more minutes.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      onClose();
    } catch (err) {
      void normalizeError(err);
      // Authored copy. `err.message` is server text — Root Cause #86.
      showToast("Failed to request re-upload.", "error");
    } finally {
      setIsRequestingReupload(false);
    }
  };

  const handleRejectFraud = async () => {
    if (!orderId) return;
    if (!reviewNote.trim()) {
      setReviewNoteError("Record why this payment is being rejected as fraud.");
      return;
    }
    setReviewNoteError(null);
    setIsRejectingFraud(true);
    try {
      await apiClient.patch(ADMIN_ENDPOINTS.ORDER_PAYMENT_REJECT_FRAUD(orderId), { note: reviewNote });
      showToast("Order cancelled and account suspended for 7 days.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      onClose();
    } catch (err) {
      void normalizeError(err);
      showToast("Failed to reject payment.", "error");
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
      <FormShellContext.Provider value={form.shellCtx}>
      <Stack gap="md" padding="md">
      <FormErrorSummary />
        {addons && <OrderAddonBadges order={addons} variant="detail" />}
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

        <SectionForm<AdminOrderUpdateValues>
          sections={sections}
          values={draft}
          onChange={(partial) => setDraft((d) => ({ ...d, ...partial }))}
          onSubmit={() => {
            // SectionForm surfaces errors and then submits regardless, so the
            // guard is here.
            form.clearErrors();
            const parsed = adminOrderUpdateSchema.safeParse(
              visibleValues(adminOrderUpdateSchema, draft),
            );
            if (!parsed.success) {
              applyZodIssues(parsed.error.issues, form.setFieldError);
              return;
            }
            saveMutation.mutate();
          }}
          onValidationChange={() => form.validate(draft)}
          schema={adminOrderUpdateSchema}
          openIds={nav.openIds}
          onOpenChange={nav.setOpenIds}
          submitLabel="Save changes"
          cancelLabel="Cancel"
          onCancel={onClose}
          isLoading={saveMutation.isPending}
          /*
           * The pinned mobile bar suppresses itself inside a SideDrawer anyway
           * (an overlay owns its own footer, and a viewport-fixed bar would
           * render behind the backdrop) — stated here so the omission reads as
           * a decision rather than an oversight.
           */
        />

        {isManualPayment && (
          <Stack gap="xs">
            <Label size="sm" weight="medium" color="primary">Payment Proof</Label>
            {isRejected && (
              <Text size="xs" className="text-error" weight="medium">
                Payment rejected as fraud — no further action available here.
              </Text>
            )}
            {isReuploadRequested && !isVerified && (
              <Text size="xs" className="text-warning" weight="medium">
                Re-upload requested — waiting for the buyer to submit a new proof.
              </Text>
            )}
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
                        Review note
                      </Label>
                      {/*
                        Says which buttons consume it. It is NOT part of "Save
                        changes" — that saves the order fields above and has
                        never carried this note.
                      */}
                      <Text size="xs" color="muted">
                        Sent with <Text as="span" size="xs" weight="medium">Request re-upload</Text> or{" "}
                        <Text as="span" size="xs" weight="medium">Reject as fraud</Text> below. Not saved by
                        &ldquo;Save changes&rdquo;.
                      </Text>
                      <Textarea
                        value={reviewNote}
                        onChange={(e) => handleReviewNoteChange(e.target.value)}
                        rows={2}
                        aria-invalid={reviewNoteError ? true : undefined}
                        placeholder="e.g. Screenshot is blurry — amount not readable / UPI ID doesn't match order"
                      />
                      {reviewNoteError && (
                        <Text size="xs" color="error" role="alert">{reviewNoteError}</Text>
                      )}
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
                      disabled={isRequestingReupload}
                      variant="secondary"
                      className="w-full"
                    />
                    <Button
                      type="button"
                      action={ACTIONS.ADMIN["reject-payment-fraud"]}
                      onClick={handleRejectFraud}
                      isLoading={isRejectingFraud}
                      disabled={isRejectingFraud}
                      variant="danger"
                      className="w-full"
                    />
                  </Stack>
                )}
                {isVerified && (
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

      </Stack>
      </FormShellContext.Provider>
    </SideDrawer>
  );
}
