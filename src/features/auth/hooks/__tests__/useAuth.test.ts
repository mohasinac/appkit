import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks (must be before imports that use them) ---

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockConfirmPasswordReset = vi.fn();
const mockApplyActionCode = vi.fn();
const mockReloadCurrentUser = vi.fn();
const mockReauthenticateAndChangePassword = vi.fn();
const mockReauthenticateAndSendEmailUpdateVerification = vi.fn();
const mockGetIdToken = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock("../../../http", () => ({
  apiClient: {
    get: mockApiGet,
    post: mockApiPost,
  },
}));

vi.mock("../../../contracts/client-auth", () => ({
  getClientAuthProvider: () => ({
    signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
    sendPasswordResetEmail: mockSendPasswordResetEmail,
    confirmPasswordReset: mockConfirmPasswordReset,
    applyActionCode: mockApplyActionCode,
    reloadCurrentUser: mockReloadCurrentUser,
    reauthenticateAndChangePassword: mockReauthenticateAndChangePassword,
    reauthenticateAndSendEmailUpdateVerification: mockReauthenticateAndSendEmailUpdateVerification,
  }),
}));

vi.mock("../../../contracts/client-session", () => ({
  getClientSessionAdapter: () => ({
    getCurrentUser: mockGetCurrentUser,
  }),
}));

vi.mock("../useAuthEvent", () => ({
  useAuthEvent: () => ({
    status: "idle",
    data: null,
    error: null,
    reset: vi.fn(),
    subscribe: vi.fn(),
  }),
}));

import {
  useCurrentUser,
  useLogin,
  useRegister,
  useForgotPassword,
  useResetPassword,
  useVerifyEmail,
} from "../useAuth";

// --- Wrapper factory ---

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockUser = {
  id: "user-buyer-1",
  uid: "user-buyer-1",
  email: "buyer@test.com",
  displayName: "Test Buyer",
  role: "user",
  isEmailVerified: true,
};

describe("useCurrentUser — query behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls apiClient.get ME endpoint on mount", async () => {
    mockApiGet.mockResolvedValue(mockUser);
    const { result } = renderHook(() => useCurrentUser(), { wrapper: makeWrapper() });
    await waitFor(() => !result.current.isLoading);
    expect(mockApiGet).toHaveBeenCalled();
  });

  it("returns user when API resolves", async () => {
    mockApiGet.mockResolvedValue(mockUser);
    const { result } = renderHook(() => useCurrentUser(), { wrapper: makeWrapper() });
    await waitFor(() => result.current.user !== null);
    expect(result.current.user).toMatchObject({ email: "buyer@test.com" });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("returns null user when API throws (not authenticated)", async () => {
    mockApiGet.mockRejectedValue(new Error("401"));
    const { result } = renderHook(() => useCurrentUser(), { wrapper: makeWrapper() });
    await waitFor(() => !result.current.isLoading);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("accepts initialData option and skips initial fetch", async () => {
    const { result } = renderHook(
      () => useCurrentUser({ initialData: mockUser }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.user).toMatchObject({ email: "buyer@test.com" });
  });
});

describe("useLogin — mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithEmailAndPassword.mockResolvedValue(undefined);
    mockGetCurrentUser.mockReturnValue({ getIdToken: mockGetIdToken });
    mockGetIdToken.mockResolvedValue("mock-id-token");
    mockApiPost.mockResolvedValue({ success: true });
  });

  it("calls signInWithEmailAndPassword with email + password", async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() });
    await act(() =>
      result.current.mutateAsync({ email: "buyer@test.com", password: "password123" }),
    );
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      "buyer@test.com",
      "password123",
    );
  });

  it("exchanges ID token for server session after sign-in", async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() });
    await act(() =>
      result.current.mutateAsync({ email: "buyer@test.com", password: "password123" }),
    );
    expect(mockApiPost).toHaveBeenCalledWith(
      expect.stringContaining("/session"),
      expect.objectContaining({ idToken: "mock-id-token" }),
    );
  });

  it("throws when signInWithEmailAndPassword fails", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue(new Error("auth/wrong-password"));
    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() });
    await expect(
      act(() =>
        result.current.mutateAsync({ email: "x@test.com", password: "wrong" }),
      ),
    ).rejects.toThrow();
  });

  it("throws when getCurrentUser returns null after sign-in", async () => {
    mockGetCurrentUser.mockReturnValue(null);
    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() });
    await expect(
      act(() =>
        result.current.mutateAsync({ email: "x@test.com", password: "pass" }),
      ),
    ).rejects.toThrow("Sign-in succeeded but no current user found");
  });

  it("fires onSuccess callback on success", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useLogin({ onSuccess }), { wrapper: makeWrapper() });
    await act(() =>
      result.current.mutateAsync({ email: "buyer@test.com", password: "pass" }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("fires onError callback on failure", async () => {
    const onError = vi.fn();
    mockSignInWithEmailAndPassword.mockRejectedValue(new Error("wrong password"));
    const { result } = renderHook(() => useLogin({ onError }), { wrapper: makeWrapper() });
    await act(async () => {
      try {
        await result.current.mutateAsync({ email: "x@test.com", password: "bad" });
      } catch {}
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("trims email whitespace before authentication", async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper() });
    await act(() =>
      result.current.mutateAsync({ email: "  buyer@test.com  ", password: "pass" }),
    );
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      "buyer@test.com",
      "pass",
    );
  });
});

describe("useRegister — mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiPost.mockResolvedValue({ uid: "new-user-1" });
    mockSignInWithEmailAndPassword.mockResolvedValue(undefined);
    mockGetCurrentUser.mockReturnValue({ getIdToken: mockGetIdToken });
    mockGetIdToken.mockResolvedValue("mock-id-token");
  });

  it("POSTs to register endpoint with email, password, displayName", async () => {
    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });
    await act(() =>
      result.current.mutateAsync({
        email: "new@test.com",
        password: "password123",
        displayName: "New User",
        acceptTerms: true,
      }),
    );
    expect(mockApiPost).toHaveBeenCalledWith(
      expect.stringContaining("register"),
      expect.objectContaining({
        email: "new@test.com",
        password: "password123",
        displayName: "New User",
        acceptTerms: true,
      }),
    );
  });

  it("signs in after registration to get ID token for session", async () => {
    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });
    await act(() =>
      result.current.mutateAsync({
        email: "new@test.com",
        password: "pass",
        acceptTerms: true,
      }),
    );
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith("new@test.com", "pass");
  });

  it("trims email and displayName whitespace", async () => {
    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper() });
    await act(() =>
      result.current.mutateAsync({
        email: "  new@test.com  ",
        password: "pass",
        displayName: "  Alice  ",
        acceptTerms: true,
      }),
    );
    expect(mockApiPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ email: "new@test.com", displayName: "Alice" }),
    );
  });

  it("fires onSuccess callback on success", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useRegister({ onSuccess }), { wrapper: makeWrapper() });
    await act(() =>
      result.current.mutateAsync({ email: "a@b.com", password: "p", acceptTerms: true }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

describe("useForgotPassword — mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
  });

  it("calls sendPasswordResetEmail with provided email", async () => {
    const { result } = renderHook(() => useForgotPassword(), { wrapper: makeWrapper() });
    await act(() =>
      result.current.mutateAsync({ email: "user@test.com" }),
    );
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith("user@test.com");
  });

  it("returns { success: true } on success", async () => {
    const { result } = renderHook(() => useForgotPassword(), { wrapper: makeWrapper() });
    const data = await act(() =>
      result.current.mutateAsync({ email: "user@test.com" }),
    );
    expect(data).toMatchObject({ success: true });
  });

  it("fires onError callback when sendPasswordResetEmail throws", async () => {
    const onError = vi.fn();
    mockSendPasswordResetEmail.mockRejectedValue(new Error("auth/user-not-found"));
    const { result } = renderHook(() => useForgotPassword({ onError }), {
      wrapper: makeWrapper(),
    });
    await act(async () => {
      try {
        await result.current.mutateAsync({ email: "unknown@test.com" });
      } catch {}
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe("useResetPassword — mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmPasswordReset.mockResolvedValue(undefined);
  });

  it("calls confirmPasswordReset with token + newPassword", async () => {
    const { result } = renderHook(() => useResetPassword(), { wrapper: makeWrapper() });
    await act(() =>
      result.current.mutateAsync({ token: "reset-token-abc", newPassword: "NewPass1!" }),
    );
    expect(mockConfirmPasswordReset).toHaveBeenCalledWith("reset-token-abc", "NewPass1!");
  });

  it("returns { success: true } on success", async () => {
    const { result } = renderHook(() => useResetPassword(), { wrapper: makeWrapper() });
    const data = await act(() =>
      result.current.mutateAsync({ token: "t", newPassword: "p" }),
    );
    expect(data).toMatchObject({ success: true });
  });
});

describe("useVerifyEmail — mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApplyActionCode.mockResolvedValue(undefined);
    mockReloadCurrentUser.mockResolvedValue(undefined);
  });

  it("calls applyActionCode and reloadCurrentUser with token", async () => {
    const { result } = renderHook(() => useVerifyEmail(), { wrapper: makeWrapper() });
    await act(() => result.current.mutateAsync({ token: "verify-token-123" }));
    expect(mockApplyActionCode).toHaveBeenCalledWith("verify-token-123");
    expect(mockReloadCurrentUser).toHaveBeenCalledTimes(1);
  });

  it("returns { success: true, emailVerified: true } on success", async () => {
    const { result } = renderHook(() => useVerifyEmail(), { wrapper: makeWrapper() });
    const data = await act(() => result.current.mutateAsync({ token: "t" }));
    expect(data).toMatchObject({ success: true, emailVerified: true });
  });
});
