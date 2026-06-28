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
    const mockBatch = {
        create: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
    };
    const mockTxn = {
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };
    const mockDocRef = {
        id: "mock-doc-id",
        create: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        collection: vi.fn(),
    };
    const mockQuery = {
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
    const mockCollection = {
        ...mockQuery,
        doc: vi.fn().mockReturnValue(mockDocRef),
        add: vi.fn().mockResolvedValue({ id: "new-doc-id" }),
    };
    // Make subcollection on doc return a fresh query
    mockDocRef.collection.mockReturnValue(mockCollection);
    const db = {
        collection: vi.fn().mockReturnValue(mockCollection),
        doc: vi.fn().mockReturnValue(mockDocRef),
        batch: vi.fn().mockReturnValue(mockBatch),
        runTransaction: vi.fn().mockImplementation(async (fn) => {
            return fn(mockTxn);
        }),
    };
    return { db, mockDocRef, mockCollection, mockQuery, mockBatch, mockTxn };
}
/**
 * Build a Firestore-like snapshot object.
 */
export function makeSnap(data, id = "mock-id") {
    const exists = data !== null;
    const mockDocRef = { id };
    return {
        exists,
        id,
        ref: mockDocRef,
        data: () => (data ?? {}),
    };
}
/**
 * Build a Firestore-like query snapshot with multiple documents.
 */
export function makeQuerySnap(docs) {
    return {
        empty: docs.length === 0,
        size: docs.length,
        docs: docs.map((d) => makeSnap(d.data, d.id)),
    };
}
