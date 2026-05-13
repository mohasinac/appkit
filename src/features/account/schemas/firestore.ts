/**
 * Account Firestore Document Types & Constants
 *
 * SB-UNI-A 2026-05-13 — Address types relocated to features/addresses/.
 * This file now re-exports the canonical shapes so existing consumers
 * keep their imports stable. The legacy `ADDRESS_SUBCOLLECTION` constant
 * stays as a backwards-compat literal until callers migrate to the
 * top-level `ADDRESSES_COLLECTION`.
 */

export {
  ADDRESS_FIELDS,
  ADDRESS_INDEXED_FIELDS,
  ADDRESS_PUBLIC_FIELDS,
  ADDRESS_UPDATABLE_FIELDS,
  ADDRESSES_COLLECTION,
  DEFAULT_ADDRESS_DATA,
  type AddressCreateInput,
  type AddressDocument,
  type AddressOwnerType,
  type AddressUpdateInput,
} from "../../addresses/schemas";

/** @deprecated SB-UNI-A — kept as a literal alias only. Top-level
 * `addresses` collection is the new home (ADDRESSES_COLLECTION). */
export const ADDRESS_SUBCOLLECTION = "addresses" as const;
