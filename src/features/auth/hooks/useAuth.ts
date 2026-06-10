"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getClientAuthProvider } from "../../../contracts/client-auth";
import { getClientSessionAdapter } from "../../../contracts/client-session";
import { apiClient } from "../../../http";
import { NotFoundError } from "../../../errors";
import type { AuthUser } from "../types";
import { useAuthEvent } from "./useAuthEvent";
import { RealtimeEventStatus } from "../../../react/hooks/useRealtimeEvent";
import {
  AUTH_ENDPOINTS,
  ACCOUNT_ENDPOINTS,
} from "../../../constants/api-endpoints";

interface UseCurrentUserOptions {
  initialData?: AuthUser | null;
  enabled?: boolean;
}

export function useCurrentUser(opts?: UseCurrentUserOptions) {
  const query = useQuery<AuthUser | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await apiClient.get<AuthUser>(AUTH_ENDPOINTS.ME);
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

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
  acceptTerms: boolean;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ChangeEmailData {
  currentPassword: string;
  newEmail: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export interface ResendVerificationData {
  email: string;
}

export interface VerifyEmailData {
  token: string;
}

export function useLogin(options?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation<unknown, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      // Client Firebase SDK authenticates first (handles password verification)
      await getClientAuthProvider().signInWithEmailAndPassword(
        credentials.email.trim(),
        credentials.password,
      );

      // Exchange the fresh ID token for a server-side session cookie
      const currentUser = getClientSessionAdapter().getCurrentUser();
      if (!currentUser) {
        throw new Error("Sign-in succeeded but no current user found.");
      }
      const idToken = await currentUser.getIdToken(true);
      await apiClient.post(AUTH_ENDPOINTS.SESSION, { idToken });

      return { success: true };
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useGoogleLogin(options?: {
  onSuccess?: (
    data: { isNewUser: boolean; uid: string; role: string } | null,
  ) => void;
  onError?: (error: unknown) => void;
  onSessionSynced?: () => Promise<void> | void;
}) {
  const authEvent = useAuthEvent();
  const [initiating, setInitiating] = useState(false);
  // popupPending stays true from popup open until auth resolves (success/error/timeout)
  const [popupPending, setPopupPending] = useState(false);
  // calledRef prevents both RTDB and postMessage from firing the callbacks
  const calledRef = useRef(false);

  const onSuccessRef = useRef(options?.onSuccess);
  const onErrorRef = useRef(options?.onError);
  const onSessionSyncedRef = useRef(options?.onSessionSynced);
  const authEventResetRef = useRef(authEvent.reset);

  useEffect(() => { onSuccessRef.current = options?.onSuccess; }, [options?.onSuccess]);
  useEffect(() => { onErrorRef.current = options?.onError; }, [options?.onError]);
  useEffect(() => { onSessionSyncedRef.current = options?.onSessionSynced; }, [options?.onSessionSynced]);
  useEffect(() => { authEventResetRef.current = authEvent.reset; }, [authEvent.reset]);

  // RTDB status watcher — fast path when RTDB is available.
  // FAILED is intentionally not forwarded to onError here: RTDB connection
  // failures (e.g. missing database URL) should fall through to the postMessage
  // fallback so the user still gets a result from the popup.
  useEffect(() => {
    if (authEvent.status === RealtimeEventStatus.SUCCESS) {
      setPopupPending(false);
      if (calledRef.current) return;
      calledRef.current = true;
      Promise.resolve(onSessionSyncedRef.current?.()).then(() => {
        onSuccessRef.current?.(authEvent.data);
      });
    } else if (authEvent.status === RealtimeEventStatus.TIMEOUT) {
      // RTDB timed out AND postMessage never arrived (popup likely closed without completing)
      setPopupPending(false);
      if (calledRef.current) return;
      calledRef.current = true;
      onErrorRef.current?.(
        new Error(authEvent.error ?? "Sign-in timed out. Please try again."),
      );
    }
    // FAILED: do not call onError — wait for the postMessage from /auth/close
  }, [authEvent.status, authEvent.error, authEvent.data]);

  // postMessage fallback — fires when /auth/close sends window.opener.postMessage.
  // This covers two cases:
  //   1. RTDB is unavailable (the primary channel failed)
  //   2. RTDB fires FAILED (connection issue) — postMessage still arrives from the popup
  // calledRef guards against double-resolution when both RTDB and postMessage fire.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== "letitrip_auth_close") return;
      if (calledRef.current) return;

      calledRef.current = true;
      setPopupPending(false);
      authEventResetRef.current();

      if (event.data.status === "success") {
        const data = event.data.uid
          ? { uid: event.data.uid as string, role: (event.data.role as string) ?? "user", isNewUser: Boolean(event.data.isNewUser) }
          : null;
        Promise.resolve(onSessionSyncedRef.current?.()).then(() => {
          onSuccessRef.current?.(data);
        });
      } else {
        onErrorRef.current?.(
          new Error((event.data.error as string | undefined) ?? "Sign-in failed. Please try again."),
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []); // mount once — uses refs, no stale closure risk

  const mutate = useCallback(async () => {
    // toast-intentionally-silent — errors surfaced via onErrorRef.current() callback
    calledRef.current = false; // reset for each new auth flow
    const popup = window.open(
      `${window.location.origin}/auth.html`,
      "oauth_google",
      "width=500,height=660,left=400,top=100",
    );

    if (!popup) {
      onErrorRef.current?.(
        new Error("Popup blocked. Please allow popups for this site."),
      );
      return;
    }

    setPopupPending(true);

    try {
      setInitiating(true);
      authEvent.reset();

      const { eventId, customToken, rtdbEnabled } = await apiClient.post<{
        eventId: string;
        customToken: string;
        expiresAt: number;
        rtdbEnabled?: boolean;
      }>(AUTH_ENDPOINTS.EVENT_INIT, {});

      const url = `${window.location.origin}${AUTH_ENDPOINTS.GOOGLE_START}?eventId=${encodeURIComponent(eventId)}`;
      localStorage.setItem("letitrip_oauth_redirect", url);

      // Only subscribe to RTDB if it's available — skipping avoids an immediate
      // FAILED status (token sign-in error) that would block the postMessage fallback.
      if (rtdbEnabled !== false) {
        authEvent.subscribe(eventId, customToken);
      }
    } catch (err) {
      popup.close();
      setPopupPending(false);
      onErrorRef.current?.(
        err instanceof Error ? err : new Error("Failed to start sign-in."),
      );
    } finally {
      setInitiating(false);
    }
  }, [authEvent]);

  const isLoading =
    initiating ||
    popupPending ||
    authEvent.status === RealtimeEventStatus.SUBSCRIBING ||
    authEvent.status === RealtimeEventStatus.PENDING;

  return { mutate, isLoading };
}

export function useRegister(options?: {
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation<unknown, Error, RegisterData>({
    mutationFn: async (data) => {
      // Create the user account on the server
      const response = await apiClient.post<Record<string, unknown>>(
        AUTH_ENDPOINTS.REGISTER,
        {
          email: data.email.trim(),
          password: data.password,
          displayName: data.displayName?.trim() || "",
          acceptTerms: data.acceptTerms,
        },
      );

      // Sign in via client SDK and exchange ID token for a server session cookie
      await getClientAuthProvider().signInWithEmailAndPassword(
        data.email.trim(),
        data.password,
      );

      const currentUser = getClientSessionAdapter().getCurrentUser();
      if (currentUser) {
        const idToken = await currentUser.getIdToken(true);
        await apiClient.post(AUTH_ENDPOINTS.SESSION, { idToken });
      }

      return { success: true, ...response };
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useVerifyEmail(options?: {
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation<unknown, Error, VerifyEmailData>({
    mutationFn: async ({ token }) => {
      const authProvider = getClientAuthProvider();
      await authProvider.applyActionCode(token);
      await authProvider.reloadCurrentUser();
      return { success: true, emailVerified: true };
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useResendVerification(options?: {
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation<unknown, Error, ResendVerificationData>({
    mutationFn: (data) =>
      apiClient.post(AUTH_ENDPOINTS.RESEND_VERIFICATION, data),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useForgotPassword(options?: {
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation<unknown, Error, ForgotPasswordData>({
    mutationFn: async (data) => {
      await getClientAuthProvider().sendPasswordResetEmail(data.email);
      return { success: true };
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useResetPassword(options?: {
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation<unknown, Error, ResetPasswordData>({
    mutationFn: async (data) => {
      await getClientAuthProvider().confirmPasswordReset(
        data.token,
        data.newPassword,
      );
      return { success: true };
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useChangePassword(options?: {
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation<unknown, Error, ChangePasswordData>({
    mutationFn: async (data) => {
      await getClientAuthProvider().reauthenticateAndChangePassword(
        data.currentPassword,
        data.newPassword,
      );
      return apiClient.post(ACCOUNT_ENDPOINTS.CHANGE_PASSWORD, data);
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

export function useChangeEmail(options?: {
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation<unknown, Error, ChangeEmailData>({
    mutationFn: async (data) => {
      await getClientAuthProvider().reauthenticateAndSendEmailUpdateVerification(
        data.currentPassword,
        data.newEmail,
      );
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}
