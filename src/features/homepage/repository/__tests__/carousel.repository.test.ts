import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";
import { DatabaseError } from "../../../../errors";

const { db, mockDocRef, mockCollection, mockQuery, mockBatch } = makeMockDb();

const { mockGetFirestoreCount } = vi.hoisted(() => ({
  mockGetFirestoreCount: vi.fn().mockResolvedValue(0),
}));

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return {
    ...actual,
    prepareForFirestore: (d: Record<string, unknown>) => d,
    getFirestoreCount: mockGetFirestoreCount,
  };
});

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { CarouselRepository } from "../carousel.repository";
import { MAX_ACTIVE_SLIDES } from "../../schemas";

const repo = new CarouselRepository();

function makeSlideDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "slide-hero",
    title: "Hero Slide",
    active: true,
    order: 0,
    cards: [],
    background: { type: "image", url: "https://example.com/img.jpg" },
    createdBy: "admin-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeActiveSlides(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `slide-${i}`,
    data: makeSlideDoc({ id: `slide-${i}`, active: true, order: i }),
  }));
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
  mockGetFirestoreCount.mockResolvedValue(0);
});

// ---------------------------------------------------------------------------
// activateSlide
// ---------------------------------------------------------------------------
describe("CarouselRepository.activateSlide", () => {
  it("activates when active count < MAX_ACTIVE_SLIDES", async () => {
    // getActiveSlides returns fewer than max
    mockQuery.get.mockResolvedValue(
      makeQuerySnap(makeActiveSlides(MAX_ACTIVE_SLIDES - 1)),
    );
    const slide = makeSlideDoc({ active: true });
    mockDocRef.get.mockResolvedValue(makeSnap(slide, "slide-hero"));
    await repo.activateSlide("slide-hero");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ active: true }),
    );
  });

  it("throws DatabaseError when active count = MAX_ACTIVE_SLIDES", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap(makeActiveSlides(MAX_ACTIVE_SLIDES)));
    await expect(repo.activateSlide("slide-7")).rejects.toThrow(DatabaseError);
  });

  it("throws DatabaseError when active count > MAX_ACTIVE_SLIDES (defensive)", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap(makeActiveSlides(MAX_ACTIVE_SLIDES + 1)));
    await expect(repo.activateSlide("slide-7")).rejects.toThrow(DatabaseError);
  });
});

// ---------------------------------------------------------------------------
// deactivateSlide
// ---------------------------------------------------------------------------
describe("CarouselRepository.deactivateSlide", () => {
  it("sets active: false on the slide", async () => {
    const slide = makeSlideDoc({ active: false });
    mockDocRef.get.mockResolvedValue(makeSnap(slide, "slide-hero"));
    await repo.deactivateSlide("slide-hero");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ active: false }),
    );
  });

  it("sets updatedAt timestamp", async () => {
    const slide = makeSlideDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(slide, "slide-hero"));
    await repo.deactivateSlide("slide-hero");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });
});

// ---------------------------------------------------------------------------
// canActivateMore
// ---------------------------------------------------------------------------
describe("CarouselRepository.canActivateMore", () => {
  it("returns true when active count < MAX_ACTIVE_SLIDES", async () => {
    mockGetFirestoreCount.mockResolvedValue(MAX_ACTIVE_SLIDES - 1);
    const result = await repo.canActivateMore();
    expect(result).toBe(true);
  });

  it("returns false when active count = MAX_ACTIVE_SLIDES", async () => {
    mockGetFirestoreCount.mockResolvedValue(MAX_ACTIVE_SLIDES);
    const result = await repo.canActivateMore();
    expect(result).toBe(false);
  });

  it("returns false when active count > MAX_ACTIVE_SLIDES", async () => {
    mockGetFirestoreCount.mockResolvedValue(MAX_ACTIVE_SLIDES + 2);
    const result = await repo.canActivateMore();
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// reorderSlides
// ---------------------------------------------------------------------------
describe("CarouselRepository.reorderSlides", () => {
  it("batch-updates order field on each slide", async () => {
    await repo.reorderSlides([
      { id: "slide-1", order: 0 },
      { id: "slide-2", order: 1 },
      { id: "slide-3", order: 2 },
    ]);
    expect(mockBatch.update).toHaveBeenCalledTimes(3);
  });

  it("commits the batch", async () => {
    await repo.reorderSlides([{ id: "slide-1", order: 0 }]);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("each update carries the correct order value", async () => {
    await repo.reorderSlides([
      { id: "slide-a", order: 2 },
      { id: "slide-b", order: 5 },
    ]);
    const updateCalls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    const orders = updateCalls.map((c) => c[1].order);
    expect(orders).toContain(2);
    expect(orders).toContain(5);
  });

  it("empty list → no batch update called, commits empty batch", async () => {
    await repo.reorderSlides([]);
    expect(mockBatch.update).not.toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// incrementViews
// ---------------------------------------------------------------------------
describe("CarouselRepository.incrementViews", () => {
  it("increments stats.views by 1", async () => {
    await repo.incrementViews("slide-hero");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ "stats.views": expect.anything() }),
    );
  });

  it("updates stats.lastViewed timestamp", async () => {
    await repo.incrementViews("slide-hero");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ "stats.lastViewed": expect.any(Date) }),
    );
  });

  it("swallows errors — analytics must not break callers", async () => {
    mockDocRef.update.mockRejectedValue(new Error("Firestore error"));
    await expect(repo.incrementViews("slide-hero")).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getActiveSlides
// ---------------------------------------------------------------------------
describe("CarouselRepository.getActiveSlides", () => {
  it("queries active=true, ordered by order ascending", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getActiveSlides();
    expect(mockCollection.where).toHaveBeenCalledWith("active", "==", true);
    expect(mockQuery.orderBy).toHaveBeenCalledWith("order", "asc");
  });

  it("limits results to MAX_ACTIVE_SLIDES", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getActiveSlides();
    expect(mockQuery.limit).toHaveBeenCalledWith(MAX_ACTIVE_SLIDES);
  });
});
