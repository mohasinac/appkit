import { describe, expect, it, vi } from "vitest";
import { safeRead, installDegradedReadReporter } from "../safe-read";

describe("safeRead", () => {
  it("returns the data on success without invoking the reporter", async () => {
    const reporter = vi.fn();
    installDegradedReadReporter(reporter);
    const result = await safeRead(async () => 42, {
      route: "/test",
      key: "k",
      fallback: -1,
    });
    expect(result).toBe(42);
    expect(reporter).not.toHaveBeenCalled();
  });

  it("returns the fallback and reports on failure", async () => {
    const reporter = vi.fn();
    installDegradedReadReporter(reporter);
    const fallback = ["empty"] as string[];
    const result = await safeRead<string[]>(
      async () => {
        throw new Error("boom");
      },
      { route: "/test", key: "k2", fallback },
    );
    expect(result).toBe(fallback);
    expect(reporter).toHaveBeenCalledTimes(1);
    const call = reporter.mock.calls[0][0];
    expect(call.route).toBe("/test");
    expect(call.key).toBe("k2");
    expect(call.code).toBe("DEGRADED_READ");
    expect(call.message).toBe("boom");
  });

  it("never throws when the reporter itself throws", async () => {
    installDegradedReadReporter(() => {
      throw new Error("reporter broken");
    });
    const result = await safeRead(
      async () => {
        throw new Error("inner");
      },
      { route: "/x", key: "y", fallback: null },
    );
    expect(result).toBeNull();
  });
});
