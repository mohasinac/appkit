"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";

/**
 * useLogout
 *
 * Mutation hook that calls the backend logout endpoint to clear the session
 * cookie and revoke tokens.
 *
 * @example
 * const { mutateAsync: logout } = useLogout();
 * await logout();
 */
export function useLogout(options?: {
  /** Override the logout API endpoint. Defaults to `/api/auth/logout`. */
  endpoint?: string;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}) {
  const endpoint = options?.endpoint ?? "/api/auth/logout";
  return useMutation<void, Error, void>({
    mutationFn: () => apiClient.post(endpoint, {}),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}
