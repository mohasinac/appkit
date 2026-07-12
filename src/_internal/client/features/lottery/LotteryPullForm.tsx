"use client";

import React, { useState } from "react";
import {
  Stack,
  Row,
  Text,
  Heading,
  Span,
} from "../../../../ui";
import { Form, FieldInput, Button } from "../../../../ui";
import type { UseFormShellStateResult } from "../../../../ui/forms";
import { useApiMutation } from "../../../../client/api/useApiMutation";
import { apiClient } from "../../../../http";

interface LotteryPullFormProps {
  sourceType: "event" | "product";
  eventId?: string;
  productId?: string;
  totalSlots: number;
  maxPullsPerUser: number;
  onSuccess?: (result: { userLotteryNumber: number; assignedPrizeSlotNumber: number; slotName: string }) => void;
}

interface PullResult {
  userLotteryNumber: number;
  assignedPrizeSlotNumber: number;
  slotName: string;
}

/**
 * User-facing lottery pull form.
 * Submits TX ID + phone + payment time + item number.
 * On success, shows the user their lottery number and assigned prize slot.
 */
export function LotteryPullForm({
  sourceType,
  eventId,
  productId,
  totalSlots,
  maxPullsPerUser: _maxPullsPerUser,
  onSuccess,
}: LotteryPullFormProps) {
  const [result, setResult] = useState<PullResult | null>(null);

  const [transactionId, setTransactionId] = useState("");
  const [paymentTime, setPaymentTime] = useState("");
  const [itemNumber, setItemNumber] = useState("");
  const [userPhone, setUserPhone] = useState("");

  const apiRoute =
    sourceType === "event"
      ? `/api/events/${eventId ?? ""}/lottery-pull`
      : `/api/products/${productId ?? ""}/lottery-pull`;

  const mutation = useApiMutation<{ data: PullResult }, Error, void>({
    mutationFn: () =>
      apiClient.post<{ data: PullResult }>(apiRoute, {
        sourceType,
        ...(sourceType === "event" ? { eventId } : { productId }),
        transactionId,
        paymentTime: new Date(paymentTime).toISOString(),
        purchasedItemNumber: parseInt(itemNumber, 10),
        userPhone,
      }),
    successMessage: "Your lottery entry has been submitted!",
    onSuccess: (data) => {
      if (data.data) {
        setResult(data.data);
        onSuccess?.(data.data);
      }
    },
  });

  if (result) {
    return (
      <Stack
        gap="sm"
        padding="md"
        rounded="2xl"
        surface="success-surface"
        className="border border-success/20"
      >
        <Row align="center" gap="sm">
          <Span
            layout="inline-flex"
            color="inverse"
            weight="semibold"
            className="bg-success text-[11px] tracking-wide"
            padding="pill-sm"
            rounded="full"
            transform="uppercase"
          >
            Entry Confirmed
          </Span>
          <Heading level={2} className="text-success" size="lg" weight="bold">
            You&apos;re #{result.userLotteryNumber}!
          </Heading>
        </Row>
        <Text className="text-success" size="sm">
          You&apos;ve been assigned{" "}
          <Span weight="bold">Slot #{result.assignedPrizeSlotNumber}</Span>
          {result.slotName ? ` — ${result.slotName}` : ""}. Good luck!
        </Text>
      </Stack>
    );
  }

  return (
    <Form onSubmit={(e) => e.preventDefault()} className="space-y-4">
      {({ setFieldError, clearErrors }: UseFormShellStateResult) => (
        <Stack gap="md">
          <Heading level={3} size="lg" weight="semibold">
            Submit Your Entry
          </Heading>
          <Text size="sm" color="muted">
            Enter your UPI Transaction ID and payment details to claim your slot.
          </Text>

          <FieldInput
            name="transactionId"
            label="Transaction ID (UPI Ref / Payment Ref)"
            placeholder="e.g. 123456789012"
            required
            value={transactionId}
            onChange={(v: string) => { setTransactionId(v); clearErrors(); }}
          />

          <FieldInput
            name="paymentTime"
            label="Payment Date & Time"
            type="datetime-local"
            required
            value={paymentTime}
            onChange={(v: string) => { setPaymentTime(v); clearErrors(); }}
          />

          <FieldInput
            name="itemNumber"
            label={`Slot Number (1 – ${totalSlots})`}
            type="number"
            placeholder={`Enter a number between 1 and ${totalSlots}`}
            required
            value={itemNumber}
            onChange={(v: string) => { setItemNumber(v); clearErrors(); }}
          />

          <FieldInput
            name="userPhone"
            label="Your Phone Number"
            type="tel"
            placeholder="e.g. 9876543210"
            required
            value={userPhone}
            onChange={(v: string) => { setUserPhone(v); clearErrors(); }}
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={mutation.isPending}
            onClick={() => {
              clearErrors();
              const num = parseInt(itemNumber, 10);
              let valid = true;
              if (!transactionId || transactionId.length < 4) {
                setFieldError("transactionId", "Transaction ID must be at least 4 characters");
                valid = false;
              }
              if (!paymentTime) {
                setFieldError("paymentTime", "Payment date & time is required");
                valid = false;
              }
              if (isNaN(num) || num < 1 || num > totalSlots) {
                setFieldError("itemNumber", `Slot number must be between 1 and ${totalSlots}`);
                valid = false;
              }
              if (!userPhone || userPhone.replace(/\D/g, "").length < 10) {
                setFieldError("userPhone", "Enter a valid phone number (minimum 10 digits)");
                valid = false;
              }
              if (valid) mutation.mutate();
            }}
            className="w-full"
          >
            {mutation.isPending ? "Submitting…" : "Submit Entry"}
          </Button>
        </Stack>
      )}
    </Form>
  );
}
