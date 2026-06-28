import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendNotification } = vi.hoisted(() => ({
  mockSendNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: mockSendNotification,
}));

vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));

import { handleSupportTicketCreate } from "../onSupportTicketCreate";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  return {
    db: {} as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSendNotification.mockResolvedValue(undefined);
});

describe("handleSupportTicketCreate — no userId", () => {
  it("returns early and warns when ticket has no userId", async () => {
    const ctx = makeCtx();
    await handleSupportTicketCreate({ ticketId: "ticket-1", ticket: { subject: "Help" } }, ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(ctx.logger.warn).toHaveBeenCalled();
  });
});

describe("handleSupportTicketCreate — with userId", () => {
  it("sends a confirmation notification to the ticket creator", async () => {
    const ctx = makeCtx();
    await handleSupportTicketCreate(
      { ticketId: "ticket-1", ticket: { userId: "user-buyer", subject: "Order missing" } },
      ctx,
    );
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-buyer" }),
    );
  });

  it("notification type is account_action", async () => {
    const ctx = makeCtx();
    await handleSupportTicketCreate(
      { ticketId: "ticket-1", ticket: { userId: "user-buyer", subject: "Help" } },
      ctx,
    );
    expect(mockSendNotification.mock.calls[0][0].type).toBe("account_action");
  });

  it("relatedId matches the ticket ID", async () => {
    const ctx = makeCtx();
    await handleSupportTicketCreate(
      { ticketId: "ticket-abc", ticket: { userId: "user-buyer" } },
      ctx,
    );
    expect(mockSendNotification.mock.calls[0][0].relatedId).toBe("ticket-abc");
  });

  it("uses ticket subject in notification message", async () => {
    const ctx = makeCtx();
    await handleSupportTicketCreate(
      { ticketId: "ticket-1", ticket: { userId: "user-buyer", subject: "Damaged package" } },
      ctx,
    );
    expect(mockSendNotification.mock.calls[0][0].message).toMatch(/Damaged package/);
  });

  it("falls back to 'your ticket' when subject is undefined", async () => {
    const ctx = makeCtx();
    await handleSupportTicketCreate(
      { ticketId: "ticket-1", ticket: { userId: "user-buyer" } },
      ctx,
    );
    expect(mockSendNotification.mock.calls[0][0].message).toMatch(/your ticket/i);
  });
});

describe("handleSupportTicketCreate — notification failure is non-fatal", () => {
  it("does not throw when sendNotification fails", async () => {
    mockSendNotification.mockRejectedValue(new Error("Mail service down"));
    const ctx = makeCtx();
    await expect(
      handleSupportTicketCreate(
        { ticketId: "ticket-1", ticket: { userId: "user-buyer" } },
        ctx,
      ),
    ).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalled();
  });
});
