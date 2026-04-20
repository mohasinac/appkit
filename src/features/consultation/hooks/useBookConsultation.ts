import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { BookConsultationInput, ConsultationBooking } from "../types";
import { CONSULTATION_ENDPOINTS } from "../../../constants/api-endpoints";

export function useBookConsultation() {
  const mutation = useMutation<ConsultationBooking, Error, BookConsultationInput>({
    mutationFn: (data) =>
      apiClient.post<ConsultationBooking>(CONSULTATION_ENDPOINTS.LIST, data),
  });

  return {
    bookConsultation: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
