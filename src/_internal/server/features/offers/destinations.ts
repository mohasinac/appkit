/**
 * Server-side verification that a coordinated purchase's destinations are real
 * and belong to the people naming them.
 *
 * ## 🛑 Why this file exists at all
 *
 * `CoordinationMember.destinationAddressId` is a REFERENCE, which is the right
 * shape — copying the address inline would put a name, a phone number and a
 * street into an offer document with no encryption story and no retention
 * story. But a reference has a failure mode a copy does not:
 *
 * **An id is guessable in a way an address is not.** Without this check a
 * member supplies any `addresses` document id and the parcel ships to a
 * stranger's house, at the coordinator's expense, with every other part of
 * the flow behaving correctly. Nothing errors; the order is valid; the goods
 * simply go somewhere nobody chose.
 *
 * So the rule is: **an id that crosses the wire is never trusted, and is
 * resolved against its claimed owner before anything is written.**
 */

import { addressesRepository } from "../../../../features/addresses/repository/addresses.repository";
import { ValidationError } from "../../../../errors/validation-error";
import type { CoordinationMember } from "../../../shared/features/offers/coordination";

/**
 * Every named destination must exist and belong to the member who named it.
 *
 * 🛑 **Owned by THAT MEMBER, not merely by someone.** Checking only that the
 * address exists and has `ownerType: "user"` would let a member ship to any
 * other user's saved address — the weaker check reads as a real one and
 * closes nothing.
 *
 * 🛑 **Fails the whole request, naming the member.** Dropping a bad
 * destination and shipping that member's parcel to the coordinator instead
 * would be a silent substitution of somebody's delivery address, which is
 * exactly the class of quiet wrongness this check exists to prevent. Grouped
 * cart lines take the same position for the same reason.
 *
 * One `getAll` over the distinct ids, not one read per member: five members
 * sharing two destinations is two reads, and Rule #6's budget is per request
 * rather than per member.
 */
export async function assertOwnedAddresses(
  members: readonly CoordinationMember[],
): Promise<void> {
  const named = members.filter(
    (m): m is CoordinationMember & { destinationAddressId: string } => !!m.destinationAddressId,
  );
  if (named.length === 0) return;

  const ids = [...new Set(named.map((m) => m.destinationAddressId))];
  const docs = await Promise.all(ids.map((id) => addressesRepository.findById(id)));
  const byId = new Map(ids.map((id, i) => [id, docs[i]]));

  for (const member of named) {
    const address = byId.get(member.destinationAddressId);
    /*
     * 🛑 ONE message for "does not exist" and "is not yours".
     *
     * Distinguishing them turns this endpoint into an oracle for which
     * `addresses` ids are real — a caller probes ids and reads existence off
     * the error text. The member who typed a genuinely stale id and the
     * member probing somebody else's get the same answer, and only the first
     * of those has a legitimate next step anyway (pick again).
     */
    if (!address || address.ownerType !== "user" || address.ownerId !== member.uid) {
      throw new ValidationError("A chosen delivery address is not available.", {
        destinationAddressId: `${member.uid}: that address cannot be used.`,
      });
    }
  }
}
