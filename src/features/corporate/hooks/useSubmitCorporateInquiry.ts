"use client";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { SubmitCorporateInquiryInput, CorporateInquiry } from "../types";
import { CORPORATE_ENDPOINTS } from "../../../constants/api-endpoints";

export function useSubmitCorporateInquiry() {
  const mutation = useMutation<CorporateInquiry, Error, SubmitCorporateInquiryInput>({
    mutationFn: (data) =>
      apiClient.post<CorporateInquiry>(CORPORATE_ENDPOINTS.INQUIRIES, data),
  });

  return {
    submitInquiry: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
