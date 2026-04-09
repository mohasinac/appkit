"use client";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@mohasinac/http";
import type { BookConsultationInput, ConsultationBooking } from "../types";

export function useBookConsultation() {
  const mutation = useMutation<ConsultationBooking, Error, BookConsultationInput>({
    mutationFn: (data) =>
      apiClient.post<ConsultationBooking>("/api/consultations", data),
  });

  return {
    bookConsultation: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
