import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mock useCurrentUser so RBAC hooks use controlled user state ---

const mockUseCurrentUser = vi.fn();

vi.mock("./useAuth", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

import {
  useHasRole,
  useIsAdmin,
  useIsModerator,
  useIsSeller,
  useRoleChecks,
  useIsOwner,
  useRequireAuth,
  useRequireRole,
  useCanAccess,
} from "../useRBAC";

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function makeUser(role: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "user-test-1",
    uid: "user-test-1",
    email: "test@example.com",
    role,
    isEmailVerified: true,
    ...overrides,
  };
}

// Role hierarchy (from auth-helpers.ts):
// user: 0, seller: 1, employee: 2, moderator: 2, admin: 3

describe("useHasRole — role hierarchy", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("admin user passes hasRole('admin')", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("admin") });
    const { result } = renderHook(() => useHasRole("admin"), { wrapper: makeWrapper() });
    expect(result.current).toBe(true);
  });

  it("moderator user passes hasRole('moderator')", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("moderator") });
    const { result } = renderHook(() => useHasRole("moderator"), { wrapper: makeWrapper() });
    expect(result.current).toBe(true);
  });

  it("moderator user FAILS hasRole('admin') — hierarchy 2 < 3", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("moderator") });
    const { result } = renderHook(() => useHasRole("admin"), { wrapper: makeWrapper() });
    expect(result.current).toBe(false);
  });

  it("seller user passes hasRole('seller')", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("seller") });
    const { result } = renderHook(() => useHasRole("seller"), { wrapper: makeWrapper() });
    expect(result.current).toBe(true);
  });

  it("seller user passes hasRole('user') — hierarchy 1 >= 0", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("seller") });
    const { result } = renderHook(() => useHasRole("user"), { wrapper: makeWrapper() });
    expect(result.current).toBe(true);
  });

  it("seller user FAILS hasRole('moderator') — hierarchy 1 < 2", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("seller") });
    const { result } = renderHook(() => useHasRole("moderator"), { wrapper: makeWrapper() });
    expect(result.current).toBe(false);
  });

  it("user role FAILS hasRole('seller')", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("user") });
    const { result } = renderHook(() => useHasRole("seller"), { wrapper: makeWrapper() });
    expect(result.current).toBe(false);
  });

  it("accepts role array — passes if user satisfies ANY element", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("seller") });
    const { result } = renderHook(() => useHasRole(["admin", "seller"]), { wrapper: makeWrapper() });
    expect(result.current).toBe(true);
  });

  it("accepts role array — fails if user satisfies none", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("user") });
    const { result } = renderHook(() => useHasRole(["admin", "moderator"]), { wrapper: makeWrapper() });
    expect(result.current).toBe(false);
  });

  it("returns false when user is null", () => {
    mockUseCurrentUser.mockReturnValue({ user: null });
    const { result } = renderHook(() => useHasRole("user"), { wrapper: makeWrapper() });
    expect(result.current).toBe(false);
  });
});

describe("useIsAdmin", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns true for admin", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("admin") });
    const { result } = renderHook(() => useIsAdmin(), { wrapper: makeWrapper() });
    expect(result.current).toBe(true);
  });

  it("returns false for moderator", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("moderator") });
    const { result } = renderHook(() => useIsAdmin(), { wrapper: makeWrapper() });
    expect(result.current).toBe(false);
  });

  it("returns false for seller", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("seller") });
    const { result } = renderHook(() => useIsAdmin(), { wrapper: makeWrapper() });
    expect(result.current).toBe(false);
  });

  it("returns false when unauthenticated", () => {
    mockUseCurrentUser.mockReturnValue({ user: null });
    const { result } = renderHook(() => useIsAdmin(), { wrapper: makeWrapper() });
    expect(result.current).toBe(false);
  });
});

describe("useIsModerator", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns true for moderator", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("moderator") });
    const { result } = renderHook(() => useIsModerator(), { wrapper: makeWrapper() });
    expect(result.current).toBe(true);
  });

  it("returns true for admin (admin >= moderator)", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("admin") });
    const { result } = renderHook(() => useIsModerator(), { wrapper: makeWrapper() });
    expect(result.current).toBe(true);
  });

  it("returns false for seller", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("seller") });
    const { result } = renderHook(() => useIsModerator(), { wrapper: makeWrapper() });
    expect(result.current).toBe(false);
  });
});

describe("useIsSeller", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns true for seller", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("seller") });
    const { result } = renderHook(() => useIsSeller(), { wrapper: makeWrapper() });
    expect(result.current).toBe(true);
  });

  it("returns true for admin (hierarchy 3 >= 1)", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("admin") });
    const { result } = renderHook(() => useIsSeller(), { wrapper: makeWrapper() });
    expect(result.current).toBe(true);
  });

  it("returns false for plain user", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("user") });
    const { result } = renderHook(() => useIsSeller(), { wrapper: makeWrapper() });
    expect(result.current).toBe(false);
  });
});

describe("useRoleChecks — computed flags", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("admin user → isAdmin: true, isModerator: true, isSeller: true", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("admin") });
    const { result } = renderHook(() => useRoleChecks(), { wrapper: makeWrapper() });
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isModerator).toBe(true);
    expect(result.current.isSeller).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("seller user → isSeller: true, isModerator: false, isAdmin: false", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("seller") });
    const { result } = renderHook(() => useRoleChecks(), { wrapper: makeWrapper() });
    expect(result.current.isSeller).toBe(true);
    expect(result.current.isModerator).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it("plain user → isUser: true, all others false", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("user") });
    const { result } = renderHook(() => useRoleChecks(), { wrapper: makeWrapper() });
    expect(result.current.isUser).toBe(true);
    expect(result.current.isSeller).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it("unauthenticated → isAuthenticated: false, role: null", () => {
    mockUseCurrentUser.mockReturnValue({ user: null });
    const { result } = renderHook(() => useRoleChecks(), { wrapper: makeWrapper() });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.role).toBeNull();
  });

  it("hasRole() function returned by useRoleChecks works correctly", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("seller") });
    const { result } = renderHook(() => useRoleChecks(), { wrapper: makeWrapper() });
    expect(result.current.hasRole("seller")).toBe(true);
    expect(result.current.hasRole("admin")).toBe(false);
  });

  it("role field reflects user.role", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("moderator") });
    const { result } = renderHook(() => useRoleChecks(), { wrapper: makeWrapper() });
    expect(result.current.role).toBe("moderator");
  });
});

describe("useCanAccess — path-based access", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns { allowed: true } by default (no checkAccess provided)", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("user") });
    const { result } = renderHook(() => useCanAccess("/public"), { wrapper: makeWrapper() });
    expect(result.current.allowed).toBe(true);
  });

  it("delegates to checkAccess when provided", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("user") });
    const checkAccess = vi.fn().mockReturnValue({ allowed: false, reason: "not admin" });
    const { result } = renderHook(
      () => useCanAccess("/admin", { checkAccess }),
      { wrapper: makeWrapper() },
    );
    expect(result.current.allowed).toBe(false);
    expect(result.current.reason).toBe("not admin");
  });

  it("passes null to checkAccess when unauthenticated", () => {
    mockUseCurrentUser.mockReturnValue({ user: null });
    const checkAccess = vi.fn().mockReturnValue({ allowed: false });
    renderHook(() => useCanAccess("/protected", { checkAccess }), { wrapper: makeWrapper() });
    expect(checkAccess).toHaveBeenCalledWith(null, "/protected");
  });

  it("passes { role, emailVerified } to checkAccess when authenticated", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("admin", { isEmailVerified: true }) });
    const checkAccess = vi.fn().mockReturnValue({ allowed: true });
    renderHook(() => useCanAccess("/admin", { checkAccess }), { wrapper: makeWrapper() });
    expect(checkAccess).toHaveBeenCalledWith(
      { role: "admin", emailVerified: true },
      "/admin",
    );
  });
});

describe("useIsOwner — ownership check", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns true when user.id matches resourceOwnerId", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("user", { id: "user-abc" }) });
    const { result } = renderHook(() => useIsOwner("user-abc"), { wrapper: makeWrapper() });
    expect(result.current).toBe(true);
  });

  it("returns false when user.id does not match resourceOwnerId", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("user", { id: "user-abc" }) });
    const { result } = renderHook(() => useIsOwner("user-xyz"), { wrapper: makeWrapper() });
    expect(result.current).toBe(false);
  });

  it("returns false when unauthenticated", () => {
    mockUseCurrentUser.mockReturnValue({ user: null });
    const { result } = renderHook(() => useIsOwner("user-abc"), { wrapper: makeWrapper() });
    expect(result.current).toBe(false);
  });

  it("returns false when resourceOwnerId is null", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("user", { id: "user-abc" }) });
    const { result } = renderHook(() => useIsOwner(null), { wrapper: makeWrapper() });
    expect(result.current).toBe(false);
  });

  it("admin user returns true regardless of resourceOwnerId (admin override)", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("admin", { id: "admin-user" }) });
    const { result } = renderHook(() => useIsOwner("completely-different-owner"), {
      wrapper: makeWrapper(),
    });
    expect(result.current).toBe(true);
  });
});

describe("useRequireAuth — throws when not authenticated", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws AuthenticationError when user is null and not loading", () => {
    mockUseCurrentUser.mockReturnValue({ user: null, isLoading: false });
    expect(() =>
      renderHook(() => useRequireAuth(), { wrapper: makeWrapper() }),
    ).toThrow();
  });

  it("does not throw when user is present", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("user"), isLoading: false });
    expect(() =>
      renderHook(() => useRequireAuth(), { wrapper: makeWrapper() }),
    ).not.toThrow();
  });

  it("returns user when authenticated", () => {
    const user = makeUser("seller");
    mockUseCurrentUser.mockReturnValue({ user, isLoading: false });
    const { result } = renderHook(() => useRequireAuth(), { wrapper: makeWrapper() });
    expect(result.current.user).toMatchObject({ role: "seller" });
  });
});

describe("useRequireRole — throws when insufficient role", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("throws AuthorizationError when user has insufficient role", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("user"), isLoading: false });
    expect(() =>
      renderHook(() => useRequireRole("admin"), { wrapper: makeWrapper() }),
    ).toThrow();
  });

  it("does not throw for admin user requiring admin role", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("admin"), isLoading: false });
    expect(() =>
      renderHook(() => useRequireRole("admin"), { wrapper: makeWrapper() }),
    ).not.toThrow();
  });

  it("does not throw when seller requires seller role", () => {
    mockUseCurrentUser.mockReturnValue({ user: makeUser("seller"), isLoading: false });
    expect(() =>
      renderHook(() => useRequireRole("seller"), { wrapper: makeWrapper() }),
    ).not.toThrow();
  });

  it("throws when unauthenticated (useRequireAuth throws first)", () => {
    mockUseCurrentUser.mockReturnValue({ user: null, isLoading: false });
    expect(() =>
      renderHook(() => useRequireRole("seller"), { wrapper: makeWrapper() }),
    ).toThrow();
  });
});
