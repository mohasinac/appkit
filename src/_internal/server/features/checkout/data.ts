import type { AddressDocument } from "../../../../features/account/schemas/index";

export function formatShippingAddress(a: AddressDocument): string {
  const parts = [
    a.fullName,
    a.addressLine1,
    a.addressLine2,
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
