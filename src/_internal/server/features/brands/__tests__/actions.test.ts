import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockCategoriesCreateWithId,
  mockCategoriesUpdate,
  mockCategoriesDelete,
  mockAssertBrandExists,
  mockAssertBrandSlugUnique,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockCategoriesCreateWithId: vi.fn(),
  mockCategoriesUpdate: vi.fn(),
  mockCategoriesDelete: vi.fn(),
  mockAssertBrandExists: vi.fn(),
  mockAssertBrandSlugUnique: vi.fn(),
}));

vi.mock("@mohasinac/appkit/server", () => ({
  wrapAction: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
}));

vi.mock("../../../../repositories", () => ({
  categoriesRepository: {
    createWithId: mockCategoriesCreateWithId,
    update: mockCategoriesUpdate,
    delete: mockCategoriesDelete,
  },
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("./service", () => ({
  assertBrandExists: mockAssertBrandExists,
  assertBrandSlugUnique: mockAssertBrandSlugUnique,
}));

import {
  createBrandAction,
  updateBrandAction,
  deleteBrandAction,
  toggleBrandActiveAction,
} from "../actions";

function makeAdminUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-admin-1", email: "admin@test.com", name: "Admin User", ...overrides };
}

function makeBrandDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "brand-hot-wheels",
    name: "Hot Wheels",
    slug: "brand-hot-wheels",
    categoryType: "brand",
    isActive: true,
    ...overrides,
  };
}

function makeCreateInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Hot Wheels",
    slug: "brand-hot-wheels",
    description: "Iconic die-cast toy cars from Mattel.",
    isActive: true,
    displayOrder: 1,
    ...overrides,
  };
}

describe("createBrandAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockAssertBrandSlugUnique.mockResolvedValue(undefined);
    mockCategoriesCreateWithId.mockResolvedValue(makeBrandDoc());
  });

  it("non-admin → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Insufficient role"));
    const result = await createBrandAction(makeCreateInput());
    expect(result.ok).toBe(false);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await createBrandAction(makeCreateInput());
    expect(result.ok).toBe(false);
  });

  it("missing name → { ok: false }", async () => {
    const { name: _n, ...input } = makeCreateInput();
    const result = await createBrandAction(input);
    expect(result.ok).toBe(false);
  });

  it("duplicate slug (assertBrandSlugUnique throws) → { ok: false, error: /already exists/i }", async () => {
    mockAssertBrandSlugUnique.mockRejectedValue(new Error("Brand slug already exists"));
    const result = await createBrandAction(makeCreateInput());
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/already exists/i);
  });

  it("valid → categoriesRepository.createWithId called with slug as id", async () => {
    await createBrandAction(makeCreateInput());
    expect(mockCategoriesCreateWithId).toHaveBeenCalledWith(
      "brand-hot-wheels",
      expect.objectContaining({ categoryType: "brand" }),
    );
  });

  it("valid → created with isBrand: true", async () => {
    await createBrandAction(makeCreateInput());
    const createArg = mockCategoriesCreateWithId.mock.calls[0][1];
    expect(createArg.isBrand).toBe(true);
  });

  it("success → { ok: true, data: brand }", async () => {
    const brand = makeBrandDoc();
    mockCategoriesCreateWithId.mockResolvedValue(brand);
    const result = await createBrandAction(makeCreateInput());
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual(brand);
  });
});

describe("updateBrandAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockAssertBrandExists.mockResolvedValue(makeBrandDoc());
    mockCategoriesUpdate.mockResolvedValue(makeBrandDoc());
  });

  it("non-admin → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Insufficient role"));
    const result = await updateBrandAction("brand-hot-wheels", { description: "Updated" });
    expect(result.ok).toBe(false);
  });

  it("brand not found (assertBrandExists throws) → { ok: false }", async () => {
    mockAssertBrandExists.mockRejectedValue(new Error("Brand not found"));
    const result = await updateBrandAction("brand-missing", { description: "Updated" });
    expect(result.ok).toBe(false);
  });

  it("valid → categoriesRepository.update called with brandId", async () => {
    await updateBrandAction("brand-hot-wheels", { description: "Updated description" });
    expect(mockCategoriesUpdate).toHaveBeenCalledWith("brand-hot-wheels", expect.any(Object));
  });

  it("logoURL provided → mapped to display.coverImage", async () => {
    await updateBrandAction("brand-hot-wheels", { logoURL: "https://example.com/logo.png" });
    const updateArg = mockCategoriesUpdate.mock.calls[0][1];
    expect(updateArg.display?.coverImage).toBe("https://example.com/logo.png");
  });
});

describe("deleteBrandAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockAssertBrandExists.mockResolvedValue(makeBrandDoc());
    mockCategoriesDelete.mockResolvedValue(undefined);
  });

  it("non-admin → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Insufficient role"));
    const result = await deleteBrandAction("brand-hot-wheels");
    expect(result.ok).toBe(false);
  });

  it("brand not found → { ok: false }", async () => {
    mockAssertBrandExists.mockRejectedValue(new Error("Brand not found"));
    const result = await deleteBrandAction("brand-missing");
    expect(result.ok).toBe(false);
  });

  it("valid → categoriesRepository.delete called", async () => {
    await deleteBrandAction("brand-hot-wheels");
    expect(mockCategoriesDelete).toHaveBeenCalledWith("brand-hot-wheels");
  });
});

describe("toggleBrandActiveAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockAssertBrandExists.mockResolvedValue(makeBrandDoc({ isActive: true }));
    mockCategoriesUpdate.mockResolvedValue(undefined);
  });

  it("non-admin → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Insufficient role"));
    const result = await toggleBrandActiveAction("brand-hot-wheels", false);
    expect(result.ok).toBe(false);
  });

  it("brand not found → { ok: false }", async () => {
    mockAssertBrandExists.mockRejectedValue(new Error("Brand not found"));
    const result = await toggleBrandActiveAction("brand-missing", false);
    expect(result.ok).toBe(false);
  });

  it("isActive = false → categoriesRepository.update called with isActive: false", async () => {
    await toggleBrandActiveAction("brand-hot-wheels", false);
    expect(mockCategoriesUpdate).toHaveBeenCalledWith("brand-hot-wheels", { isActive: false });
  });

  it("isActive = true → categoriesRepository.update called with isActive: true", async () => {
    await toggleBrandActiveAction("brand-hot-wheels", true);
    expect(mockCategoriesUpdate).toHaveBeenCalledWith("brand-hot-wheels", { isActive: true });
  });
});
