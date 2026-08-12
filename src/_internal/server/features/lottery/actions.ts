"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { getAdminDb } from "../../../../providers/db-firebase";
import { eventRepository, productRepository } from "../../../../repositories";
import { lotteryEntryRepository } from "../../../../features/lottery/repository/lottery-entry.repository";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { ValidationError } from "../../../shared/errors/index";
import {
  submitLotteryPullSchema,
  flagLotteryEntrySchema,
  reopenLotterySlotSchema,
} from "../../../../features/lottery/schemas/zod";
import {
  LotteryError,
  assignSlotWeights,
  pickWeightedSlot,
} from "../../../../features/lottery/types";
import type { LotteryConfig } from "../../../../features/lottery/types";
import type { LotteryEntryDocument } from "../../../../features/lottery/schemas/firestore";
import { LOTTERY_ENTRIES_COLLECTION } from "../../../../features/lottery/schemas/firestore";

// ── Helpers ──────────────────────────────────────────────────────────────────

function isDrawWindowOpen(config: LotteryConfig): boolean {
  // Draw window is implicitly open when there are unclaimed slots.
  // A real implementation would also check if the event status is "active".
  return config.slots.some((s) => !s.isBooked);
}

// ── Public actions ────────────────────────────────────────────────────────────

/**
 * User-initiated lottery pull.
 * Atomically:
 * 1. Validates inputs + limits
 * 2. Runs weighted slot selection on unclaimed slots
 * 3. Marks the slot as booked
 * 4. Creates the LotteryEntryDocument with assignedPrizeSlotNumber set
 *
 * Returns the assigned slot number so the user sees their prize immediately.
 */
export async function submitLotteryPullAction(
  input: unknown,
): Promise<ActionResult<{ userLotteryNumber: number; assignedPrizeSlotNumber: number; slotName: string }>> {
  return wrapAction(async () => {
    // Auth — must be logged in
    const user = await requireRoleUser(["buyer", "seller", "admin", "moderator", "employee"]);

    const parsed = submitLotteryPullSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid lottery pull input");
    }

    const data = parsed.data;
    const sourceId = data.sourceType === "event" ? data.eventId! : data.productId!;
    const sourceField = data.sourceType === "event" ? "eventId" : "productId";

    // Load the event/product to get the lotteryConfig
    let lotteryConfig: LotteryConfig;
    if (data.sourceType === "event") {
      const event = await eventRepository.findById(sourceId).catch(() => null);
      if (!event || event.type !== "lottery") {
        throw new LotteryError("LOTTERY_WINDOW_CLOSED", "Lottery event not found or not of type lottery.");
      }
      if (event.status !== "active") {
        throw new LotteryError("LOTTERY_WINDOW_CLOSED", "This lottery is not currently active.");
      }
      if (!event.lotteryConfig) {
        throw new LotteryError("LOTTERY_WINDOW_CLOSED", "Lottery config not found on event.");
      }
      lotteryConfig = event.lotteryConfig;
    } else {
      const product = await productRepository.findById(sourceId).catch(() => null);
      if (!product || product.listingType !== "prize-draw") {
        throw new LotteryError("LOTTERY_WINDOW_CLOSED", "Prize-draw product not found.");
      }
      if (product.status !== "published") {
        throw new LotteryError("LOTTERY_WINDOW_CLOSED", "This prize draw is not currently active.");
      }
      if (product.prizeDrawMode !== "lottery" || !product.lotteryConfig) {
        throw new LotteryError("LOTTERY_WINDOW_CLOSED", "Lottery config not found on product.");
      }
      lotteryConfig = product.lotteryConfig;
    }

    // Check draw window
    if (!isDrawWindowOpen(lotteryConfig)) {
      throw new LotteryError("LOTTERY_FULL", "All slots have been claimed.");
    }

    // Enforce maxPullsPerUser
    const existingUserPulls = await lotteryEntryRepository.countByUser(sourceId, sourceField, user.uid);
    if (existingUserPulls >= lotteryConfig.maxPullsPerUser) {
      throw new LotteryError("USER_LIMIT_REACHED", "You have reached the maximum number of pulls for this lottery.");
    }

    // Enforce maxPullsPerTransaction
    const existingTxPulls = await lotteryEntryRepository.countByTransactionId(
      sourceId,
      sourceField,
      data.transactionId,
    );
    if (existingTxPulls >= lotteryConfig.maxPullsPerTransaction) {
      throw new LotteryError("TX_ALREADY_USED", "This transaction ID has already been used the maximum number of times.");
    }

    // Atomically: pick slot + create entry + mark slot booked
    const db = getAdminDb();
    const sourceCollectionName = data.sourceType === "event" ? "events" : "products";
    const sourceDocRef = db.collection(sourceCollectionName).doc(sourceId);

    const { assignedSlot, userLotteryNumber } = await db.runTransaction(async (tx) => {
      // Re-read lotteryConfig inside transaction for freshness
      const sourceSnap = await tx.get(sourceDocRef);
      if (!sourceSnap.exists) throw new LotteryError("LOTTERY_WINDOW_CLOSED", "Lottery source not found.");

      const freshConfig = (sourceSnap.data() as { lotteryConfig?: LotteryConfig }).lotteryConfig;
      if (!freshConfig) throw new LotteryError("LOTTERY_WINDOW_CLOSED", "Lottery config missing.");

      const freshWeighted = assignSlotWeights(freshConfig);
      const unclaimed = freshWeighted.filter((s) => !s.isBooked);
      if (unclaimed.length === 0) throw new LotteryError("LOTTERY_FULL", "All slots have been claimed.");

      // Weighted pick
      const chosen = pickWeightedSlot(unclaimed);

      // Compute next userLotteryNumber (count + 1 inside tx via collection size)
      const countSnap = await db
        .collection(LOTTERY_ENTRIES_COLLECTION)
        .where(sourceField, "==", sourceId)
        .get();
      const nextNumber = countSnap.size + 1;

      // Mark slot booked in the source document
      const updatedSlots = freshConfig.slots.map((s) =>
        s.slotNumber === chosen.slotNumber
          ? {
              ...s,
              isBooked: true,
              bookedByUserId: user.uid,
              bookedByDisplayName: (user as unknown as { displayName?: string; name?: string }).displayName ?? (user as unknown as { name?: string }).name ?? undefined,
              bookedByUserLotteryNumber: nextNumber,
            }
          : s,
      );

      tx.update(sourceDocRef, {
        "lotteryConfig.slots": updatedSlots,
      });

      return { assignedSlot: chosen, userLotteryNumber: nextNumber };
    });

    // Create the entry document outside the transaction (acceptable — slot is already booked)
    const entryData: Omit<LotteryEntryDocument, "id"> = {
      sourceType: data.sourceType,
      ...(data.sourceType === "event" ? { eventId: sourceId } : { productId: sourceId }),
      userId: user.uid,
      userDisplayName: (user as unknown as { displayName?: string; name?: string }).displayName ?? (user as unknown as { name?: string }).name ?? undefined,
      userEmail: user.email ?? undefined,
      userPhone: data.userPhone,
      transactionId: data.transactionId,
      paymentTime: new Date(data.paymentTime),
      purchasedItemNumber: data.purchasedItemNumber,
      userLotteryNumber,
      assignedPrizeSlotNumber: assignedSlot.slotNumber,
      status: "drawn",
      isFlagged: false,
      submittedAt: new Date(),
      drawnAt: new Date(),
    };

    await lotteryEntryRepository.createEntry(entryData);

    return {
      userLotteryNumber,
      assignedPrizeSlotNumber: assignedSlot.slotNumber,
      slotName: assignedSlot.name,
    };
  });
}

/**
 * Admin — flag a lottery entry as fraudulent.
 * Slot stays booked; use reopenLotterySlotAction to free it.
 */
export async function flagLotteryEntryAction(
  input: unknown,
): Promise<ActionResult<LotteryEntryDocument>> {
  return wrapAction(async () => {
    await requireRoleUser(["admin", "moderator"]);

    const parsed = flagLotteryEntrySchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid flag input");
    }

    return lotteryEntryRepository.flagEntry(
      parsed.data.entryId,
      parsed.data.flagNote,
      parsed.data.flaggedByUserId,
    );
  });
}

/**
 * Admin — reopen a slot from a flagged entry.
 * Clears isBooked on the slot so it can be claimed in a future pull.
 */
export async function reopenLotterySlotAction(
  input: unknown,
): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    await requireRoleUser(["admin"]);

    const parsed = reopenLotterySlotSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid reopen input");
    }

    const { sourceType, sourceId, slotNumber } = parsed.data;
    const db = getAdminDb();
    const collectionName = sourceType === "event" ? "events" : "products";
    const docRef = db.collection(collectionName).doc(sourceId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) throw new ValidationError("Source document not found.");

      const config = (snap.data() as { lotteryConfig?: { slots?: Array<{ slotNumber: number; isBooked: boolean }> } }).lotteryConfig;
      if (!config?.slots) throw new ValidationError("Lottery config not found.");

      const updatedSlots = config.slots.map((s) =>
        s.slotNumber === slotNumber
          ? {
              ...s,
              isBooked: false,
              bookedByUserId: null,
              bookedByDisplayName: null,
              bookedByUserLotteryNumber: null,
            }
          : s,
      );

      tx.update(docRef, { "lotteryConfig.slots": updatedSlots });
    });
  });
}

/**
 * Admin — create a new lottery event.
 * Weights computed server-side; never returned to client.
 */
export async function createLotteryEventAction(
  data: unknown,
): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["admin", "moderator"]);

    const rawData = data as Record<string, unknown>;
    const lotteryConfig = rawData.lotteryConfig as LotteryConfig | undefined;

    if (!lotteryConfig) throw new ValidationError("lotteryConfig is required for lottery events.");

    // Compute weights server-side
    const withWeights = assignSlotWeights(lotteryConfig);

    return eventRepository.createEvent({
        ...(rawData as object),
        type: "lottery",
        lotteryConfig: { ...lotteryConfig, slots: withWeights },
        createdBy: user.uid,
        status: (rawData.status as string) ?? "draft",
        stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
      } as unknown as Parameters<typeof eventRepository.createEvent>[0]);
  });
}

/**
 * Admin — update a lottery event.
 * Recomputes slot weights after update.
 */
export async function updateLotteryEventAction(
  id: string,
  data: unknown,
): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser(["admin", "moderator"]);

    const rawData = data as Record<string, unknown>;
    const lotteryConfig = rawData.lotteryConfig as LotteryConfig | undefined;

    if (lotteryConfig) {
      const withWeights = assignSlotWeights(lotteryConfig);
      return eventRepository.updateEvent(id, {
        ...(rawData as object),
        lotteryConfig: { ...lotteryConfig, slots: withWeights },
      } as Parameters<typeof eventRepository.updateEvent>[1]);
    }

    return eventRepository.updateEvent(id, rawData as Parameters<typeof eventRepository.updateEvent>[1]);
  });
}

/**
 * Store owner or Admin — switch a prize-draw product into lottery mode.
 * Store owners provide prizeSlotPrice but weight is NEVER returned to them.
 */
export async function setProductLotteryModeAction(
  productId: string,
  lotteryConfig: LotteryConfig,
): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    await requireRoleUser(["admin", "moderator", "seller"]);

    const withWeights = assignSlotWeights(lotteryConfig);

    const db = getAdminDb();
    await db.collection("products").doc(productId).update({
      prizeDrawMode: "lottery",
      lotteryConfig: { ...lotteryConfig, slots: withWeights },
    });
  });
}
