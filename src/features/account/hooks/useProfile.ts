import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  googleLinked?: boolean;
  googleLinkedEmail?: string | null;
  uiPreferences?: {
    collapsedSections?: string[];
    dataViewMode?: "table" | "grid" | "list";
    handMode?: "left" | "right";
  };
}

export interface UpdateCurrentProfileInput {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  avatarMetadata?: {
    url: string;
    position: { x: number; y: number };
    zoom: number;
  };
  bio?: string;
  profileIsPublic?: boolean;
  uiPreferences?: {
    collapsedSections?: string[];
    dataViewMode?: "table" | "grid" | "list";
    handMode?: "left" | "right";
  };
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
  onSuccess?: (data: JsonValue) => void;
  onError?: (error: Error) => void;
  endpoint?: string;
}) {
  const queryClient = useQueryClient();
  const endpoint = options?.endpoint ?? ACCOUNT_ENDPOINTS.PROFILE;

  return useApiMutation({
    mutationFn: (data: UpdateCurrentProfileInput) =>
      apiClient.patch(endpoint, data),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      // useCurrentUser()/useRBAC() read identity via a separate ["auth","me"]
      // query — without this, displayName/photoURL stay stale for up to 5min.
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
}
