import { describe, it, expect } from "vitest";

import { handleStoreWrite } from "../onStoreWrite";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  return {
    db: {} as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  } as unknown as JobContext;
}

describe("handleStoreWrite — intentional no-op", () => {
  it("resolves without throwing when store is created", async () => {
    await expect(
      handleStoreWrite({ storeId: "store-1", before: null, after: { name: "New Store" } }, makeCtx()),
    ).resolves.toBeUndefined();
  });

  it("resolves without throwing when store is updated", async () => {
    await expect(
      handleStoreWrite(
        { storeId: "store-1", before: { name: "Old" }, after: { name: "New" } },
        makeCtx(),
      ),
    ).resolves.toBeUndefined();
  });

  it("resolves without throwing when store is deleted", async () => {
    await expect(
      handleStoreWrite({ storeId: "store-1", before: { name: "Old" }, after: null }, makeCtx()),
    ).resolves.toBeUndefined();
  });
});
