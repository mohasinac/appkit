/*
 * WHY: `lotteryConfig` had NO write schema. The only authoring UI
 *      (`LotteryAdminEditView`) was orphaned, and the route it would have
 *      posted to — `PATCH /api/admin/events/[id]` — is `.passthrough()`, so
 *      the whole config wrote through completely unvalidated.
 * WHAT: The write contract, plus `mergeLotteryConfig` — the one function that
 *       is allowed to turn an admin's edit into a stored config.
 *
 * ## 🛑 The author-side slot shape CANNOT carry booking state
 *
 * `LotteryAdminEditView.handleSubmit` sent `isBooked: false` and `weight: 0`
 * for every slot, and dropped `bookedByUserId` / `bookedByDisplayName` /
 * `bookedByUserLotteryNumber` entirely. Against a `.passthrough()` PATCH that
 * is not a validation gap — it is a **destructive write**: the first save of
 * a live lottery marks every purchased slot as available again, and the
 * buyers who paid for them are simply gone from the record.
 *
 * So the input type deliberately has NO booking fields at all. An admin
 * editing a lottery is describing PRIZES, not attendance, and the schema
 * refuses to express the latter — a `.strict()` object, so sending
 * `isBooked` is a 400 rather than something a merge has to defend against.
 *
 * `weight` is absent for the same reason: it is derived from price
 * server-side and is never client input.
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
 * EXPORTS: lotteryConfigWriteSchema, lotterySlotWriteSchema,
 *          mergeLotteryConfig, type LotteryConfigWriteInput
 *
 * @tag domain:lottery
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:/api/admin/events/[id]/lottery-config,LotteryAdminEditView
 * @tag sideEffects:none
 */

import { z } from "zod";
import type { LotteryConfig, LotterySlot } from "../types/index";

/** Mirrors `LotteryPricingMode`. */
const pricingModeSchema = z.enum(["uniform", "variable"]);

/**
 * What an admin may say about one slot. Booking state is deliberately absent
 * — see the header. `.strict()`, so `isBooked` is a 400.
 */
export const lotterySlotWriteSchema = z
  .object({
    slotNumber: z.coerce.number().int().min(1).max(200),
    name: z.string().min(1, "Every slot needs a prize name.").max(200),
    image: z.string().max(2000).optional(),
    price: z.coerce.number().min(0, "A price cannot be negative."),
  })
  .strict();

export const lotteryConfigWriteSchema = z
  .object({
    slots: z
      .array(lotterySlotWriteSchema)
      .min(1, "A lottery needs at least one slot.")
      .max(200, "A lottery cannot exceed 200 slots."),
    pricingMode: pricingModeSchema,
    uniformPrice: z.coerce.number().min(0).optional(),
    drawWindowDurationMinutes: z.coerce.number().int().min(1).max(1440),
    maxPullsPerTransaction: z.coerce.number().int().min(1).max(200),
    maxPullsPerUser: z.coerce.number().int().min(1).max(200),
  })
  .strict()
  .refine(
    (c) => new Set(c.slots.map((s) => s.slotNumber)).size === c.slots.length,
    { message: "Two slots share a slot number.", path: ["slots"] },
  )
  .refine((c) => c.pricingMode !== "uniform" || typeof c.uniformPrice === "number", {
    message: "Uniform pricing needs a price.",
    path: ["uniformPrice"],
  });

export type LotteryConfigWriteInput = z.infer<typeof lotteryConfigWriteSchema>;

/** Why a merge was refused. Distinct from a validation failure. */
export interface LotteryMergeRejection {
  ok: false;
  code: "BOOKED_SLOT_REMOVED";
  message: string;
  slotNumbers: number[];
}

export type LotteryMergeResult =
  | { ok: true; config: LotteryConfig }
  | LotteryMergeRejection;

/**
 * Apply an admin's edit to the stored config, carrying every booking across.
 *
 * `existing` is undefined when the lottery is being created, in which case
 * there is nothing to preserve and every slot starts unbooked.
 *
 * `totalSlots` is DERIVED from `slots.length` and never accepted from input —
 * a caller-supplied count that disagrees with the array is exactly the
 * mirror-drift trap (Root Cause #42), and `totalSlots` is what the fullness
 * check reads.
 */
export function mergeLotteryConfig(
  input: LotteryConfigWriteInput,
  existing?: LotteryConfig,
): LotteryMergeResult {
  const priorBySlot = new Map<number, LotterySlot>();
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

  const slots: LotterySlot[] = input.slots.map((s) => {
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
      bookedByUserLotteryNumber: prior?.bookedByUserLotteryNumber,
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
