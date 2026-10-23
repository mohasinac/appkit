/**
 * Booking a parcel through the platform's own carrier account — Part 1′.
 *
 * ## 🛑 Why this could not be built until Part 14
 *
 * `CreateShipmentInput` needs a structured `{name, phone, addressLine1, city,
 * state, pincode, country}` for BOTH ends. Until the delivery snapshot landed
 * the order carried `shippingAddress?: string` — flat free text with no
 * pincode and no phone — and the only way to produce a party from it was to
 * parse prose. The `placeOfSupply` comment already refuses that for tax, and
 * the same argument holds here: a mis-parsed pincode is a parcel that goes to
 * the wrong city, except nothing errors and the label prints fine.
 *
 * `deliveryPartyFor(order)` now returns exactly that shape, or `null` when a
 * required field is missing — which is the only honest answer for an order
 * placed before the snapshot existed.
 *
 * ## 🛑 `platformBookedShipment` is the flag this writes
 *
 * `order-math.ts` gates shipping reimbursement on it
 * (`if (order.platformBookedShipment === true) return 0`) and
 * `quote.ts:241` records that it has had **ZERO writers** — so the
 * reimbursement rule has been reading a flag nothing sets. This is its
 * writer, which is why the booking and the dispatch form are one unit of
 * work and why the form must not ship first: a "Book through us" button with
 * no booking behind it is a control the server refuses.
 */

import { getProviders } from "../../../../contracts/registry";
import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import { storeRepository } from "../../../../features/stores/repository/store.repository";
import { addressesRepository } from "../../../../features/addresses/repository/addresses.repository";
import { deliveryPartyFor } from "../../../shared/features/orders/delivery-snapshot";
import { revealPii } from "../../../../security/pii-accessors";
import { ORDER_PII_FIELDS } from "../../../../security/pii-schemas";

/*
 * The order with its delivery PII decrypted. `revealPii`'s type parameter is
 * the OUTPUT shape, so naming `OrderDocument` there would assert the fields
 * are still `Encrypted<string>` — i.e. claim the decrypt did not happen, and
 * hand `deliveryPartyFor` the same unusable branded strings.
 *
 * Only the five encrypted fields are widened; city/state/pincode/country are
 * deliberately NOT PII (they have to stay queryable for tax and
 * serviceability) and keep their own types from `OrderDocument`.
 */
type PlainDeliveryOrder = Omit<
  OrderDocument,
  "deliveryFullName" | "deliveryPhone" | "deliveryAddressLine1" | "deliveryAddressLine2" | "deliveryLandmark"
> & {
  deliveryFullName?: string;
  deliveryPhone?: string;
  deliveryAddressLine1?: string;
  deliveryAddressLine2?: string;
  deliveryLandmark?: string;
};
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";
import type {
  CreateShipmentInput,
  Shipment,
  ShippingAddress,
} from "../../../../contracts/shipping";
import { ValidationError } from "../../../../errors/validation-error";
import { NotFoundError } from "../../../../errors/not-found-error";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";

export interface BookShipmentInput {
  orderId: string;
  /** Centimetres and kilograms, from the dispatch form's box preset. */
  dimensions: { weight: number; length: number; width: number; height: number };
  /** The store address the courier collects from. */
  pickupAddressId: string;
}

export interface BookShipmentResult {
  trackingId: string;
  courier?: string;
  estimatedDelivery?: string;
}

/**
 * Book one parcel.
 *
 * ## 🛑 The wallet is checked BEFORE the booking, and a failure is a 409
 *
 * A carrier account with no balance rejects the booking — but some providers
 * accept it and then silently fail to hand over, which produces a tracking id
 * that never moves. Checking first turns "the parcel vanished" into "top up
 * the account", and the 409 is deliberate: the request is well-formed and the
 * seller is not confused, the world is simply not ready.
 *
 * 🛑 `getWalletBalance` is NOT abstract on `IShippingProvider` — manual
 * shipping has no wallet, so a provider that does not implement it returns
 * undefined and the check is SKIPPED rather than failing. A missing balance
 * must never block a manual dispatch.
 */
export async function bookShipment(input: BookShipmentInput): Promise<BookShipmentResult> {
  const order = (await orderRepository.findById(input.orderId)) as OrderDocument | null;
  if (!order) throw new NotFoundError("Order not found.");

  if (order.trackingNumber) {
    /*
     * 409, not 400. Double-booking is the expensive mistake here — two
     * parcels, two charges, one of them never collected — and it is easy to
     * cause by refreshing a form.
     */
    throw new ValidationError("This order already has a shipment.", {
      orderId: `Already booked as ${order.trackingNumber}.`,
    });
  }

  /*
   * 🛑 DECRYPTED first. `OrderDocument`'s delivery name, phone and address
   * lines are `Encrypted<string>` (ciphertext-by-default), and `Encrypted<T>`
   * is deliberately assignable to nothing that wants a plain `string` — which
   * is what made this a compile error rather than a courier label printed
   * with `enc:v1:…` on it.
   *
   * A courier booking is the one place the plaintext is genuinely required:
   * the carrier has to deliver to a real person at a real door. Masked would
   * be the wrong default HERE and the right one almost everywhere else, which
   * is why the two accessors are separately named.
   */
  const delivery = deliveryPartyFor(revealPii<PlainDeliveryOrder>(order, ORDER_PII_FIELDS));
  if (!delivery) {
    /*
     * An order placed before the delivery snapshot existed. Refused, loudly,
     * rather than guessed at — see the module header on parsing prose.
     */
    throw new ValidationError(
      "This order has no structured delivery address, so it cannot be booked automatically.",
      { orderId: "Placed before structured addresses; dispatch it manually." },
    );
  }

  const pickupDoc = await addressesRepository.findById(input.pickupAddressId);
  const store = order.storeId ? await storeRepository.findBySlug(order.storeId) : null;
  /*
   * 🛑 The pickup address must belong to the ORDER'S STORE. Checking only
   * that it exists would let one seller's parcel be collected from another
   * seller's premises — the same class of hole `assertOwnedAddresses` closes
   * for coordinated purchases, and it is reachable here by id alone.
   */
  if (
    !pickupDoc ||
    pickupDoc.ownerType !== "store" ||
    !store ||
    pickupDoc.ownerId !== store.id
  ) {
    throw new ValidationError("That pickup address is not available for this store.", {
      pickupAddressId: "Pick one of this store's own addresses.",
    });
  }
  const pickupPlain = addressesRepository.revealAddress(pickupDoc);
  const pickup: ShippingAddress = {
    name: String(pickupPlain.fullName ?? store.storeName ?? ""),
    phone: String(pickupPlain.phone ?? ""),
    addressLine1: String(pickupPlain.addressLine1 ?? ""),
    ...(pickupPlain.addressLine2 ? { addressLine2: String(pickupPlain.addressLine2) } : {}),
    city: pickupPlain.city ?? "",
    state: pickupPlain.state ?? "",
    pincode: pickupPlain.postalCode ?? "",
    country: pickupPlain.country ?? "",
  };

  /*
   * 🛑 `getProviders().shipping` is OPTIONAL on the registry, and refusing
   * here is the honest handling. `providers.config.ts` always registers one
   * today, so this is unreachable in this app — but a non-null assertion
   * would turn the day somebody ships a build without it into a
   * `Cannot read properties of undefined` at the moment money is involved,
   * instead of a sentence a seller can act on.
   */
  const provider = getProviders().shipping;
  if (!provider) {
    throw new ValidationError("No shipping provider is configured.", {
      orderId: "Automatic booking is unavailable — dispatch this order manually.",
    });
  }

  /*
   * 🛑 `WalletBalance` is a THREE-state union and collapsing it is the whole
   * hazard the contract's own header describes. Only `{known: true, amount: 0}`
   * is a decision to skip. `{known: false}` means either "no wallet exists"
   * (manual shipping) or "could not read it right now" — and refusing on an
   * unreadable balance would fail every dispatch on a transient blip.
   *
   * An earlier draft of this function tested `typeof balance === "number"`,
   * which is never true against this contract: the guard was dead, so a
   * genuinely empty wallet would have been booked into anyway.
   */
  const balance = await provider.getWalletBalance().catch((err: unknown) => {
    void normalizeError(err);
    serverLogger.warn("bookShipment: wallet balance unavailable", { orderId: input.orderId });
    return { known: false, supported: true } as const;
  });
  if (balance.known && balance.amount <= 0) {
    throw new ValidationError(
      "The courier account has no balance, so the booking was not attempted.",
      { orderId: "Top up the carrier wallet and try again." },
    );
  }

  const payload: CreateShipmentInput = {
    orderId: input.orderId,
    dimensions: input.dimensions,
    pickup,
    delivery,
    ...(order.paymentMethod === "cod"
      ? { isCod: true, codAmount: order.codRemainingAmount ?? order.totalPrice }
      : {}),
  };

  const shipment: Shipment = await provider.createShipment(payload);

  /*
   * 🛑 `platformBookedShipment: true` is the WHOLE POINT of this function.
   *
   * `order-math.ts` already gates shipping reimbursement on it and nothing
   * has ever set it. Writing the tracking id without it would book the parcel
   * AND reimburse the seller for postage the platform just paid.
   */
  await orderRepository.update(input.orderId, {
    trackingNumber: shipment.trackingId,
    ...(shipment.courier ? { carrier: shipment.courier } : {}),
    platformBookedShipment: true,
  } as never);

  return {
    trackingId: shipment.trackingId,
    ...(shipment.courier ? { courier: shipment.courier } : {}),
    ...(shipment.estimatedDelivery ? { estimatedDelivery: shipment.estimatedDelivery } : {}),
  };
}
