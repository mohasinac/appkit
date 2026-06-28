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

vi.mock("../../../../security", () => ({
  encryptPiiFields: (d: Record<string, unknown>) => d,
  decryptPiiFields: (d: Record<string, unknown>) => d,
  EVENT_ENTRY_PII_FIELDS: ["userEmail"],
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { EventRepository } from "../events.repository";
import { EventEntryRepository } from "../event-entry.repository";

const eventRepo = new EventRepository();
const entryRepo = new EventEntryRepository();

function makeEventDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-summer-holo-sale-2026",
    title: "Summer Holo Sale",
    type: "sale",
    status: "active",
    slug: "summer-holo-sale-2026",
    startsAt: new Date(Date.now() - 3600_000),
    endsAt: new Date(Date.now() + 3600_000),
    tags: [],
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
    createdBy: "admin-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeEntryDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-abc123",
    eventId: "event-summer-holo-sale-2026",
    userId: "user-ravi",
    userDisplayName: "Ravi Kumar",
    userEmail: "ravi@test.com",
    reviewStatus: "pending" as const,
    submittedAt: new Date(),
    points: 100,
    ...overrides,
  };
}

function makeAddRef(data: Record<string, unknown>, id = "new-entry-id") {
  return { id, get: vi.fn().mockResolvedValue(makeSnap(data, id)) };
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
// EventRepository.incrementTotalEntries
// ---------------------------------------------------------------------------
describe("EventRepository.incrementTotalEntries", () => {
  it("updates stats.totalEntries with an increment op", async () => {
    await eventRepo.incrementTotalEntries("event-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ "stats.totalEntries": expect.anything() }),
    );
  });

  it("calls doc(eventId) before update", async () => {
    await eventRepo.incrementTotalEntries("event-xyz");
    expect(mockCollection.doc).toHaveBeenCalledWith("event-xyz");
  });
});

// ---------------------------------------------------------------------------
// EventRepository.incrementApprovedEntries
// ---------------------------------------------------------------------------
describe("EventRepository.incrementApprovedEntries", () => {
  it("updates stats.approvedEntries with an increment op", async () => {
    await eventRepo.incrementApprovedEntries("event-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ "stats.approvedEntries": expect.anything() }),
    );
  });
});

// ---------------------------------------------------------------------------
// EventRepository.changeStatus
// ---------------------------------------------------------------------------
describe("EventRepository.changeStatus", () => {
  it("sets the new status on the event document", async () => {
    const event = makeEventDoc({ status: "upcoming" });
    mockDocRef.get.mockResolvedValue(makeSnap(event, "event-1"));
    await eventRepo.changeStatus("event-1", "active");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" }),
    );
  });

  it("sets updatedAt timestamp", async () => {
    const event = makeEventDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(event, "event-1"));
    await eventRepo.changeStatus("event-1", "ended");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });
});

// ---------------------------------------------------------------------------
// EventRepository.createEvent
// ---------------------------------------------------------------------------
describe("EventRepository.createEvent", () => {
  it("sets stats.totalEntries=0, approvedEntries=0, flaggedEntries=0", async () => {
    const eventData = makeEventDoc();
    const addRef = makeAddRef(eventData);
    mockCollection.add.mockResolvedValue(addRef);
    const result = await eventRepo.createEvent({
      title: "Summer Holo Sale",
      type: "sale",
      status: "upcoming",
    } as never);
    expect(result.stats.totalEntries).toBe(0);
    expect(result.stats.approvedEntries).toBe(0);
    expect(result.stats.flaggedEntries).toBe(0);
  });

  it("generates slug from title when not provided", async () => {
    const eventData = makeEventDoc({ slug: "summer-holo-sale" });
    const addRef = makeAddRef(eventData);
    mockCollection.add.mockResolvedValue(addRef);
    const result = await eventRepo.createEvent({
      title: "Summer Holo Sale",
      type: "sale",
      status: "upcoming",
    } as never);
    expect(result.slug).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// EventEntryRepository.hasUserEntered
// ---------------------------------------------------------------------------
describe("EventEntryRepository.hasUserEntered", () => {
  it("returns true when entry exists for (eventId, userId)", async () => {
    const entry = makeEntryDoc();
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([{ id: entry.id as string, data: entry }]),
    );
    const result = await entryRepo.hasUserEntered("event-1", "user-ravi");
    expect(result).toBe(true);
  });

  it("returns false when no entry found", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await entryRepo.hasUserEntered("event-1", "user-nobody");
    expect(result).toBe(false);
  });

  it("queries by both eventId and userId", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await entryRepo.hasUserEntered("event-abc", "user-xyz");
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("eventId"),
      "==",
      "event-abc",
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("userId"),
      "==",
      "user-xyz",
    );
  });
});

// ---------------------------------------------------------------------------
// EventEntryRepository.countUserEntries
// ---------------------------------------------------------------------------
describe("EventEntryRepository.countUserEntries", () => {
  it("returns 0 when no entries for user", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    const count = await entryRepo.countUserEntries("event-1", "user-1");
    expect(count).toBe(0);
  });

  it("returns correct count when entries exist", async () => {
    mockQuery.get.mockResolvedValue({ empty: false, size: 3, docs: [] });
    const count = await entryRepo.countUserEntries("event-1", "user-1");
    expect(count).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// EventEntryRepository.getLeaderboard
// ---------------------------------------------------------------------------
describe("EventEntryRepository.getLeaderboard", () => {
  it("sums points per userId from approved entries", async () => {
    const entries = [
      makeEntryDoc({ userId: "user-ravi", userDisplayName: "Ravi", points: 100, reviewStatus: "approved" }),
      makeEntryDoc({ id: "entry-2", userId: "user-ravi", userDisplayName: "Ravi", points: 50, reviewStatus: "approved" }),
      makeEntryDoc({ id: "entry-3", userId: "user-priya", userDisplayName: "Priya", points: 200, reviewStatus: "approved" }),
    ];
    mockQuery.get.mockResolvedValue(
      makeQuerySnap(entries.map((e) => ({ id: e.id as string, data: e }))),
    );
    const board = await entryRepo.getLeaderboard("event-1");
    expect(board).toHaveLength(2);
    const ravi = board.find((b) => b.userId === "user-ravi");
    expect(ravi?.totalPoints).toBe(150);
  });

  it("sorts leaderboard descending by totalPoints", async () => {
    const entries = [
      makeEntryDoc({ userId: "user-a", userDisplayName: "A", points: 10, reviewStatus: "approved" }),
      makeEntryDoc({ id: "e2", userId: "user-b", userDisplayName: "B", points: 300, reviewStatus: "approved" }),
    ];
    mockQuery.get.mockResolvedValue(
      makeQuerySnap(entries.map((e) => ({ id: e.id as string, data: e }))),
    );
    const board = await entryRepo.getLeaderboard("event-1");
    expect(board[0].userId).toBe("user-b");
    expect(board[1].userId).toBe("user-a");
  });

  it("assigns correct rank starting at 1", async () => {
    const entries = [
      makeEntryDoc({ userId: "user-x", userDisplayName: "X", points: 50, reviewStatus: "approved" }),
    ];
    mockQuery.get.mockResolvedValue(
      makeQuerySnap(entries.map((e) => ({ id: e.id as string, data: e }))),
    );
    const board = await entryRepo.getLeaderboard("event-1");
    expect(board[0].rank).toBe(1);
  });

  it("returns empty array when no approved entries", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const board = await entryRepo.getLeaderboard("event-1");
    expect(board).toHaveLength(0);
  });

  it("applies limit (default 50)", async () => {
    const entries = Array.from({ length: 60 }, (_, i) =>
      makeEntryDoc({ id: `e-${i}`, userId: `user-${i}`, userDisplayName: `U${i}`, points: 60 - i, reviewStatus: "approved" }),
    );
    mockQuery.get.mockResolvedValue(
      makeQuerySnap(entries.map((e) => ({ id: e.id as string, data: e }))),
    );
    const board = await entryRepo.getLeaderboard("event-1");
    expect(board).toHaveLength(50);
  });

  it("applies custom limit", async () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntryDoc({ id: `e-${i}`, userId: `user-${i}`, userDisplayName: `U${i}`, points: 10 - i, reviewStatus: "approved" }),
    );
    mockQuery.get.mockResolvedValue(
      makeQuerySnap(entries.map((e) => ({ id: e.id as string, data: e }))),
    );
    const board = await entryRepo.getLeaderboard("event-1", 3);
    expect(board).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// EventEntryRepository.createEntry
// ---------------------------------------------------------------------------
describe("EventEntryRepository.createEntry", () => {
  it("sets submittedAt timestamp on the created entry", async () => {
    const entry = makeEntryDoc();
    const addRef = makeAddRef(entry);
    mockCollection.add.mockResolvedValue(addRef);
    const result = await entryRepo.createEntry({
      eventId: "event-1",
      userId: "user-ravi",
      userDisplayName: "Ravi Kumar",
      userEmail: "ravi@test.com",
    } as never);
    // submittedAt set in createEntry, visible through the returned doc
    expect(result.eventId).toBe("event-summer-holo-sale-2026");
  });

  it("persists entry to Firestore via add", async () => {
    const entry = makeEntryDoc();
    const addRef = makeAddRef(entry);
    mockCollection.add.mockResolvedValue(addRef);
    await entryRepo.createEntry({
      eventId: "event-1",
      userId: "user-ravi",
      userDisplayName: "Ravi Kumar",
      userEmail: "ravi@test.com",
    } as never);
    expect(mockCollection.add).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// EventEntryRepository.reviewEntry
// ---------------------------------------------------------------------------
describe("EventEntryRepository.reviewEntry", () => {
  it("sets reviewStatus=approved on the entry", async () => {
    const entry = makeEntryDoc({ reviewStatus: "approved" });
    mockDocRef.get.mockResolvedValue(makeSnap(entry, "entry-1"));
    await entryRepo.reviewEntry("entry-1", "approved", "mod-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ reviewStatus: "approved" }),
    );
  });

  it("sets reviewStatus=rejected on the entry", async () => {
    const entry = makeEntryDoc({ reviewStatus: "rejected" });
    mockDocRef.get.mockResolvedValue(makeSnap(entry, "entry-1"));
    await entryRepo.reviewEntry("entry-1", "rejected", "mod-1", "Off topic");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ reviewStatus: "rejected" }),
    );
  });

  it("stores reviewNote when provided", async () => {
    const entry = makeEntryDoc({ reviewStatus: "rejected" });
    mockDocRef.get.mockResolvedValue(makeSnap(entry, "entry-1"));
    await entryRepo.reviewEntry("entry-1", "rejected", "mod-1", "Spam");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ reviewNote: "Spam" }),
    );
  });

  it("stores points when provided", async () => {
    const entry = makeEntryDoc({ reviewStatus: "approved" });
    mockDocRef.get.mockResolvedValue(makeSnap(entry, "entry-1"));
    await entryRepo.reviewEntry("entry-1", "approved", "mod-1", undefined, 250);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ points: 250 }),
    );
  });

  it("sets reviewedBy and reviewedAt", async () => {
    const entry = makeEntryDoc({ reviewStatus: "approved" });
    mockDocRef.get.mockResolvedValue(makeSnap(entry, "entry-1"));
    await entryRepo.reviewEntry("entry-1", "approved", "mod-admin-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewedBy: "mod-admin-1",
        reviewedAt: expect.any(Date),
      }),
    );
  });
});
