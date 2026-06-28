import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendNotification } = vi.hoisted(() => ({
  mockSendNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: mockSendNotification,
}));

vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));

import { handleSupportTicketUpdate } from "../onSupportTicketUpdate";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  return {
    db: {} as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

function makeInput(prev: string | null, next: string | null, userId = "user-buyer") {
  return {
    ticketId: "ticket-1",
    before: prev ? { status: prev, userId, subject: "My ticket" } : null,
    after: next ? { status: next, userId, subject: "My ticket" } : null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendNotification.mockResolvedValue(undefined);
});

describe("handleSupportTicketUpdate — no notification conditions", () => {
  it("no-op when prevStatus === nextStatus", async () => {
    const ctx = makeCtx();
    await handleSupportTicketUpdate(makeInput("open", "open"), ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("no-op when nextStatus is not in notify-set (e.g. 'open')", async () => {
    const ctx = makeCtx();
    await handleSupportTicketUpdate(makeInput("new", "open"), ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("no-op when userId is missing from both before and after", async () => {
    const ctx = makeCtx();
    await handleSupportTicketUpdate(
      { ticketId: "ticket-1", before: { status: "open" }, after: { status: "resolved" } },
      ctx,
    );
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});

describe("handleSupportTicketUpdate — sends notifications for key statuses", () => {
  it("notifies on resolved status change", async () => {
    const ctx = makeCtx();
    await handleSupportTicketUpdate(makeInput("in_progress", "resolved"), ctx);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-buyer" }),
    );
    expect(mockSendNotification.mock.calls[0][0].title).toMatch(/resolved/i);
  });

  it("notifies on in_progress status change", async () => {
    const ctx = makeCtx();
    await handleSupportTicketUpdate(makeInput("open", "in_progress"), ctx);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-buyer" }),
    );
  });

  it("notifies on waiting_on_user status change", async () => {
    const ctx = makeCtx();
    await handleSupportTicketUpdate(makeInput("open", "waiting_on_user"), ctx);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-buyer" }),
    );
  });

  it("notifies on closed status change", async () => {
    const ctx = makeCtx();
    await handleSupportTicketUpdate(makeInput("resolved", "closed"), ctx);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-buyer" }),
    );
  });
});

describe("handleSupportTicketUpdate — notification content", () => {
  it("includes ticket subject in message", async () => {
    const ctx = makeCtx();
    await handleSupportTicketUpdate(
      {
        ticketId: "ticket-1",
        before: { status: "open", userId: "user-buyer", subject: "My special issue" },
        after: { status: "resolved", userId: "user-buyer", subject: "My special issue" },
      },
      ctx,
    );
    expect(mockSendNotification.mock.calls[0][0].message).toMatch(/My special issue/);
  });

  it("relatedId is the ticketId", async () => {
    const ctx = makeCtx();
    await handleSupportTicketUpdate(
      { ticketId: "ticket-xyz", before: { status: "open", userId: "user-1" }, after: { status: "resolved", userId: "user-1" } },
      ctx,
    );
    expect(mockSendNotification.mock.calls[0][0].relatedId).toBe("ticket-xyz");
  });
});

describe("handleSupportTicketUpdate — notification failure is non-fatal", () => {
  it("does not throw when sendNotification fails", async () => {
    mockSendNotification.mockRejectedValue(new Error("Network error"));
    const ctx = makeCtx();
    await expect(handleSupportTicketUpdate(makeInput("open", "resolved"), ctx)).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalled();
  });
});
