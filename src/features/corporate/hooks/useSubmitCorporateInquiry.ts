"use client";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { SubmitCorporateInquiryInput, CorporateInquiry } from "../types";

export function useSubmitCorporateInquiry() {
  const mutation = useMutation<CorporateInquiry, Error, SubmitCorporateInquiryInput>({
    mutationFn: (data) =>
      apiClient.post<CorporateInquiry>("/api/corporate-inquiries", data),
  });

  return {
    submitInquiry: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
