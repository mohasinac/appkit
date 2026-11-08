"use server";

/*
 * 🛑 From the DEFINING module, never "@mohasinac/appkit/server".
 *
 * appkit importing its own public server barrel is a self-reference that drags
 * the whole server surface in behind it — `dist/server.js` reaches next/og,
 * next/navigation, next/headers and driver.js. Twenty `actions.ts` files did
 * this for two symbols, and because `obligationSweep` reaches one of them, the
 * Firebase Functions tsup bundle (noExternal: appkit) had to resolve Next:
 * it failed on two `react-server-dom-webpack/*` requires and two @vercel/og
 * .wasm files, naming none of the responsible files. Root Cause #18.
 */
import { wrapAction, type ActionResult } from "../../../shared/types/action-result";
import { getAdminDb } from "../../../../providers/db-firebase";
import { eventRepository, productRepository, orderRepository } from "../../../../repositories";
import { normalizeEventType } from "../../../../features/events/types/index";
import { serverLogger } from "../../../../monitoring";
import { giveawayEntryRepository } from "../../../../features/giveaway/repository/giveaway-entry.repository";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { ValidationError } from "../../../shared/errors/index";
import {
  submitGiveawayPullSchema,
  flagGiveawayEntrySchema,
  reopenGiveawaySlotSchema,
} from "../../../../features/giveaway/schemas/zod";
import {
  GiveawayError,
  assignSlotWeights,
  pickWeightedSlot,
} from "../../../../features/giveaway/types";
import type { GiveawayConfig } from "../../../../features/giveaway/types";
import type {
  GiveawayEntryDocument,
  GiveawayEntryPlain,
} from "../../../../features/giveaway/schemas/firestore";
import { GIVEAWAY_ENTRIES_COLLECTION } from "../../../../features/giveaway/schemas/firestore";

// ── Helpers ──────────────────────────────────────────────────────────────────

function isDrawWindowOpen(config: GiveawayConfig): boolean {
  // Draw window is implicitly open when there are unclaimed slots.
  // A real implementation would also check if the event status is "active".
  return config.slots.some((s) => !s.isBooked);
}

// ── Public actions ────────────────────────────────────────────────────────────

/**
 * User-initiated giveaway pull.
 * Atomically:
 * 1. Validates inputs + limits
 * 2. Runs weighted slot selection on unclaimed slots
 * 3. Marks the slot as booked
 * 4. Creates the GiveawayEntryDocument with assignedPrizeSlotNumber set
 *
 * Returns the assigned slot number so the user sees their prize immediately.
 */
export async function submitGiveawayPullAction(
  input: unknown,
): Promise<ActionResult<{ userGiveawayNumber: number; assignedPrizeSlotNumber: number; slotName: string }>> {
  return wrapAction(async () => {
    // Auth — must be logged in
    const user = await requireRoleUser(["user", "buyer", "seller", "admin", "moderator", "employee"]);

    const parsed = submitGiveawayPullSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid giveaway pull input");
    }

    const data = parsed.data;
    const sourceId = data.sourceType === "event" ? data.eventId! : data.productId!;
    const sourceField = data.sourceType === "event" ? "eventId" : "productId";

    // Load the event/product to get the giveawayConfig
    let giveawayConfig: GiveawayConfig;
    if (data.sourceType === "event") {
      const event = await eventRepository.findById(sourceId);
      // 🛑 `normalizeEventType`, not `===`: documents written before the
      // 2026-10-31 rename still hold `type: "giveaway"`, and a bare equality
      // would reject every one of them as "not found".
      if (!event || normalizeEventType(event.type) !== "random-draw") {
        throw new GiveawayError("GIVEAWAY_WINDOW_CLOSED", "Random draw event not found or not of type random-draw.");
      }
      if (event.status !== "active") {
        throw new GiveawayError("GIVEAWAY_WINDOW_CLOSED", "This giveaway is not currently active.");
      }
      if (!event.giveawayConfig) {
        throw new GiveawayError("GIVEAWAY_WINDOW_CLOSED", "Giveaway config not found on event.");
      }
      giveawayConfig = event.giveawayConfig;
    } else {
      const product = await productRepository.findById(sourceId);
      if (!product || product.listingType !== "clearance") {
        throw new GiveawayError("GIVEAWAY_WINDOW_CLOSED", "Clearance product not found.");
      }
      if (product.status !== "published") {
        throw new GiveawayError("GIVEAWAY_WINDOW_CLOSED", "This clearance draw is not currently active.");
      }
      if (product.prizeDrawMode !== "giveaway" || !product.giveawayConfig) {
        throw new GiveawayError("GIVEAWAY_WINDOW_CLOSED", "Giveaway config not found on product.");
      }
      giveawayConfig = product.giveawayConfig;
    }

    // Check draw window
    if (!isDrawWindowOpen(giveawayConfig)) {
      throw new GiveawayError("GIVEAWAY_FULL", "All slots have been claimed.");
    }

    // Enforce maxPullsPerUser
    const existingUserPulls = await giveawayEntryRepository.countByUser(sourceId, sourceField, user.uid);
    if (existingUserPulls >= giveawayConfig.maxPullsPerUser) {
      throw new GiveawayError("USER_LIMIT_REACHED", "You have reached the maximum number of pulls for this giveaway.");
    }

    /*
     * ── D52: THE TRANSACTION MUST BE A REAL, PAID, CALLER-OWNED ORDER ──────
     *
     * 🛑 Before this, `data.transactionId` was a user-supplied STRING
     * (`z.string().min(4)`) and the only thing checked was a COUNT of prior
     * entries carrying the same string. Nothing verified that the transaction
     * existed, that it was paid, or that it belonged to the caller — and
     * `paymentTime` was user-supplied too.
     *
     * So **anyone could claim a giveaway slot for free** by typing any
     * four-character string, up to `maxPullsPerUser`, and then another
     * `maxPullsPerUser` under the next string. On a giveaway whose slots carry
     * real prices and real prizes.
     *
     * The code knew: `// FUTURE_FINANCIAL_DB: external_tx_id →
     * giveaway_transactions.external_tx_id`, pointing at a collection that does
     * not exist. The gap was marked and left open.
     *
     * It does not need that collection: a clearance entry is bought through
     * the ordinary cart, so a paid ORDER is the payment record we already
     * have. `maxPullsPerTransaction` then does what its name says — it bounds
     * pulls per PAYMENT rather than per guessed string.
     *
     * 🛑 THE TWO SOURCES HAVE DIFFERENT PAYMENT REALITIES, and pretending
     * otherwise would either leave the hole open or break a working feature.
     *
     * · A PRODUCT-sourced giveaway is a `clearance` listing bought through the
     *   ordinary cart, so a paid ORDER exists and is verifiable. Required.
     *
     * · An EVENT-sourced giveaway carries real slot prices (the seed has both
     *   `uniform` and `variable` events) and has **no cart or checkout path at
     *   all** — an event is not a product and cannot be added to a cart. So
     *   the typed `transactionId` was the ENTIRE payment record: an
     *   honour-system reference with nothing behind it.
     *
     *   Requiring an order here would break every event giveaway. Accepting the
     *   string silently is the hole. So the entry is accepted and marked
     *   `isFlagged` for admin review BEFORE the draw — `flagGiveawayEntry`
     *   already exists for exactly this, and an admin can clear or void it.
     *   That makes the unverified state VISIBLE instead of indistinguishable
     *   from a paid one.
     *
     * 🛑 This is a stopgap, not a fix, and it is the honest one available
     * without building a checkout path for events. The real fix is to make an
     * event giveaway purchasable (or free), which is a product decision.
     */
    let paymentUnverified = false;
    if (data.sourceType === "product") {
      const payingOrder = await orderRepository.findById(data.transactionId);
      /*
       * "Not found" and "not yours" share one message DELIBERATELY.
       * Distinguishing them confirms that an order id exists and belongs to
       * someone else, which is an enumeration oracle over order ids.
       */
      if (!payingOrder || payingOrder.userId !== user.uid) {
        throw new GiveawayError(
          "TX_ALREADY_USED",
          "That order could not be found. Enter the order ID from your confirmation email.",
        );
      }
      if (payingOrder.paymentStatus !== "paid") {
        throw new GiveawayError(
          "TX_ALREADY_USED",
          "That order has not been paid yet. Once the payment is confirmed you can claim your slot.",
        );
      }
      /*
       * The order must contain THIS clearance draw, or one paid order could be
       * spent across every open giveaway on the site.
       *
       * Both shapes are checked: `items[]` is the fan-out form, and the flat
       * `productId` is the PRIMARY field on an order — CLAUDE.md's own
       * correction records that `items` is OPTIONAL and the flat fields are
       * not legacy residue, so checking only one misses real orders.
       */
      const orderCoversSource =
        payingOrder.productId === sourceId ||
        (payingOrder.items ?? []).some((i) => i.productId === sourceId);
      if (!orderCoversSource) {
        throw new GiveawayError(
          "TX_ALREADY_USED",
          "That order does not include this clearance draw. Check the order ID.",
        );
      }
    } else {
      paymentUnverified = true;
      serverLogger.warn(
        "[giveaway] event pull accepted with an UNVERIFIED payment reference — flagged for admin review",
        { eventId: sourceId, uid: user.uid, transactionId: data.transactionId },
      );
    }

    // Enforce maxPullsPerTransaction — now per PAYMENT, not per guessed string.
    const existingTxPulls = await giveawayEntryRepository.countByTransactionId(
      sourceId,
      sourceField,
      data.transactionId,
    );
    if (existingTxPulls >= giveawayConfig.maxPullsPerTransaction) {
      throw new GiveawayError("TX_ALREADY_USED", "This order has already been used for the maximum number of pulls.");
    }

    // Atomically: pick slot + create entry + mark slot booked
    const db = getAdminDb();
    const sourceCollectionName = data.sourceType === "event" ? "events" : "products";
    const sourceDocRef = db.collection(sourceCollectionName).doc(sourceId);

    const { assignedSlot, userGiveawayNumber } = await db.runTransaction(async (tx) => {
      // Re-read giveawayConfig inside transaction for freshness
      const sourceSnap = await tx.get(sourceDocRef);
      if (!sourceSnap.exists) throw new GiveawayError("GIVEAWAY_WINDOW_CLOSED", "Giveaway source not found.");

      const freshConfig = (sourceSnap.data() as { giveawayConfig?: GiveawayConfig }).giveawayConfig;
      if (!freshConfig) throw new GiveawayError("GIVEAWAY_WINDOW_CLOSED", "Giveaway config missing.");

      const freshWeighted = assignSlotWeights(freshConfig);
      const unclaimed = freshWeighted.filter((s) => !s.isBooked);
      if (unclaimed.length === 0) throw new GiveawayError("GIVEAWAY_FULL", "All slots have been claimed.");

      // Weighted pick
      const chosen = pickWeightedSlot(unclaimed);

      // Compute next userGiveawayNumber (count + 1 inside tx via collection size)
      const countSnap = await db
        .collection(GIVEAWAY_ENTRIES_COLLECTION)
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
              bookedByUserGiveawayNumber: nextNumber,
            }
          : s,
      );

      tx.update(sourceDocRef, {
        "giveawayConfig.slots": updatedSlots,
      });

      return { assignedSlot: chosen, userGiveawayNumber: nextNumber };
    });

    /*
     * Create the entry document outside the transaction (acceptable — slot is
     * already booked).
     *
     * Typed `GiveawayEntryPlain`: this is PLAINTEXT from the session and the
     * request body, and `createEntry` encrypts it. The document type now says
     * `Encrypted<string>`, so annotating this `GiveawayEntryDocument` is a
     * compile error — correctly, because the values here are not ciphertext.
     */
    const entryData: Omit<GiveawayEntryPlain, "id"> = {
      sourceType: data.sourceType,
      ...(data.sourceType === "event" ? { eventId: sourceId } : { productId: sourceId }),
      userId: user.uid,
      userDisplayName: (user as unknown as { displayName?: string; name?: string }).displayName ?? (user as unknown as { name?: string }).name ?? undefined,
      userEmail: user.email ?? undefined,
      userPhone: data.userPhone,
      transactionId: data.transactionId,
      paymentTime: new Date(data.paymentTime),
      purchasedItemNumber: data.purchasedItemNumber,
      userGiveawayNumber,
      assignedPrizeSlotNumber: assignedSlot.slotNumber,
      status: "drawn",
      /*
       * D52 — an EVENT pull carries no verifiable payment (events have no
       * cart path), so it is flagged on creation rather than recorded as if it
       * were paid. A product pull reached here only after its order was
       * verified paid, caller-owned and covering this draw, so it is not
       * flagged.
       *
       * This is what makes the unverified state visible to an admin before the
       * draw instead of indistinguishable from a paid one.
       */
      isFlagged: paymentUnverified,
      ...(paymentUnverified
        ? {
            flagNote:
              "Payment reference not verified — event giveaways have no checkout path, so this reference was typed by the entrant. Confirm the payment before the draw.",
          }
        : {}),
      submittedAt: new Date(),
      drawnAt: new Date(),
    };

    await giveawayEntryRepository.createEntry(entryData);

    return {
      userGiveawayNumber,
      assignedPrizeSlotNumber: assignedSlot.slotNumber,
      slotName: assignedSlot.name,
    };
  });
}

/**
 * Admin — flag a giveaway entry as fraudulent.
 * Slot stays booked; use reopenGiveawaySlotAction to free it.
 */
export async function flagGiveawayEntryAction(
  input: unknown,
): Promise<ActionResult<GiveawayEntryDocument>> {
  return wrapAction(async () => {
    await requireRoleUser(["admin", "moderator"]);

    const parsed = flagGiveawayEntrySchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid flag input");
    }

    return giveawayEntryRepository.flagEntry(
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
export async function reopenGiveawaySlotAction(
  input: unknown,
): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    await requireRoleUser(["admin"]);

    const parsed = reopenGiveawaySlotSchema.safeParse(input);
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

      const config = (snap.data() as { giveawayConfig?: { slots?: Array<{ slotNumber: number; isBooked: boolean }> } }).giveawayConfig;
      if (!config?.slots) throw new ValidationError("Giveaway config not found.");

      const updatedSlots = config.slots.map((s) =>
        s.slotNumber === slotNumber
          ? {
              ...s,
              isBooked: false,
              bookedByUserId: null,
              bookedByDisplayName: null,
              bookedByUserGiveawayNumber: null,
            }
          : s,
      );

      tx.update(docRef, { "giveawayConfig.slots": updatedSlots });
    });
  });
}

/**
 * Admin — create a new giveaway event.
 * Weights computed server-side; never returned to client.
 */
export async function createGiveawayEventAction(
  data: unknown,
): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["admin", "moderator"]);

    const rawData = data as Record<string, unknown>;
    const giveawayConfig = rawData.giveawayConfig as GiveawayConfig | undefined;

    if (!giveawayConfig) throw new ValidationError("giveawayConfig is required for giveaway events.");

    // Compute weights server-side
    const withWeights = assignSlotWeights(giveawayConfig);

    return eventRepository.createEvent({
        ...(rawData as object),
        type: "random-draw",
        giveawayConfig: { ...giveawayConfig, slots: withWeights },
        createdBy: user.uid,
        status: (rawData.status as string) ?? "draft",
        stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
      } as unknown as Parameters<typeof eventRepository.createEvent>[0]);
  });
}

/**
 * Admin — update a giveaway event.
 * Recomputes slot weights after update.
 */
export async function updateGiveawayEventAction(
  id: string,
  data: unknown,
): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser(["admin", "moderator"]);

    const rawData = data as Record<string, unknown>;
    const giveawayConfig = rawData.giveawayConfig as GiveawayConfig | undefined;

    if (giveawayConfig) {
      const withWeights = assignSlotWeights(giveawayConfig);
      return eventRepository.updateEvent(id, {
        ...(rawData as object),
        giveawayConfig: { ...giveawayConfig, slots: withWeights },
      } as Parameters<typeof eventRepository.updateEvent>[1]);
    }

    return eventRepository.updateEvent(id, rawData as Parameters<typeof eventRepository.updateEvent>[1]);
  });
}

/**
 * Store owner or Admin — switch a clearance product into giveaway mode.
 * Store owners provide prizeSlotPrice but weight is NEVER returned to them.
 */
export async function setProductGiveawayModeAction(
  productId: string,
  giveawayConfig: GiveawayConfig,
): Promise<ActionResult<void>> {
  return wrapAction(async () => {
    await requireRoleUser(["admin", "moderator", "seller"]);

    const withWeights = assignSlotWeights(giveawayConfig);

    const db = getAdminDb();
    await db.collection("products").doc(productId).update({
      prizeDrawMode: "giveaway",
      giveawayConfig: { ...giveawayConfig, slots: withWeights },
    });
  });
}
