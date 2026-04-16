"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../http";

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

export function useCurrentProfile(options?: { enabled?: boolean }) {
  return useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => apiClient.get<UserProfile>("/api/user/profile"),
    enabled: options?.enabled,
  });
}

export function useUpdateCurrentProfile(options?: {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCurrentProfileInput) =>
      apiClient.patch("/api/user/profile", data),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}
