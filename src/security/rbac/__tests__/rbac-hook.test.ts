import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { createRbacHook } from "../hook";
import type { RbacConfig } from "../types";

const config: RbacConfig = {
  roles: {
    admin: {
      label: "Admin",
      permissions: ["admin:access", "products:write", "users:write"],
    },
    seller: {
      label: "Seller",
      permissions: ["seller:access", "products:write"],
    },
    moderator: {
      label: "Moderator",
      permissions: ["admin:access"],
      inherits: ["seller"],
    },
    super_admin: {
      label: "Super Admin",
      permissions: ["*"],
    },
    user: {
      label: "User",
      permissions: ["orders:read"],
    },
  },
};

describe("createRbacHook — no roles", () => {
  it("returns empty permissions for no roles", () => {
    const useRBAC = createRbacHook(config, () => []);
    const { result } = renderHook(() => useRBAC());
    expect(result.current.permissions.size).toBe(0);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSeller).toBe(false);
  });

  it("can() returns false for any permission", () => {
    const useRBAC = createRbacHook(config, () => []);
    const { result } = renderHook(() => useRBAC());
    expect(result.current.can("admin:access")).toBe(false);
    expect(result.current.can("products:write")).toBe(false);
  });
});

describe("createRbacHook — single role", () => {
  it("resolves permissions for admin role", () => {
    const useRBAC = createRbacHook(config, () => ["admin"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current.can("admin:access")).toBe(true);
    expect(result.current.can("products:write")).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isSeller).toBe(false);
  });

  it("resolves permissions for seller role", () => {
    const useRBAC = createRbacHook(config, () => ["seller"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current.can("seller:access")).toBe(true);
    expect(result.current.can("admin:access")).toBe(false);
    expect(result.current.isSeller).toBe(true);
  });

  it("inherits permissions from parent role", () => {
    const useRBAC = createRbacHook(config, () => ["moderator"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current.can("admin:access")).toBe(true);
    expect(result.current.can("seller:access")).toBe(true);
    expect(result.current.can("products:write")).toBe(true);
  });
});

describe("createRbacHook — super_admin wildcard", () => {
  it("wildcard grants all permissions", () => {
    const useRBAC = createRbacHook(config, () => ["super_admin"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current.can("admin:access")).toBe(true);
    expect(result.current.can("any:random:perm")).toBe(true);
    expect(result.current.isAdmin).toBe(true);
  });
});

describe("createRbacHook — multi-role union (default)", () => {
  it("union of two roles gives combined permissions", () => {
    const useRBAC = createRbacHook(config, () => ["user", "seller"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current.can("orders:read")).toBe(true);
    expect(result.current.can("seller:access")).toBe(true);
  });

  it("roles array is returned", () => {
    const useRBAC = createRbacHook(config, () => ["user", "seller"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current.roles).toEqual(["user", "seller"]);
  });
});

describe("createRbacHook — multi-role intersection", () => {
  it("intersection keeps only shared permissions", () => {
    const intersectConfig: RbacConfig = {
      ...config,
      multiRoleStrategy: "intersection",
    };
    const useRBAC = createRbacHook(intersectConfig, () => ["seller", "user"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current.can("seller:access")).toBe(false);
    expect(result.current.can("orders:read")).toBe(false);
  });
});

describe("createRbacHook — canAll and canAny", () => {
  it("canAll returns true when all permissions are held", () => {
    const useRBAC = createRbacHook(config, () => ["admin"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current.canAll(["admin:access", "products:write"])).toBe(true);
  });

  it("canAll returns false when any permission is missing", () => {
    const useRBAC = createRbacHook(config, () => ["admin"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current.canAll(["admin:access", "seller:access"])).toBe(false);
  });

  it("canAny returns true when at least one permission is held", () => {
    const useRBAC = createRbacHook(config, () => ["seller"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current.canAny(["admin:access", "seller:access"])).toBe(true);
  });

  it("canAny returns false when no permissions are held", () => {
    const useRBAC = createRbacHook(config, () => ["user"]);
    const { result } = renderHook(() => useRBAC());
    expect(result.current.canAny(["admin:access", "seller:access"])).toBe(false);
  });
});
