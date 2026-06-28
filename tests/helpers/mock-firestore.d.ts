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
    offset?: ReturnType<typeof vi.fn>;
    select?: ReturnType<typeof vi.fn>;
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
    getAll?: ReturnType<typeof vi.fn>;
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
export declare function makeMockDb(): {
    db: MockDb;
    mockDocRef: MockDocRef;
    mockCollection: MockCollectionRef;
    mockQuery: MockQuery;
    mockBatch: MockBatch;
    mockTxn: MockTxn;
};
/**
 * Build a Firestore-like snapshot object.
 */
export declare function makeSnap(data: Record<string, unknown> | null, id?: string): MockSnap;
/**
 * Build a Firestore-like query snapshot with multiple documents.
 */
export declare function makeQuerySnap(docs: Array<{
    id: string;
    data: Record<string, unknown>;
}>): {
    empty: boolean;
    size: number;
    docs: MockSnap[];
};
