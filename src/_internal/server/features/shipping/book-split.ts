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
import { serverLogger } from "../../../../monitoring/server-logger";

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
 * direction — and it is the same reasoning `bookShipment` applies to a wallet
 * balance it could not read.
 *
 * A MISSING pincode is the opposite case and is reported unserviceable: that
 * is a fact about the stored address, not about the provider, and it will not
 * fix itself on a retry.
 */
export async function checkDestinations(
  members: readonly CoordinationMember[],
  /**
   * 🛑 The parcel's weight in kg, NOT an origin pincode.
   *
   * `IShippingProvider.checkServiceability(pincode, weight)` reads its first
   * argument as the DESTINATION. A reasonable guess of `(origin, destination)`
   * would pass two strings into a `(string, number)` signature — caught by
   * `tsc` here, but worth naming because the argument ORDER is the part a
   * reader assumes.
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

  /*
   * 🛑 Optional on the registry. This is the serviceability PRE-FLIGHT, so
   * with no provider the honest answer is "unknown", not "unserviceable":
   * reporting every destination as unserviceable would block an accept that
   * manual dispatch handles perfectly well.
   */
  const provider = getProviders().shipping;
  if (!provider) {
    return ids.map((addressId) => ({ addressId, pincode: "", serviceable: true }));
  }
  const docs = await Promise.all(ids.map((id) => addressesRepository.findById(id)));

  return Promise.all(
    ids.map(async (addressId, i) => {
      /*
       * 🛑 `.postalCode` needs no reveal — it is not PII and
       * `AddressRepository` deliberately leaves it unencrypted so it stays
       * queryable (see its own `computeAddressHash` comment). Calling
       * `revealAddress` here would decrypt a name and a phone number we have
       * no use for, on a path that only needs six digits.
       */
      const pincode = docs[i]?.postalCode ?? "";
      if (!pincode) return { addressId, pincode, serviceable: false };

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

/**
 * The parcels one coordinated order produces.
 *
 * 🛑 **Keyed by ADDRESS, not by member.** Two members naming the same address
 * are one parcel, not two — that is the whole reason `destinationIds` returns
 * a distinct set. Fanning out per member would book the courier twice to the
 * same door and bill for both.
 *
 * 🛑 **A member with no `destinationAddressId` is NOT in this list.** Absent
 * means "the coordinator's address", which is the ordinary one-parcel case
 * and is handled by `bookShipment`'s existing single-delivery path — the
 * order's own snapshot. Inventing a parcel for them here would duplicate it.
 */
export interface ParcelPlan {
  addressId: string;
  /** Members whose share rides in this parcel. Never empty. */
  memberUids: string[];
}

export function planParcels(members: readonly CoordinationMember[]): ParcelPlan[] {
  const byAddress = new Map<string, string[]>();
  for (const m of members) {
    if (!m.destinationAddressId) continue;
    const uids = byAddress.get(m.destinationAddressId);
    if (uids) uids.push(m.uid);
    else byAddress.set(m.destinationAddressId, [m.uid]);
  }
  return [...byAddress].map(([addressId, memberUids]) => ({ addressId, memberUids }));
}
