import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockList } = vi.hoisted(() => ({
  mockList: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  newsletterRepository: { list: mockList },
}));

import { runNewsletterExport } from "../newsletterExport";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  return {
    db: {} as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

const mockData = [
  {
    id: "sub-001",
    email: "ravi@example.com",
    status: "active",
    source: "homepage",
    subscribedAt: "2026-01-01T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "sub-002",
    email: "alice,bob@example.com", // has comma — must be escaped
    status: "unsubscribed",
    source: "checkout",
    subscribedAt: "2026-02-01T00:00:00Z",
    createdAt: "2026-02-01T00:00:00Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue({ data: mockData });
});

describe("runNewsletterExport", () => {
  it("calls list with pageSize 10000 to export all records", async () => {
    await runNewsletterExport(makeCtx());
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ pageSize: "10000" }));
  });

  it("returns a CSV header row as the first line", async () => {
    const result = await runNewsletterExport(makeCtx());
    const firstLine = result.data?.csv?.toString().split("\r\n")[0];
    expect(firstLine).toBe("id,email,status,source,subscribedAt,createdAt");
  });

  it("data rows include subscriber data", async () => {
    const result = await runNewsletterExport(makeCtx());
    const csv = String(result.data?.csv);
    expect(csv).toContain("sub-001");
    expect(csv).toContain("ravi@example.com");
  });

  it("escapes a value containing a comma in double quotes", async () => {
    const result = await runNewsletterExport(makeCtx());
    const csv = String(result.data?.csv);
    expect(csv).toContain('"alice,bob@example.com"');
  });

  it("empty subscriber list → only header row", async () => {
    mockList.mockResolvedValue({ data: [] });
    const result = await runNewsletterExport(makeCtx());
    const lines = String(result.data?.csv).split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(1);
  });

  it("summary.total matches subscriber count", async () => {
    const result = await runNewsletterExport(makeCtx());
    expect(result.summary.total).toBe(2);
  });
});
