"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";

export interface UserProfile {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateCurrentProfileInput {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
}

export function useCurrentProfile(options?: {
  enabled?: boolean;
  endpoint?: string;
}) {
  const endpoint = options?.endpoint ?? ACCOUNT_ENDPOINTS.PROFILE;
  return useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => apiClient.get<UserProfile>(endpoint),
    enabled: options?.enabled,
  });
}

export function useUpdateCurrentProfile(options?: {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
  endpoint?: string;
}) {
  const queryClient = useQueryClient();
  const endpoint = options?.endpoint ?? ACCOUNT_ENDPOINTS.PROFILE;

  return useMutation({
    mutationFn: (data: UpdateCurrentProfileInput) =>
      apiClient.patch(endpoint, data),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}
