/**
 * Account Firestore Document Types & Constants
 *
 * Canonical Firestore document interfaces, collection names, field constants
 * for the account feature (user addresses).
 */

// ── Address Subcollection ────────────────────────────────────────────────────

export interface AddressDocument {
  id: string;
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

/**
 * Subcollection path — users/{userId}/addresses/{addressId}
 */
export const ADDRESS_SUBCOLLECTION = "addresses" as const;

export const ADDRESS_INDEXED_FIELDS = ["isDefault", "createdAt"] as const;

export const DEFAULT_ADDRESS_DATA: Partial<AddressDocument> = {
  isDefault: false,
};

export const ADDRESS_PUBLIC_FIELDS = [
  "id",
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

export type AddressCreateInput = Omit<
  AddressDocument,
  "id" | "createdAt" | "updatedAt"
>;

export type AddressUpdateInput = Partial<
  Pick<AddressDocument, (typeof ADDRESS_UPDATABLE_FIELDS)[number]>
>;

export const ADDRESS_FIELDS = {
  ID: "id",
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
