import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery } = makeMockDb();

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return { ...actual, prepareForFirestore: (d: Record<string, unknown>) => d };
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
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../token-helpers", () => ({
  generateSessionId: vi.fn(() => "mock-session-id-abc123"),
  generateToken: vi.fn(() => "mock-token-xyz"),
  generateEmailVerificationToken: vi.fn(() => "mock-email-token"),
  generatePasswordResetToken: vi.fn(() => "mock-pw-reset-token"),
}));

import { SessionRepository } from "../session.repository";
import { SESSION_EXPIRATION_MS } from "../../schemas";

const repo = new SessionRepository();

function makeSessionDoc(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: "mock-session-id-abc123",
    userId: "user-ravi",
    deviceInfo: { browser: "Chrome", os: "Windows", device: "desktop", ip: "*.*.*.1" },
    location: { country: "IN" },
    isActive: true,
    createdAt: now,
    lastActivity: now,
    expiresAt: new Date(now.getTime() + SESSION_EXPIRATION_MS),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockCollection.orderBy = vi.fn().mockReturnValue(mockQuery);
  mockCollection.get = vi.fn().mockResolvedValue(makeQuerySnap([]));
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.offset = vi.fn().mockReturnValue(mockQuery);
  mockQuery.count = vi.fn().mockReturnValue({
    get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
  });
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(makeSessionDoc(), "mock-session-id-abc123"));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  mockDocRef.delete.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------
describe("SessionRepository.createSession", () => {
  it("sets isActive: true on new session", async () => {
    await repo.createSession("user-ravi", {
      deviceInfo: { browser: "Chrome", os: "Windows", device: "desktop", ip: "*.*.*.1" },
      location: { country: "IN" },
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.isActive).toBe(true);
  });

  it("sets expiresAt = now + SESSION_EXPIRATION_MS", async () => {
    const before = Date.now();
    await repo.createSession("user-ravi", {
      deviceInfo: { browser: "Chrome", os: "Windows", device: "desktop", ip: "*.*.*.1" },
      location: { country: "IN" },
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    const expiresAt = (setArg.expiresAt as Date).getTime();
    const expectedExpiry = before + SESSION_EXPIRATION_MS;
    expect(expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 100);
    expect(expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000);
  });

  it("stores deviceInfo in the session document", async () => {
    await repo.createSession("user-ravi", {
      deviceInfo: { browser: "Safari", os: "iOS", device: "mobile", ip: "*.*.*.2" },
      location: { country: "IN" },
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect((setArg.deviceInfo as Record<string, unknown>).browser).toBe("Safari");
  });

  it("uses generated sessionId as document ID", async () => {
    await repo.createSession("user-ravi", {
      deviceInfo: { browser: "Chrome", os: "Windows", device: "desktop", ip: "*.*.*.1" },
      location: { country: "IN" },
    } as never);
    expect(mockCollection.doc).toHaveBeenCalledWith("mock-session-id-abc123");
  });

  it("stores the userId in the session", async () => {
    await repo.createSession("user-ravi", {
      deviceInfo: { browser: "Chrome", os: "Windows", device: "desktop", ip: "*.*.*.1" },
      location: { country: "IN" },
    } as never);
    const setArg = mockDocRef.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.userId).toBe("user-ravi");
  });
});

// ---------------------------------------------------------------------------
// updateActivity
// ---------------------------------------------------------------------------
describe("SessionRepository.updateActivity", () => {
  it("updates lastActivity to current time", async () => {
    const session = makeSessionDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(session, "mock-session-id-abc123"));
    await repo.updateActivity("mock-session-id-abc123");
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.lastActivity).toBeInstanceOf(Date);
  });

  it("does NOT throw on NOT_FOUND error (session may have been revoked)", async () => {
    const notFoundErr = Object.assign(new Error("NOT_FOUND"), { code: 5 });
    mockDocRef.update.mockRejectedValue(notFoundErr);
    // update calls super.update which calls docRef.update
    await expect(repo.updateActivity("revoked-session")).resolves.toBeUndefined();
  });

  it("does NOT throw on 'No document to update' error", async () => {
    const err = new Error("No document to update");
    mockDocRef.update.mockRejectedValue(err);
    await expect(repo.updateActivity("deleted-session")).resolves.toBeUndefined();
  });

  it("DOES re-throw errors that are not NOT_FOUND", async () => {
    const permErr = Object.assign(new Error("Permission denied"), { code: 7 });
    mockDocRef.update.mockRejectedValue(permErr);
    // BaseRepository.update() wraps in DatabaseError, so the thrown error has DATABASE_ERROR message
    await expect(repo.updateActivity("session-id")).rejects.toThrow("Failed to update document: session-id");
  });
});

// ---------------------------------------------------------------------------
// revokeSession
// ---------------------------------------------------------------------------
describe("SessionRepository.revokeSession", () => {
  it("sets isActive: false on the session", async () => {
    const session = makeSessionDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(session, "mock-session-id-abc123"));
    await repo.revokeSession("mock-session-id-abc123", "admin");
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.isActive).toBe(false);
  });

  it("stores revokedAt timestamp", async () => {
    const session = makeSessionDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(session, "mock-session-id-abc123"));
    await repo.revokeSession("mock-session-id-abc123", "admin");
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.revokedAt).toBeInstanceOf(Date);
  });

  it("stores revokedBy actor", async () => {
    const session = makeSessionDoc();
    mockDocRef.get.mockResolvedValue(makeSnap(session, "mock-session-id-abc123"));
    await repo.revokeSession("mock-session-id-abc123", "user-admin");
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.revokedBy).toBe("user-admin");
  });
});

// ---------------------------------------------------------------------------
// revokeAllUserSessions
// ---------------------------------------------------------------------------
describe("SessionRepository.revokeAllUserSessions", () => {
  it("revokes all active sessions for the user", async () => {
    const sessions = [makeSessionDoc({ id: "s-1" }), makeSessionDoc({ id: "s-2" })];
    // findActiveByUser uses a multi-where + orderBy + get chain
    mockQuery.get.mockResolvedValue(
      makeQuerySnap(sessions.map((s) => ({ id: s.id as string, data: s }))),
    );
    mockDocRef.get.mockResolvedValue(makeSnap(makeSessionDoc(), "s-1"));
    const count = await repo.revokeAllUserSessions("user-ravi", "admin");
    expect(count).toBe(2);
    expect(mockDocRef.update).toHaveBeenCalledTimes(2);
  });

  it("returns 0 when user has no active sessions", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const count = await repo.revokeAllUserSessions("user-no-sessions", "admin");
    expect(count).toBe(0);
    expect(mockDocRef.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// findActiveByUser
// ---------------------------------------------------------------------------
describe("SessionRepository.findActiveByUser", () => {
  it("queries userId, isActive==true, and expiresAt > now", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findActiveByUser("user-ravi");
    expect(mockCollection.where).toHaveBeenCalledWith("userId", "==", "user-ravi");
    expect(mockQuery.where).toHaveBeenCalledWith("isActive", "==", true);
    expect(mockQuery.where).toHaveBeenCalledWith("expiresAt", ">", expect.any(Date));
  });

  it("returns only active sessions for the given user", async () => {
    const session = makeSessionDoc({ isActive: true });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: session.id as string, data: session }]));
    const results = await repo.findActiveByUser("user-ravi");
    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe("user-ravi");
  });

  it("orders by expiresAt desc", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.findActiveByUser("user-ravi");
    expect(mockQuery.orderBy).toHaveBeenCalledWith("expiresAt", "desc");
  });
});

// ---------------------------------------------------------------------------
// cleanupExpiredSessions
// ---------------------------------------------------------------------------
describe("SessionRepository.cleanupExpiredSessions", () => {
  it("queries sessions where expiresAt <= now", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.cleanupExpiredSessions();
    expect(mockCollection.where).toHaveBeenCalledWith(
      "expiresAt",
      "<=",
      expect.any(Date),
    );
  });

  it("deletes each expired session and returns count", async () => {
    const expired = [
      makeSessionDoc({ id: "s-expired-1", isActive: false }),
      makeSessionDoc({ id: "s-expired-2", isActive: false }),
    ];
    mockQuery.get.mockResolvedValue(
      makeQuerySnap(expired.map((s) => ({ id: s.id as string, data: s }))),
    );
    const count = await repo.cleanupExpiredSessions();
    expect(count).toBe(2);
    expect(mockDocRef.delete).toHaveBeenCalledTimes(2);
  });

  it("returns 0 and deletes nothing when no expired sessions", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const count = await repo.cleanupExpiredSessions();
    expect(count).toBe(0);
    expect(mockDocRef.delete).not.toHaveBeenCalled();
  });

  it("limits to 500 documents per cleanup run", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.cleanupExpiredSessions();
    expect(mockQuery.limit).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// countActiveByUser
// ---------------------------------------------------------------------------
describe("SessionRepository.countActiveByUser", () => {
  it("returns count of active sessions for user", async () => {
    const sessions = [makeSessionDoc(), makeSessionDoc({ id: "s-2" })];
    mockQuery.get.mockResolvedValue(
      makeQuerySnap(sessions.map((s) => ({ id: s.id as string, data: s }))),
    );
    const count = await repo.countActiveByUser("user-ravi");
    expect(count).toBe(2);
  });

  it("returns 0 when user has no active sessions", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const count = await repo.countActiveByUser("user-no-sessions");
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// findActiveSession
// ---------------------------------------------------------------------------
describe("SessionRepository.findActiveSession", () => {
  it("returns session when it is active and not expired", async () => {
    const session = makeSessionDoc({ isActive: true, expiresAt: new Date(Date.now() + 60_000) });
    mockDocRef.get.mockResolvedValue(makeSnap(session, "mock-session-id-abc123"));
    const result = await repo.findActiveSession("mock-session-id-abc123");
    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-ravi");
  });

  it("returns null when session is isActive: false", async () => {
    const session = makeSessionDoc({ isActive: false });
    mockDocRef.get.mockResolvedValue(makeSnap(session, "s-revoked"));
    const result = await repo.findActiveSession("s-revoked");
    expect(result).toBeNull();
  });

  it("returns null when session is expired (expiresAt in past)", async () => {
    const session = makeSessionDoc({ isActive: true, expiresAt: new Date(Date.now() - 1000) });
    mockDocRef.get.mockResolvedValue(makeSnap(session, "s-expired"));
    const result = await repo.findActiveSession("s-expired");
    expect(result).toBeNull();
  });

  it("returns null when session does not exist", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.findActiveSession("nonexistent");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getExpiredRefs
// ---------------------------------------------------------------------------
describe("SessionRepository.getExpiredRefs", () => {
  it("queries sessions where expiresAt < now", async () => {
    const now = new Date();
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getExpiredRefs(now);
    expect(mockCollection.where).toHaveBeenCalledWith("expiresAt", "<", now);
  });

  it("limits to 500 documents", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await repo.getExpiredRefs(new Date());
    expect(mockQuery.limit).toHaveBeenCalledWith(500);
  });

  it("returns document refs from the matching sessions", async () => {
    const session = makeSessionDoc({ id: "s-expired" });
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: "s-expired", data: session }]));
    const refs = await repo.getExpiredRefs(new Date());
    expect(refs).toHaveLength(1);
  });
});
