"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { AuthUser } from "../types";

interface UseCurrentUserOptions {
  initialData?: AuthUser | null;
  enabled?: boolean;
}

export function useCurrentUser(opts?: UseCurrentUserOptions) {
  const query = useQuery<AuthUser | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await apiClient.get<AuthUser>("/api/auth/me");
      } catch {
        return null;
      }
    },
    initialData: opts?.initialData ?? undefined,
    enabled: opts?.enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
    error: query.error,
    refetch: query.refetch,
  };
}
