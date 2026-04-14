"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";

interface ValidateCouponPayload {
  code: string;
  orderTotal?: number;
  cartItems?: Array<{
    productId: string;
    sellerId?: string;
    price: number;
    quantity: number;
    isPreOrder?: boolean;
    isAuction?: boolean;
  }>;
}

interface ValidateCouponResult {
  valid: boolean;
  discountAmount?: number;
  message?: string;
  [key: string]: unknown;
}

export function useCouponValidate(options?: { endpoint?: string }) {
  const endpoint = options?.endpoint ?? "/api/coupons/validate";

  return useMutation<ValidateCouponResult, Error, ValidateCouponPayload>({
    mutationFn: (payload) =>
      apiClient.post<ValidateCouponResult>(endpoint, payload),
  });
}
