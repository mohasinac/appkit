import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockBlogCreate,
  mockBlogUpdate,
  mockBlogDelete,
  mockAssertBlogPostExists,
  mockAssertBlogSlugUnique,
  mockComputeReadTime,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockBlogCreate: vi.fn(),
  mockBlogUpdate: vi.fn(),
  mockBlogDelete: vi.fn(),
  mockAssertBlogPostExists: vi.fn(),
  mockAssertBlogSlugUnique: vi.fn(),
  mockComputeReadTime: vi.fn(),
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
  blogRepository: {
    createWithId: mockBlogCreate,
    update: mockBlogUpdate,
    delete: mockBlogDelete,
  },
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("./service", () => ({
  assertBlogPostExists: mockAssertBlogPostExists,
  assertBlogSlugUnique: mockAssertBlogSlugUnique,
  computeReadTime: mockComputeReadTime,
}));

import {
  createBlogPostAction,
  updateBlogPostAction,
  deleteBlogPostAction,
  publishBlogPostAction,
  unpublishBlogPostAction,
} from "../actions";

function makeAdminUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-admin-1", email: "admin@test.com", name: "Admin User", ...overrides };
}

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: "blog-how-to-grade",
    slug: "how-to-grade-pokemon-cards",
    title: "How to Grade Pokémon Cards",
    content: "Content here with at least ten words to satisfy the schema.",
    status: "draft",
    ...overrides,
  };
}

function makeCreateInput(overrides: Record<string, unknown> = {}) {
  return {
    slug: "how-to-grade-pokemon-cards",
    title: "How to Grade Pokémon Cards",
    content: "Content here with at least ten words to satisfy the schema.",
    excerpt: "Short excerpt",
    category: "guides",
    tags: ["pokemon"],
    status: "draft",
    ...overrides,
  };
}

describe("createBlogPostAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockAssertBlogSlugUnique.mockResolvedValue(undefined);
    mockComputeReadTime.mockReturnValue(3);
    mockBlogCreate.mockResolvedValue(makePost());
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await createBlogPostAction(makeCreateInput());
    expect(result.ok).toBe(false);
  });

  it("non-admin/moderator role → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Insufficient role"));
    const result = await createBlogPostAction(makeCreateInput());
    expect(result.ok).toBe(false);
  });

  it("missing title → { ok: false }", async () => {
    const { title: _t, ...input } = makeCreateInput();
    const result = await createBlogPostAction(input);
    expect(result.ok).toBe(false);
  });

  it("duplicate slug (assertBlogSlugUnique throws) → { ok: false }", async () => {
    mockAssertBlogSlugUnique.mockRejectedValue(new Error("Slug already exists"));
    const result = await createBlogPostAction(makeCreateInput());
    expect(result.ok).toBe(false);
  });

  it("valid → blogRepository.createWithId called with slug as id", async () => {
    await createBlogPostAction(makeCreateInput());
    expect(mockBlogCreate).toHaveBeenCalledWith(
      "how-to-grade-pokemon-cards",
      expect.objectContaining({ authorId: "user-admin-1" }),
    );
  });

  it("valid → status defaults to draft on creation with no publishedAt", async () => {
    await createBlogPostAction(makeCreateInput({ status: "draft" }));
    const createArg = mockBlogCreate.mock.calls[0][1];
    expect(createArg.publishedAt).toBeUndefined();
  });

  it("valid published post → publishedAt set", async () => {
    await createBlogPostAction(makeCreateInput({ status: "published" }));
    const createArg = mockBlogCreate.mock.calls[0][1];
    expect(createArg.publishedAt).toBeInstanceOf(Date);
  });

  it("valid → readTimeMinutes set from computeReadTime", async () => {
    mockComputeReadTime.mockReturnValue(5);
    await createBlogPostAction(makeCreateInput());
    const createArg = mockBlogCreate.mock.calls[0][1];
    expect(createArg.readTimeMinutes).toBe(5);
  });

  it("success → { ok: true, data: post }", async () => {
    const post = makePost();
    mockBlogCreate.mockResolvedValue(post);
    const result = await createBlogPostAction(makeCreateInput());
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual(post);
  });
});

describe("updateBlogPostAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockAssertBlogPostExists.mockResolvedValue(makePost());
    mockComputeReadTime.mockReturnValue(4);
    mockBlogUpdate.mockResolvedValue(makePost({ status: "published" }));
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await updateBlogPostAction("blog-how-to-grade", { title: "New Title" });
    expect(result.ok).toBe(false);
  });

  it("post not found (assertBlogPostExists throws) → { ok: false }", async () => {
    mockAssertBlogPostExists.mockRejectedValue(new Error("Post not found"));
    const result = await updateBlogPostAction("blog-missing", { title: "Title" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not found/i);
  });

  it("invalid input → { ok: false }", async () => {
    // title with only 1 char should fail schema
    const result = await updateBlogPostAction("blog-how-to-grade", { title: "X" });
    expect(result.ok).toBe(false);
  });

  it("valid → blogRepository.update called with postId", async () => {
    await updateBlogPostAction("blog-how-to-grade", { title: "Updated Title" });
    expect(mockBlogUpdate).toHaveBeenCalledWith("blog-how-to-grade", expect.any(Object));
  });

  it("content updated → readTimeMinutes recomputed", async () => {
    mockComputeReadTime.mockReturnValue(7);
    await updateBlogPostAction("blog-how-to-grade", { content: "New content with many words here for the update." });
    const updateArg = mockBlogUpdate.mock.calls[0][1];
    expect(updateArg.readTimeMinutes).toBe(7);
  });

  it("status changed to published from draft → publishedAt set", async () => {
    mockAssertBlogPostExists.mockResolvedValue(makePost({ status: "draft" }));
    await updateBlogPostAction("blog-how-to-grade", { status: "published" });
    const updateArg = mockBlogUpdate.mock.calls[0][1];
    expect(updateArg.publishedAt).toBeInstanceOf(Date);
  });

  it("already published → no new publishedAt on re-publish", async () => {
    mockAssertBlogPostExists.mockResolvedValue(makePost({ status: "published" }));
    await updateBlogPostAction("blog-how-to-grade", { status: "published" });
    const updateArg = mockBlogUpdate.mock.calls[0][1];
    expect(updateArg.publishedAt).toBeUndefined();
  });
});

describe("deleteBlogPostAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockAssertBlogPostExists.mockResolvedValue(makePost());
    mockBlogDelete.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await deleteBlogPostAction("blog-how-to-grade");
    expect(result.ok).toBe(false);
  });

  it("non-admin (moderator) → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Insufficient role"));
    const result = await deleteBlogPostAction("blog-how-to-grade");
    expect(result.ok).toBe(false);
  });

  it("post not found → { ok: false }", async () => {
    mockAssertBlogPostExists.mockRejectedValue(new Error("Post not found"));
    const result = await deleteBlogPostAction("blog-missing");
    expect(result.ok).toBe(false);
  });

  it("valid → blogRepository.delete called", async () => {
    await deleteBlogPostAction("blog-how-to-grade");
    expect(mockBlogDelete).toHaveBeenCalledWith("blog-how-to-grade");
  });
});

describe("publishBlogPostAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockAssertBlogPostExists.mockResolvedValue(makePost());
    mockBlogUpdate.mockResolvedValue(makePost({ status: "published" }));
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await publishBlogPostAction("blog-how-to-grade");
    expect(result.ok).toBe(false);
  });

  it("post not found → { ok: false }", async () => {
    mockAssertBlogPostExists.mockRejectedValue(new Error("Post not found"));
    const result = await publishBlogPostAction("blog-missing");
    expect(result.ok).toBe(false);
  });

  it("valid → sets status: published with publishedAt", async () => {
    await publishBlogPostAction("blog-how-to-grade");
    expect(mockBlogUpdate).toHaveBeenCalledWith(
      "blog-how-to-grade",
      expect.objectContaining({ status: "published" }),
    );
    const updateArg = mockBlogUpdate.mock.calls[0][1];
    expect(updateArg.publishedAt).toBeInstanceOf(Date);
  });
});

describe("unpublishBlogPostAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockAssertBlogPostExists.mockResolvedValue(makePost({ status: "published" }));
    mockBlogUpdate.mockResolvedValue(makePost({ status: "draft" }));
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await unpublishBlogPostAction("blog-how-to-grade");
    expect(result.ok).toBe(false);
  });

  it("valid → sets status: draft", async () => {
    await unpublishBlogPostAction("blog-how-to-grade");
    expect(mockBlogUpdate).toHaveBeenCalledWith("blog-how-to-grade", { status: "draft" });
  });
});
