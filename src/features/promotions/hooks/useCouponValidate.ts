import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { PROMOTION_ENDPOINTS } from "../../../constants/api-endpoints";
import type { JsonValue } from "@mohasinac/appkit";

interface ValidateCouponPayload {
  code: string;
  orderTotal?: number;
  cartItems?: Array<{
    productId: string;
    storeId?: string;
    price: number;
    quantity: number;
    /** Canonical listing-kind snapshot (SB1-G Phase 4). */
    listingType?: "standard" | "auction" | "pre-order" | "prize-draw" | "classified" | "digital-code" | "live"; // audit-listing-type-inline-ok: pre-existing inline union; pending import of ListingType from products/types
  }>;
}

interface ValidateCouponResult {
  valid: boolean;
  discountAmount?: number;
  message?: string;
  [key: string]: JsonValue | undefined;
}

export function useCouponValidate(options?: { endpoint?: string }) {
  const endpoint = options?.endpoint ?? PROMOTION_ENDPOINTS.COUPON_VALIDATE;

  return useMutation<ValidateCouponResult, Error, ValidateCouponPayload>({
    mutationFn: (payload) =>
      apiClient.post<ValidateCouponResult>(endpoint, payload),
  });
}
