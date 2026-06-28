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

vi.mock("../../../../contracts/field-ops", () => ({
  serverTimestamp: () => new Date(),
  increment: (n: number) => n,
  arrayUnion: (...args: unknown[]) => args,
  arrayRemove: (...args: unknown[]) => args,
  deleteField: () => null,
  registerFieldOps: vi.fn(),
}));

vi.mock("../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));
vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { ScammerRepository } from "../scammer.repository";

const repo = new ScammerRepository();

function makeScammerDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "scammer-fake-seller-lk4e7",
    status: "verified",
    displayNames: ["Fake Seller"],
    phones: ["9876543210"],
    upiIds: ["fakeseller@paytm"],
    emails: ["fake@example.com"],
    scamType: "fake_seller",
    scamPlatform: "instagram",
    reportedBy: "user-ravi",
    views: 0,
    incidentCount: 0,
    commentCount: 0,
    contestCount: 0,
    isContested: false,
    seoSlug: "scammer-fake-seller-lk4e7",
    relatedScammerIds: [],
    mergedFromIds: [],
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Subcollection mock
const mockSubCollection = {
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  get: vi.fn().mockResolvedValue(makeQuerySnap([])),
};

beforeEach(() => {
  vi.clearAllMocks();
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.offset = vi.fn().mockReturnValue(mockQuery);
  mockQuery.count.mockReturnValue({
    get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
  });
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(makeScammerDoc(), "scammer-1"));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  mockDocRef.delete.mockResolvedValue(undefined);

  // Subcollection chain
  mockSubCollection.where.mockReturnValue(mockSubCollection);
  mockSubCollection.orderBy.mockReturnValue(mockSubCollection);
  mockSubCollection.limit.mockReturnValue(mockSubCollection);
  mockSubCollection.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.collection = vi.fn().mockReturnValue(mockSubCollection);
});

// ---------------------------------------------------------------------------
// findByContactField
// ---------------------------------------------------------------------------
describe("ScammerRepository.findByContactField", () => {
  it("queries phones array-contains the given value", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findByContactField("phones", "9876543210");
    expect(mockCollection.where).toHaveBeenCalledWith("phones", "array-contains", "9876543210");
  });

  it("queries upiIds array-contains the given value", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findByContactField("upiIds", "fakeseller@paytm");
    expect(mockCollection.where).toHaveBeenCalledWith("upiIds", "array-contains", "fakeseller@paytm");
  });

  it("queries emails array-contains the given value", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findByContactField("emails", "fake@example.com");
    expect(mockCollection.where).toHaveBeenCalledWith("emails", "array-contains", "fake@example.com");
  });

  it("queries displayNames array-contains the given value", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findByContactField("displayNames", "Fake Seller");
    expect(mockCollection.where).toHaveBeenCalledWith("displayNames", "array-contains", "Fake Seller");
  });

  it("limits to 5 results", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findByContactField("phones", "123");
    expect(mockQuery.limit).toHaveBeenCalledWith(5);
  });

  it("returns empty array when no matches", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.findByContactField("phones", "no-match");
    expect(result).toEqual([]);
  });

  it("returns matched documents", async () => {
    const scammer = makeScammerDoc({ phones: ["9876543210"] });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([{ id: scammer.id as string, data: scammer }]),
    );
    const result = await repo.findByContactField("phones", "9876543210");
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe("ScammerRepository.create", () => {
  it("generates an ID prefixed with 'scammer-'", async () => {
    await repo.create({
      displayNames: ["John Faker"],
      phones: ["9999999999"],
      upiIds: [],
      emails: [],
      scamType: "fake_seller",
      scamPlatform: "whatsapp",
      reportedBy: "user-ravi",
      description: "Fraud",
    } as never);
    const docId = mockCollection.doc.mock.calls[0][0] as string;
    expect(docId).toMatch(/^scammer-/);
  });

  it("slugifies displayNames[0] into the ID", async () => {
    await repo.create({
      displayNames: ["John Faker"],
      phones: [],
      upiIds: [],
      emails: [],
      scamType: "fake_seller",
      scamPlatform: "whatsapp",
      reportedBy: "user-ravi",
      description: "Fraud",
    } as never);
    const docId = mockCollection.doc.mock.calls[0][0] as string;
    expect(docId).toContain("john-faker");
  });

  it("generates fallback ID when displayNames is empty", async () => {
    await repo.create({
      displayNames: [],
      phones: ["9999999999"],
      upiIds: [],
      emails: [],
      scamType: "fake_seller",
      scamPlatform: "instagram",
      reportedBy: "user-ravi",
      description: "Fraud",
    } as never);
    const docId = mockCollection.doc.mock.calls[0][0] as string;
    expect(docId).toMatch(/^scammer-/);
  });

  it("sets status: pending_review on new scammer profile", async () => {
    await repo.create({
      displayNames: ["Faker"],
      phones: [],
      upiIds: [],
      emails: [],
      scamType: "fake_seller",
      scamPlatform: "instagram",
      reportedBy: "user-ravi",
      description: "Fraud",
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.status).toBe("pending_review");
  });

  it("initialises counters to zero", async () => {
    await repo.create({
      displayNames: ["Faker"],
      phones: [],
      upiIds: [],
      emails: [],
      scamType: "fake_seller",
      scamPlatform: "instagram",
      reportedBy: "user-ravi",
      description: "Fraud",
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.views).toBe(0);
    expect(setArg.incidentCount).toBe(0);
    expect(setArg.commentCount).toBe(0);
    expect(setArg.contestCount).toBe(0);
  });

  it("sets isContested: false", async () => {
    await repo.create({
      displayNames: ["Faker"],
      phones: [],
      upiIds: [],
      emails: [],
      scamType: "fake_seller",
      scamPlatform: "instagram",
      reportedBy: "user-ravi",
      description: "Fraud",
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.isContested).toBe(false);
  });

  it("sets seoSlug equal to the generated ID", async () => {
    await repo.create({
      displayNames: ["Faker"],
      phones: [],
      upiIds: [],
      emails: [],
      scamType: "fake_seller",
      scamPlatform: "instagram",
      reportedBy: "user-ravi",
      description: "Fraud",
    } as never);
    const docId = mockCollection.doc.mock.calls[0][0] as string;
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.seoSlug).toBe(docId);
  });

  it("initialises empty arrays for relatedScammerIds, mergedFromIds, tags", async () => {
    await repo.create({
      displayNames: ["Faker"],
      phones: [],
      upiIds: [],
      emails: [],
      scamType: "fake_seller",
      scamPlatform: "instagram",
      reportedBy: "user-ravi",
      description: "Fraud",
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.relatedScammerIds).toEqual([]);
    expect(setArg.mergedFromIds).toEqual([]);
    expect(setArg.tags).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// adminUpdate
// ---------------------------------------------------------------------------
describe("ScammerRepository.adminUpdate", () => {
  it("calls doc(id).update with provided fields", async () => {
    await repo.adminUpdate("scammer-1", { status: "verified" } as never);
    expect(mockCollection.doc).toHaveBeenCalledWith("scammer-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "verified" }),
    );
  });

  it("always sets updatedAt on update", async () => {
    await repo.adminUpdate("scammer-1", { status: "dismissed" } as never);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });

  it("supports partial updates (only provided fields changed)", async () => {
    await repo.adminUpdate("scammer-1", { isContested: true } as never);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ isContested: true }),
    );
  });
});

// ---------------------------------------------------------------------------
// incrementViews
// ---------------------------------------------------------------------------
describe("ScammerRepository.incrementViews", () => {
  it("calls doc(id).update with views increment (fire-and-forget)", async () => {
    await repo.incrementViews("scammer-1");
    expect(mockCollection.doc).toHaveBeenCalledWith("scammer-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ views: 1 }),
    );
  });

  it("does not throw when Firestore update fails (graceful fallback)", async () => {
    mockDocRef.update.mockRejectedValue(new Error("Firestore error"));
    await expect(repo.incrementViews("scammer-1")).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// findBySeoSlug
// ---------------------------------------------------------------------------
describe("ScammerRepository.findBySeoSlug", () => {
  it("queries by seoSlug field with == operator", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findBySeoSlug("scammer-fake-seller-lk4e7");
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("seoSlug"),
      "==",
      "scammer-fake-seller-lk4e7",
    );
  });

  it("limits to 1 result", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findBySeoSlug("scammer-abc");
    expect(mockQuery.limit).toHaveBeenCalledWith(1);
  });

  it("returns null when no match found", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.findBySeoSlug("nonexistent-slug");
    expect(result).toBeNull();
  });

  it("returns matched document", async () => {
    const scammer = makeScammerDoc({ seoSlug: "scammer-fake-seller-lk4e7" });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([{ id: scammer.id as string, data: scammer }]),
    );
    const result = await repo.findBySeoSlug("scammer-fake-seller-lk4e7");
    expect(result).not.toBeNull();
    expect(result?.seoSlug).toBe("scammer-fake-seller-lk4e7");
  });
});

// ---------------------------------------------------------------------------
// findManyById
// ---------------------------------------------------------------------------
describe("ScammerRepository.findManyById", () => {
  it("returns empty array immediately when ids is empty", async () => {
    const result = await repo.findManyById([]);
    expect(result).toEqual([]);
    expect(mockDocRef.get).not.toHaveBeenCalled();
  });

  it("returns only verified scammers", async () => {
    const verified = makeScammerDoc({ id: "s-1", status: "verified" });
    const pending = makeScammerDoc({ id: "s-2", status: "pending_review" });
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap(verified, "s-1"))
      .mockResolvedValueOnce(makeSnap(pending, "s-2"));
    const result = await repo.findManyById(["s-1", "s-2"]);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("verified");
  });

  it("does not include null results (non-existent IDs)", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.findManyById(["nonexistent"]);
    expect(result).toEqual([]);
  });

  it("caps at 5 IDs (slices excess)", async () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g"];
    const verified = makeScammerDoc({ status: "verified" });
    mockDocRef.get.mockResolvedValue(makeSnap(verified, "a"));
    await repo.findManyById(ids);
    expect(mockDocRef.get).toHaveBeenCalledTimes(5);
  });
});

// ---------------------------------------------------------------------------
// listVerified
// ---------------------------------------------------------------------------
describe("ScammerRepository.listVerified", () => {
  it("applies status==verified as the base query filter", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    mockQuery.count = vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }) });
    await repo.listVerified({ page: 1, pageSize: 20, filters: "" });
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("status"),
      "==",
      "verified",
    );
  });
});

// ---------------------------------------------------------------------------
// listPublicIncidents
// ---------------------------------------------------------------------------
describe("ScammerRepository.listPublicIncidents", () => {
  it("queries subcollection for verified incidents", async () => {
    await repo.listPublicIncidents("scammer-1");
    expect(mockSubCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("status"),
      "==",
      "verified",
    );
  });

  it("limits to 20 incidents", async () => {
    await repo.listPublicIncidents("scammer-1");
    expect(mockSubCollection.limit).toHaveBeenCalledWith(20);
  });

  it("returns empty array when subcollection query fails", async () => {
    mockSubCollection.get.mockRejectedValue(new Error("subcollection error"));
    const result = await repo.listPublicIncidents("scammer-1");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// listPublicComments
// ---------------------------------------------------------------------------
describe("ScammerRepository.listPublicComments", () => {
  it("filters by isHidden == false", async () => {
    await repo.listPublicComments("scammer-1");
    expect(mockSubCollection.where).toHaveBeenCalledWith("isHidden", "==", false);
  });

  it("limits to 30 comments", async () => {
    await repo.listPublicComments("scammer-1");
    expect(mockSubCollection.limit).toHaveBeenCalledWith(30);
  });

  it("returns empty array when query fails", async () => {
    mockSubCollection.get.mockRejectedValue(new Error("error"));
    const result = await repo.listPublicComments("scammer-1");
    expect(result).toEqual([]);
  });
});
