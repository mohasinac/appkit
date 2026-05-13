// SB-UNI-A 2026-05-13 — thin shim re-pointing the legacy `*ForUser` action
// surface at the unified `addressesRepository` (ownerType:"user"). Kept so
// existing callers (src/actions/address.actions.ts, _internal data layer)
// don't need to update.
import { serverLogger } from "../../../monitoring";
import { addressesRepository } from "../../addresses/repository/addresses.repository";
import type {
  AddressCreateInput,
  AddressDocument,
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

export async function getAddressByIdForUser(
  userId: string,
  addressId: string,
): Promise<AddressDocument | null> {
  const address = await addressesRepository.findById(addressId);
  if (!address || address.ownerType !== "user" || address.ownerId !== userId) {
    return null;
  }
  return address;
}
