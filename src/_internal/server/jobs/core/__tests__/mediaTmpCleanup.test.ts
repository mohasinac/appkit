import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../../providers/db-firebase/admin-storage-lite", () => ({
  getAdminStorageLite: vi.fn(),
}));

import { runMediaTmpCleanup } from "../mediaTmpCleanup";
import { getAdminStorageLite } from "../../../../../providers/db-firebase/admin-storage-lite";
import type { JobContext } from "../../runtime/types";

function makeCtx(envOverrides: Record<string, string> = {}): JobContext {
  return {
    job: "media-tmp-cleanup",
    db: {} as JobContext["db"],
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    env: (key) => envOverrides[key],
    now: new Date("2026-01-15T12:00:00Z"),
  };
}

function makeFile(name: string, updatedOffset: number, cutoffBase: Date) {
  const updated = new Date(cutoffBase.getTime() + updatedOffset).toISOString();
  return {
    name,
    getMetadata: vi.fn().mockResolvedValue([{ updated }]),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

function setupBucket(files: ReturnType<typeof makeFile>[]) {
  const bucket = {
    getFiles: vi.fn().mockResolvedValue([files]),
  };
  (getAdminStorageLite as ReturnType<typeof vi.fn>).mockReturnValue({
    bucket: vi.fn(() => bucket),
  });
  return bucket;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.FIREBASE_ADMIN_STORAGE_BUCKET;
  delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
});

describe("runMediaTmpCleanup", () => {
  it("does nothing when no files exist under tmp/", async () => {
    setupBucket([]);
    const ctx = makeCtx();
    await runMediaTmpCleanup(ctx);
    // Should complete without error
  });

  it("skips files newer than the TTL cutoff", async () => {
    // cutoff = now - 24h; file updated 1ms AFTER cutoff → not stale
    const ctx = makeCtx();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newFile = makeFile("tmp/new-file.jpg", 1000, cutoff); // updated after cutoff
    setupBucket([newFile]);
    await runMediaTmpCleanup(ctx);
    expect(newFile.delete).not.toHaveBeenCalled();
  });

  it("deletes files older than the TTL cutoff", async () => {
    const ctx = makeCtx();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldFile = makeFile("tmp/old-file.jpg", -1000, cutoff); // updated before cutoff
    setupBucket([oldFile]);
    await runMediaTmpCleanup(ctx);
    expect(oldFile.delete).toHaveBeenCalledOnce();
  });

  it("uses MEDIA_TMP_TTL_HOURS env var to override default TTL", async () => {
    const ctx = makeCtx({ MEDIA_TMP_TTL_HOURS: "1" });
    // With 1h TTL, cutoff = now - 1h
    // A file updated 2h ago should be deleted
    const cutoff = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const twoHourOldFile = makeFile("tmp/old.jpg", -60 * 60 * 1000, cutoff);
    setupBucket([twoHourOldFile]);
    await runMediaTmpCleanup(ctx);
    expect(twoHourOldFile.delete).toHaveBeenCalledOnce();
  });

  it("swallows 404 errors without logging them as errors", async () => {
    const ctx = makeCtx();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const staleFile = makeFile("tmp/gone.jpg", -1000, cutoff);
    const notFoundErr = Object.assign(new Error("Not found"), { code: 404 });
    (staleFile.delete as ReturnType<typeof vi.fn>).mockRejectedValue(notFoundErr);
    setupBucket([staleFile]);
    await expect(runMediaTmpCleanup(ctx)).resolves.toBeUndefined();
    expect((ctx.logger.error as ReturnType<typeof vi.fn>)).not.toHaveBeenCalledWith(
      "Failed to delete tmp file",
      expect.anything(),
      expect.anything(),
    );
  });

  it("logs a non-404 delete error but continues processing", async () => {
    const ctx = makeCtx();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failFile = makeFile("tmp/fail.jpg", -1000, cutoff);
    const okFile = makeFile("tmp/ok.jpg", -2000, cutoff);
    const genericErr = Object.assign(new Error("Permission denied"), { code: 403 });
    (failFile.delete as ReturnType<typeof vi.fn>).mockRejectedValue(genericErr);
    setupBucket([failFile, okFile]);
    await runMediaTmpCleanup(ctx);
    expect((ctx.logger.error as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      "Failed to delete tmp file",
      genericErr,
      expect.any(Object),
    );
    expect(okFile.delete).toHaveBeenCalledOnce();
  });

  it("skips files missing updated/timeCreated metadata", async () => {
    const ctx = makeCtx();
    const noMetaFile = {
      name: "tmp/no-meta.jpg",
      getMetadata: vi.fn().mockResolvedValue([{}]),
      delete: vi.fn(),
    };
    setupBucket([noMetaFile]);
    await runMediaTmpCleanup(ctx);
    expect(noMetaFile.delete).not.toHaveBeenCalled();
  });

  it("throws when bucket.getFiles itself fails", async () => {
    const bucket = {
      getFiles: vi.fn().mockRejectedValue(new Error("Storage unavailable")),
    };
    (getAdminStorageLite as ReturnType<typeof vi.fn>).mockReturnValue({
      bucket: vi.fn(() => bucket),
    });
    const ctx = makeCtx();
    await expect(runMediaTmpCleanup(ctx)).rejects.toThrow("Storage unavailable");
  });
});
