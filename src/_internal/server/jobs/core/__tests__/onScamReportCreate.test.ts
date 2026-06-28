import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindById,
  mockUserList,
  mockSendNotification,
} = vi.hoisted(() => ({
  mockUserFindById: vi.fn(),
  mockUserList: vi.fn(),
  mockSendNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../../repositories", () => ({
  userRepository: {
    findById: mockUserFindById,
    list: mockUserList,
  },
}));

vi.mock("../../../../../features/admin/actions/notification-actions", () => ({
  sendNotification: mockSendNotification,
}));

vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));

vi.mock("../../../../../features/scams/constants/scam-types", () => ({
  SCAM_TYPE_LABELS: { fake_item: "Fake Item", no_delivery: "No Delivery" },
}));

import { handleScamReportCreate } from "../onScamReportCreate";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  return {
    db: {} as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

function makeInput(overrides: Partial<{
  scammerId: string;
  reportedBy: string;
  displayNames: string[];
  scamType: string;
}> = {}) {
  return {
    scammerId: overrides.scammerId ?? "scammer-1",
    report: {
      reportedBy: overrides.reportedBy ?? "user-reporter",
      displayNames: overrides.displayNames ?? ["Bad Seller"],
      scamType: overrides.scamType ?? "fake_item",
      scamPlatform: "WhatsApp",
      amountLost: 50000,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindById.mockResolvedValue({ email: "reporter@example.com", phoneNumber: "+9199999" });
  mockUserList.mockResolvedValue({ items: [] });
  mockSendNotification.mockResolvedValue(undefined);
});

describe("handleScamReportCreate — reporter notification", () => {
  it("notifies the reporter when reportedBy is set", async () => {
    const ctx = makeCtx();
    await handleScamReportCreate(makeInput({ reportedBy: "user-reporter" }), ctx);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-reporter" }),
    );
  });

  it("notification message mentions the scammer display name", async () => {
    const ctx = makeCtx();
    await handleScamReportCreate(makeInput({ displayNames: ["Fake Seller Name"] }), ctx);
    const call = mockSendNotification.mock.calls[0][0];
    expect(call.message).toMatch(/Fake Seller Name/);
  });

  it("notification relatedId is the scammerId", async () => {
    const ctx = makeCtx();
    await handleScamReportCreate(makeInput({ scammerId: "scammer-42" }), ctx);
    const call = mockSendNotification.mock.calls[0][0];
    expect(call.relatedId).toBe("scammer-42");
  });

  it("does NOT notify reporter when reportedBy is undefined", async () => {
    const ctx = makeCtx();
    await handleScamReportCreate({
      scammerId: "scammer-1",
      report: { displayNames: ["Someone"], scamType: "fake_item" },
    }, ctx);
    // Only employee notifications possible (list returned no employees)
    expect(mockUserFindById).not.toHaveBeenCalled();
  });
});

describe("handleScamReportCreate — employee notifications", () => {
  it("notifies all employees returned by userRepository.list", async () => {
    const ctx = makeCtx();
    mockUserList.mockResolvedValue({
      items: [
        { id: "emp-1", email: "emp1@company.com" },
        { id: "emp-2", email: "emp2@company.com" },
      ],
    });
    await handleScamReportCreate(makeInput(), ctx);
    // reporter + 2 employees = 3 total
    const employeeCalls = mockSendNotification.mock.calls.filter(
      (c) => c[0].userId === "emp-1" || c[0].userId === "emp-2",
    );
    expect(employeeCalls).toHaveLength(2);
  });

  it("employee notification uses scam type label", async () => {
    mockUserList.mockResolvedValue({ items: [{ id: "emp-1" }] });
    const ctx = makeCtx();
    await handleScamReportCreate(makeInput({ scamType: "fake_item" }), ctx);
    const empCall = mockSendNotification.mock.calls.find((c) => c[0].userId === "emp-1");
    expect(empCall?.[0].message).toMatch(/Fake Item/);
  });
});

describe("handleScamReportCreate — reporter notification failure is non-fatal", () => {
  it("continues even if reporter notification throws", async () => {
    mockUserFindById.mockRejectedValue(new Error("PII lookup failed"));
    const ctx = makeCtx();
    await expect(handleScamReportCreate(makeInput(), ctx)).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalled();
  });
});
