import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockEventCreate,
  mockEventFindById,
  mockEventUpdate,
  mockEventIncrementTotalEntries,
  mockEntryCreate,
  mockEntryFindById,
  mockEntryDelete,
  mockEntryHasUserEntered,
  mockAssertEventActive,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockEventCreate: vi.fn(),
  mockEventFindById: vi.fn(),
  mockEventUpdate: vi.fn(),
  mockEventIncrementTotalEntries: vi.fn(),
  mockEntryCreate: vi.fn(),
  mockEntryFindById: vi.fn(),
  mockEntryDelete: vi.fn(),
  mockEntryHasUserEntered: vi.fn(),
  mockAssertEventActive: vi.fn(),
}));

vi.mock("@mohasinac/appkit/server", () => ({
  wrapAction: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
}));

vi.mock("../../../../repositories", () => ({
  eventRepository: {
    createEvent: mockEventCreate,
    findById: mockEventFindById,
    updateEvent: mockEventUpdate,
    incrementTotalEntries: mockEventIncrementTotalEntries,
  },
  eventEntryRepository: {
    create: mockEntryCreate,
    findById: mockEntryFindById,
    delete: mockEntryDelete,
    hasUserEntered: mockEntryHasUserEntered,
  },
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("./service", () => ({
  assertEventActive: mockAssertEventActive,
}));

import {
  createEventAction,
  registerForEventAction,
  cancelEventRegistrationAction,
} from "../actions";

function makeAdminUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-admin-1", email: "admin@test.com", name: "Admin User", ...overrides };
}

function makeBuyerUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer One", ...overrides };
}

function makeEventDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-summer-sale-2026",
    title: "Summer Holo Sale 2026",
    slug: "event-summer-sale-2026",
    status: "active",
    type: "sale",
    stats: { totalEntries: 5, approvedEntries: 3, flaggedEntries: 0 },
    ...overrides,
  };
}

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-abc123",
    eventId: "event-summer-sale-2026",
    userId: "user-buyer-1",
    userDisplayName: "Buyer One",
    reviewStatus: "pending",
    ...overrides,
  };
}

function makeCreateEventInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Summer Holo Sale 2026",
    slug: "event-summer-sale-2026",
    type: "sale",
    tags: ["pokemon"],
    startsAt: new Date(Date.now() + 86400000),
    endsAt: new Date(Date.now() + 172800000),
    ...overrides,
  };
}

describe("createEventAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockEventCreate.mockResolvedValue(makeEventDoc());
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await createEventAction(makeCreateEventInput());
    expect(result.ok).toBe(false);
  });

  it("non-admin/moderator → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Insufficient role"));
    const result = await createEventAction(makeCreateEventInput());
    expect(result.ok).toBe(false);
  });

  it("missing title → { ok: false }", async () => {
    const { title: _t, ...input } = makeCreateEventInput();
    const result = await createEventAction(input);
    expect(result.ok).toBe(false);
  });

  it("valid → eventRepository.createEvent called with status: draft", async () => {
    await createEventAction(makeCreateEventInput());
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft", createdBy: "user-admin-1" }),
    );
  });

  it("success → { ok: true, data: event }", async () => {
    const event = makeEventDoc();
    mockEventCreate.mockResolvedValue(event);
    const result = await createEventAction(makeCreateEventInput());
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual(event);
  });
});

describe("registerForEventAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeBuyerUser());
    mockAssertEventActive.mockResolvedValue(makeEventDoc());
    mockEntryHasUserEntered.mockResolvedValue(false);
    mockEntryCreate.mockResolvedValue(makeEntry());
    mockEventIncrementTotalEntries.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await registerForEventAction({ eventId: "event-summer-sale-2026" });
    expect(result.ok).toBe(false);
  });

  it("missing eventId → { ok: false }", async () => {
    const result = await registerForEventAction({});
    expect(result.ok).toBe(false);
  });

  it("event not active (assertEventActive throws) → { ok: false }", async () => {
    mockAssertEventActive.mockRejectedValue(new Error("Event is not accepting registrations"));
    const result = await registerForEventAction({ eventId: "event-summer-sale-2026" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not accepting/i);
  });

  it("already registered → { ok: false }", async () => {
    mockEntryHasUserEntered.mockResolvedValue(true);
    const result = await registerForEventAction({ eventId: "event-summer-sale-2026" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/already registered/i);
  });

  it("valid → eventEntryRepository.create called with status pending/confirmed", async () => {
    await registerForEventAction({ eventId: "event-summer-sale-2026" });
    expect(mockEntryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "event-summer-sale-2026",
        userId: "user-buyer-1",
      }),
    );
  });

  it("valid → eventRepository.incrementTotalEntries called", async () => {
    await registerForEventAction({ eventId: "event-summer-sale-2026" });
    expect(mockEventIncrementTotalEntries).toHaveBeenCalledWith("event-summer-sale-2026");
  });

  it("incrementTotalEntries failure is non-fatal", async () => {
    mockEventIncrementTotalEntries.mockRejectedValue(new Error("Firestore timeout"));
    const result = await registerForEventAction({ eventId: "event-summer-sale-2026" });
    expect(result.ok).toBe(true);
  });

  it("success → { ok: true, data: entry }", async () => {
    const entry = makeEntry();
    mockEntryCreate.mockResolvedValue(entry);
    const result = await registerForEventAction({ eventId: "event-summer-sale-2026" });
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual(entry);
  });
});

describe("cancelEventRegistrationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeBuyerUser());
    mockEntryFindById.mockResolvedValue(makeEntry({ userId: "user-buyer-1" }));
    mockEntryDelete.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await cancelEventRegistrationAction("entry-abc123");
    expect(result.ok).toBe(false);
  });

  it("entry not found → { ok: false }", async () => {
    mockEntryFindById.mockResolvedValue(null);
    const result = await cancelEventRegistrationAction("entry-missing");
    expect(result.ok).toBe(false);
  });

  it("entry belongs to different user → { ok: false }", async () => {
    mockEntryFindById.mockResolvedValue(makeEntry({ userId: "user-other-buyer" }));
    const result = await cancelEventRegistrationAction("entry-abc123");
    expect(result.ok).toBe(false);
  });

  it("valid → eventEntryRepository.delete called with entryId", async () => {
    await cancelEventRegistrationAction("entry-abc123");
    expect(mockEntryDelete).toHaveBeenCalledWith("entry-abc123");
  });

  it("success → { ok: true }", async () => {
    const result = await cancelEventRegistrationAction("entry-abc123");
    expect(result.ok).toBe(true);
  });
});
