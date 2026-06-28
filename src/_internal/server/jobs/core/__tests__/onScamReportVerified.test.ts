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

import { handleScamReportVerified } from "../onScamReportVerified";
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
    scammerId: "scammer-99",
    report: {
      reportedBy: overrides.reportedBy ?? "user-reporter",
      displayNames: ["Verified Scammer"],
      prevStatus: overrides.prevStatus ?? "pending",
      nextStatus: overrides.nextStatus ?? "verified",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindById.mockResolvedValue({ email: "reporter@example.com" });
  mockSendNotification.mockResolvedValue(undefined);
});

describe("handleScamReportVerified — early exit conditions", () => {
  it("returns early when prevStatus === nextStatus", async () => {
    const ctx = makeCtx();
    await handleScamReportVerified(makeInput({ prevStatus: "verified", nextStatus: "verified" }), ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("returns early when nextStatus is not 'verified'", async () => {
    const ctx = makeCtx();
    await handleScamReportVerified(makeInput({ nextStatus: "rejected" }), ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("returns early when reportedBy is undefined", async () => {
    const ctx = makeCtx();
    await handleScamReportVerified({
      scammerId: "scammer-99",
      report: { prevStatus: "pending", nextStatus: "verified" },
    }, ctx);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});

describe("handleScamReportVerified — sends verification notification", () => {
  it("notifies the reporter when status becomes 'verified'", async () => {
    const ctx = makeCtx();
    await handleScamReportVerified(makeInput(), ctx);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-reporter" }),
    );
  });

  it("title confirms the report was verified", async () => {
    const ctx = makeCtx();
    await handleScamReportVerified(makeInput(), ctx);
    const call = mockSendNotification.mock.calls[0][0];
    expect(call.title).toMatch(/verified/i);
  });

  it("message mentions the scammer name and community protection", async () => {
    const ctx = makeCtx();
    await handleScamReportVerified(makeInput(), ctx);
    const call = mockSendNotification.mock.calls[0][0];
    expect(call.message).toMatch(/Verified Scammer/);
  });

  it("relatedType is 'scammer'", async () => {
    const ctx = makeCtx();
    await handleScamReportVerified(makeInput(), ctx);
    expect(mockSendNotification.mock.calls[0][0].relatedType).toBe("scammer");
  });
});

describe("handleScamReportVerified — notification failure is non-fatal", () => {
  it("does not throw when sendNotification fails", async () => {
    mockSendNotification.mockRejectedValue(new Error("Network down"));
    const ctx = makeCtx();
    await expect(handleScamReportVerified(makeInput(), ctx)).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalled();
  });
});
