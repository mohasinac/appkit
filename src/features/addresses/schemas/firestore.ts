/**
 * Addresses Firestore Document Types & Constants — SB-UNI-A 2026-05-13
 *
 * Unified top-level `addresses` collection replacing the two subcollections
 * `users/{uid}/addresses` and `stores/{slug}/addresses`. Discriminated by
 * `ownerType: "user" | "store"`. PII fields (fullName, phone, addressLine1)
 * are encrypted at rest via the existing `encryptPiiFields` pipeline; the
 * repository overrides `createWithId` and `create` to inject encryption.
 */

export type AddressOwnerType = "user" | "store";

export interface AddressDocument {
  id: string;
  ownerType: AddressOwnerType;
  ownerId: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const ADDRESSES_COLLECTION = "addresses" as const;

export const ADDRESS_INDEXED_FIELDS = [
  "ownerType",
  "ownerId",
  "isDefault",
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
] as const;

// External create-input excludes the discriminator (added by createForOwner)
// and the system-managed id/timestamps. Keeps consumer shape backwards-compat.
export type AddressCreateInput = Omit<
  AddressDocument,
  "id" | "ownerType" | "ownerId" | "createdAt" | "updatedAt"
>;

export type AddressUpdateInput = Partial<
  Pick<AddressDocument, (typeof ADDRESS_UPDATABLE_FIELDS)[number]>
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
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;
