/**
 * S5a — one parcel per destination on a coordinated purchase.
 *
 * A coordinated purchase can send each member's share to their own address
 * (`CoordinationMember.destinationAddressId`). That is N parcels from one
 * order, which is N bookings and N serviceability checks.
 *
 * ## 🛑 Serviceability is checked for EVERY destination BEFORE any booking
 *
 * Booking as you go and failing on the fourth leaves three parcels already
 * accepted by the carrier and a coordinator who cannot undo them — the
 * cancel path exists but the money and the pickup slot are gone. A
 * pre-flight over all destinations turns that into one refusal naming the
 * pincode that cannot be served, before anything is committed.
 *
 * Two-phase on purpose, and it is NOT a transaction: a carrier booking has
 * no rollback. What the pre-flight buys is that the common failure — an
 * unservable pincode — is caught while rolling back is still free.
 *
 * ## 🛑 Bounded by `SHARED_PURCHASE_MAX_MEMBERS`
 *
 * Five destinations is five outbound calls for serviceability and five more
 * to book, on a path somebody is waiting on. That ceiling is why the limit
 * exists at all; see the registry's own header.
 */

import { getProviders } from "../../../../contracts/registry";
import { addressesRepository } from "../../../../features/addresses/repository/addresses.repository";
import {
  SHARED_PURCHASE_MAX_MEMBERS,
  destinationIds,
  type CoordinationMember,
} from "../../../shared/features/offers/coordination";
import { ValidationError } from "../../../../errors/validation-error";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../utils/server-logger";

export interface DestinationCheck {
  addressId: string;
  pincode: string;
  serviceable: boolean;
}

/**
 * Can every named destination actually be delivered to?
 *
 * 🛑 Returns the FULL list, not the first failure. A coordinator fixing one
 * unservable address only to be told about the next one is three round trips
 * for a problem that was knowable in one — and each round trip is another
 * chance for someone to give up with the arrangement half-built.
 *
 * 🛑 An UNREADABLE check is treated as serviceable. A provider timeout is not
 * evidence that a pincode cannot be served, and refusing on it would block a
 * legitimate purchase on an outage we caused. The booking itself will fail
 * loudly if the address really is unservable, which is the recoverable
 * direction.
 */
export async function checkDestinations(
  members: readonly CoordinationMember[],
  /**
   * 🛑 The parcel's weight in kg, NOT an origin pincode.
   *
   * `IShippingProvider.checkServiceability(pincode, weight)` reads the pincode
   * as the DESTINATION and the second argument as weight — a reasonable guess
   * of `(origin, destination)` typechecks (both strings would not, but a
   * number and a string are distinguishable) and would ask the carrier about
   * the wrong thing entirely.
   */
  weightKg: number,
): Promise<DestinationCheck[]> {
  const ids = destinationIds(members);
  if (ids.length === 0) return [];
  if (ids.length > SHARED_PURCHASE_MAX_MEMBERS) {
    throw new ValidationError(
      `A coordinated purchase can ship to at most ${SHARED_PURCHASE_MAX_MEMBERS} addresses.`,
      { destinations: `${ids.length} distinct addresses named.` },
    );
  }

  const provider = getProviders().shipping;
  const docs = await Promise.all(ids.map((id) => addressesRepository.findById(id)));

  return Promise.all(
    ids.map(async (addressId, i) => {
      const pincode = docs[i]?.postalCode ?? "";
      if (!pincode) {
        return { addressId, pincode, serviceable: false };
      }
      try {
        const res = await provider.checkServiceability(pincode, weightKg);
        return { addressId, pincode, serviceable: res.isServiceable };
      } catch (err) {
        void normalizeError(err);
        serverLogger.warn("checkDestinations: serviceability unreadable", { addressId, pincode });
        return { addressId, pincode, serviceable: true };
      }
    }),
  );
}

/**
 * Refuse the whole arrangement if any destination cannot be served.
 *
 * Names every failing pincode, for the reason above.
 */
export function assertAllServiceable(checks: readonly DestinationCheck[]): void {
  const bad = checks.filter((c) => !c.serviceable);
  if (bad.length === 0) return;
  throw new ValidationError(
    bad.length === 1
      ? "One delivery address cannot be served by the courier."
      : `${bad.length} delivery addresses cannot be served by the courier.`,
    {
      destinations: bad
        .map((b) => (b.pincode ? `${b.pincode}: not serviceable` : "missing pincode"))
        .join("; "),
    },
  );
}
