/**
 * Correcting a delivery address after the order was placed.
 *
 * ## 🛑 This APPENDS. It never touches the snapshot.
 *
 * `delivery*` on the order is what the buyer chose when they paid — it is
 * what the invoice states and what a dispute argues over. A correction is a
 * new fact about where the parcel should go, not a revision of what was
 * agreed, and collapsing the two is how an invoice silently restates itself.
 *
 * `deliveryPartyFor` reads the latest amendment; `placeOfSupplyFrom` reads
 * the snapshot. Tax is fixed at the time of supply.
 *
 * ## 🛑 There is a window, and it closes at dispatch
 *
 * Once a tracking id exists the parcel is with the courier and a new address
 * changes nothing we control — accepting one would tell the buyer their
 * correction took effect when it did not. That is a worse outcome than
 * refusing, which at least routes them to support.
 */

import { addressesRepository } from "../../../../features/addresses/repository/addresses.repository";
import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import {
  AMENDMENT_PII_FIELDS,
  type DeliveryAmendment,
  type OrderDocument,
} from "../../../../features/orders/schemas/firestore";
import { revealPii } from "../../../../security/pii-accessors";
import { ValidationError } from "../../../../errors/validation-error";
import { NotFoundError } from "../../../../errors/not-found-error";
import { HISTORY_ACTOR_ROLE, type HistoryActor } from "../../../shared/history";

/**
 * How many corrections one order may carry.
 *
 * 🛑 Bounded for the same reason `statusHistory` is: this array rides on the
 * order document, which has a 1 MiB ceiling and is read by every list query.
 * Unlike `statusHistory` it does NOT evict — reaching the cap is refused,
 * because dropping the oldest amendment would silently discard an address a
 * parcel may already have gone to.
 *
 * Ten is far past any honest use. A buyer correcting an address eleven times
 * is a support conversation, not a form submission.
 */
export const DELIVERY_AMENDMENT_MAX = 10;

export interface AmendDeliveryInput {
  orderId: string;
  /** An `addresses` row belonging to the actor. Never a loose address. */
  addressId: string;
  reason?: string;
}

/**
 * 🛑 The new address is a REFERENCE the caller must own, resolved here — not
 * a free-form address object.
 *
 * Accepting fields directly would let a correction route a parcel anywhere
 * with no record that the destination was ever the buyer's, which is the
 * same hole `assertOwnedAddresses` closes for coordinated purchases. The
 * resolved values are then COPIED into the amendment, because the row can be
 * edited or deleted afterwards and a label must not depend on that.
 */
export async function amendDeliveryAddress(
  input: AmendDeliveryInput,
  actor: HistoryActor & { uid: string },
): Promise<DeliveryAmendment> {
  const order = (await orderRepository.findById(input.orderId)) as OrderDocument | null;
  if (!order) throw new NotFoundError("Order not found.");

  /*
   * Ownership. A seller or admin may correct on a buyer's behalf — that is
   * the support flow — but a BUYER may only touch their own order.
   */
  if (actor.role === HISTORY_ACTOR_ROLE.BUYER && order.userId !== actor.uid) {
    throw new NotFoundError("Order not found.");
  }

  if (order.trackingNumber) {
    throw new ValidationError(
      "This order has already been dispatched, so its address can no longer be changed.",
      { addressId: "Already dispatched — contact support." },
    );
  }

  const existing = order.deliveryAmendments ?? [];
  if (existing.length >= DELIVERY_AMENDMENT_MAX) {
    throw new ValidationError(
      "This order has been corrected too many times. Please contact support.",
      { addressId: `Limit of ${DELIVERY_AMENDMENT_MAX} corrections reached.` },
    );
  }

  const addressDoc = await addressesRepository.findById(input.addressId);
  /*
   * Owned by the ORDER'S BUYER, not by the actor. A support agent correcting
   * on someone's behalf must still pick from that buyer's own addresses —
   * checking the actor would let staff route a parcel to their own address.
   */
  if (!addressDoc || addressDoc.ownerType !== "user" || addressDoc.ownerId !== order.userId) {
    throw new ValidationError("That delivery address is not available.", {
      addressId: "That address cannot be used.",
    });
  }
  const address = addressesRepository.revealAddress(addressDoc);

  const amendment: DeliveryAmendment = {
    at: new Date(),
    actorUid: actor.uid,
    actorRole: actor.role,
    ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
    fullName: String(address.fullName ?? ""),
    phone: String(address.phone ?? ""),
    addressLine1: String(address.addressLine1 ?? ""),
    ...(address.addressLine2 ? { addressLine2: String(address.addressLine2) } : {}),
    ...(address.landmark ? { landmark: String(address.landmark) } : {}),
    city: address.city ?? "",
    state: address.state ?? "",
    pincode: address.postalCode ?? "",
    country: address.country ?? "",
  };

  /*
   * 🛑 NOT encrypted here. `ORDER_PII_FIELDS` declares
   * `deliveryAmendments[].fullName` and friends, and the repository's write
   * hook runs that list through `encryptInArray` — which the encryptor has
   * always supported.
   *
   * The first draft of this file encrypted by hand, on the belief that
   * `encryptPiiFields` "is a flat top-level loop that never descends". That
   * is CLAUDE.md's wording and it is false: the function handles `a.b` and
   * `a[].b` in both directions, and `CONVERSATION_PII_FIELDS` has been using
   * the dotted form in production. Encrypting here as well would double-
   * encrypt — the guard is a `enc:v1:` prefix test, so the second pass is a
   * no-op today and a silent corruption the day the prefix changes.
   */

  /*
   * 🛑 Whole array, not `arrayUnion`. `arrayUnion` cannot enforce the cap —
   * the same reason `withHistory`'s batch paths fold in memory — and it
   * de-duplicates by value, so two identical corrections would collapse into
   * one and the record would under-state what happened.
   */
  await orderRepository.update(input.orderId, {
    deliveryAmendments: [...existing, amendment],
  } as never);

  return amendment;
}

/** Plaintext amendments, for a surface that renders them. */
export function revealAmendments(order: OrderDocument): DeliveryAmendment[] {
  return (order.deliveryAmendments ?? []).map(
    (a) => revealPii(a as never, AMENDMENT_PII_FIELDS as unknown as string[]) as DeliveryAmendment,
  );
}
