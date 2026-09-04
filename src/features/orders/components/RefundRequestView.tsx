"use client";

/**
 * RefundRequestView — buyer-facing return / refund request form.
 *
 * ## What changed and why
 *
 * This component had **zero call sites** and was grandfathered in
 * `audit-orphan-view-component`. It also predated three project rules:
 * it hand-rolled `useState<string | null>` for its error (Rule #9.4), took a
 * free-text reason with no schema (Rule #9.2), and had no `<FormErrorSummary>`.
 *
 * The free-text reason is the substantive change. "Final sale, unless the
 * buyer didn't get what they paid for" cannot be enforced against prose — the
 * server needs a coded reason to decide, so the buyer picks one here and the
 * note is the optional elaboration beside it.
 *
 * ## Final sale is a filter, not a wall
 *
 * When a line in scope is final sale, this does NOT refuse to render. It says
 * so, and narrows the picker to the reasons that remain valid. Blocking the
 * page outright would hide the two claims a final sale can never refuse —
 * which are exactly the ones a buyer in trouble needs.
 */

import React, { useMemo, useState } from "react";
import { Alert, Div, Span, Stack, Text, Checkbox, PaginatedSelect } from "../../../ui";
import {
  FormShellContext,
  useFormShellState,
  FormErrorSummary,
  FieldTextarea,
} from "../../../ui/forms";
import { SectionForm, useSectionFormNav, type SectionDef } from "../../shell";
import { z } from "zod";
import { REFUND_COPY } from "../../../_internal/shared/features/orders/refund-copy";
import {
  RETURN_REASON_LABEL,
  selectableReturnReasons,
  isFinalSaleExempt,
  type ReturnReason,
} from "../../../_internal/shared/features/orders/return-reasons";
import { formatCurrency } from "../../../utils/number.formatter";
import type { Order } from "../types";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";

export interface RefundRequestSubmission {
  reasonCode: ReturnReason;
  reasonNote?: string;
}

export interface RefundRequestViewProps {
  /*
   * The CLIENT `Order` shape, not `OrderDocument`.
   *
   * Every real caller has the client shape — it is what `useOrder` returns —
   * and the previous `Pick<OrderDocument, ...>` signature is part of why this
   * component never acquired one: no page could satisfy it without casting a
   * document it did not have.
   */
  order: Pick<
    Order,
    "id" | "total" | "currency" | "isNonRefundable" | "contestable" | "items"
  >;
  onSubmitRequest: (submission: RefundRequestSubmission) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

const ACK_COUNT = REFUND_COPY.request.acknowledgments.length;

interface RefundRequestDraft {
  reasonCode: ReturnReason | "";
  reasonNote: string;
  acknowledged: boolean[];
}

export function RefundRequestView({
  order,
  onSubmitRequest,
  isLoading = false,
  className = "",
}: RefundRequestViewProps) {
  /*
   * Does anything in this order carry the final-sale term? Read from the
   * ORDER's own per-line snapshot — the product may have been re-listed on
   * different terms since, and the buyer agreed to the terms at checkout.
   */
  const hasFinalSaleLine = useMemo(
    () => (order.items ?? []).some((i) => i.finalSale === true),
    [order.items],
  );

  const allowedReasons = useMemo(
    () => selectableReturnReasons(hasFinalSaleLine),
    [hasFinalSaleLine],
  );

  /*
   * The schema mirrors the server's `returnRequestSchema`, plus the
   * acknowledgements, which are a client-side consent gate and are not stored.
   * `reasonCode` is constrained to the ALLOWED set rather than the full enum,
   * so a change-of-mind reason cannot be submitted on a final-sale order even
   * if the option list were bypassed.
   */
  const schema = useMemo(
    () =>
      z.object({
        reasonCode: z.enum(allowedReasons as [ReturnReason, ...ReturnReason[]], {
          errorMap: () => ({ message: "Choose why you're returning this order." }),
        }),
        reasonNote: z.string().max(500).optional(),
        acknowledged: z
          .array(z.boolean())
          .refine((a) => a.every(Boolean), {
            message: "Please acknowledge all three statements before submitting.",
          }),
      }),
    [allowedReasons],
  );

  const [draft, setDraft] = useState<RefundRequestDraft>({
    reasonCode: "",
    reasonNote: "",
    acknowledged: Array(ACK_COUNT).fill(false),
  });

  const update = (partial: Partial<RefundRequestDraft>) =>
    setDraft((prev) => ({ ...prev, ...partial }));

  const sections: SectionDef<RefundRequestDraft>[] = useMemo(
    () => [
      {
        id: "declare",
        label: "Why are you returning this?",
        required: true,
        fields: ["reasonCode", "reasonNote"],
        render: ({ values, onChange }) => (
          <Stack gap="md">
            <Text size="sm" color="muted">
              {REFUND_COPY.request.orderTotalLabel}{" "}
              <Span weight="bold">
                {formatCurrency(order.total, order.currency ?? "INR")}
              </Span>
            </Text>

            {hasFinalSaleLine && (
              <Alert variant="warning" title={REFUND_COPY.request.finalSaleNoticeHeading}>
                You can&rsquo;t return it for a change of mind, but you can still claim
                if it never arrived, arrived damaged, was the wrong item, wasn&rsquo;t as
                described, or is counterfeit. Only those reasons are listed below.
              </Alert>
            )}

            <Stack gap="xs">
              <Text size="sm" weight="semibold">
                {REFUND_COPY.request.reasonSelectLabel} <Span aria-hidden>*</Span>
              </Text>
              <PaginatedSelect<ReturnReason>
                value={values.reasonCode === "" ? null : values.reasonCode}
                onChange={(v) => onChange({ reasonCode: v ?? "" })}
                options={allowedReasons.map((r) => ({
                  value: r,
                  label: RETURN_REASON_LABEL[r],
                }))}
                placeholder={REFUND_COPY.request.reasonSelectPlaceholder}
                ariaLabel={REFUND_COPY.request.reasonSelectLabel}
              />
            </Stack>

            <FieldTextarea
              name="reasonNote"
              label={REFUND_COPY.request.reasonNoteLabel}
              value={values.reasonNote}
              onChange={(v) => onChange({ reasonNote: v })}
              rows={3}
              maxLength={500}
              showCharCount
            />
          </Stack>
        ),
      },
      {
        id: "declare-acknowledgements",
        label: REFUND_COPY.request.acknowledgeHeading,
        required: true,
        fields: ["acknowledged"],
        render: ({ values, onChange }) => (
          <Stack gap="sm">
            {REFUND_COPY.request.acknowledgments.map((text, i) => (
              <Checkbox
                key={i}
                checked={values.acknowledged[i] ?? false}
                onChange={() =>
                  onChange({
                    acknowledged: values.acknowledged.map((v, idx) =>
                      idx === i ? !v : v,
                    ),
                  })
                }
                label={<Text size="sm" className="leading-snug">{text}</Text>}
                aria-label={`Acknowledgment ${i + 1}`}
              />
            ))}
          </Stack>
        ),
      },
    ],
    [order.total, order.currency, hasFinalSaleLine, allowedReasons],
  );

  const nav = useSectionFormNav(sections, draft);
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(schema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  // ── Early returns: states in which no request can be made at all ──────────

  if (order.isNonRefundable) {
    return (
      <Div className={className} rounded="xl" padding="md" surface="muted" border="default">
        <Text size="sm" color="muted">{REFUND_COPY.request.nonRefundableMessage}</Text>
      </Div>
    );
  }

  if (order.contestable === false) {
    return (
      <Alert variant="warning" className={className}>
        {REFUND_COPY.request.alreadyRefundedMessage}
      </Alert>
    );
  }

  const handleSubmit = async () => {
    clearErrors();
    const parsed = schema.safeParse(draft);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setFieldError(issue.path.map(String).join("."), issue.message);
      }
      return;
    }
    try {
      await onSubmitRequest({
        reasonCode: parsed.data.reasonCode,
        ...(parsed.data.reasonNote?.trim()
          ? { reasonNote: parsed.data.reasonNote.trim() }
          : {}),
      });
    } catch (err) {
      const e = normalizeError(err);
      /*
       * Surfaced on the field the server actually rejected. A final-sale
       * refusal is always about the chosen reason, so putting it on
       * `reasonCode` puts the message next to the control that fixes it.
       *
       * `toUserMessage` and never the raw server text — Rule #9.6.
       */
      setFieldError(
        "reasonCode",
        toUserMessage(e.code, undefined, { fallback: REFUND_COPY.request.errorFallback }),
      );
    }
  };

  return (
    <FormShellContext.Provider value={shellCtx}>
      <Stack gap="md" className={className}>
        <FormErrorSummary />
        <SectionForm<RefundRequestDraft>
          sections={sections}
          values={draft}
          onChange={update}
          onSubmit={handleSubmit}
          schema={schema}
          openIds={nav.openIds}
          onOpenChange={nav.setOpenIds}
          submitLabel={REFUND_COPY.request.submitLabel}
          isLoading={isLoading}
        />
      </Stack>
    </FormShellContext.Provider>
  );
}
