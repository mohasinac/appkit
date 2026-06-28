/**
 * Mock Firestore factory for repository unit tests.
 *
 * Usage:
 *   const { db, mockDocGet, mockTxn } = makeMockDb();
 *   vi.mock("../../../providers/db-firebase", () => ({ getAdminDb: () => db }));
 *
 *   // In test:
 *   mockDocGet.mockResolvedValue({ exists: true, data: () => ({ items: [] }) });
 */
import { vi } from "vitest";

export type MockSnap = {
  exists: boolean;
  id: string;
  ref: MockDocRef;
  data: () => Record<string, unknown>;
};

export type MockDocRef = {
  id: string;
  create: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  collection: ReturnType<typeof vi.fn>;
};

export type MockQuery = {
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};

export type MockCollectionRef = MockQuery & {
  doc: ReturnType<typeof vi.fn>;
  add: ReturnType<typeof vi.fn>;
};

export type MockBatch = {
  create: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
};

export type MockTxn = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

export type MockDb = {
  collection: ReturnType<typeof vi.fn>;
  batch: ReturnType<typeof vi.fn>;
  runTransaction: ReturnType<typeof vi.fn>;
  doc: ReturnType<typeof vi.fn>;
};

/**
 * Create a mock Firestore db with chainable mocks.
 *
 * The returned `mockDocGet`, `mockQueryGet`, `mockBatch`, `mockTxn`, and
 * `mockDocRef` objects can be used to control return values per test.
 *
 * `db.collection(X)` returns a MockCollectionRef where `.doc(Y)` returns a
 * MockDocRef. The actual return values are controlled by the functions you
 * re-assign in each test.
 */
export function makeMockDb() {
  const mockBatch: MockBatch = {
    create: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  const mockTxn: MockTxn = {
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockDocRef: MockDocRef = {
    id: "mock-doc-id",
    create: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
    set: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn(),
  };

  const mockQuery: MockQuery = {
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
    count: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
    }),
  };

  // Make query methods chainable
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);

  const mockCollection: MockCollectionRef = {
    ...mockQuery,
    doc: vi.fn().mockReturnValue(mockDocRef),
    add: vi.fn().mockResolvedValue({ id: "new-doc-id" }),
  };

  // Make subcollection on doc return a fresh query
  mockDocRef.collection.mockReturnValue(mockCollection);

  const db: MockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
    doc: vi.fn().mockReturnValue(mockDocRef),
    batch: vi.fn().mockReturnValue(mockBatch),
    runTransaction: vi.fn().mockImplementation(async (fn: (txn: MockTxn) => Promise<unknown>) => {
      return fn(mockTxn);
    }),
  };

  return { db, mockDocRef, mockCollection, mockQuery, mockBatch, mockTxn };
}

/**
 * Build a Firestore-like snapshot object.
 */
export function makeSnap(
  data: Record<string, unknown> | null,
  id = "mock-id",
): MockSnap {
  const exists = data !== null;
  const mockDocRef = { id } as unknown as MockDocRef;
  return {
    exists,
    id,
    ref: mockDocRef,
    data: () => (data ?? {}) as Record<string, unknown>,
  };
}

/**
 * Build a Firestore-like query snapshot with multiple documents.
 */
export function makeQuerySnap(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs: docs.map((d) => makeSnap(d.data, d.id)),
  };
}
