import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { UserProfile } from "../types";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseProfileOptions {
  initialData?: UserProfile;
  enabled?: boolean;
  endpoint?: string;
}

export function useProfile(userId: string, opts?: UseProfileOptions) {
  const endpoint = opts?.endpoint ?? ACCOUNT_ENDPOINTS.BY_ID(userId);
  const query = useQuery<UserProfile>({
    queryKey: ["account", userId],
    queryFn: () => apiClient.get<UserProfile>(endpoint),
    initialData: opts?.initialData,
    enabled: opts?.enabled !== false && !!userId,
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
