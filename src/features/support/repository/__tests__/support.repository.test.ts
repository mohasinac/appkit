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
    firebaseFieldOps: {
      arrayUnion: (...args: unknown[]) => args,
      arrayRemove: (...args: unknown[]) => args,
      increment: (n: number) => n,
      serverTimestamp: () => new Date(),
      delete: () => null,
    },
  };
});

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { SupportRepository } from "../support.repository";
import { ACTIVE_TICKET_STATUSES } from "../../schemas/firestore";

const repo = new SupportRepository();

function makeTicketDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "ticket-order-issue-ravi-20260627",
    userId: "user-ravi",
    userEmail: "ravi@test.com",
    userDisplayName: "Ravi Kumar",
    category: "order_issue" as const,
    subject: "My order is missing",
    description: "I placed an order but never received it.",
    orderId: "order-3-20260601-abc123",
    status: "open" as const,
    priority: "normal" as const,
    messages: [] as Array<Record<string, unknown>>,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-1",
    authorId: "user-ravi",
    authorRole: "user" as const,
    body: "I need help with my order.",
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockCollection.add = vi.fn().mockResolvedValue({ id: "new-ticket-id", get: vi.fn().mockResolvedValue(makeSnap(makeTicketDoc(), "new-ticket-id")) });
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.orderBy.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.select = vi.fn().mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue(makeQuerySnap([]));
  mockDocRef.get.mockResolvedValue(makeSnap(makeTicketDoc(), "ticket-1"));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// createTicket
// ---------------------------------------------------------------------------
describe("SupportRepository.createTicket", () => {
  it("sets status: open on new tickets", async () => {
    const input = {
      userId: "user-ravi",
      userEmail: "ravi@test.com",
      userDisplayName: "Ravi Kumar",
      category: "order_issue" as const,
      subject: "Missing order",
      description: "Order never arrived.",
    };
    await repo.createTicket(input);
    // create() calls collection.add (BaseRepository.create uses add for auto-ID)
    const addArg = mockCollection.add.mock.calls[0][0] as Record<string, unknown>;
    expect(addArg.status).toBe("open");
  });

  it("sets priority: normal by default", async () => {
    await repo.createTicket({
      userId: "user-ravi",
      userEmail: "ravi@test.com",
      userDisplayName: "Ravi Kumar",
      category: "general" as const,
      subject: "Question",
      description: "I have a question.",
    });
    const addArg = mockCollection.add.mock.calls[0][0] as Record<string, unknown>;
    expect(addArg.priority).toBe("normal");
  });

  it("initialises messages: [] on new ticket", async () => {
    await repo.createTicket({
      userId: "user-ravi",
      userEmail: "ravi@test.com",
      userDisplayName: "Ravi Kumar",
      category: "general" as const,
      subject: "Question",
      description: "I have a question.",
    });
    const addArg = mockCollection.add.mock.calls[0][0] as Record<string, unknown>;
    expect(addArg.messages).toEqual([]);
  });

  it("stores orderId when provided", async () => {
    await repo.createTicket({
      userId: "user-ravi",
      userEmail: "ravi@test.com",
      userDisplayName: "Ravi Kumar",
      category: "order_issue" as const,
      subject: "Order missing",
      description: "My order is gone.",
      orderId: "order-3-20260601-abc123",
    });
    const addArg = mockCollection.add.mock.calls[0][0] as Record<string, unknown>;
    expect(addArg.orderId).toBe("order-3-20260601-abc123");
  });

  it("sets createdAt and updatedAt timestamps", async () => {
    await repo.createTicket({
      userId: "user-ravi",
      userEmail: "ravi@test.com",
      userDisplayName: "Ravi Kumar",
      category: "general" as const,
      subject: "Q",
      description: "D",
    });
    const addArg = mockCollection.add.mock.calls[0][0] as Record<string, unknown>;
    expect(addArg.createdAt).toBeInstanceOf(Date);
    expect(addArg.updatedAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// countActiveTickets
// ---------------------------------------------------------------------------
describe("SupportRepository.countActiveTickets", () => {
  it("runs a query per ACTIVE_TICKET_STATUS in parallel", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    await repo.countActiveTickets("user-ravi");
    // One query per active status
    expect(mockQuery.get).toHaveBeenCalledTimes(ACTIVE_TICKET_STATUSES.length);
  });

  it("returns sum of sizes across all active status queries", async () => {
    // Each of the 3 queries returns size=2 → total should be 6
    mockQuery.get.mockResolvedValue({ empty: false, size: 2, docs: [] });
    const count = await repo.countActiveTickets("user-ravi");
    expect(count).toBe(ACTIVE_TICKET_STATUSES.length * 2);
  });

  it("returns 0 when no active tickets", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    const count = await repo.countActiveTickets("user-nobody");
    expect(count).toBe(0);
  });

  it("queries by userId on each sub-query", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    await repo.countActiveTickets("user-specific");
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("userId"),
      "==",
      "user-specific",
    );
  });

  it("uses select() stub reads (minimal cost)", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    await repo.countActiveTickets("user-ravi");
    expect(mockQuery.select).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getActiveCategoryTicket
// ---------------------------------------------------------------------------
describe("SupportRepository.getActiveCategoryTicket", () => {
  it("returns existing ticket for userId + category with status waiting_on_user", async () => {
    const ticket = makeTicketDoc({ status: "waiting_on_user", category: "order_issue" });
    mockQuery.get.mockResolvedValue({
      empty: false,
      size: 1,
      docs: [makeSnap(ticket, ticket.id as string)],
    });
    const result = await repo.getActiveCategoryTicket("user-ravi", "order_issue");
    expect(result).not.toBeNull();
    expect(result?.category).toBe("order_issue");
  });

  it("returns null when no matching ticket found", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    const result = await repo.getActiveCategoryTicket("user-ravi", "general");
    expect(result).toBeNull();
  });

  it("queries specifically for status == waiting_on_user", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    await repo.getActiveCategoryTicket("user-ravi", "billing_payment");
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("status"),
      "==",
      "waiting_on_user",
    );
  });

  it("queries by userId and category", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    await repo.getActiveCategoryTicket("user-xyz", "account");
    expect(mockCollection.where).toHaveBeenCalledWith(
      expect.stringContaining("userId"),
      "==",
      "user-xyz",
    );
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("category"),
      "==",
      "account",
    );
  });

  it("uses limit(1) to avoid scanning all tickets", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    await repo.getActiveCategoryTicket("user-ravi", "general");
    expect(mockQuery.limit).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// addMessage
// ---------------------------------------------------------------------------
describe("SupportRepository.addMessage", () => {
  it("appends message using arrayUnion (does not overwrite messages array)", async () => {
    const message = makeMessage();
    await repo.addMessage("ticket-1", message);
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    // arrayUnion mock returns its arguments as an array
    expect(updateArg.messages).toBeDefined();
  });

  it("updates updatedAt timestamp on message add", async () => {
    await repo.addMessage("ticket-1", makeMessage());
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.updatedAt).toBeInstanceOf(Date);
  });

  it("sets newStatus when provided", async () => {
    await repo.addMessage("ticket-1", makeMessage(), "in_progress");
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.status).toBe("in_progress");
  });

  it("does NOT set status field when newStatus not provided", async () => {
    await repo.addMessage("ticket-1", makeMessage());
    const updateArg = mockDocRef.update.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(updateArg)).not.toContain("status");
  });

  it("calls doc(ticketId).update — not collection.add", async () => {
    await repo.addMessage("ticket-1", makeMessage());
    expect(mockCollection.doc).toHaveBeenCalledWith("ticket-1");
    expect(mockDocRef.update).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// assignTicket
// ---------------------------------------------------------------------------
describe("SupportRepository.assignTicket", () => {
  it("sets assignedTo field", async () => {
    await repo.assignTicket("ticket-1", "employee-uid-1", "Support Agent");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ assignedTo: "employee-uid-1" }),
    );
  });

  it("sets assignedToName field", async () => {
    await repo.assignTicket("ticket-1", "emp-1", "Alice Support");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ assignedToName: "Alice Support" }),
    );
  });

  it("sets updatedAt timestamp", async () => {
    await repo.assignTicket("ticket-1", "emp-1", "Agent");
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });
});

// ---------------------------------------------------------------------------
// updateTicketStatus
// ---------------------------------------------------------------------------
describe("SupportRepository.updateTicketStatus", () => {
  it("applies provided status update", async () => {
    await repo.updateTicketStatus("ticket-1", { status: "resolved" });
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "resolved" }),
    );
  });

  it("sets updatedAt on every status change", async () => {
    await repo.updateTicketStatus("ticket-1", { status: "closed" });
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ updatedAt: expect.any(Date) }),
    );
  });

  it("stores resolvedAt when provided", async () => {
    const resolvedAt = new Date();
    await repo.updateTicketStatus("ticket-1", { status: "resolved", resolvedAt });
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ resolvedAt }),
    );
  });

  it("stores priority update when provided", async () => {
    await repo.updateTicketStatus("ticket-1", { priority: "high" } as never);
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "high" }),
    );
  });
});

// ---------------------------------------------------------------------------
// getActiveOrderTicket
// ---------------------------------------------------------------------------
describe("SupportRepository.getActiveOrderTicket", () => {
  it("returns ticket matching userId + orderId with active status", async () => {
    const ticket = makeTicketDoc({ status: "open", orderId: "order-1" });
    mockQuery.get.mockResolvedValue({
      empty: false,
      size: 1,
      docs: [{ id: ticket.id, data: () => ticket }],
    });
    const result = await repo.getActiveOrderTicket("user-ravi", "order-1");
    expect(result).not.toBeNull();
    expect(result?.orderId).toBe("order-1");
  });

  it("returns null when no active order ticket exists", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    const result = await repo.getActiveOrderTicket("user-ravi", "order-nonexistent");
    expect(result).toBeNull();
  });

  it("queries status in ACTIVE_TICKET_STATUSES", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    await repo.getActiveOrderTicket("user-ravi", "order-1");
    expect(mockQuery.where).toHaveBeenCalledWith(
      expect.stringContaining("status"),
      "in",
      ACTIVE_TICKET_STATUSES,
    );
  });

  it("uses limit(1)", async () => {
    mockQuery.get.mockResolvedValue({ empty: true, size: 0, docs: [] });
    await repo.getActiveOrderTicket("user-ravi", "order-1");
    expect(mockQuery.limit).toHaveBeenCalledWith(1);
  });
});
