import { useApiMutation } from "../../../client/api/useApiMutation";
import type { JsonValue } from "../../../schemas/types";
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
    /** @deprecated Superseded by `sectionState`. Still written during the
     * migration window so an existing user's layout carries over. */
    collapsedSections?: string[];
    /** scope -> ids that are OPEN. See useSectionState. */
    sectionState?: Record<string, string[]>;
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
    /** @deprecated Superseded by `sectionState`. Still written during the
     * migration window so an existing user's layout carries over. */
    collapsedSections?: string[];
    /** scope -> ids that are OPEN. See useSectionState. */
    sectionState?: Record<string, string[]>;
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
  /**
   * Curated failure copy, forwarded to the ONE error surface. A wrapper that
   * omits this forces its callers to add a second toast of their own, which
   * is exactly how one failed avatar save produced three stacked banners.
   */
  errorMessage?: string;
}) {
  const queryClient = useQueryClient();
  const endpoint = options?.endpoint ?? ACCOUNT_ENDPOINTS.PROFILE;

  return useApiMutation({
    errorMessage: options?.errorMessage,
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
