/*
 * WHY: `giveawayConfig` had NO write schema. The only authoring UI
 *      (`GiveawayAdminEditView`) was orphaned, and the route it would have
 *      posted to — `PATCH /api/admin/events/[id]` — is `.passthrough()`, so
 *      the whole config wrote through completely unvalidated.
 * WHAT: The write contract, plus `mergeGiveawayConfig` — the one function that
 *       is allowed to turn an admin's edit into a stored config.
 *
 * ## 🛑 The author-side slot shape CANNOT carry booking state
 *
 * `GiveawayAdminEditView.handleSubmit` sent `isBooked: false` and `weight: 0`
 * for every slot, and dropped `bookedByUserId` / `bookedByDisplayName` /
 * `bookedByUserGiveawayNumber` entirely. Against a `.passthrough()` PATCH that
 * is not a validation gap — it is a **destructive write**: the first save of
 * a live giveaway marks every purchased slot as available again, and the
 * buyers who paid for them are simply gone from the record.
 *
 * So the input type deliberately has NO booking fields at all. An admin
 * editing a giveaway is describing PRIZES, not attendance, and the schema
 * refuses to express the latter — a `.strict()` object, so sending
 * `isBooked` is a 400 rather than something a merge has to defend against.
 *
 * `weight` is absent for the same reason: it is derived from price
 * server-side and is never client input.
 *
 * ## One schema, not two
 *
 * There was a second one — `giveawayConfigFormSchema`, in
 * `_internal/shared/features/giveaway/config-form.ts`. `GiveawayAdminEditView`
 * passed THAT to `<Form>` and parsed THIS in its submit handler, so the form
 * schema's rules (the duplicate-slot check, the free-giveaway check) had never
 * once executed. It was deleted 2026-08-30 and its annotations moved here:
 * `annotate()` keys a WeakMap by schema instance and the server ignores the
 * registry entirely, so carrying layout metadata on the write contract costs
 * the route nothing and removes the opportunity for the two to disagree.
 *
 * ## Merging is BY `slotNumber`, not by index
 *
 * Array position is not identity. An admin who deletes slot 3 shifts every
 * later slot's index by one, and an index-wise merge would hand slot 7's
 * buyer the prize that used to be slot 8. `slotNumber` is the stable key
 * users actually see and pull against.
 *
 * A slot that is booked cannot be REMOVED either. Dropping it would erase a
 * paid entry with no trace; the merge rejects that rather than silently
 * carrying the slot along, because an admin who thinks they deleted a prize
 * and did not is a worse outcome than an error.
 *
 * EXPORTS: giveawayConfigWriteSchema, giveawaySlotWriteSchema,
 *          mergeGiveawayConfig, type GiveawayConfigWriteInput
 *
 * @tag domain:giveaway
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:/api/admin/events/[id]/giveaway-config,GiveawayAdminEditView
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import type { GiveawayConfig, GiveawaySlot } from "../types/index";

/** Mirrors `GiveawayPricingMode`. */
const pricingModeSchema = z.enum(["uniform", "variable"]);

/**
 * What an admin may say about one slot. Booking state is deliberately absent
 * — see the header. `.strict()`, so `isBooked` is a 400.
 */
export const giveawaySlotWriteSchema = z
  .object({
    slotNumber: z.coerce.number().int().min(1).max(200),
    name: z.string().min(1, "Every slot needs a prize name.").max(200),
    image: z.string().max(2000).optional(),
    price: z.coerce.number().min(0, "A price cannot be negative."),
  })
  .strict();

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const giveawayConfigWriteSchema = z
  .object({
    pricingMode: annotate(pricingModeSchema, {
      section: "pricing", sectionLabel: "Pricing", sectionRequired: true,
      quick: true, order: 1, row: "pair", label: "Pricing mode",
    }),
    /*
     * Hidden under variable pricing, and therefore not sent — `visibleValues`
     * drops it, and the refine below only demands it in uniform mode. The two
     * halves have to agree or a hidden field fails validation invisibly.
     */
    uniformPrice: annotate(z.coerce.number().min(0).optional(), {
      section: "pricing", order: 2, row: "pair", kind: "number",
      label: "Price per slot (₹)",
      when: (v) => v.pricingMode === "uniform",
    }),
    drawWindowDurationMinutes: annotate(
      z.coerce.number().int().min(1).max(1440),
      {
        section: "limits", sectionLabel: "Draw rules", order: 1, row: "third",
        kind: "number", label: "Draw window (minutes)",
        help: "How long a buyer has to complete a pull once it starts.",
      },
    ),
    maxPullsPerTransaction: annotate(z.coerce.number().int().min(1).max(200), {
      section: "limits", order: 2, row: "third", kind: "number",
      label: "Max pulls per transaction",
    }),
    maxPullsPerUser: annotate(z.coerce.number().int().min(1).max(200), {
      section: "limits", order: 3, row: "third", kind: "number",
      label: "Max pulls per user",
    }),
    slots: annotate(
      z
        .array(giveawaySlotWriteSchema)
        .min(1, "A giveaway needs at least one slot.")
        .max(200, "A giveaway cannot exceed 200 slots."),
      {
        section: "slots", sectionLabel: "Slots", sectionRequired: true,
        order: 1, row: "full", kind: "list", label: "Prize slots",
        /*
         * The slot table holds uncommitted rows — a name half-typed, an image
         * URL pasted but not yet saved. `<Collapse>` unmounts its children, so
         * without this a collapse discards them.
         */
        sectionKeepMounted: true,
      },
    ),
  })
  .strict()
  .refine(
    (c) => new Set(c.slots.map((s) => s.slotNumber)).size === c.slots.length,
    { message: "Two slots share a slot number.", path: ["slots"] },
  )
  /*
   * ABOVE zero, not merely present.
   *
   * This read `typeof c.uniformPrice === "number"`, so `0` passed — and the
   * editor's payload builds the value as
   * `Math.round(parseFloat(uniformPrice) * 100) / 100 || 0`, which turns
   * "12,00" or "twelve" into exactly that. A typo became a FREE giveaway,
   * indistinguishable from deliberately pricing one at zero.
   *
   * `giveawayConfigFormSchema` has carried the correct `> 0` rule all along and
   * has never executed: the editor passes it to `<Form>` and parses THIS schema
   * instead. The rule belongs on the schema that runs.
   */
  .refine(
    (c) => c.pricingMode !== "uniform" || (typeof c.uniformPrice === "number" && c.uniformPrice > 0),
    {
      message: "Set a slot price above zero, or switch to variable pricing.",
      path: ["uniformPrice"],
    },
  );

export type GiveawayConfigWriteInput = z.infer<typeof giveawayConfigWriteSchema>;

/** Why a merge was refused. Distinct from a validation failure. */
export interface GiveawayMergeRejection {
  ok: false;
  code: "BOOKED_SLOT_REMOVED";
  message: string;
  slotNumbers: number[];
}

export type GiveawayMergeResult =
  | { ok: true; config: GiveawayConfig }
  | GiveawayMergeRejection;

/**
 * Apply an admin's edit to the stored config, carrying every booking across.
 *
 * `existing` is undefined when the giveaway is being created, in which case
 * there is nothing to preserve and every slot starts unbooked.
 *
 * `totalSlots` is DERIVED from `slots.length` and never accepted from input —
 * a caller-supplied count that disagrees with the array is exactly the
 * mirror-drift trap (Root Cause #42), and `totalSlots` is what the fullness
 * check reads.
 */
export function mergeGiveawayConfig(
  input: GiveawayConfigWriteInput,
  existing?: GiveawayConfig,
): GiveawayMergeResult {
  const priorBySlot = new Map<number, GiveawaySlot>();
  for (const slot of existing?.slots ?? []) priorBySlot.set(slot.slotNumber, slot);

  const incoming = new Set(input.slots.map((s) => s.slotNumber));
  const droppedBooked = [...priorBySlot.values()]
    .filter((s) => s.isBooked && !incoming.has(s.slotNumber))
    .map((s) => s.slotNumber);

  if (droppedBooked.length > 0) {
    return {
      ok: false,
      code: "BOOKED_SLOT_REMOVED",
      message:
        `Slot ${droppedBooked.join(", ")} has already been pulled and cannot be ` +
        `removed. Reopen it first if the pull needs to be undone.`,
      slotNumbers: droppedBooked,
    };
  }

  const slots: GiveawaySlot[] = input.slots.map((s) => {
    const prior = priorBySlot.get(s.slotNumber);
    return {
      slotNumber: s.slotNumber,
      name: s.name,
      image: s.image?.trim() || undefined,
      price: input.pricingMode === "uniform" ? (input.uniformPrice ?? 0) : s.price,
      // Server-derived, never input. Recomputed by the pricing pass; carried
      // from the prior slot so an edit does not zero a live weighting.
      weight: prior?.weight ?? 0,
      // 🛑 THE WHOLE POINT: booking state comes from the STORED slot, never
      // from the request. A slot the admin renames keeps its buyer.
      isBooked: prior?.isBooked ?? false,
      bookedByUserId: prior?.bookedByUserId,
      bookedByDisplayName: prior?.bookedByDisplayName,
      bookedByUserGiveawayNumber: prior?.bookedByUserGiveawayNumber,
    };
  });

  return {
    ok: true,
    config: {
      slots,
      totalSlots: slots.length,
      pricingMode: input.pricingMode,
      uniformPrice: input.pricingMode === "uniform" ? input.uniformPrice : undefined,
      drawWindowDurationMinutes: input.drawWindowDurationMinutes,
      maxPullsPerTransaction: input.maxPullsPerTransaction,
      maxPullsPerUser: input.maxPullsPerUser,
    },
  };
}
