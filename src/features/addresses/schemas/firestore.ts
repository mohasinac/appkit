/**
 * Addresses Firestore Document Types & Constants — SB-UNI-A 2026-05-13
 *
 * Unified top-level `addresses` collection replacing the two subcollections
 * `users/{uid}/addresses` and `stores/{slug}/addresses`. Discriminated by
 * `ownerType: "user" | "store"`. PII fields (fullName, phone, addressLine1)
 * are encrypted at rest via the existing `encryptPiiFields` pipeline; the
 * repository overrides `createWithId` and `create` to inject encryption.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { Encrypted, Plaintext } from "../../../security/encrypted";

export type AddressOwnerType = "user" | "store";

export type AddressBanStatus = "banned" | "unban_requested" | "suspicious";

/**
 * `AddressDocument` with its PII as plain `string` — what the named repository
 * accessors return, and what a WRITE path accepts (the repository encrypts).
 *
 * `Plaintext<T>` is the one definition of this shape; see `security/encrypted.ts`.
 * It is deliberately NOT distinguishable from a MASKED value — `maskPii`
 * returns plain strings too, and no type can express "these characters are
 * asterisks". The distinction is which named method you called.
 */
export type AddressPlain = Plaintext<AddressDocument>;

export interface AddressDocument extends BaseDocument {
  ownerType: AddressOwnerType;
  ownerId: string;
  label: string;
  fullName: Encrypted<string>;
  phone: Encrypted<string>;
  addressLine1: Encrypted<string>;
  addressLine2?: Encrypted<string>;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  /** SHA-256(normalised postalCode|line1|line2) — stored unencrypted for cross-account dedup. */
  addressHash?: string;
  banStatus?: AddressBanStatus;
  banReason?: string;
  bannedBy?: string;
  bannedAt?: Date;
  /** true when cascaded from a user hard-ban (vs manually banned by admin). */
  autoBanned?: boolean;
  unbanRequestNote?: string;
  unbanRequestedAt?: Date;
}

export const ADDRESSES_COLLECTION = "addresses" as const;

export const ADDRESS_INDEXED_FIELDS = [
  "ownerType",
  "ownerId",
  "isDefault",
  "addressHash",
  "banStatus",
  "autoBanned",
  "createdAt",
] as const;

export const DEFAULT_ADDRESS_DATA: Partial<AddressDocument> = {
  isDefault: false,
};

export const ADDRESS_PUBLIC_FIELDS = [
  "id",
  "ownerType",
  "ownerId",
  "label",
  "fullName",
  "phone",
  "addressLine1",
  "addressLine2",
  "landmark",
  "city",
  "state",
  "postalCode",
  "country",
  "isDefault",
  "addressHash",
  "banStatus",
  "banReason",
  "bannedAt",
  "autoBanned",
  "unbanRequestNote",
  "unbanRequestedAt",
  "createdAt",
  "updatedAt",
] as const;

export const ADDRESS_UPDATABLE_FIELDS = [
  "label",
  "fullName",
  "phone",
  "addressLine1",
  "addressLine2",
  "landmark",
  "city",
  "state",
  "postalCode",
  "country",
  "isDefault",
  "banStatus",
  "banReason",
  "bannedBy",
  "bannedAt",
  "autoBanned",
  "unbanRequestNote",
  "unbanRequestedAt",
] as const;

// External create-input excludes the discriminator (added by createForOwner)
// and the system-managed id/timestamps. Keeps consumer shape backwards-compat.
/*
 * 🛑 Derived from the PLAIN shape — a caller types a real name, phone and
 * street into a form, and the repository encrypts them. Deriving from the
 * document demanded `Encrypted<string>` from seven routes and actions, and the
 * only way to produce one without encrypting is `asEncrypted(value)`, which
 * labels plaintext as ciphertext.
 */
export type AddressCreateInput = Omit<
  AddressPlain,
  "id" | "ownerType" | "ownerId" | "createdAt" | "updatedAt"
>;

export type AddressUpdateInput = Partial<
  Pick<AddressPlain, (typeof ADDRESS_UPDATABLE_FIELDS)[number]>
>;

export const ADDRESS_FIELDS = {
  ID: "id",
  OWNER_TYPE: "ownerType",
  OWNER_ID: "ownerId",
  LABEL: "label",
  FULL_NAME: "fullName",
  PHONE: "phone",
  ADDRESS_LINE_1: "addressLine1",
  ADDRESS_LINE_2: "addressLine2",
  LANDMARK: "landmark",
  CITY: "city",
  STATE: "state",
  POSTAL_CODE: "postalCode",
  COUNTRY: "country",
  IS_DEFAULT: "isDefault",
  ADDRESS_HASH: "addressHash",
  BAN_STATUS: "banStatus",
  BAN_REASON: "banReason",
  BANNED_BY: "bannedBy",
  BANNED_AT: "bannedAt",
  AUTO_BANNED: "autoBanned",
  UNBAN_REQUEST_NOTE: "unbanRequestNote",
  UNBAN_REQUESTED_AT: "unbanRequestedAt",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;
