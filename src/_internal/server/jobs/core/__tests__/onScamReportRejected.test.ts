import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindById,
  mockSendNotification,
} = vi.hoisted(() => ({
  mockUserFindById: vi.fn(),
  mockSendNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../../repositories", () => ({
  userRepository: { findById: mockUserFindById },
}));

vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: mockSendNotification,
}));

vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));

import { handleScamReportRejected } from "../onScamReportRejected";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  return {
    db: {} as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

function makeInput(overrides: Partial<{
  reportedBy: string;
  prevStatus: string;
  nextStatus: string;
}> = {}) {
  return {
    scammerId: "scammer-1",
    report: {
      reportedBy: overrides.reportedBy ?? "user-reporter",
      displayNames: ["Bad Actor"],
      prevStatus: overrides.prevStatus ?? "pending",
      nextStatus: overrides.nextStatus ?? "rejected",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindById.mockResolvedValue({ email: "reporter@example.com" });
  mockSendNotification.mockResolvedValue(undefined);
});

describe("handleScamReportRejected — early exit conditions", () => {
  it("returns early (no notification) when prevStatus === nextStatus", async () => {
    const ctx = makeCtx();
    await handleScamReportRejected(makeInput({ prevStatus: "rejected", nextStatus: "rejected" }), ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("returns early when nextStatus is not 'rejected'", async () => {
    const ctx = makeCtx();
    await handleScamReportRejected(makeInput({ nextStatus: "verified" }), ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("returns early when reportedBy is undefined", async () => {
    const ctx = makeCtx();
    await handleScamReportRejected({
      scammerId: "scammer-1",
      report: { prevStatus: "pending", nextStatus: "rejected" },
    }, ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});

describe("handleScamReportRejected — sends notification on rejection", () => {
  it("notifies the reporter when nextStatus becomes 'rejected'", async () => {
    const ctx = makeCtx();
    await handleScamReportRejected(makeInput(), ctx);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-reporter" }),
    );
  });

  it("notification type is account_action", async () => {
    const ctx = makeCtx();
    await handleScamReportRejected(makeInput(), ctx);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "account_action" }),
    );
  });

  it("message mentions the scammer display name", async () => {
    const ctx = makeCtx();
    await handleScamReportRejected(makeInput(), ctx);
    const call = mockSendNotification.mock.calls[0][0];
    expect(call.message).toMatch(/Bad Actor/);
  });

  it("relatedId is scammerId", async () => {
    const ctx = makeCtx();
    await handleScamReportRejected(makeInput(), ctx);
    expect(mockSendNotification.mock.calls[0][0].relatedId).toBe("scammer-1");
  });
});

describe("handleScamReportRejected — notification failure is non-fatal", () => {
  it("does not throw when sendNotification fails", async () => {
    mockSendNotification.mockRejectedValue(new Error("Notification down"));
    const ctx = makeCtx();
    await expect(handleScamReportRejected(makeInput(), ctx)).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalled();
  });
});
