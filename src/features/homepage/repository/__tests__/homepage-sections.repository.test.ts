import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery, mockBatch } = makeMockDb();

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

import { HomepageSectionsRepository } from "../homepage-sections.repository";

const repo = new HomepageSectionsRepository();

function makeSectionDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "section-featured-products",
    type: "featured-products",
    enabled: true,
    order: 0,
    config: {},
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
  db.batch.mockReturnValue(mockBatch);
});

// ---------------------------------------------------------------------------
// getEnabledSections
// ---------------------------------------------------------------------------
describe("HomepageSectionsRepository.getEnabledSections", () => {
  it("queries where enabled=true, ordered by order ascending", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getEnabledSections();
    expect(mockCollection.where).toHaveBeenCalledWith("enabled", "==", true);
    expect(mockQuery.orderBy).toHaveBeenCalledWith("order", "asc");
  });

  it("returns only enabled sections", async () => {
    const section = makeSectionDoc({ enabled: true });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([{ id: section.id as string, data: section }]),
    );
    const results = await repo.getEnabledSections();
    expect(results).toHaveLength(1);
  });

  it("returns empty array when no enabled sections", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const results = await repo.getEnabledSections();
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// enableSection
// ---------------------------------------------------------------------------
describe("HomepageSectionsRepository.enableSection", () => {
  it("sets enabled: true on the section", async () => {
    const section = makeSectionDoc({ enabled: false });
    mockDocRef.get.mockResolvedValue(makeSnap(section, "section-1"));
    await repo.enableSection("section-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it("sets updatedAt timestamp", async () => {
    const section = makeSectionDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(section, "section-1"));
    await repo.enableSection("section-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });
});

// ---------------------------------------------------------------------------
// disableSection
// ---------------------------------------------------------------------------
describe("HomepageSectionsRepository.disableSection", () => {
  it("sets enabled: false on the section", async () => {
    const section = makeSectionDoc({ enabled: true });
    mockDocRef.get.mockResolvedValue(makeSnap(section, "section-1"));
    await repo.disableSection("section-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});

// ---------------------------------------------------------------------------
// toggleSection
// ---------------------------------------------------------------------------
describe("HomepageSectionsRepository.toggleSection", () => {
  it("enabled:true → sets enabled:false", async () => {
    const section = makeSectionDoc({ enabled: true });
    mockDocRef.get.mockResolvedValue(makeSnap(section, "section-1"));
    await repo.toggleSection("section-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it("enabled:false → sets enabled:true", async () => {
    const section = makeSectionDoc({ enabled: false });
    mockDocRef.get.mockResolvedValue(makeSnap(section, "section-1"));
    await repo.toggleSection("section-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });
});

// ---------------------------------------------------------------------------
// reorderSections
// ---------------------------------------------------------------------------
describe("HomepageSectionsRepository.reorderSections", () => {
  it("batch-updates order field for each section", async () => {
    await repo.reorderSections([
      { id: "section-1", order: 0 },
      { id: "section-2", order: 1 },
      { id: "section-3", order: 2 },
    ]);
    expect(mockBatch.update).toHaveBeenCalledTimes(3);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("each update sets the correct order value", async () => {
    await repo.reorderSections([
      { id: "section-a", order: 5 },
      { id: "section-b", order: 10 },
    ]);
    const calls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    expect(calls.some((c) => c[1].order === 5)).toBe(true);
    expect(calls.some((c) => c[1].order === 10)).toBe(true);
  });

  it("empty list → no batch update, commits empty batch", async () => {
    await repo.reorderSections([]);
    expect(mockBatch.update).not.toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// batchToggleSections
// ---------------------------------------------------------------------------
describe("HomepageSectionsRepository.batchToggleSections", () => {
  it("sets enabled:true on all provided sections in one batch", async () => {
    await repo.batchToggleSections(["section-1", "section-2", "section-3"], true);
    expect(mockBatch.update).toHaveBeenCalledTimes(3);
    const calls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    expect(calls.every((c) => c[1].enabled === true)).toBe(true);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("sets enabled:false on all provided sections", async () => {
    await repo.batchToggleSections(["section-x", "section-y"], false);
    const calls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    expect(calls.every((c) => c[1].enabled === false)).toBe(true);
  });

  it("empty list → no updates, commits empty batch", async () => {
    await repo.batchToggleSections([], true);
    expect(mockBatch.update).not.toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// resetSectionToDefault
// ---------------------------------------------------------------------------
describe("HomepageSectionsRepository.resetSectionToDefault", () => {
  it("overwrites config with the provided default config", async () => {
    const section = makeSectionDoc({ config: { customKey: "old-value" } });
    mockDocRef.get.mockResolvedValue(makeSnap(section, "section-1"));
    const defaultCfg = { title: "Default Title", itemCount: 6 };
    await repo.resetSectionToDefault("section-1", defaultCfg as never);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ config: defaultCfg }),
    );
  });

  it("does NOT delete the section document", async () => {
    const section = makeSectionDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(section, "section-1"));
    await repo.resetSectionToDefault("section-1", {});
    expect(mockDocRef.delete).not.toHaveBeenCalled();
  });

  it("sets updatedAt timestamp on reset", async () => {
    const section = makeSectionDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(section, "section-1"));
    await repo.resetSectionToDefault("section-1", {});
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });
});
