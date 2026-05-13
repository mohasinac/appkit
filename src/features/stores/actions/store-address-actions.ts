/**
 * Store Address Domain Actions (appkit)
 *
 * SB-UNI-A 2026-05-13 — re-pointed at the unified `addressesRepository`
 * (ownerType:"store"). The seller's store is resolved off their UID first;
 * `store.storeSlug` is the ownerId for the address row.
 */

import { NotFoundError, ValidationError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import { addressesRepository } from "../../addresses/repository/addresses.repository";
import { storeRepository } from "../repository/store.repository";
import type {
  AddressDocument,
  AddressCreateInput,
  AddressUpdateInput,
} from "../../addresses/schemas";

// Backwards-compat aliases — keep the old type names exported for callers.
export type StoreAddressDocument = AddressDocument;
export type StoreAddressCreateInput = AddressCreateInput;
export type StoreAddressUpdateInput = AddressUpdateInput;

async function resolveSellerStore(uid: string) {
  const store = await storeRepository.findByOwnerId(uid);
  if (!store) throw new NotFoundError("Store not found. Create a store first.");
  return store;
}

export async function listStoreAddressesForSeller(
  userId: string,
): Promise<AddressDocument[]> {
  const store = await resolveSellerStore(userId);
  serverLogger.debug("listStoreAddressesForSeller", {
    userId,
    storeSlug: store.storeSlug,
  });
  return addressesRepository.listByOwner("store", store.storeSlug);
}

export async function createStoreAddressForSeller(
  userId: string,
  input: AddressCreateInput,
): Promise<AddressDocument> {
  const store = await resolveSellerStore(userId);
  serverLogger.debug("createStoreAddressForSeller", {
    userId,
    storeSlug: store.storeSlug,
  });
  return addressesRepository.createForOwner("store", store.storeSlug, input);
}

export async function updateStoreAddressForSeller(
  userId: string,
  addressId: string,
  input: AddressUpdateInput,
): Promise<AddressDocument> {
  if (!addressId?.trim()) throw new ValidationError("addressId is required");
  const store = await resolveSellerStore(userId);
  serverLogger.debug("updateStoreAddressForSeller", {
    userId,
    storeSlug: store.storeSlug,
    addressId,
  });
  return addressesRepository.updateForOwner("store", store.storeSlug, addressId, input);
}

export async function deleteStoreAddressForSeller(
  userId: string,
  addressId: string,
): Promise<void> {
  if (!addressId?.trim()) throw new ValidationError("addressId is required");
  const store = await resolveSellerStore(userId);
  serverLogger.debug("deleteStoreAddressForSeller", {
    userId,
    storeSlug: store.storeSlug,
    addressId,
  });
  return addressesRepository.deleteForOwner("store", store.storeSlug, addressId);
}
