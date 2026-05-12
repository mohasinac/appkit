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
}
