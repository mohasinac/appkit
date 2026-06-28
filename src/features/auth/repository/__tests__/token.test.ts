import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap, makeQuerySnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery, mockBatch } = makeMockDb();

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
    async findBy(field: string, value: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const snap = await (db as any).collection(this.collection).where(field, "==", value).get() as { docs: Array<{ id: string; data: () => Record<string, unknown> }> };
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    async findOneBy(field: string, value: unknown) {
      const results = await this.findBy(field, value);
      return results[0] ?? null;
    }
    async findById(id: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const snap = await (db as any).collection(this.collection).doc(id).get() as { exists: boolean; id: string; data: () => Record<string, unknown> };
      return snap.exists ? { id: snap.id, ...snap.data() } : null;
    }
    async findByIdOrFail(id: string) {
      const doc = await this.findById(id);
      if (!doc) throw new Error("Not found");
      return doc;
    }
    async create(data: Record<string, unknown>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ref = await (db as any).collection(this.collection).add(data) as { id: string };
      return { id: ref.id, ...data };
    }
  },
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

vi.mock("../../../../security", () => ({
  TOKEN_PII_FIELDS: ["email"],
  TOKEN_PII_INDEX_MAP: { email: "emailIndex" },
  encryptPiiFields: (data: Record<string, unknown>) => data,
  decryptPiiFields: (data: Record<string, unknown>) => data,
  addPiiIndices: (data: Record<string, unknown>) => data,
  piiBlindIndex: (v: string) => `idx:${v}`,
}));

vi.mock("../../../../utils", () => ({
  resolveDate: (d: unknown) => (d instanceof Date ? d : d ? new Date(d as string) : null),
}));

import {
  EmailVerificationTokenRepository,
  PasswordResetTokenRepository,
} from "../token.repository";

const emailRepo = new EmailVerificationTokenRepository();
const passwordRepo = new PasswordResetTokenRepository();

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
  mockDocRef.delete.mockResolvedValue(undefined);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.add.mockResolvedValue({ id: "token-id-123" });
  db.collection.mockReturnValue(mockCollection);
  db.batch.mockReturnValue(mockBatch);
  mockBatch.commit.mockResolvedValue(undefined);
});

describe("EmailVerificationTokenRepository.findByToken", () => {
  it("token exists → returns document", async () => {
    const tokenData = { userId: "user-1", email: "a@b.com", expiresAt: new Date(Date.now() + 60000) };
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: "tok-1", data: tokenData }]));
    const result = await emailRepo.findByToken("some-token");
    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-1");
  });

  it("token does not exist → returns null", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await emailRepo.findByToken("nonexistent-token");
    expect(result).toBeNull();
  });
});

describe("EmailVerificationTokenRepository.isExpired", () => {
  it("expiresAt in past → returns true", () => {
    const pastToken = { id: "t1", userId: "u", email: "a@b.com", expiresAt: new Date(Date.now() - 1000) };
    expect(emailRepo.isExpired(pastToken as never)).toBe(true);
  });

  it("expiresAt in future → returns false", () => {
    const futureToken = { id: "t1", userId: "u", email: "a@b.com", expiresAt: new Date(Date.now() + 60000) };
    expect(emailRepo.isExpired(futureToken as never)).toBe(false);
  });
});

describe("EmailVerificationTokenRepository.deleteAllForUser", () => {
  it("batch-deletes all tokens for the user", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([
      { id: "tok-1", data: { userId: "user-1" } },
      { id: "tok-2", data: { userId: "user-1" } },
    ]));
    await emailRepo.deleteAllForUser("user-1");
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("no tokens for user → still calls commit (empty batch)", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    await emailRepo.deleteAllForUser("user-no-tokens");
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });
});

describe("EmailVerificationTokenRepository.findByEmail", () => {
  it("uses HMAC blind index for lookup (emailIndex field)", async () => {
    const tokenData = { userId: "u", emailIndex: "idx:a@b.com", expiresAt: new Date() };
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: "tok-1", data: tokenData }]));
    await emailRepo.findByEmail("a@b.com");
    expect(mockCollection.where).toHaveBeenCalledWith("emailIndex", "==", "idx:a@b.com");
  });
});

describe("PasswordResetTokenRepository.markAsUsed", () => {
  it("sets usedAt timestamp and used: true on the document", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap({ userId: "user-1", token: "tok", used: false }));
    await passwordRepo.markAsUsed("tok-1");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ used: true, usedAt: expect.any(Date) }),
    );
  });
});

describe("PasswordResetTokenRepository.findUnusedForUser", () => {
  it("returns null when all tokens have used: true", async () => {
    mockQuery.get.mockResolvedValue(makeQuerySnap([]));
    const result = await passwordRepo.findUnusedForUser("user-1");
    expect(result).toEqual([]);
  });

  it("returns unused tokens (used: false)", async () => {
    const tokenData = { userId: "user-1", token: "abc", used: false, expiresAt: new Date() };
    mockQuery.get.mockResolvedValue(makeQuerySnap([{ id: "tok-1", data: tokenData }]));
    const result = await passwordRepo.findUnusedForUser("user-1");
    expect(result).toHaveLength(1);
  });
});
