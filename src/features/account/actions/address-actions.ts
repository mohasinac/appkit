import { serverLogger } from "../../../monitoring";
import { addressRepository } from "../repository/address.repository";
import type {
  AddressCreateInput,
  AddressDocument,
  AddressUpdateInput,
} from "../schemas";

export async function createAddressForUser(
  userId: string,
  input: AddressCreateInput,
): Promise<AddressDocument> {
  serverLogger.debug("createAddressForUser", { userId });
  return addressRepository.create(userId, input);
}

export async function updateAddressForUser(
  userId: string,
  addressId: string,
  input: AddressUpdateInput,
): Promise<AddressDocument> {
  serverLogger.debug("updateAddressForUser", { userId, addressId });
  return addressRepository.update(userId, addressId, input);
}

export async function deleteAddressForUser(
  userId: string,
  addressId: string,
): Promise<void> {
  serverLogger.debug("deleteAddressForUser", { userId, addressId });
  return addressRepository.delete(userId, addressId);
}

export async function setDefaultAddressForUser(
  userId: string,
  addressId: string,
): Promise<AddressDocument> {
  serverLogger.debug("setDefaultAddressForUser", { userId, addressId });
  return addressRepository.setDefault(userId, addressId);
}

export async function listAddressesForUser(
  userId: string,
): Promise<AddressDocument[]> {
  return addressRepository.findByUser(userId);
}

export async function getAddressByIdForUser(
  userId: string,
  addressId: string,
): Promise<AddressDocument | null> {
  return addressRepository.findById(userId, addressId);
}
