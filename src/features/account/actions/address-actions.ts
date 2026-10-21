// SB-UNI-A 2026-05-13 — thin shim re-pointing the legacy `*ForUser` action
// surface at the unified `addressesRepository` (ownerType:"user"). Kept so
// existing callers (src/actions/address.actions.ts, _internal data layer)
// don't need to update.
import { serverLogger } from "../../../monitoring";
import { addressesRepository } from "../../addresses/repository/addresses.repository";
import type {
  AddressCreateInput,
  AddressDocument,
  AddressPlain,
  AddressUpdateInput,
} from "../../addresses/schemas";

export async function createAddressForUser(
  userId: string,
  input: AddressCreateInput,
): Promise<AddressDocument> {
  serverLogger.debug("createAddressForUser", { userId });
  return addressesRepository.createForOwner("user", userId, input);
}

export async function updateAddressForUser(
  userId: string,
  addressId: string,
  input: AddressUpdateInput,
): Promise<AddressDocument> {
  serverLogger.debug("updateAddressForUser", { userId, addressId });
  return addressesRepository.updateForOwner("user", userId, addressId, input);
}

export async function deleteAddressForUser(
  userId: string,
  addressId: string,
): Promise<void> {
  serverLogger.debug("deleteAddressForUser", { userId, addressId });
  return addressesRepository.deleteForOwner("user", userId, addressId);
}

export async function setDefaultAddressForUser(
  userId: string,
  addressId: string,
): Promise<AddressDocument> {
  serverLogger.debug("setDefaultAddressForUser", { userId, addressId });
  return addressesRepository.setDefault("user", userId, addressId);
}

export async function listAddressesForUser(
  userId: string,
): Promise<AddressDocument[]> {
  return addressesRepository.listByOwner("user", userId);
}

/**
 * One address, for the person who owns it.
 *
 * 🛑 RETURNS PLAINTEXT, and the return TYPE says so.
 *
 * `AddressesRepository.mapDoc` does not decrypt — the repository is
 * ciphertext-by-default — so this returned `enc:v1:` blobs for `fullName`,
 * `phone` and the street lines. Its one caller is a server action that hands
 * the result straight to the client, so the owner's own saved address
 * rendered as ciphertext. That is the `/user/addresses` symptom the audit
 * measured, reached through a second door: the ROUTE was fixed with
 * `revealAddresss`, this action path was not.
 *
 * Revealing belongs HERE rather than at the caller, because this function is
 * the thing that knows the read is owner-scoped — it refuses any address
 * whose `ownerId` is not the caller's, three lines down. A caller cannot make
 * that judgement without repeating the check.
 *
 * And the signature is `AddressPlain`, not `AddressDocument`, so the choice
 * is visible in review and `tsc` enumerates anyone who assumed otherwise —
 * which is the whole point of the branded-plaintext direction CLAUDE.md
 * prescribes: the fields are `string` either way, so only the type can say
 * which.
 */
export async function getAddressByIdForUser(
  userId: string,
  addressId: string,
): Promise<AddressPlain | null> {
  const address = await addressesRepository.findById(addressId);
  if (!address || address.ownerType !== "user" || address.ownerId !== userId) {
    return null;
  }
  return addressesRepository.revealAddress(address);
}
