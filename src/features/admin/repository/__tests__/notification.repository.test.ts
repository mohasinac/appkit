import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

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

vi.mock("../../../../contracts/field-ops", () => ({
  serverTimestamp: () => new Date(),
  increment: (n: number) => n,
  arrayUnion: (...args: unknown[]) => args,
  arrayRemove: (...args: unknown[]) => args,
  deleteField: () => null,
  registerFieldOps: vi.fn(),
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { NotificationRepository } from "../notification.repository";

const repo = new NotificationRepository();

function makeNotifDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "notif-order-shipped-001",
    userId: "user-ravi",
    type: "order_shipped" as const,
    title: "Your order has shipped!",
    body: "Order #123 is on its way.",
    isRead: false,
    entityId: "order-3-20260627-abc123",
    entityType: "order",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetFirestoreCount.mockResolvedValue(0);
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(makeNotifDoc(), "notif-1"));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  mockDocRef.delete.mockResolvedValue(undefined);
  db.batch.mockReturnValue(mockBatch);
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe("NotificationRepository.create", () => {
  it("sets isRead: false on new notifications", async () => {
    await repo.create({
      userId: "user-ravi",
      type: "order_shipped" as never,
      priority: "normal" as const,
      title: "Shipped!",
      message: "Your order shipped.",
    });
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.isRead).toBe(false);
  });

  it("stores all required fields", async () => {
    await repo.create({
      userId: "user-ravi",
      type: "order_placed" as never,
      priority: "normal" as const,
      title: "Order placed",
      message: "Thanks for your order.",
    });
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.userId).toBe("user-ravi");
    expect(setArg.type).toBe("order_placed");
    expect(setArg.title).toBe("Order placed");
  });

  it("sets createdAt and updatedAt timestamps", async () => {
    await repo.create({ userId: "user-1", type: "general" as never, priority: "normal" as const, title: "Hi", message: "Hello" });
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.createdAt).toBeInstanceOf(Date);
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });

  it("uses collection.doc() with no args (auto-ID)", async () => {
    await repo.create({ userId: "user-1", type: "general" as never, priority: "normal" as const, title: "T", message: "B" });
    // doc() is called with no argument for auto-generated IDs
    expect(mockCollection.doc).toHaveBeenCalledWith();
  });

  it("returns the created notification with id", async () => {
    mockDocRef.id = "notif-auto-123";
    const result = await repo.create({
      userId: "user-ravi",
      type: "bid_won" as never,
      priority: "normal" as const,
      title: "You won!",
      message: "Congratulations.",
    });
    expect(result.id).toBe("notif-auto-123");
    expect(result.isRead).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// markAsRead
// ---------------------------------------------------------------------------
describe("NotificationRepository.markAsRead", () => {
  it("sets isRead: true on the notification", async () => {
    await repo.markAsRead("notif-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ isRead: true }),
    );
  });

  it("sets readAt timestamp", async () => {
    await repo.markAsRead("notif-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ readAt: expect.any(Date) }),
    );
  });

  it("sets updatedAt timestamp", async () => {
    await repo.markAsRead("notif-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });

  it("calls doc(id) to target the correct notification", async () => {
    await repo.markAsRead("notif-abc");
    expect(mockCollection.doc).toHaveBeenCalledWith("notif-abc");
  });
});

// ---------------------------------------------------------------------------
// markAllAsRead
// ---------------------------------------------------------------------------
describe("NotificationRepository.markAllAsRead", () => {
  it("queries unread notifications for the user", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.markAllAsRead("user-ravi");
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("userId"),
      "==",
      "user-ravi",
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("isRead"),
      "==",
      false,
    );
  });

  it("batch-updates all unread notifications to isRead: true", async () => {
    const notifs = [
      makeNotifDoc({ id: "n-1", isRead: false }),
      makeNotifDoc({ id: "n-2", isRead: false }),
    ];
    mockQuery.get.mockResolvedValue(makeQuerySnap(notifs.map((n) => ({ id: n.id as string, data: n }))));
    await repo.markAllAsRead("user-ravi");
    expect(mockBatch.update).toHaveBeenCalledTimes(2);
    const calls = mockBatch.update.mock.calls as [unknown, Record<string, unknown>][];
    expect(calls.every((c) => c[1].isRead === true)).toBe(true);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("returns 0 and does not batch-update when no unread notifications", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const count = await repo.markAllAsRead("user-ravi");
    expect(count).toBe(0);
    expect(mockBatch.update).not.toHaveBeenCalled();
  });

  it("returns the count of notifications marked", async () => {
    const notifs = [
      makeNotifDoc({ id: "n-1", isRead: false }),
      makeNotifDoc({ id: "n-2", isRead: false }),
      makeNotifDoc({ id: "n-3", isRead: false }),
    ];
    mockQuery.get.mockResolvedValue(makeQuerySnap(notifs.map((n) => ({ id: n.id as string, data: n }))));
    const count = await repo.markAllAsRead("user-ravi");
    expect(count).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------
describe("NotificationRepository.getUnreadCount", () => {
  it("returns the count of unread notifications for userId", async () => {
    mockGetFirestoreCount.mockResolvedValue(7);
    const count = await repo.getUnreadCount("user-ravi");
    expect(count).toBe(7);
  });

  it("returns 0 when no unread notifications", async () => {
    mockGetFirestoreCount.mockResolvedValue(0);
    const count = await repo.getUnreadCount("user-ravi");
    expect(count).toBe(0);
  });

  it("returns 0 on error (graceful fallback)", async () => {
    mockGetFirestoreCount.mockRejectedValue(new Error("Firestore error"));
    const count = await repo.getUnreadCount("user-ravi");
    expect(count).toBe(0);
  });

  it("queries by userId and isRead == false", async () => {
    mockGetFirestoreCount.mockResolvedValue(3);
    await repo.getUnreadCount("user-xyz");
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("userId"),
      "==",
      "user-xyz",
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("isRead"),
      "==",
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// deleteAllForUser
// ---------------------------------------------------------------------------
describe("NotificationRepository.deleteAllForUser", () => {
  it("batch-deletes all notifications for the user", async () => {
    const notifs = [
      makeNotifDoc({ id: "n-1" }),
      makeNotifDoc({ id: "n-2" }),
    ];
    mockQuery.get.mockResolvedValue(makeQuerySnap(notifs.map((n) => ({ id: n.id as string, data: n }))));
    await repo.deleteAllForUser("user-ravi");
    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("returns 0 and skips batch when no notifications exist", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const count = await repo.deleteAllForUser("user-nobody");
    expect(count).toBe(0);
    expect(mockBatch.delete).not.toHaveBeenCalled();
  });

  it("returns count of deleted notifications", async () => {
    const notifs = [
      makeNotifDoc({ id: "n-1" }),
      makeNotifDoc({ id: "n-2" }),
      makeNotifDoc({ id: "n-3" }),
    ];
    mockQuery.get.mockResolvedValue(makeQuerySnap(notifs.map((n) => ({ id: n.id as string, data: n }))));
    const count = await repo.deleteAllForUser("user-ravi");
    expect(count).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// delete (single)
// ---------------------------------------------------------------------------
describe("NotificationRepository.delete", () => {
  it("calls doc(id).delete()", async () => {
    await repo.delete("notif-abc");
    expect(mockCollection.doc).toHaveBeenCalledWith("notif-abc");
    expect(mockDocRef.delete).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// getOldReadRefs
// ---------------------------------------------------------------------------
describe("NotificationRepository.getOldReadRefs", () => {
  it("queries isRead == true and createdAt < cutoff date", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getOldReadRefs(30);
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("isRead"),
      "==",
      true,
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("createdAt"),
      "<",
      expect.any(Date),
    );
  });

  it("cutoff date is approximately ttlDays ago", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const before = Date.now();
    await repo.getOldReadRefs(30);
    const cutoffArg = (mockQuery.where.mock.calls as [string, string, Date][]).find(
      (c) => c[0].includes("createdAt"),
    )?.[2];
    expect(cutoffArg).toBeInstanceOf(Date);
    const expectedCutoff = before - 30 * 24 * 60 * 60 * 1000;
    expect(cutoffArg!.getTime()).toBeGreaterThanOrEqual(expectedCutoff - 1000);
    expect(cutoffArg!.getTime()).toBeLessThanOrEqual(expectedCutoff + 1000);
  });

  it("limits to 500 documents", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getOldReadRefs();
    expect(mockQuery.limit).toHaveBeenCalledWith(500);
  });

  it("does NOT include unread notifications (isRead==false docs excluded)", async () => {
    // The query explicitly filters isRead==true — unread docs are never fetched
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getOldReadRefs(30);
    const whereCalls = mockCollection.where.mock.calls as [string, string, unknown][];
    const isReadFilter = whereCalls.find((c) => c[0].includes("isRead"));
    expect(isReadFilter?.[1]).toBe("==");
    expect(isReadFilter?.[2]).toBe(true);
  });

  it("returns document refs", async () => {
    const notif = makeNotifDoc({ id: "notif-old", isRead: true });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: notif.id as string, data: notif }]));
    const refs = await repo.getOldReadRefs(30);
    expect(refs).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// createInBatch
// ---------------------------------------------------------------------------
describe("NotificationRepository.createInBatch", () => {
  it("stages notification via batch.create (does not commit)", () => {
    const mockExternalBatch = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    repo.createInBatch(mockExternalBatch as never, {
      userId: "user-ravi",
      type: "order_shipped" as never,
      priority: "normal" as const,
      title: "Shipped!",
      message: "On its way.",
    });
    expect(mockExternalBatch.create).toHaveBeenCalledOnce();
    expect(mockExternalBatch.commit).not.toHaveBeenCalled();
  });

  it("sets isRead: false in the batched notification", () => {
    const mockExternalBatch = { create: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn() };
    repo.createInBatch(mockExternalBatch as never, {
      userId: "user-ravi",
      type: "general" as never,
      priority: "normal" as const,
      title: "Hi",
      message: "Hello",
    });
    const createArg = mockExternalBatch.create.mock.calls[0][1] as Record<string, unknown>;
    expect(createArg.isRead).toBe(false);
  });

  it("returns a document reference synchronously", () => {
    const mockExternalBatch = { create: vi.fn(), update: vi.fn(), delete: vi.fn(), commit: vi.fn() };
    const ref = repo.createInBatch(mockExternalBatch as never, {
      userId: "user-1",
      type: "general" as never,
      priority: "normal" as const,
      title: "T",
      message: "B",
    });
    expect(ref).toBeDefined();
    expect(ref.id).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// findByUser
// ---------------------------------------------------------------------------
describe("NotificationRepository.findByUser", () => {
  it("returns notifications for the given userId", async () => {
    const notif = makeNotifDoc({ userId: "user-ravi" });
    mockQuery.get.mockResolvedValue(
      makeQuerySnap([{ id: notif.id as string, data: notif }]),
    );
    const results = await repo.findByUser("user-ravi");
    expect(results).toHaveLength(1);
  });

  it("orders by createdAt descending (newest first)", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findByUser("user-ravi");
    expect(mockQuery.orderBy).toHaveBeenCalledWith(
      expect.stringContaining("createdAt"),
      "desc",
    );
  });

  it("applies default limit of 20", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findByUser("user-ravi");
    expect(mockQuery.limit).toHaveBeenCalledWith(20);
  });

  it("applies custom limit when provided", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findByUser("user-ravi", 5);
    expect(mockQuery.limit).toHaveBeenCalledWith(5);
  });
});
