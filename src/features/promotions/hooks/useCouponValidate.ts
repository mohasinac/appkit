"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { PROMOTION_ENDPOINTS } from "../../../constants/api-endpoints";

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
  const endpoint = options?.endpoint ?? PROMOTION_ENDPOINTS.COUPON_VALIDATE;

  return useMutation<ValidateCouponResult, Error, ValidateCouponPayload>({
    mutationFn: (payload) =>
      apiClient.post<ValidateCouponResult>(endpoint, payload),
  });
}
