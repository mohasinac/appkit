"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { useMessage } from "../../../react";
import type { BecomeSellerResult } from "../actions/seller-actions";

export type { BecomeSellerResult };

export interface UseBecomeSellerOptions<T = BecomeSellerResult> {
  mutationFn?: () => Promise<T>;
  endpoint?: string;
  successMessage?: string;
  errorMessage?: string;
  shouldShowSuccess?: (result: T) => boolean;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

export function useBecomeSeller<T = BecomeSellerResult>(
  options?: UseBecomeSellerOptions<T>,
) {
  const { showSuccess, showError } = useMessage();

  return useMutation<T, Error, void>({
    mutationFn:
      options?.mutationFn ??
      (() => apiClient.post<T>(options?.endpoint ?? "/api/seller/become", {})),
    onSuccess: (result) => {
      const shouldShowSuccess =
        options?.shouldShowSuccess ??
        ((value: T) => !(value as { alreadySeller?: boolean })?.alreadySeller);

      if (options?.successMessage && shouldShowSuccess(result)) {
        showSuccess(options.successMessage);
      }

      options?.onSuccess?.(result);
    },
    onError: (error) => {
      if (options?.errorMessage) {
        showError(options.errorMessage);
      }

      options?.onError?.(error);
    },
  });
}
