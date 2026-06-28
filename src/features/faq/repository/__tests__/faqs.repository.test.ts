import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery } = makeMockDb();

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return {
    ...actual,
    prepareForFirestore: (d: Record<string, unknown>) => d,
  };
});

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { FirebaseFAQsRepository } from "../faqs.repository";
import type { FAQDocument } from "../../schemas";

const repo = new FirebaseFAQsRepository();

function makeFaqDoc(overrides: Partial<FAQDocument> = {}): FAQDocument {
  return {
    id: "faq-how-does-bidding-work",
    question: "How does bidding work?",
    answer: { text: "You place a bid above the current price.", format: "plain" as const },
    category: "Auctions" as FAQDocument["category"],
    tags: ["bidding", "auctions"],
    searchTokens: ["how", "does", "bidding", "work"],
    relatedFAQs: [],
    seo: { slug: "how-does-bidding-work" },
    isActive: true,
    showOnHomepage: false,
    showInFooter: false,
    isPinned: false,
    priority: 0,
    order: 0,
    useSiteSettings: false,
    createdBy: "admin-1",
    stats: { views: 0, helpful: 0, notHelpful: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// createWithSlug
// ---------------------------------------------------------------------------
describe("FirebaseFAQsRepository.createWithSlug", () => {
  it("uses seo.slug from input when provided", async () => {
    const input = {
      question: "How does bidding work?",
      answer: { text: "You bid above the current price.", format: "plain" as const },
      category: "Auctions" as FAQDocument["category"],
      tags: ["bidding"],
      seo: { slug: "custom-slug" },
      isActive: true,
    };
    const result = await repo.createWithSlug(input as never);
    expect(result.seo.slug).toBe("custom-slug");
  });

  it("generates seo.slug from question when seo.slug not provided", async () => {
    const input = {
      question: "How does bidding work?",
      answer: { text: "Details here.", format: "plain" as const },
      category: "Auctions" as FAQDocument["category"],
      tags: [],
      isActive: true,
    };
    const result = await repo.createWithSlug(input as never);
    expect(result.seo.slug).toMatch(/bidding/i);
  });

  it("builds searchTokens from question, answer, category, and tags", async () => {
    const input = {
      question: "What is a reserve price?",
      answer: { text: "Reserve is the minimum.", format: "plain" as const },
      category: "Auctions" as FAQDocument["category"],
      tags: ["reserve", "price"],
      seo: { slug: "what-is-reserve-price" },
      isActive: true,
    };
    const result = await repo.createWithSlug(input as never);
    expect(result.searchTokens).toContain("reserve");
    expect(result.searchTokens).toContain("price");
    expect(result.searchTokens).toContain("what");
  });

  it("sets stats.views=0, stats.helpful=0, stats.notHelpful=0", async () => {
    const input = {
      question: "New question?",
      answer: { text: "Answer.", format: "plain" as const },
      category: "General" as FAQDocument["category"],
      tags: [],
      isActive: true,
    };
    const result = await repo.createWithSlug(input as never);
    expect(result.stats).toEqual({ views: 0, helpful: 0, notHelpful: 0 });
  });

  it("persists the FAQ to Firestore", async () => {
    const input = {
      question: "Question?",
      answer: { text: "Answer.", format: "plain" as const },
      category: "General" as FAQDocument["category"],
      tags: [],
      seo: { slug: "question" },
      isActive: true,
    };
    await repo.createWithSlug(input as never);
    expect(mockDocRef.set).toHaveBeenCalledOnce();
  });

  it("searchTokens deduplicated and lowercased", async () => {
    const input = {
      question: "What what what?",
      answer: { text: "Answer.", format: "plain" as const },
      category: "General" as FAQDocument["category"],
      tags: [],
      isActive: true,
    };
    const result = await repo.createWithSlug(input as never);
    const whatCount = result.searchTokens!.filter((t) => t === "what").length;
    expect(whatCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// interpolateVariables
// ---------------------------------------------------------------------------
describe("FirebaseFAQsRepository.interpolateVariables", () => {
  it("replaces {{variable}} placeholders with provided values", async () => {
    const faq = makeFaqDoc({
      answer: { text: "Your order {{orderId}} will arrive in {{days}} days.", format: "plain" as const },
    });
    const result = await repo.interpolateVariables(faq, { orderId: "ORD-123", days: 3 });
    expect(result.answer.interpolated).toBe(
      "Your order ORD-123 will arrive in 3 days.",
    );
  });

  it("falls back to faq.variables when runtime variable not provided", async () => {
    const faq = makeFaqDoc({
      answer: { text: "Contact us at {{supportEmail}}.", format: "plain" as const },
      variables: { supportEmail: "support@letitrip.in" },
    } as never);
    const result = await repo.interpolateVariables(faq);
    expect(result.answer.interpolated).toBe("Contact us at support@letitrip.in.");
  });

  it("leaves unknown placeholders as-is", async () => {
    const faq = makeFaqDoc({
      answer: { text: "Hello {{unknownVar}}!", format: "plain" as const },
    });
    const result = await repo.interpolateVariables(faq, {});
    expect(result.answer.interpolated).toBe("Hello {{unknownVar}}!");
  });

  it("returns unchanged interpolated when no placeholders present", async () => {
    const faq = makeFaqDoc({
      answer: { text: "No variables here.", format: "plain" as const },
    });
    const result = await repo.interpolateVariables(faq, { irrelevant: "x" });
    expect(result.answer.interpolated).toBe("No variables here.");
  });

  it("replaces multiple occurrences of the same placeholder", async () => {
    const faq = makeFaqDoc({
      answer: { text: "{{name}} is {{name}}.", format: "plain" as const },
    });
    const result = await repo.interpolateVariables(faq, { name: "LetItRip" });
    expect(result.answer.interpolated).toBe("LetItRip is LetItRip.");
  });
});

// ---------------------------------------------------------------------------
// markHelpful
// ---------------------------------------------------------------------------
describe("FirebaseFAQsRepository.markHelpful", () => {
  it("increments stats.helpful on the FAQ document", async () => {
    await repo.markHelpful("faq-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ "stats.helpful": expect.anything() }),
    );
  });

  it("does not modify other stats fields", async () => {
    await repo.markHelpful("faq-1");
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(updateArg)).not.toContain("stats.views");
    expect(Object.keys(updateArg)).not.toContain("stats.notHelpful");
  });
});

// ---------------------------------------------------------------------------
// markNotHelpful
// ---------------------------------------------------------------------------
describe("FirebaseFAQsRepository.markNotHelpful", () => {
  it("increments stats.notHelpful on the FAQ document", async () => {
    await repo.markNotHelpful("faq-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ "stats.notHelpful": expect.anything() }),
    );
  });

  it("does not modify stats.helpful", async () => {
    await repo.markNotHelpful("faq-1");
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(updateArg)).not.toContain("stats.helpful");
  });
});

// ---------------------------------------------------------------------------
// incrementViews
// ---------------------------------------------------------------------------
describe("FirebaseFAQsRepository.incrementViews", () => {
  it("increments stats.views by 1", async () => {
    await repo.incrementViews("faq-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ "stats.views": expect.anything() }),
    );
  });

  it("sets stats.lastViewed timestamp", async () => {
    await repo.incrementViews("faq-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ "stats.lastViewed": expect.any(Date) }),
    );
  });
});

// ---------------------------------------------------------------------------
// getHomepageFAQs
// ---------------------------------------------------------------------------
describe("FirebaseFAQsRepository.getHomepageFAQs", () => {
  it("queries showOnHomepage=true AND isActive=true", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getHomepageFAQs();
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("showOnHomepage"),
      "==",
      true,
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("isActive"),
      "==",
      true,
    );
  });

  it("orders results by priority descending", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getHomepageFAQs();
    expect(mockQuery.orderBy).toHaveBeenCalledWith(
      expect.stringContaining("priority"),
      "desc",
    );
  });

  it("returns matching FAQs", async () => {
    const faq = makeFaqDoc({ showOnHomepage: true });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: faq.id, data: faq as unknown as Record<string, unknown> }]));
    const results = await repo.getHomepageFAQs();
    expect(results).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// searchByTag
// ---------------------------------------------------------------------------
describe("FirebaseFAQsRepository.searchByTag", () => {
  it("filters by array-contains on the tags field", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.searchByTag("grading");
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("tags"),
      "array-contains",
      "grading",
    );
  });

  it("also filters isActive=true", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.searchByTag("returns");
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("isActive"),
      "==",
      true,
    );
  });

  it("returns matching FAQs", async () => {
    const faq = makeFaqDoc({ tags: ["grading"] });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: faq.id, data: faq as unknown as Record<string, unknown> }]));
    const results = await repo.searchByTag("grading");
    expect(results).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getPinnedFAQs
// ---------------------------------------------------------------------------
describe("FirebaseFAQsRepository.getPinnedFAQs", () => {
  it("queries isPinned=true AND isActive=true", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getPinnedFAQs();
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("isPinned"),
      "==",
      true,
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("isActive"),
      "==",
      true,
    );
  });

  it("orders by order field ascending", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getPinnedFAQs();
    expect(mockQuery.orderBy).toHaveBeenCalledWith(
      expect.stringContaining("order"),
      "asc",
    );
  });

  it("filters by category when provided", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getPinnedFAQs("Shipping" as FAQDocument["category"]);
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("category"),
      "==",
      "Shipping",
    );
  });

  it("no category filter applied when category not provided", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getPinnedFAQs();
    const whereCalls = mockQuery.where.mock.calls as [string, string, unknown][];
    const categoryFilter = whereCalls.find((c) => c[0].includes("category"));
    expect(categoryFilter).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getMostHelpful
// ---------------------------------------------------------------------------
describe("FirebaseFAQsRepository.getMostHelpful", () => {
  it("filters by isActive=true", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getMostHelpful();
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("isActive"),
      "==",
      true,
    );
  });

  it("orders by stats.helpful descending", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getMostHelpful();
    expect(mockQuery.orderBy).toHaveBeenCalledWith("stats.helpful", "desc");
  });

  it("applies default limit of 10", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getMostHelpful();
    expect(mockQuery.limit).toHaveBeenCalledWith(10);
  });

  it("applies custom limit when provided", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getMostHelpful(5);
    expect(mockQuery.limit).toHaveBeenCalledWith(5);
  });
});
