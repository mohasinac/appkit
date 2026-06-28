import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery } = makeMockDb();

vi.mock("../../../../providers/db-firebase", () => ({
  getAdminDb: () => db,
  BaseRepository: class {
    protected collection: string;
    protected get db() { return db; }
    constructor(col: string) { this.collection = col; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected getCollection() { return (db as any).collection(this.collection); }
    protected mapDoc(snap: { id: string; data: () => Record<string, unknown> }) {
      return { id: snap.id, ...snap.data() };
    }
    async findById(id: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const snap = await (db as any).collection(this.collection).doc(id).get() as { exists: boolean; id: string; data: () => Record<string, unknown> };
      return snap.exists ? { id: snap.id, ...snap.data() } : null;
    }
    async update(id: string, data: Record<string, unknown>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (db as any).collection(this.collection).doc(id).update(data);
    }
    async delete(id: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (db as any).collection(this.collection).doc(id).delete();
    }
    async createWithId(id: string, data: Record<string, unknown>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).collection(this.collection).doc(id).set(data);
      return { id, ...data };
    }
  },
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../token-helpers", () => ({
  generateSessionId: () => "session-id-abc123",
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { SessionRepository } from "../session.repository";
import { SESSION_EXPIRATION_MS } from "../../schemas";

const repo = new SessionRepository();

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  mockDocRef.delete.mockResolvedValue(undefined);
  mockCollection.doc.mockReturnValue(mockDocRef);
  db.collection.mockReturnValue(mockCollection);
});

describe("SessionRepository.createSession", () => {
  it("sets isActive: true", async () => {
    await repo.createSession("user-1", {
      deviceInfo: { browser: "Chrome", os: "Windows", device: "Desktop", ip: "127.0.0.1" },
      location: { country: "IN" },
    });
    expect(mockDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    );
  });

  it("expiresAt is now + SESSION_EXPIRATION_MS (within 1s tolerance)", async () => {
    const before = Date.now();
    await repo.createSession("user-1", {
      deviceInfo: { browser: "Chrome", os: "Windows", device: "Desktop", ip: "127.0.0.1" },
      location: { country: "IN" },
    });
    const after = Date.now();
    const setCall = mockDocRef.set.mock.calls[0][0] as { expiresAt: Date };
    const expiresAt = setCall.expiresAt.getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + SESSION_EXPIRATION_MS - 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + SESSION_EXPIRATION_MS + 1000);
  });

  it("stores deviceInfo from input", async () => {
    await repo.createSession("user-1", {
      deviceInfo: { browser: "Firefox", os: "macOS", device: "Desktop", ip: "10.0.0.1" },
      location: { country: "US" },
    });
    expect(mockDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ deviceInfo: { browser: "Firefox", os: "macOS", device: "Desktop", ip: "10.0.0.1" } }),
    );
  });
});

describe("SessionRepository.updateActivity", () => {
  it("updates lastActivity timestamp", async () => {
    mockDocRef.update.mockResolvedValue(undefined);
    await repo.updateActivity("session-id");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ lastActivity: expect.any(Date) }),
    );
  });

  it("does NOT throw when Firestore NOT_FOUND (swallowed)", async () => {
    mockDocRef.update.mockRejectedValue({ code: 5, message: "NOT_FOUND" });
    await expect(repo.updateActivity("session-id")).resolves.toBeUndefined();
  });
});

describe("SessionRepository.revokeSession", () => {
  it("sets isActive: false on the targeted session", async () => {
    await repo.revokeSession("session-id", "admin-uid");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    );
  });
});

describe("SessionRepository.findActiveByUser", () => {
  it("queries where isActive == true for the given userId", async () => {
    const sessions = makeQuerySnap([
      { id: "s1", data: { userId: "user-1", isActive: true, expiresAt: new Date(Date.now() + 60000), lastActivity: new Date() } },
    ]);
    mockQuery.get.mockResolvedValue(sessions);
    const result = await repo.findActiveByUser("user-1");
    expect(result).toHaveLength(1);
    // Verify isActive and userId filters are used
    expect(mockCollection.where).toHaveBeenCalledWith("userId", "==", "user-1");
    expect(mockQuery.where).toHaveBeenCalledWith("isActive", "==", true);
  });

  it("returns empty array when user has no active sessions", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await repo.findActiveByUser("user-1");
    expect(result).toEqual([]);
  });
});

describe("SessionRepository.cleanupExpiredSessions", () => {
  it("deletes documents returned by expired query, returns count", async () => {
    const expiredDocs = makeQuerySnap([
      { id: "s-expired-1", data: { userId: "u", isActive: true } },
      { id: "s-expired-2", data: { userId: "u", isActive: false } },
    ]);
    mockQuery.get.mockResolvedValue(expiredDocs);
    const count = await repo.cleanupExpiredSessions();
    expect(count).toBe(2);
  });

  it("does not delete non-expired sessions", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const count = await repo.cleanupExpiredSessions();
    expect(count).toBe(0);
    expect(mockDocRef.delete).not.toHaveBeenCalled();
  });
});

describe("SessionRepository.countActiveByUser", () => {
  it("returns the count of active sessions", async () => {
    const sessions = makeQuerySnap([
      { id: "s1", data: { userId: "user-1", isActive: true, expiresAt: new Date(Date.now() + 60000), lastActivity: new Date() } },
      { id: "s2", data: { userId: "user-1", isActive: true, expiresAt: new Date(Date.now() + 60000), lastActivity: new Date() } },
    ]);
    mockQuery.get.mockResolvedValue(sessions);
    const count = await repo.countActiveByUser("user-1");
    expect(count).toBe(2);
  });
});
