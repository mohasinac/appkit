import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery, mockTxn } = makeMockDb();

vi.mock("../../../../providers/db-firebase", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { ConversationsRepository } from "../conversations.repository";

const repo = new ConversationsRepository();

function makeConvData(overrides: Record<string, unknown> = {}) {
  return {
    buyerId: "user-ravi",
    buyerDisplayName: "Ravi Kumar",
    storeId: "store-pokemon-palace",
    storeName: "Pokemon Palace",
    sellerDisplayName: "Misty Singh",
    productId: "product-charizard",
    productTitle: "Charizard PSA9",
    messages: [],
    lastMessage: "",
    lastMessageAt: new Date(),
    unreadBuyer: 0,
    unreadSeller: 0,
    status: "active",
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
  mockQuery.get.mockResolvedValue({ docs: [], empty: true, size: 0 });
  mockDocRef.get.mockResolvedValue({ exists: false, id: "mock-id", data: () => ({}) });
  mockDocRef.update.mockResolvedValue(undefined);
  db.runTransaction.mockImplementation(
    async (fn: (txn: typeof mockTxn) => Promise<unknown>) => fn(mockTxn),
  );
  mockTxn.get.mockResolvedValue({ exists: false, id: "mock-id", data: () => ({}) });
  mockTxn.set.mockReturnValue(undefined);
  mockTxn.update.mockReturnValue(undefined);
});

// ---------------------------------------------------------------------------
// findOrCreateByContext
// ---------------------------------------------------------------------------
describe("ConversationsRepository.findOrCreateByContext", () => {
  it("generates stable ID: conv-{buyerId}-{storeId}-{productId}", async () => {
    const convData = makeConvData();
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-user-ravi-store-pokemon-palace-product-charizard", data: () => convData });
    const result = await repo.findOrCreateByContext({
      buyerId: "user-ravi",
      buyerDisplayName: "Ravi Kumar",
      storeId: "store-pokemon-palace",
      storeName: "Pokemon Palace",
      sellerDisplayName: "Misty Singh",
      productId: "product-charizard",
    });
    expect(mockCollection.doc).toHaveBeenCalledWith(
      "conv-user-ravi-store-pokemon-palace-product-charizard",
    );
    expect(result.buyerId).toBe("user-ravi");
  });

  it("uses 'general' productKey when productId is not provided", async () => {
    const convData = makeConvData({ productId: undefined });
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-user-ravi-store-1-general", data: () => convData });
    await repo.findOrCreateByContext({
      buyerId: "user-ravi",
      buyerDisplayName: "Ravi",
      storeId: "store-1",
      storeName: "Store 1",
      sellerDisplayName: "Seller 1",
    });
    expect(mockCollection.doc).toHaveBeenCalledWith("conv-user-ravi-store-1-general");
  });

  it("returns existing conversation without creating a new one (idempotent)", async () => {
    const convData = makeConvData();
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-abc", data: () => convData });
    await repo.findOrCreateByContext({
      buyerId: "user-ravi",
      buyerDisplayName: "Ravi",
      storeId: "store-1",
      storeName: "Store 1",
      sellerDisplayName: "Seller",
    });
    expect(mockTxn.set).not.toHaveBeenCalled();
  });

  it("creates a new conversation when one does not exist", async () => {
    mockTxn.get.mockResolvedValue({ exists: false, id: "conv-new", data: () => ({}) });
    await repo.findOrCreateByContext({
      buyerId: "user-new",
      buyerDisplayName: "New Buyer",
      storeId: "store-new",
      storeName: "New Store",
      sellerDisplayName: "New Seller",
    });
    expect(mockTxn.set).toHaveBeenCalledOnce();
  });

  it("new conversation starts with messages=[], unreadBuyer=0, unreadSeller=0", async () => {
    mockTxn.get.mockResolvedValue({ exists: false, id: "conv-new", data: () => ({}) });
    const result = await repo.findOrCreateByContext({
      buyerId: "user-new",
      buyerDisplayName: "New",
      storeId: "store-new",
      storeName: "New Store",
      sellerDisplayName: "Seller",
    });
    expect(result.messages).toHaveLength(0);
    expect(result.unreadBuyer).toBe(0);
    expect(result.unreadSeller).toBe(0);
  });

  it("uses Firestore transaction for atomicity", async () => {
    mockTxn.get.mockResolvedValue({ exists: false, id: "conv-new", data: () => ({}) });
    await repo.findOrCreateByContext({
      buyerId: "user-a",
      buyerDisplayName: "A",
      storeId: "store-b",
      storeName: "B",
      sellerDisplayName: "Seller",
    });
    expect(db.runTransaction).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// appendMessage
// ---------------------------------------------------------------------------
describe("ConversationsRepository.appendMessage", () => {
  it("increments unreadBuyer when seller sends a message", async () => {
    const convData = makeConvData({ unreadBuyer: 0, unreadSeller: 0 });
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-1", data: () => convData });
    const result = await repo.appendMessage("conv-1", {
      senderId: "seller-uid",
      senderRole: "seller",
      body: "Hello buyer!",
    });
    expect(result.unreadBuyer).toBe(1);
    expect(result.unreadSeller).toBe(0);
  });

  it("increments unreadSeller when buyer sends a message", async () => {
    const convData = makeConvData({ unreadBuyer: 0, unreadSeller: 2 });
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-1", data: () => convData });
    const result = await repo.appendMessage("conv-1", {
      senderId: "buyer-uid",
      senderRole: "buyer",
      body: "Hello seller!",
    });
    expect(result.unreadSeller).toBe(3);
    expect(result.unreadBuyer).toBe(0);
  });

  it("appends the new message to the existing messages array", async () => {
    const existingMsg = {
      id: "msg-old",
      senderId: "seller-uid",
      senderRole: "seller",
      body: "Previous message",
      isRead: false,
      sentAt: new Date(),
    };
    const convData = makeConvData({ messages: [existingMsg] });
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-1", data: () => convData });
    const result = await repo.appendMessage("conv-1", {
      senderId: "buyer-uid",
      senderRole: "buyer",
      body: "New message",
    });
    expect(result.messages).toHaveLength(2);
    expect(result.messages[1].body).toBe("New message");
  });

  it("sets isRead: false on the new message", async () => {
    const convData = makeConvData();
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-1", data: () => convData });
    const result = await repo.appendMessage("conv-1", {
      senderId: "buyer-uid",
      senderRole: "buyer",
      body: "Test",
    });
    expect(result.messages[0].isRead).toBe(false);
  });

  it("updates lastMessage and lastMessageAt", async () => {
    const convData = makeConvData();
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-1", data: () => convData });
    const result = await repo.appendMessage("conv-1", {
      senderId: "buyer-uid",
      senderRole: "buyer",
      body: "Latest message",
    });
    expect(result.lastMessage).toBe("Latest message");
    expect(result.lastMessageAt).toBeInstanceOf(Date);
  });

  it("uses Firestore transaction", async () => {
    const convData = makeConvData();
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-1", data: () => convData });
    await repo.appendMessage("conv-1", { senderId: "uid", senderRole: "buyer", body: "msg" });
    expect(db.runTransaction).toHaveBeenCalledOnce();
    expect(mockTxn.update).toHaveBeenCalledOnce();
  });

  it("throws when conversation not found", async () => {
    mockTxn.get.mockResolvedValue({ exists: false, id: "conv-ghost", data: () => ({}) });
    await expect(
      repo.appendMessage("conv-ghost", { senderId: "uid", senderRole: "buyer", body: "msg" }),
    ).rejects.toThrow(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// markRead
// ---------------------------------------------------------------------------
describe("ConversationsRepository.markRead", () => {
  it("zeroes unreadBuyer when role=buyer", async () => {
    const sellerMsg = { id: "m1", senderId: "seller", senderRole: "seller", body: "Hi", isRead: false, sentAt: new Date() };
    const convData = makeConvData({ unreadBuyer: 3, unreadSeller: 1, messages: [sellerMsg] });
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-1", data: () => convData });
    await repo.markRead("conv-1", "buyer");
    const updateArg = mockTxn.update.mock.calls[0][1] as Record<string, unknown>;
    expect(updateArg.unreadBuyer).toBe(0);
  });

  it("does NOT touch unreadSeller when buyer reads", async () => {
    const convData = makeConvData({ unreadBuyer: 2, unreadSeller: 5 });
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-1", data: () => convData });
    await repo.markRead("conv-1", "buyer");
    const updateArg = mockTxn.update.mock.calls[0][1] as Record<string, unknown>;
    expect(updateArg).not.toHaveProperty("unreadSeller");
  });

  it("zeroes unreadSeller when role=seller", async () => {
    const buyerMsg = { id: "m1", senderId: "buyer", senderRole: "buyer", body: "Hi", isRead: false, sentAt: new Date() };
    const convData = makeConvData({ unreadBuyer: 2, unreadSeller: 4, messages: [buyerMsg] });
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-1", data: () => convData });
    await repo.markRead("conv-1", "seller");
    const updateArg = mockTxn.update.mock.calls[0][1] as Record<string, unknown>;
    expect(updateArg.unreadSeller).toBe(0);
  });

  it("marks seller-sent messages as isRead=true when buyer reads", async () => {
    const sellerMsg = { id: "m1", senderId: "seller", senderRole: "seller", body: "Hi", isRead: false, sentAt: new Date() };
    const convData = makeConvData({ messages: [sellerMsg] });
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-1", data: () => convData });
    await repo.markRead("conv-1", "buyer");
    const updateArg = mockTxn.update.mock.calls[0][1] as Record<string, unknown>;
    const msgs = updateArg.messages as Array<{ isRead: boolean }>;
    expect(msgs[0].isRead).toBe(true);
  });

  it("does NOT mark buyer-sent messages when buyer reads (only marks counterparty)", async () => {
    const buyerMsg = { id: "m1", senderId: "buyer", senderRole: "buyer", body: "Hi", isRead: false, sentAt: new Date() };
    const convData = makeConvData({ messages: [buyerMsg] });
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-1", data: () => convData });
    await repo.markRead("conv-1", "buyer");
    const updateArg = mockTxn.update.mock.calls[0][1] as Record<string, unknown>;
    const msgs = updateArg.messages as Array<{ isRead: boolean }>;
    expect(msgs[0].isRead).toBe(false);
  });

  it("uses Firestore transaction", async () => {
    const convData = makeConvData();
    mockTxn.get.mockResolvedValue({ exists: true, id: "conv-1", data: () => convData });
    await repo.markRead("conv-1", "buyer");
    expect(db.runTransaction).toHaveBeenCalledOnce();
  });
});
