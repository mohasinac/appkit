"use client";
import {
  applyActionCode,
  confirmPasswordReset,
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updatePassword,
} from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { NotFoundError } from "../../../errors";
import type { AuthUser } from "../types";
import { useAuthEvent } from "./useAuthEvent";

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
      await apiClient.post("/api/auth/login", {
        email: credentials.email.trim(),
        password: credentials.password,
      });

      await signInWithEmailAndPassword(
        getAuth(),
        credentials.email.trim(),
        credentials.password,
      );

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

  const onSuccessRef = useRef(options?.onSuccess);
  const onErrorRef = useRef(options?.onError);
  const onSessionSyncedRef = useRef(options?.onSessionSynced);

  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
  }, [options?.onSuccess]);

  useEffect(() => {
    onErrorRef.current = options?.onError;
  }, [options?.onError]);

  useEffect(() => {
    onSessionSyncedRef.current = options?.onSessionSynced;
  }, [options?.onSessionSynced]);

  useEffect(() => {
    if (authEvent.status === "success") {
      Promise.resolve(onSessionSyncedRef.current?.()).then(() => {
        onSuccessRef.current?.(authEvent.data);
      });
    } else if (
      authEvent.status === "failed" ||
      authEvent.status === "timeout"
    ) {
      onErrorRef.current?.(
        new Error(authEvent.error ?? "Sign-in failed. Please try again."),
      );
    }
  }, [authEvent.status, authEvent.error, authEvent.data]);

  const mutate = useCallback(async () => {
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

    try {
      setInitiating(true);
      authEvent.reset();

      const { eventId, customToken } = await apiClient.post<{
        eventId: string;
        customToken: string;
        expiresAt: number;
      }>("/api/auth/event/init", {});

      const url = `${window.location.origin}/api/auth/google/start?eventId=${encodeURIComponent(eventId)}`;
      localStorage.setItem("letitrip_oauth_redirect", url);
      authEvent.subscribe(eventId, customToken);
    } catch (err) {
      popup.close();
      onErrorRef.current?.(
        err instanceof Error ? err : new Error("Failed to start sign-in."),
      );
    } finally {
      setInitiating(false);
    }
  }, [authEvent]);

  const isLoading =
    initiating ||
    authEvent.status === "subscribing" ||
    authEvent.status === "pending";

  return { mutate, isLoading };
}

export function useRegister(options?: {
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation<unknown, Error, RegisterData>({
    mutationFn: async (data) => {
      const response = await apiClient.post<Record<string, unknown>>(
        "/api/auth/register",
        {
          email: data.email.trim(),
          password: data.password,
          displayName: data.displayName?.trim() || "",
          acceptTerms: data.acceptTerms,
        },
      );

      await signInWithEmailAndPassword(
        getAuth(),
        data.email.trim(),
        data.password,
      );
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
      await applyActionCode(getAuth(), token);
      if (getAuth().currentUser) {
        await getAuth().currentUser?.reload();
      }
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
    mutationFn: (data) => apiClient.post("/api/auth/resend-verification", data),
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
      await sendPasswordResetEmail(getAuth(), data.email);
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
      await confirmPasswordReset(getAuth(), data.token, data.newPassword);
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
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user?.email) {
        throw new NotFoundError("User not found");
      }

      const credential = EmailAuthProvider.credential(
        user.email,
        data.currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, data.newPassword);
      return apiClient.post("/api/user/change-password", data);
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}
