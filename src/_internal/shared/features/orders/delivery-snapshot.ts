/**
 * The delivery snapshot — what the buyer chose, frozen at checkout.
 *
 * ## 🛑 Why the fields are flat and ugly
 *
 * 🛑 **CORRECTED.** This read "`encryptPiiFields` is a flat top-level loop
 * that never descends", which is FALSE — it handles `a.b` and `a[].b` via
 * `encryptInArray`, and `CONVERSATION_PII_FIELDS` ships `lastMessage.body`.
 *
 * What it does not do is INFER. A nested `deliveryAddress: {fullName, …}`
 * is covered only if somebody writes `deliveryAddress.fullName` into
 * `ORDER_PII_FIELDS`, and the near-miss `"fullName"` reads as covering it
 * while storing plaintext.
 *
 * The decisive argument is not tidiness: **an unencrypted nested field looks
 * identical to an encrypted one in every inspection** — both are `string`,
 * and `Encrypted<string>` is erased at runtime. Flat keys cannot
 * silently half-apply, because `ORDER_PII_FIELDS` either names them or does
 * not and the audit can see which.
 *
 * ## 🛑 Four fields are deliberately NOT encrypted
 *
 * `city` / `state` / `pincode` / `country` decide tax and serviceability and
 * must stay QUERYABLE. An encrypted pincode cannot be filtered, grouped into
 * a courier manifest, or read by `placeOfSupply` without a decrypt per row.
 * They are not PII in any useful sense on their own.
 */

import type { AddressPlain } from "../../../../features/addresses/schemas/firestore";

/** The plaintext shape — what a caller builds and what the repository encrypts. */
export interface DeliverySnapshot {
  deliveryFullName: string;
  deliveryPhone: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2?: string;
  deliveryLandmark?: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryPincode: string;
  deliveryCountry: string;
  deliveryAddressId: string;
}

/**
 * Freeze a chosen address onto an order.
 *
 * 🛑 Takes the resolved DOCUMENT, never an id. Resolving here would mean a
 * second read on the money path, and — worse — would invite a caller to pass
 * an id it had not verified belongs to the buyer. The checkout already loads
 * and ownership-checks the address; this just copies it.
 *
 * 🛑 Takes `AddressPlain`, not `AddressDocument`, and that is the point.
 * `addressesRepository` encrypts `fullName` / `phone` / `addressLine1` on
 * write, so a raw `findById` returns CIPHERTEXT — snapshotting it would put
 * `enc:v1:…` on the invoice, and nothing would catch it because both are
 * `string` at runtime and `Encrypted<string>` is erased.
 *
 * Demanding the revealed type makes the mistake a COMPILE error instead of a
 * comment nobody reads. Call `addressesRepository.revealAddress(doc)` first.
 */
export function snapshotDeliveryAddress(address: AddressPlain): DeliverySnapshot {
  return {
    deliveryFullName: String(address.fullName ?? ""),
    deliveryPhone: String(address.phone ?? ""),
    deliveryAddressLine1: String(address.addressLine1 ?? ""),
    ...(address.addressLine2 ? { deliveryAddressLine2: String(address.addressLine2) } : {}),
    ...(address.landmark ? { deliveryLandmark: String(address.landmark) } : {}),
    deliveryCity: address.city ?? "",
    deliveryState: address.state ?? "",
    deliveryPincode: address.postalCode ?? "",
    deliveryCountry: address.country ?? "",
    deliveryAddressId: address.id,
  };
}

/** Everything a carrier booking needs, in `CreateShipmentInput`'s shape. */
export interface DeliveryParty {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

/**
 * What the PARCEL goes to — the latest amendment, or the snapshot.
 *
 * 🛑 This is the one read that must NOT use the snapshot, and the invoice is
 * the one that must. A buyer who corrects their address before dispatch
 * expects the parcel to follow; the invoice records what was agreed when they
 * paid. Collapsing the two is how a parcel goes to the old address or an
 * invoice silently restates itself.
 *
 * Returns `null` rather than a partial party when a required field is
 * missing — a booking built from blanks is accepted by the carrier and
 * delivered nowhere.
 */
export function deliveryPartyFor(order: {
  deliveryFullName?: string;
  deliveryPhone?: string;
  deliveryAddressLine1?: string;
  deliveryAddressLine2?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryPincode?: string;
  deliveryCountry?: string;
  deliveryAmendments?: Array<{
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  }>;
}): DeliveryParty | null {
  const latest = order.deliveryAmendments?.[order.deliveryAmendments.length - 1];
  const party: DeliveryParty = latest
    ? {
        name: latest.fullName,
        phone: latest.phone,
        addressLine1: latest.addressLine1,
        ...(latest.addressLine2 ? { addressLine2: latest.addressLine2 } : {}),
        city: latest.city,
        state: latest.state,
        pincode: latest.pincode,
        country: latest.country,
      }
    : {
        name: order.deliveryFullName ?? "",
        phone: order.deliveryPhone ?? "",
        addressLine1: order.deliveryAddressLine1 ?? "",
        ...(order.deliveryAddressLine2 ? { addressLine2: order.deliveryAddressLine2 } : {}),
        city: order.deliveryCity ?? "",
        state: order.deliveryState ?? "",
        pincode: order.deliveryPincode ?? "",
        country: order.deliveryCountry ?? "",
      };

  const required = [
    party.name,
    party.phone,
    party.addressLine1,
    party.city,
    party.state,
    party.pincode,
    party.country,
  ];
  return required.every((v) => v.trim().length > 0) ? party : null;
}

/**
 * The state the tax split was decided from.
 *
 * 🛑 Reads the SNAPSHOT, never an amendment. Place of supply is fixed at the
 * time of supply; an address correction after the fact does not re-decide
 * CGST/SGST versus IGST on an invoice that has been issued and may have been
 * filed. That is the same forward-only rule `/admin/pricing` holds for rates.
 */
export function placeOfSupplyFrom(order: { deliveryState?: string }): string | undefined {
  return order.deliveryState || undefined;
}
