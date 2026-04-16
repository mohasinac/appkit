/**
 * Store Address Domain Actions (appkit)
 *
 * Pure business functions for store pickup address CRUD.
 * Auth, rate-limiting, and Next.js specifics are handled by the consumer.
 */

import { NotFoundError, ValidationError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import { storeAddressRepository } from "../repository/store-address.repository";
import { storeRepository } from "../repository/store.repository";
import type {
  StoreAddressDocument,
  StoreAddressCreateInput,
  StoreAddressUpdateInput,
} from "../schemas";

async function resolveSellerStore(uid: string) {
  const store = await storeRepository.findByOwnerId(uid);
  if (!store) throw new NotFoundError("Store not found. Create a store first.");
  return store;
}

export async function listStoreAddressesForSeller(
  userId: string,
): Promise<StoreAddressDocument[]> {
  const store = await resolveSellerStore(userId);
  serverLogger.debug("listStoreAddressesForSeller", {
    userId,
    storeSlug: store.storeSlug,
  });
  return storeAddressRepository.findByStore(store.storeSlug);
}

export async function createStoreAddressForSeller(
  userId: string,
  input: StoreAddressCreateInput,
): Promise<StoreAddressDocument> {
  const store = await resolveSellerStore(userId);
  serverLogger.debug("createStoreAddressForSeller", {
    userId,
    storeSlug: store.storeSlug,
  });
  return storeAddressRepository.create(store.storeSlug, input);
}

export async function updateStoreAddressForSeller(
  userId: string,
  addressId: string,
  input: StoreAddressUpdateInput,
): Promise<StoreAddressDocument> {
  if (!addressId?.trim()) throw new ValidationError("addressId is required");
  const store = await resolveSellerStore(userId);
  serverLogger.debug("updateStoreAddressForSeller", {
    userId,
    storeSlug: store.storeSlug,
    addressId,
  });
  return storeAddressRepository.update(store.storeSlug, addressId, input);
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
  return storeAddressRepository.delete(store.storeSlug, addressId);
}
