"use client";

import React, { useState, useTransition } from "react";
import { normalizeError } from "../../../../errors/normalize";
import {
  Stack,
  Row,
  Text,
  Heading,
  Section,
  Container,
  Button,
  DataTable,
  type DataTableColumn,
} from "../../../../ui";
import { Form, FieldInput, FieldSelect, Input } from "../../../../ui";
import type { UseFormShellStateResult } from "../../../../ui/forms";
import { lotteryConfigFormSchema } from "../../../shared/features/lottery/config-form";
import { lotteryConfigWriteSchema } from "../../../../features/lottery/schemas/config-write";
import type { LotteryConfigWriteInput } from "../../../../features/lottery/schemas/config-write";
import { FormErrorSummary } from "../../../../ui/forms/FormErrorSummary";

interface LotterySlotRow {
  slotNumber: number;
  name: string;
  price: number;
  /** Prize photo — rendered publicly in the prize collage on the detail page. */
  image?: string;
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
  title: string;
  description?: string;
  type: "lottery";
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

export function LotteryAdminEditView({
  eventId,
  initialData,
  onSubmit,
}: LotteryAdminEditViewProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [pricingMode, setPricingMode] = useState<"uniform" | "variable">(initialData?.pricingMode ?? "uniform");
  const [uniformPrice, setUniformPrice] = useState(String(initialData?.uniformPrice ?? 0));
  const [drawWindowMinutes, setDrawWindowMinutes] = useState(String(initialData?.drawWindowDurationMinutes ?? 5));
  const [maxPullsPerTx, setMaxPullsPerTx] = useState(String(initialData?.maxPullsPerTransaction ?? 1));
  const [maxPullsPerUser, setMaxPullsPerUser] = useState(String(initialData?.maxPullsPerUser ?? 1));
  const [slots, setSlots] = useState<LotterySlotRow[]>(
    initialData?.slots ?? [{ slotNumber: 1, name: "", price: 0 }],
  );

  const addSlot = () => {
    setSlots((prev) => [
      ...prev,
      { slotNumber: prev.length + 1, name: "", price: 0 },
    ]);
  };

  const removeSlot = (idx: number) => {
    setSlots((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, slotNumber: i + 1 })),
    );
  };

  const updateSlot = (idx: number, field: "name" | "price" | "image", value: string) => {
    setSlots((prev) =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, [field]: field === "price" ? Math.round(parseFloat(value) * 100) / 100 || 0 : value }
          : s,
      ),
    );
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      try {
        /*
         * 🛑 This used to send `isBooked: false` and `weight: 0` on every slot,
         * and drop `bookedByUserId` / `bookedByDisplayName` /
         * `bookedByUserLotteryNumber` entirely — against a `.passthrough()`
         * PATCH, which made the first save of a live lottery erase every
         * purchased slot, silently, with a 200.
         *
         * The write shape now has NO booking fields at all and is `.strict()`,
         * so a slot's buyer is not something this form can express, let alone
         * overwrite. `PUT /lottery-config` merges by `slotNumber` against the
         * stored config and is the only writer.
         */
        const candidate = {
          slots: slots.map((s) => ({
            slotNumber: s.slotNumber,
            name: s.name,
            image: s.image?.trim() || undefined,
            price: s.price,
          })),
          pricingMode,
          uniformPrice:
            pricingMode === "uniform"
              ? Math.round(parseFloat(uniformPrice) * 100) / 100 || 0
              : undefined,
          drawWindowDurationMinutes: parseInt(drawWindowMinutes, 10) || 5,
          maxPullsPerTransaction: parseInt(maxPullsPerTx, 10) || 1,
          maxPullsPerUser: parseInt(maxPullsPerUser, 10) || 1,
        };

        /*
         * The schema was passed to `<Form>` and never actually run — so the
         * `parseFloat(x) || 0` coercions above, which it exists to catch, were
         * still live. Parsed here so a bad slot is refused on the client
         * rather than discovered as a 400.
         */
        const parsed = lotteryConfigWriteSchema.safeParse(candidate);
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Check the lottery settings.");
          return;
        }

        await onSubmit({ title, description, type: "lottery", lotteryConfig: parsed.data });
      } catch (err) {
        void normalizeError(err);
        setError(err instanceof Error ? err.message : "Failed to save lottery");
      }
    });
  };

  // Slot table columns
  const slotColumns: DataTableColumn<LotterySlotRow & { _idx: number }>[] = [
    {
      key: "slotNumber",
      header: "#",
      render: (s) => <Text size="xs" color="muted" family="mono">{s.slotNumber}</Text>,
    },
    {
      key: "name",
      header: "Prize Name",
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
    ...(pricingMode === "variable"
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

  const slotsWithIdx = slots.map((s, i) => ({ ...s, _idx: i }));

  return (
    <Container>
      <Section>
        <Form schema={lotteryConfigFormSchema} onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {({ clearErrors }: UseFormShellStateResult) => (
            <Stack gap="xl">
              <FormErrorSummary />
              <Heading level={1} size="2xl" weight="bold">
                {eventId ? "Edit Lottery" : "Create Lottery"}
              </Heading>

              <Stack gap="md">
                <Heading level={2} size="lg" weight="semibold">Basic Info</Heading>
                <FieldInput name="title" label="Title" required value={title} onChange={(v: string) => { setTitle(v); clearErrors(); }} />
                <FieldInput name="description" label="Description" value={description} onChange={(v: string) => { setDescription(v); clearErrors(); }} />
              </Stack>

              <Stack gap="md">
                <Heading level={2} size="lg" weight="semibold">Configuration</Heading>
                <FieldSelect
                  name="pricingMode"
                  label="Pricing Mode"
                  value={pricingMode}
                  options={[
                    { label: "Uniform (all slots same price)", value: "uniform" },
                    { label: "Variable (per-slot pricing)", value: "variable" },
                  ]}
                  onChange={(v: string) => setPricingMode(v as "uniform" | "variable")}
                />
                {pricingMode === "uniform" && (
                  <FieldInput name="uniformPrice" label="Price per Slot (₹)" type="number" value={uniformPrice} onChange={(v: string) => setUniformPrice(v)} />
                )}
                <FieldInput name="drawWindowMinutes" label="Draw Window (minutes)" type="number" value={drawWindowMinutes} onChange={(v: string) => setDrawWindowMinutes(v)} />
                <FieldInput name="maxPullsPerTx" label="Max Pulls per Transaction" type="number" value={maxPullsPerTx} onChange={(v: string) => setMaxPullsPerTx(v)} />
                <FieldInput name="maxPullsPerUser" label="Max Pulls per User" type="number" value={maxPullsPerUser} onChange={(v: string) => setMaxPullsPerUser(v)} />
              </Stack>

              <Stack gap="md">
                <Row align="center" justify="between">
                  <Heading level={2} size="lg" weight="semibold">Slots ({slots.length})</Heading>
                  <Button type="button" variant="secondary" size="sm" onClick={addSlot} disabled={slots.length >= 200}>
                    + Add Slot
                  </Button>
                </Row>
                <DataTable
                  data={slotsWithIdx}
                  columns={slotColumns}
                  keyExtractor={(s) => String(s.slotNumber)}
                  emptyMessage="No slots yet."
                  actions={(s) =>
                    slots.length > 1 ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeSlot(s._idx)} aria-label={`Remove slot ${s.slotNumber}`}>
                        ×
                      </Button>
                    ) : null
                  }
                />
              </Stack>

              {error && <Text className="text-error" size="sm" role="alert">{error}</Text>}

              <Button type="submit" variant="primary" isLoading={isPending} onClick={handleSubmit} className="w-full sm:w-auto">
                {isPending ? "Saving…" : eventId ? "Update Lottery" : "Create Lottery"}
              </Button>
            </Stack>
          )}
        </Form>
      </Section>
    </Container>
  );
}
