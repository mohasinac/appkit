import type { AddressDocument } from "../../../../features/account/schemas/index";
import { ADDRESS_PII_FIELDS, revealPii } from "../../../../security";
import type { AddressPlain } from "../../../../features/addresses/schemas";

/**
 * Flatten an address into the one-line string stored on
 * `OrderDocument.shippingAddress` and printed on invoices and labels.
 *
 * 🛑 Reveals INSIDE the function, deliberately, rather than asking its two
 * callers to.
 *
 * `AddressDocument` is ciphertext-by-default, and `shippingAddress` is NOT a
 * PII field — so joining the stored values froze three `enc:v1:` blobs into one
 * string that is no longer a valid envelope and can never be decrypted. It is
 * then printed on every invoice, shipping label and order-confirmation email.
 *
 * Doing it here rather than at `actions.ts:1279` and `:2506` is the point: a
 * third caller gets it right by construction instead of by remembering.
 */
export function formatShippingAddress(a: AddressDocument): string {
  const plain = revealPii<AddressPlain>(a, ADDRESS_PII_FIELDS);
  const parts = [
    plain.fullName,
    plain.addressLine1,
    plain.addressLine2,
    (a as { landmark?: string }).landmark,
    a.city,
    a.state,
    a.postalCode,
    a.country,
  ].filter(Boolean);
  return parts.join(", ");
}

export interface CheckoutOrderResult {
  orderIds: string[];
  total: number;
  itemCount: number;
  unavailableItems?: {
    productId: string;
    productTitle: string;
    requestedQty: number;
    availableQty: number;
  }[];
  /**
   * Coupons that were on the cart but failed re-validation at placement time
   * (expired, limit reached, no longer any eligible items). They were removed
   * and the order priced without them — surfaced so the UI can tell the buyer
   * rather than silently charging more than the cart showed.
   */
  droppedCoupons?: {
    code: string;
    reason: string;
  }[];
}
