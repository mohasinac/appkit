"use client";

/**
 * User-facing lottery pull form — claim a slot with a UPI reference.
 *
 * Fields come from `lotteryPullSchema`. Two need a `renderers` entry because
 * their labels depend on `totalSlots`, which a static annotation cannot know,
 * and one needs `datetime-local` rather than a plain date.
 *
 * ## The upper bound stays a runtime check, on purpose
 *
 * `purchasedItemNumber` is `.min(1)` in the schema and has no `.max()`: the
 * ceiling is `totalSlots`, a prop that varies per lottery. A schema shared with
 * the route cannot carry it, so it is checked after the parse rather than
 * pretended into the annotation. Everything else the hand-written validation
 * used to duplicate — the reference length, the phone shape, the date — now
 * comes from the schema, which is where those rules already lived.
 */

import React, { useMemo, useState } from "react";

import { useApiMutation } from "../../../../client/api/useApiMutation";
import { lotteryPullSchema } from "../../../../features/admin/schemas/admin-user-form";
import { buildSectionsFromSchema } from "../../../../features/shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../../../features/shell/SectionForm";
import { apiClient } from "../../../../http";
import { FieldInput, Heading, Row, Span, Stack, Text } from "../../../../ui";
import { applyZodIssues } from "../../../../ui/forms/apply-zod-issues";
import { FormErrorSummary } from "../../../../ui/forms/FormErrorSummary";
import { FormShellContext, useFormShellState } from "../../../../ui/forms/FormShell";

interface LotteryPullFormProps {
  sourceType: "event" | "product";
  eventId?: string;
  productId?: string;
  totalSlots: number;
  maxPullsPerUser: number;
  onSuccess?: (result: {
    userLotteryNumber: number;
    assignedPrizeSlotNumber: number;
    slotName: string;
  }) => void;
}

interface PullResult {
  userLotteryNumber: number;
  assignedPrizeSlotNumber: number;
  slotName: string;
}

interface Values {
  [key: string]: unknown;
  sourceType: "event" | "product";
  transactionId: string;
  paymentTime: string;
  purchasedItemNumber: string;
  userPhone: string;
}

export function LotteryPullForm({
  sourceType,
  eventId,
  productId,
  totalSlots,
  maxPullsPerUser,
  onSuccess,
}: LotteryPullFormProps) {
  const [result, setResult] = useState<PullResult | null>(null);
  const [form, setForm] = useState<Values>({
    sourceType,
    transactionId: "",
    paymentTime: "",
    purchasedItemNumber: "",
    userPhone: "",
  });

  const apiRoute =
    sourceType === "event"
      ? `/api/events/${eventId ?? ""}/lottery-pull`
      : `/api/products/${productId ?? ""}/lottery-pull`;

  const sections = useMemo(
    () =>
      buildSectionsFromSchema<Values>(lotteryPullSchema, {
        renderers: {
          paymentTime: ({ values, onChange, errors }) => (
            <FieldInput
              name="paymentTime"
              label="Payment Date & Time"
              // `datetime-local`, not `date` — the pull is matched against a
              // bank timestamp, so the time of day is part of the evidence.
              type="datetime-local"
              required
              value={values.paymentTime as string}
              error={errors.paymentTime}
              onChange={(v: string) => onChange({ paymentTime: v })}
            />
          ),
          purchasedItemNumber: ({ values, onChange, errors }) => (
            <FieldInput
              name="purchasedItemNumber"
              label={`Slot Number (1 – ${totalSlots})`}
              type="number"
              placeholder={`Enter a number between 1 and ${totalSlots}`}
              required
              value={values.purchasedItemNumber as string}
              error={errors.purchasedItemNumber}
              onChange={(v: string) => onChange({ purchasedItemNumber: v })}
            />
          ),
        },
      }),
    [totalSlots],
  );

  const nav = useSectionFormNav(sections, form, { scope: "lottery:pull" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(lotteryPullSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const mutation = useApiMutation<{ data: PullResult }, Error, void>({
    errorMessage: "Could not submit your entry.",
    mutationFn: () =>
      apiClient.post<{ data: PullResult }>(apiRoute, {
        sourceType,
        ...(sourceType === "event" ? { eventId } : { productId }),
        transactionId: form.transactionId,
        paymentTime: new Date(form.paymentTime).toISOString(),
        purchasedItemNumber: parseInt(form.purchasedItemNumber, 10),
        userPhone: form.userPhone,
      }),
    successMessage: "Your lottery entry has been submitted!",
    onSuccess: (data) => {
      if (data.data) {
        setResult(data.data);
        onSuccess?.(data.data);
      }
    },
  });

  const onSubmit = () => {
    clearErrors();
    const parsed = lotteryPullSchema.safeParse(form);
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    // Data-dependent ceiling — see the header.
    if (parsed.data.purchasedItemNumber > totalSlots) {
      setFieldError("purchasedItemNumber", `This lottery has ${totalSlots} slots.`);
      return;
    }
    mutation.mutate();
  };

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
    <Stack gap="md">
      <Heading level={3} size="lg" weight="semibold">
        Submit Your Entry
      </Heading>
      <Text size="sm" color="muted">
        Enter your UPI Transaction ID and payment details to claim your slot. You may enter up to{" "}
        {maxPullsPerUser} time{maxPullsPerUser === 1 ? "" : "s"}.
      </Text>
      <FormShellContext.Provider value={shellCtx}>
        <FormErrorSummary />
        <SectionForm<Values>
          sections={sections}
          values={form}
          onChange={(partial) => setForm((prev) => Object.assign({}, prev, partial))}
          onSubmit={onSubmit}
          schema={lotteryPullSchema}
          openIds={nav.openIds}
          onOpenChange={nav.setOpenIds}
          isLoading={mutation.isPending}
          submitLabel="Submit Entry"
        />
      </FormShellContext.Provider>
    </Stack>
  );
}
