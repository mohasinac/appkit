"use client";

/**
 * LotteryAdminEditView — the slot configuration for one lottery. Sectionised
 * 2026-08-30.
 *
 * ## Two schemas became one
 *
 * It declared `lotteryConfigFormSchema` on `<Form>` and parsed
 * `lotteryConfigWriteSchema` in the submit handler, so the form schema's
 * duplicate-slot and free-lottery rules had never executed. The form schema is
 * deleted; `lotteryConfigWriteSchema` carries the annotations now and is both
 * what this form renders from and what the route parses.
 *
 * ## Title and description are gone, not moved
 *
 * They were editable here and reached nothing: `LotteryConfigClient` posts
 * `data.lotteryConfig` to `PUT .../lottery-config` and ignores the rest, and
 * that route accepts only the config. An event's title, dates, status and
 * media are edited in the ordinary event editor — this page is the slots. Two
 * inputs that saved silently into nowhere are worse than their absence, which
 * is the same call made on `rememberMe`. The title still appears, as the
 * heading, so it is obvious which lottery is open.
 */

import React from "react";
import {
  Button,
  DataTable,
  Input,
  Row,
  Stack,
  Text,
  type DataTableColumn,
} from "../../../../ui";
import { FormErrorSummary } from "../../../../ui/forms/FormErrorSummary";
import { FormShellContext, useFormShellState } from "../../../../ui/forms/FormShell";
import { applyZodIssues } from "../../../../ui/forms/apply-zod-issues";
import { StackedViewShell } from "../../../../ui";
import { buildSectionsFromSchema, visibleValues } from "../../../../features/shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../../../features/shell/SectionForm";
import { lotteryConfigWriteSchema } from "../../../../features/lottery/schemas/config-write";
import type { LotteryConfigWriteInput } from "../../../../features/lottery/schemas/config-write";

/** One editable row of the slot table. */
interface LotterySlotRow {
  slotNumber: number;
  name: string;
  price: number;
  /** Prize photo — rendered publicly in the prize collage on the detail page. */
  image?: string;
}

/** The draft this form edits — the write contract's own field set, verbatim. */
interface Values {
  [key: string]: unknown;
  pricingMode: "uniform" | "variable";
  uniformPrice: number;
  drawWindowDurationMinutes: number;
  maxPullsPerTransaction: number;
  maxPullsPerUser: number;
  slots: LotterySlotRow[];
}

/**
 * What this form hands its caller.
 *
 * `lotteryConfig` is the WRITE input — deliberately not `LotteryConfig`. It
 * carries no `isBooked`, no `bookedBy*` and no `weight`, because an admin
 * editing a lottery is describing prizes, not attendance. The stored config
 * gains those in `mergeLotteryConfig`, server-side, from the slots that are
 * already there.
 *
 * `totalSlots` is absent for the same reason: derived from `slots.length` by
 * the merge, never sent. A caller-supplied count that disagrees with the array
 * is the mirror-drift trap (Root Cause #42), and the count is what the
 * fullness check reads.
 */
interface LotteryEventFormData {
  lotteryConfig: LotteryConfigWriteInput;
}

interface LotteryAdminEditViewProps {
  eventId?: string;
  initialData?: {
    title: string;
    description?: string;
    totalSlots: number;
    pricingMode: "uniform" | "variable";
    uniformPrice?: number;
    drawWindowDurationMinutes: number;
    maxPullsPerTransaction: number;
    maxPullsPerUser: number;
    slots: LotterySlotRow[];
  };
  onSubmit: (data: LotteryEventFormData) => Promise<void>;
}

const MAX_SLOTS = 200;

export function LotteryAdminEditView({
  eventId,
  initialData,
  onSubmit,
}: LotteryAdminEditViewProps) {
  const [isPending, startTransition] = React.useTransition();

  const [form, setForm] = React.useState<Values>({
    pricingMode: initialData?.pricingMode ?? "uniform",
    uniformPrice: initialData?.uniformPrice ?? 0,
    drawWindowDurationMinutes: initialData?.drawWindowDurationMinutes ?? 5,
    maxPullsPerTransaction: initialData?.maxPullsPerTransaction ?? 1,
    maxPullsPerUser: initialData?.maxPullsPerUser ?? 1,
    slots: initialData?.slots ?? [{ slotNumber: 1, name: "", price: 0 }],
  });

  const patch = (partial: Partial<Values>) =>
    setForm((prev) => Object.assign({}, prev, partial));

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<Values>(lotteryConfigWriteSchema, {
        renderers: {
          slots: ({ values, onChange }) => (
            <SlotTable
              slots={values.slots}
              showPrice={values.pricingMode === "variable"}
              onSlotsChange={(next) => onChange({ slots: next })}
            />
          ),
        },
      }),
    [],
  );

  const nav = useSectionFormNav(sections, form, { scope: "admin:lottery-config" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(
    lotteryConfigWriteSchema,
    {
      sections: nav.sectionMeta,
      onGoToSection: nav.goToSection,
      fieldToSectionIndex: nav.fieldToSectionIndex,
    },
  );

  const handleSubmit = () => {
    clearErrors();
    /*
     * Per-slot prices are dropped under uniform pricing, where the price of a
     * slot IS `uniformPrice`. They used to be sent in both modes, so a figure
     * loaded from `initialData` survived a switch to uniform — unreachable on
     * screen, still written on save. `visibleValues` cannot reach inside an
     * array, so this one masking stays explicit.
     */
    const draft = visibleValues(lotteryConfigWriteSchema, form) as Partial<Values>;
    const candidate = {
      ...draft,
      slots: form.slots.map((s) => ({
        slotNumber: s.slotNumber,
        name: s.name,
        image: s.image?.trim() || undefined,
        price: form.pricingMode === "variable" ? s.price : 0,
      })),
    };

    const parsed = lotteryConfigWriteSchema.safeParse(candidate);
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }

    startTransition(async () => {
      await onSubmit({ lotteryConfig: parsed.data });
    });
  };

  return (
    <StackedViewShell
      portal="admin"
      title={
        eventId
          ? `Edit lottery${initialData?.title ? ` — ${initialData.title}` : ""}`
          : "Create lottery"
      }
      sections={[
        <FormShellContext.Provider value={shellCtx} key="lottery-config-form">
          <FormErrorSummary />
          <SectionForm<Values>
            sections={sections}
            values={form}
            onChange={patch}
            onSubmit={handleSubmit}
            schema={lotteryConfigWriteSchema}
            openIds={nav.openIds}
            onOpenChange={nav.setOpenIds}
            isLoading={isPending}
            submitLabel={eventId ? "Update lottery" : "Create lottery"}
          />
        </FormShellContext.Provider>,
      ]}
    />
  );
}

/**
 * The repeatable slot rows.
 *
 * A module-level component rather than an inline renderer: its handlers would
 * otherwise sit six braces deep inside `useMemo`, which is what
 * `audit-code-quality`'s DEEP_NESTING rule exists to stop.
 */
function SlotTable({
  slots,
  showPrice,
  onSlotsChange,
}: {
  slots: LotterySlotRow[];
  showPrice: boolean;
  onSlotsChange: (next: LotterySlotRow[]) => void;
}) {
  /**
   * Next number is max+1, not length+1.
   *
   * Now that removeSlot preserves numbering, `slots.length + 1` collides: delete
   * slot 1 of 25 and you hold 24 slots numbered 2..25, so length+1 is 25 — a
   * duplicate, which the write schema rejects outright (slot numbers must be
   * unique). Deriving from the highest number in use is stable under any gaps.
   */
  const addSlot = () =>
    onSlotsChange([
      ...slots,
      { slotNumber: slots.reduce((max, s) => Math.max(max, s.slotNumber), 0) + 1, name: "", price: 0 },
    ]);

  /**
   * 🛑 Remove the slot. Do NOT renumber the survivors.
   *
   * `slotNumber` is the stable identity a booking is attached to, and renumbering
   * silently defeated the server's own protection. `mergeLotteryConfig` refuses a
   * save that drops a BOOKED slot by checking `isBooked && !incoming.has(slotNumber)`
   * — but this function used to renumber the remaining slots to `i + 1`, so deleting
   * slot 1 of 25 sent back numbers 1..24. Every booked number (1–5) still *appeared*
   * in that set, the check found nothing to refuse, and the save went through.
   *
   * The damage was worse than the deletion: the merge re-attaches bookings by
   * slotNumber, so the buyer of the deleted slot 1 had their booking moved onto
   * whatever prize now occupied number 1. That is precisely the hazard the schema
   * header describes — "hands slot 7's buyer the prize that used to be slot 8".
   *
   * Numbers may therefore be non-contiguous after a delete (2..25), which the write
   * schema allows: it requires slot numbers to be UNIQUE, not gapless, and totalSlots
   * is derived from slots.length rather than from the highest number.
   */
  const removeSlot = (idx: number) => onSlotsChange(slots.filter((_, i) => i !== idx));

  const updateSlot = (
    idx: number,
    field: "name" | "price" | "image",
    value: string,
  ) =>
    onSlotsChange(
      slots.map((s, i) =>
        i === idx
          ? {
              ...s,
              [field]:
                field === "price"
                  ? Math.round(parseFloat(value) * 100) / 100 || 0
                  : value,
            }
          : s,
      ),
    );

  const rows = slots.map((s, i) => ({ ...s, _idx: i }));

  const columns: DataTableColumn<LotterySlotRow & { _idx: number }>[] = [
    {
      key: "slotNumber",
      header: "#",
      render: (s) => (
        <Text size="xs" color="muted" family="mono">
          {s.slotNumber}
        </Text>
      ),
    },
    {
      key: "name",
      header: "Prize name",
      render: (s) => (
        <Input
          type="text"
          className="w-full"
          placeholder={`Prize for slot ${s.slotNumber}`}
          value={s.name}
          onChange={(e) => updateSlot(s._idx, "name", e.target.value)}
          aria-label={`Slot ${s.slotNumber} prize name`}
        />
      ),
    },
    {
      key: "image",
      header: "Image",
      render: (s) => (
        <Input
          type="text"
          className="w-full"
          placeholder="/media/… or https://…"
          value={s.image ?? ""}
          onChange={(e) => updateSlot(s._idx, "image", e.target.value)}
          aria-label={`Slot ${s.slotNumber} prize image URL`}
        />
      ),
    },
    ...(showPrice
      ? [
          {
            key: "price" as const,
            header: "Price (₹)",
            render: (s: LotterySlotRow & { _idx: number }) => (
              <Input
                type="number"
                className="w-24"
                placeholder="0"
                value={s.price}
                onChange={(e) => updateSlot(s._idx, "price", e.target.value)}
                aria-label={`Slot ${s.slotNumber} price`}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <Stack gap="md">
      <Row align="center" justify="between">
        <Text size="sm" color="muted">
          {slots.length} slot{slots.length === 1 ? "" : "s"}
        </Text>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addSlot}
          disabled={slots.length >= MAX_SLOTS}
        >
          + Add slot
        </Button>
      </Row>
      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={(s) => String(s.slotNumber)}
        emptyMessage="No slots yet."
        actions={(s) =>
          slots.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeSlot(s._idx)}
              aria-label={`Remove slot ${s.slotNumber}`}
            >
              ×
            </Button>
          ) : null
        }
      />
    </Stack>
  );
}
